"""Task router — CRUD + SSE agent execution."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from agents.orchestrator import run_agent_stream
from models.database import get_session
from models.task import Task

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


# ── Pydantic schemas ────────────────────────────────────────────────────────

class TaskCreate(BaseModel):
    description: str


class TaskResponse(BaseModel):
    id: str
    description: str
    status: str
    result: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("")
async def create_task(
    body: TaskCreate,
    session: AsyncSession = Depends(get_session),
):
    """Create a task, run the agent, and stream SSE events."""
    task = Task(description=body.description, status="running")
    session.add(task)
    await session.commit()
    await session.refresh(task)

    task_id = task.id

    async def event_generator():
        accumulated_result: list[str] = []
        final_status = "completed"

        try:
            async for event in run_agent_stream(body.description):
                event_type = event["type"]
                content = event["content"]

                if event_type == "token":
                    accumulated_result.append(content)
                elif event_type == "done":
                    accumulated_result.clear()
                    accumulated_result.append(content)
                elif event_type == "error":
                    final_status = "failed"

                data = json.dumps({"type": event_type, "content": content})
                yield f"data: {data}\n\n"
        except Exception as exc:
            final_status = "failed"
            data = json.dumps({"type": "error", "content": str(exc)})
            yield f"data: {data}\n\n"
        finally:
            # Update task in a fresh session to avoid stale-state issues
            from models.database import async_session as session_factory

            async with session_factory() as db:
                task_obj = await db.get(Task, task_id)
                if task_obj is not None:
                    task_obj.status = final_status
                    task_obj.result = "".join(accumulated_result) or None
                    task_obj.updated_at = datetime.now(timezone.utc)
                    await db.commit()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("", response_model=list[TaskResponse])
async def list_tasks(session: AsyncSession = Depends(get_session)):
    """List all tasks ordered by created_at desc."""
    result = await session.execute(
        select(Task).order_by(Task.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str, session: AsyncSession = Depends(get_session)):
    """Get a single task by UUID."""
    task = await session.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

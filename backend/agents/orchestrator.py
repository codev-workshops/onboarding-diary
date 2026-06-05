"""Single LangChain agent with tool-calling that streams SSE events."""

from __future__ import annotations

import json
from typing import Any, AsyncGenerator

from langchain_core.callbacks import AsyncCallbackHandler
from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI

from tools.web_search import web_search

import asyncio


class SSECallbackHandler(AsyncCallbackHandler):
    """Captures streaming tokens and tool calls, pushing them into an asyncio queue."""

    def __init__(self) -> None:
        super().__init__()
        self.queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()

    async def on_llm_new_token(self, token: str, **kwargs: Any) -> None:
        await self.queue.put({"type": "token", "content": token})

    async def on_tool_start(
        self,
        serialized: dict[str, Any],
        input_str: str,
        **kwargs: Any,
    ) -> None:
        tool_name = serialized.get("name", kwargs.get("name", "unknown"))
        await self.queue.put(
            {
                "type": "tool_call",
                "content": json.dumps({"name": tool_name, "args": input_str}),
            }
        )

    async def on_tool_end(self, output: str, **kwargs: Any) -> None:
        await self.queue.put({"type": "tool_result", "content": str(output)})


TOOLS = [web_search]


def _build_agent():
    """Build a LangChain agent with tool-calling."""
    llm = ChatOpenAI(
        model="gpt-4o",
        temperature=0,
        streaming=True,
    )
    llm_with_tools = llm.bind_tools(TOOLS)
    return llm_with_tools


async def run_agent_stream(description: str) -> AsyncGenerator[dict[str, Any], None]:
    """Run the agent on *description* and yield SSE-ready event dicts.

    Yields dicts with keys ``type`` (token | tool_call | tool_result | done | error)
    and ``content`` (str).
    """
    from langchain.agents import AgentExecutor, create_tool_calling_agent
    from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

    handler = SSECallbackHandler()

    llm = ChatOpenAI(
        model="gpt-4o",
        temperature=0,
        streaming=True,
        callbacks=[handler],
    )

    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are a helpful AI assistant. Use the tools available to you to "
                "answer the user's request as thoroughly as possible.",
            ),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ]
    )

    agent = create_tool_calling_agent(llm, TOOLS, prompt)
    executor = AgentExecutor(
        agent=agent,
        tools=TOOLS,
        verbose=False,
        callbacks=[handler],
    )

    final_output: str | None = None

    async def _invoke() -> None:
        nonlocal final_output
        try:
            result = await executor.ainvoke(
                {"input": description},
                config={"callbacks": [handler]},
            )
            final_output = result.get("output", "")
        except Exception as exc:
            await handler.queue.put({"type": "error", "content": str(exc)})
        finally:
            # Sentinel to signal the generator to stop
            await handler.queue.put(None)

    task = asyncio.create_task(_invoke())

    try:
        while True:
            event = await handler.queue.get()
            if event is None:
                break
            yield event

        if final_output is not None:
            yield {"type": "done", "content": final_output}
    except Exception as exc:
        yield {"type": "error", "content": str(exc)}
    finally:
        if not task.done():
            task.cancel()

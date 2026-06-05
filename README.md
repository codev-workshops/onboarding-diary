# Agent Orchestration Learning Project

An educational, hands-on project for building a **multi-agent orchestration platform** with a web frontend and a Python backend. Users submit tasks through a Next.js UI; a FastAPI + LangGraph backend decomposes each task and delegates it to specialised sub-agents (Research, Code, File) that collaborate to produce a result streamed back in real time.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) · Tailwind CSS · shadcn/ui |
| Backend | Python 3.12 · FastAPI · LangGraph · LangChain |
| LLM | OpenAI GPT-4o |
| Database | PostgreSQL · SQLAlchemy |
| Task Queue | Redis (optional) |
| Sandbox | Docker SDK for Python |
| Observability | LangSmith / Langfuse |
| DevOps | Docker Compose |

## Getting Started

> Full setup instructions will be added as the project scaffolding is built out in Phase 1.

## Project Plan

See **[docs/PLAN.md](docs/PLAN.md)** for the detailed planning document including architecture diagram, phased roadmap, folder structure, and learning objectives.

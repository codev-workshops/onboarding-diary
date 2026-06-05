"""Web search tool for the agent.

Tries to use DuckDuckGo search via langchain-community.  Falls back to a
simple mock implementation so the backend can start even when the
duckduckgo-search package is unavailable or rate-limited.
"""

from __future__ import annotations

from langchain_core.tools import tool

try:
    from langchain_community.tools import DuckDuckGoSearchRun

    _ddg_tool = DuckDuckGoSearchRun()
except Exception:
    _ddg_tool = None


@tool
def web_search(query: str) -> str:
    """Search the web for information about a given query."""
    if _ddg_tool is not None:
        try:
            return _ddg_tool.invoke(query)
        except Exception:
            pass
    # Fallback mock results
    return (
        f"[Mock search results for '{query}']\n"
        "1. Example result one — https://example.com/1\n"
        "2. Example result two — https://example.com/2\n"
        "3. Example result three — https://example.com/3\n"
    )

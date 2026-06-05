"use client";

import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface StreamEvent {
  type: "token" | "tool_call" | "tool_result" | "done" | "error";
  content: string;
}

interface StreamingOutputProps {
  events: StreamEvent[];
  isRunning: boolean;
}

function ToolCallBlock({ content }: { content: string }) {
  let toolName = content;
  try {
    const parsed = JSON.parse(content) as { name?: string };
    toolName = parsed.name ?? content;
  } catch {
    // use raw content as fallback
  }

  return (
    <div className="my-2 flex items-center gap-2 rounded-md bg-indigo-950/60 px-3 py-2 border border-indigo-800">
      <span className="text-base">🔧</span>
      <span className="text-sm text-indigo-300">
        Calling: <span className="font-semibold text-indigo-200">{toolName}</span>
      </span>
    </div>
  );
}

function ToolResultBlock({ content }: { content: string }) {
  return (
    <details className="my-2 rounded-md border border-zinc-700 bg-zinc-900/50">
      <summary className="cursor-pointer px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200">
        📎 Tool Result (click to expand)
      </summary>
      <pre className="overflow-x-auto px-3 py-2 text-xs text-zinc-300 whitespace-pre-wrap">
        {content}
      </pre>
    </details>
  );
}

export function StreamingOutput({ events, isRunning }: StreamingOutputProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  const hasContent = events.length > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Output</CardTitle>
        {isRunning && (
          <Badge variant="secondary" className="animate-pulse">
            Streaming…
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-[400px] overflow-y-auto rounded-md border border-zinc-800 bg-zinc-950 p-4 font-mono text-sm">
          {!hasContent && !isRunning && (
            <p className="text-zinc-500">
              Output will appear here once you run a task.
            </p>
          )}
          {events.map((event, i) => {
            switch (event.type) {
              case "token":
                return (
                  <span key={i} className="text-zinc-200 whitespace-pre-wrap">
                    {event.content}
                  </span>
                );
              case "tool_call":
                return <ToolCallBlock key={i} content={event.content} />;
              case "tool_result":
                return <ToolResultBlock key={i} content={event.content} />;
              case "done":
                return (
                  <div key={i} className="my-3 flex items-center gap-2 text-emerald-400">
                    <span>✅</span>
                    <span className="font-semibold">Task completed</span>
                  </div>
                );
              case "error":
                return (
                  <div key={i} className="my-2 rounded-md bg-red-950/60 border border-red-800 px-3 py-2 text-sm text-red-400">
                    ❌ Error: {event.content}
                  </div>
                );
              default:
                return null;
            }
          })}
          <div ref={bottomRef} />
        </div>
      </CardContent>
    </Card>
  );
}

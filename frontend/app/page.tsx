"use client";

import { useState, useCallback } from "react";
import { TaskInput } from "@/components/task-input";
import { StreamingOutput, type StreamEvent } from "@/components/streaming-output";
import { TaskHistory } from "@/components/task-history";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function Home() {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSubmit = useCallback(async (description: string) => {
    setEvents([]);
    setIsRunning(true);

    try {
      const response = await fetch(`${API_URL}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No readable stream in response");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;

          const jsonStr = trimmed.slice(6);
          try {
            const event = JSON.parse(jsonStr) as StreamEvent;
            setEvents((prev) => [...prev, event]);

            if (event.type === "done" || event.type === "error") {
              setIsRunning(false);
              setRefreshKey((k) => k + 1);
            }
          } catch {
            // skip malformed JSON
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setEvents((prev) => [...prev, { type: "error", content: message }]);
    } finally {
      setIsRunning(false);
      setRefreshKey((k) => k + 1);
    }
  }, []);

  return (
    <main className="min-h-screen p-6 md:p-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-50">
          Agent Orchestration Platform
        </h1>
        <p className="mt-1 text-zinc-400">
          Run AI-powered tasks and watch them execute in real-time.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <TaskInput onSubmit={handleSubmit} isRunning={isRunning} />
          <StreamingOutput events={events} isRunning={isRunning} />
        </div>
        <aside>
          <TaskHistory refreshKey={refreshKey} />
        </aside>
      </div>
    </main>
  );
}

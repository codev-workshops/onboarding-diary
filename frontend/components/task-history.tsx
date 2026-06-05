"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Task {
  id: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed";
  result: string | null;
  created_at: string;
  updated_at: string;
}

function statusBadgeVariant(status: Task["status"]) {
  switch (status) {
    case "completed":
      return "success" as const;
    case "running":
      return "secondary" as const;
    case "failed":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

interface TaskHistoryProps {
  refreshKey: number;
}

export function TaskHistory({ refreshKey }: TaskHistoryProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/tasks`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Task[];
      setTasks(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch tasks";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks, refreshKey]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Task History</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          {loading && (
            <p className="text-sm text-zinc-500">Loading tasks…</p>
          )}
          {error && (
            <p className="text-sm text-red-400">Error: {error}</p>
          )}
          {!loading && !error && tasks.length === 0 && (
            <p className="text-sm text-zinc-500">No tasks yet.</p>
          )}
          <div className="space-y-3 pr-3">
            {tasks.map((task) => (
              <button
                key={task.id}
                type="button"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-left transition-colors hover:bg-zinc-800/50"
                onClick={() =>
                  setExpandedId(expandedId === task.id ? null : task.id)
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-zinc-200 line-clamp-2">
                    {task.description}
                  </p>
                  <Badge variant={statusBadgeVariant(task.status)}>
                    {task.status}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {formatTime(task.created_at)}
                </p>
                {expandedId === task.id && task.result && (
                  <pre className="mt-2 whitespace-pre-wrap rounded-md bg-zinc-950 p-2 text-xs text-zinc-300 border border-zinc-800">
                    {task.result}
                  </pre>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

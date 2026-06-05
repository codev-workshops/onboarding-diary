"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TaskInputProps {
  onSubmit: (description: string) => void;
  isRunning: boolean;
}

export function TaskInput({ onSubmit, isRunning }: TaskInputProps) {
  const [description, setDescription] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = description.trim();
    if (!trimmed || isRunning) return;
    onSubmit(trimmed);
    setDescription("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Task</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            placeholder="Describe your task..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="resize-none font-mono"
            disabled={isRunning}
          />
          <Button type="submit" disabled={isRunning || !description.trim()}>
            {isRunning ? "Running…" : "Run Task"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

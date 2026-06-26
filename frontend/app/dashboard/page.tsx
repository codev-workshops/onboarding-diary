"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "@/lib/protected-route";
import {
  getDashboard,
  type DashboardSummaryDto,
  type OpenIssueDto,
  type RecentEntryDto,
} from "@/lib/api";

function ProgressBar({ percentage }: { percentage: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: "12px",
        background: "#e9ecef",
        borderRadius: "6px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${Math.min(percentage, 100)}%`,
          height: "100%",
          background: percentage >= 75 ? "#28a745" : percentage >= 50 ? "#ffc107" : "#dc3545",
          borderRadius: "6px",
          transition: "width 0.3s ease",
        }}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href?: string;
}) {
  const router = useRouter();
  return (
    <div
      onClick={href ? () => router.push(href) : undefined}
      style={{
        padding: "1.25rem",
        border: "1px solid #e0e0e0",
        borderRadius: "10px",
        textAlign: "center",
        cursor: href ? "pointer" : "default",
        transition: "box-shadow 0.2s",
      }}
      onMouseEnter={(e) => {
        if (href) (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      <div style={{ fontSize: "2rem", fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: "0.85rem", color: "#666", marginTop: "0.25rem" }}>{label}</div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    Critical: "#dc3545",
    High: "#fd7e14",
    Medium: "#ffc107",
    Low: "#28a745",
  };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "4px",
        fontSize: "0.75rem",
        fontWeight: 600,
        background: colors[severity] ?? "#6c757d",
        color: severity === "Medium" ? "#000" : "#fff",
      }}
    >
      {severity}
    </span>
  );
}

function RecentList({
  title,
  items,
  basePath,
}: {
  title: string;
  items: RecentEntryDto[];
  basePath: string;
}) {
  const router = useRouter();
  if (items.length === 0) return null;
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>{title}</h3>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {items.map((item) => (
          <li
            key={item.id}
            onClick={() => router.push(`${basePath}/${item.id}`)}
            style={{
              padding: "0.5rem 0.75rem",
              borderBottom: "1px solid #f0f0f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: "0.9rem" }}>{item.title}</span>
            {item.badge && (
              <span
                style={{
                  fontSize: "0.75rem",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background: "#f0f0f0",
                  color: "#555",
                }}
              >
                {item.badge}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DashboardContent() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardSummaryDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const result = await getDashboard();
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load dashboard");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  const startDate = user?.startDate;
  const daysSinceStart = startDate
    ? Math.floor(
        (new Date().getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <div style={{ padding: "2rem", maxWidth: "1000px", margin: "0 auto" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
          paddingBottom: "1rem",
          borderBottom: "1px solid #eaeaea",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.5rem", margin: 0 }}>
            Welcome{user?.name ? `, ${user.name}` : ""}!
          </h1>
          {daysSinceStart !== null && daysSinceStart >= 0 && (
            <p style={{ color: "#666", margin: "0.25rem 0 0", fontSize: "0.9rem" }}>
              Day {daysSinceStart} of your onboarding journey
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {user?.role && user.role !== "Recruit" && (
            <button
              onClick={() => router.push("/team")}
              style={{
                padding: "0.5rem 1rem",
                background: "#0070f3",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Team Dashboard
            </button>
          )}
          <button
            onClick={handleLogout}
            style={{
              padding: "0.5rem 1rem",
              background: "transparent",
              border: "1px solid #ccc",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {loading && <p>Loading dashboard...</p>}
      {error && <p style={{ color: "#dc3545" }}>{error}</p>}

      {data && (
        <>
          {/* Task Progress */}
          <section style={{ marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>
              Task Completion — {data.taskStats.completionRate}%
            </h2>
            <ProgressBar percentage={data.taskStats.completionRate} />
          </section>

          {/* Summary Tiles */}
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "1rem",
              marginBottom: "2rem",
            }}
          >
            <StatCard label="Tasks" value={data.taskStats.total} href="/tasks" />
            <StatCard label="Issues" value={data.issueStats.total} href="/issues" />
            <StatCard label="Feedback" value={data.feedbackStats.total} href="/feedback" />
            <StatCard label="Notes" value={data.noteStats.total} href="/notes" />
          </section>

          {/* Recent Entries & Open Issues */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "2rem",
              marginBottom: "2rem",
            }}
          >
            <div>
              <RecentList title="Recent Tasks" items={data.recentEntries.tasks} basePath="/tasks" />
              <RecentList title="Recent Issues" items={data.recentEntries.issues} basePath="/issues" />
              <RecentList title="Recent Feedback" items={data.recentEntries.feedback} basePath="/feedback" />
              <RecentList title="Recent Notes" items={data.recentEntries.notes} basePath="/notes" />
            </div>
            <div>
              <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Open Issues</h3>
              {data.openIssues.length === 0 && (
                <p style={{ color: "#666", fontSize: "0.9rem" }}>No open issues</p>
              )}
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {data.openIssues.map((issue: OpenIssueDto) => (
                  <li
                    key={issue.id}
                    onClick={() => router.push(`/issues/${issue.id}`)}
                    style={{
                      padding: "0.6rem 0.75rem",
                      borderBottom: "1px solid #f0f0f0",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor: "pointer",
                      background: issue.severity === "Critical" ? "#fff5f5" : "transparent",
                    }}
                  >
                    <span style={{ fontSize: "0.9rem" }}>{issue.title}</span>
                    <SeverityBadge severity={issue.severity} />
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Quick Actions */}
          <section>
            <h3 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>Quick Actions</h3>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {[
                { label: "New Task", href: "/tasks?new=1" },
                { label: "New Issue", href: "/issues?new=1" },
                { label: "New Feedback", href: "/feedback?new=1" },
                { label: "New Note", href: "/notes?new=1" },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => router.push(action.href)}
                  style={{
                    padding: "0.5rem 1rem",
                    border: "1px solid #0070f3",
                    borderRadius: "6px",
                    background: "transparent",
                    color: "#0070f3",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

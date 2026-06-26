"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "@/lib/protected-route";
import { getTeamDashboard, type TeamRecruitDto } from "@/lib/api";

function ProgressBar({ percentage }: { percentage: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: "10px",
        background: "#e9ecef",
        borderRadius: "5px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${Math.min(percentage, 100)}%`,
          height: "100%",
          background:
            percentage >= 75
              ? "#28a745"
              : percentage >= 50
                ? "#ffc107"
                : "#dc3545",
          borderRadius: "5px",
          transition: "width 0.3s ease",
        }}
      />
    </div>
  );
}

function RecruitCard({ recruit }: { recruit: TeamRecruitDto }) {
  const router = useRouter();
  return (
    <div
      onClick={() => router.push(`/tasks?recruitId=${recruit.id}`)}
      style={{
        border: "1px solid #e0e0e0",
        borderRadius: "10px",
        padding: "1.25rem",
        cursor: "pointer",
        transition: "box-shadow 0.2s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 2px 8px rgba(0,0,0,0.1)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "0.75rem",
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: "1rem" }}>{recruit.name}</h3>
          <p style={{ margin: "0.25rem 0 0", color: "#666", fontSize: "0.85rem" }}>
            {recruit.department}
          </p>
        </div>
        <div style={{ textAlign: "right", fontSize: "0.8rem", color: "#666" }}>
          <div>Started {new Date(recruit.startDate).toLocaleDateString()}</div>
          <div>Day {recruit.daysSinceStart}</div>
        </div>
      </div>

      <div style={{ marginBottom: "0.75rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.8rem",
            marginBottom: "0.25rem",
          }}
        >
          <span>Task Completion</span>
          <span style={{ fontWeight: 600 }}>{recruit.completionPercentage}%</span>
        </div>
        <ProgressBar percentage={recruit.completionPercentage} />
      </div>

      <div style={{ display: "flex", gap: "1rem", fontSize: "0.85rem" }}>
        <span
          style={{
            padding: "2px 8px",
            borderRadius: "4px",
            background: recruit.openIssueCount > 0 ? "#fff5f5" : "#f0f0f0",
            color: recruit.openIssueCount > 0 ? "#dc3545" : "#555",
            fontWeight: recruit.openIssueCount > 0 ? 600 : 400,
          }}
        >
          {recruit.openIssueCount} open issue{recruit.openIssueCount !== 1 ? "s" : ""}
        </span>
        {recruit.escalatedIssueCount > 0 && (
          <span
            style={{
              padding: "2px 8px",
              borderRadius: "4px",
              background: "#fff3cd",
              color: "#856404",
              fontWeight: 600,
            }}
          >
            {recruit.escalatedIssueCount} escalated
          </span>
        )}
      </div>
    </div>
  );
}

function TeamContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [recruits, setRecruits] = useState<TeamRecruitDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [department, setDepartment] = useState<string>("");

  const isAllowed = user?.role === "Manager" || user?.role === "Admin";

  useEffect(() => {
    if (!isAllowed) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const result = await getTeamDashboard(department || undefined);
        if (!cancelled) {
          setRecruits(result.recruits);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load team data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [isAllowed, department]);

  if (!isAllowed) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h2>Access Denied</h2>
        <p>This page is only available to managers and administrators.</p>
        <button
          onClick={() => router.push("/dashboard")}
          style={{
            padding: "0.5rem 1rem",
            border: "1px solid #0070f3",
            borderRadius: "6px",
            background: "transparent",
            color: "#0070f3",
            cursor: "pointer",
          }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

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
        <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Team Dashboard</h1>
        <button
          onClick={() => router.push("/dashboard")}
          style={{
            padding: "0.5rem 1rem",
            background: "transparent",
            border: "1px solid #ccc",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Back
        </button>
      </header>

      {user?.role === "Admin" && (
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ fontSize: "0.9rem", marginRight: "0.5rem" }}>
            Filter by department:
          </label>
          <input
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="All departments"
            style={{
              padding: "0.4rem 0.75rem",
              border: "1px solid #ccc",
              borderRadius: "6px",
              fontSize: "0.9rem",
            }}
          />
        </div>
      )}

      {loading && <p>Loading team data...</p>}
      {error && <p style={{ color: "#dc3545" }}>{error}</p>}

      {!loading && !error && recruits.length === 0 && (
        <p style={{ color: "#666" }}>No recruits found.</p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "1rem",
        }}
      >
        {recruits.map((recruit) => (
          <RecruitCard key={recruit.id} recruit={recruit} />
        ))}
      </div>
    </div>
  );
}

export default function TeamPage() {
  return (
    <ProtectedRoute>
      <TeamContent />
    </ProtectedRoute>
  );
}

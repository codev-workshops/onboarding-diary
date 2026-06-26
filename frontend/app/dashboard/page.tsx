"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "@/lib/protected-route";

function DashboardContent() {
  const { user, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
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
        <h1 style={{ fontSize: "1.5rem" }}>Dashboard</h1>
        <button
          onClick={handleLogout}
          style={{
            padding: "0.5rem 1rem",
            background: "transparent",
            border: "1px solid #ccc",
            borderRadius: "6px",
            cursor: "pointer",
            color: "var(--foreground)",
          }}
        >
          Sign Out
        </button>
      </header>

      <div
        style={{
          padding: "1.5rem",
          border: "1px solid #eaeaea",
          borderRadius: "12px",
        }}
      >
        <h2 style={{ marginBottom: "0.5rem" }}>
          Welcome{user?.name ? `, ${user.name}` : ""}!
        </h2>
        <p style={{ color: "#666", marginBottom: "1rem" }}>
          You are signed in{user?.role ? ` as ${user.role}` : ""}.
        </p>
        {user && (
          <dl style={{ fontSize: "0.9rem", lineHeight: "1.8" }}>
            {user.email && (
              <>
                <dt style={{ fontWeight: 600, display: "inline" }}>Email: </dt>
                <dd style={{ display: "inline", margin: 0 }}>{user.email}</dd>
                <br />
              </>
            )}
            {user.department && (
              <>
                <dt style={{ fontWeight: 600, display: "inline" }}>Department: </dt>
                <dd style={{ display: "inline", margin: 0 }}>{user.department}</dd>
                <br />
              </>
            )}
          </dl>
        )}
        <p style={{ color: "#999", marginTop: "1.5rem", fontSize: "0.85rem" }}>
          Full dashboard with diary features will be available in a future phase.
        </p>
      </div>
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

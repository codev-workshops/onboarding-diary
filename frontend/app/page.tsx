"use client";

import { useEffect, useState } from "react";
import { getHealth } from "@/lib/api";
import styles from "./page.module.css";

export default function Home() {
  const [apiStatus, setApiStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getHealth()
      .then((data) => setApiStatus(data.status))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>Onboarding Diary</h1>
        <p>
          A web application for new recruits to document their onboarding
          journey.
        </p>

        <section className={styles.status}>
          <h2>API Status</h2>
          {apiStatus && <p className={styles.success}>Backend: {apiStatus}</p>}
          {error && <p className={styles.error}>Backend: {error}</p>}
          {!apiStatus && !error && <p>Checking API connection...</p>}
        </section>
      </main>
    </div>
  );
}

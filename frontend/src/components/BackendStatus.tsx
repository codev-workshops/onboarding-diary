"use client";

import { observer } from "mobx-react-lite";
import { useEffect } from "react";
import { API_BASE_URL } from "@/lib/apiClient";
import { useStores } from "@/stores/StoreProvider";
import styles from "./BackendStatus.module.css";

const LABELS: Record<string, string> = {
  idle: "Not checked",
  loading: "Checking…",
  UP: "Backend UP",
  DOWN: "Backend DOWN",
  unreachable: "Backend unreachable",
};

export const BackendStatus = observer(function BackendStatus() {
  const { health } = useStores();

  useEffect(() => {
    void health.check();
  }, [health]);

  return (
    <section className={styles.card} aria-live="polite">
      <h2 className={styles.title}>Backend connectivity</h2>
      <p className={styles.row}>
        <span className={`${styles.dot} ${styles[health.state]}`} aria-hidden />
        <strong data-testid="health-state">{LABELS[health.state]}</strong>
      </p>
      <p className={styles.meta}>
        <code>{API_BASE_URL}/health</code>
        {health.checkedAt && <> &middot; {health.checkedAt.toLocaleTimeString()}</>}
      </p>
      {health.error && <p className={styles.error}>{health.error}</p>}
      <button
        type="button"
        className={styles.button}
        onClick={() => void health.check()}
        disabled={health.state === "loading"}
      >
        Re-check
      </button>
    </section>
  );
});

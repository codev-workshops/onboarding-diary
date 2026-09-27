import { BackendStatus } from "@/components/BackendStatus";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <h1 className={styles.heading}>Welcome to Onboarding Diary</h1>
        <p className={styles.lead}>
          Track tasks, log issues, collect feedback and keep notes during your
          first weeks. Sign-in and diary features arrive in the next slices.
        </p>
      </section>
      <BackendStatus />
    </div>
  );
}

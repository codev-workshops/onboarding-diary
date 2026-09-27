import { RequireRole } from "@/components/auth/RequireRole";
import styles from "@/components/ui/forms.module.css";

export default function TeamPage() {
  return (
    <RequireRole roles={["MANAGER", "ADMIN"]}>
      <section className={`${styles.card} ${styles.wide}`} aria-labelledby="team-title">
        <h1 id="team-title" className={styles.title}>
          Team
        </h1>
        <p className={styles.subtitle}>Manager view. Recruit assignments arrive in a later slice.</p>
      </section>
    </RequireRole>
  );
}

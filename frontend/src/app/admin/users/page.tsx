import { RequireRole } from "@/components/auth/RequireRole";
import styles from "@/components/ui/forms.module.css";

export default function AdminUsersPage() {
  return (
    <RequireRole roles={["ADMIN"]}>
      <section className={`${styles.card} ${styles.wide}`} aria-labelledby="users-title">
        <h1 id="users-title" className={styles.title}>
          Users
        </h1>
        <p className={styles.subtitle}>Admin view. Inviting and managing users arrives in a later slice.</p>
      </section>
    </RequireRole>
  );
}

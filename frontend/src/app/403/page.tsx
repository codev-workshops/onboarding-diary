import Link from "next/link";
import styles from "@/components/ui/forms.module.css";

export default function ForbiddenPage() {
  return (
    <section className={styles.card} aria-labelledby="forbidden-title">
      <h1 id="forbidden-title" className={styles.title}>
        403 — Access denied
      </h1>
      <p className={styles.subtitle}>Your role does not allow you to view this page.</p>
      <p className={styles.footerText}>
        <Link href="/">Back to home</Link>
      </p>
    </section>
  );
}

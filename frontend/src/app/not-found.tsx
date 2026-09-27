import Link from "next/link";
import styles from "@/components/ui/forms.module.css";

export default function NotFound() {
  return (
    <section className={styles.card} aria-labelledby="not-found-title">
      <h1 id="not-found-title" className={styles.title}>
        404 — Page not found
      </h1>
      <p className={styles.subtitle}>The page you are looking for does not exist.</p>
      <p className={styles.footerText}>
        <Link href="/">Back to home</Link>
      </p>
    </section>
  );
}

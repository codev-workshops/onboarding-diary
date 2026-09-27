"use client";

import Link from "next/link";
import { observer } from "mobx-react-lite";
import { BackendStatus } from "@/components/BackendStatus";
import { useStores } from "@/stores/StoreProvider";
import styles from "./page.module.css";

const HomePage = observer(function HomePage() {
  const { auth } = useStores();

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        {auth.isAuthenticated && auth.user ? (
          <>
            <h1 className={styles.heading}>Welcome back, {auth.user.fullName}</h1>
            <p className={styles.lead}>
              You are signed in as {auth.user.email}. Manage your details on your{" "}
              <Link href="/profile">profile</Link>. Diary features arrive in the next slices.
            </p>
          </>
        ) : (
          <>
            <h1 className={styles.heading}>Welcome to Onboarding Diary</h1>
            <p className={styles.lead}>
              Track tasks, log issues, collect feedback and keep notes during your first weeks.{" "}
              <Link href="/login">Log in</Link> or <Link href="/signup">complete your sign-up</Link> to get started.
            </p>
          </>
        )}
      </section>
      <BackendStatus />
    </div>
  );
});

export default HomePage;

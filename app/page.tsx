import styles from "./page.module.css";
import Link from "next/link";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>Classroom Engine</h1>
        <p className={styles.subtitle}>Speed over intelligence. Usability over features.</p>
        <div className={styles.ctas}>
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <button>Start Session</button>
          </Link>
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <button className={styles.btnSecondary} style={{ marginLeft: "1rem" }}>Manage Classes</button>
          </Link>
        </div>
      </main>
    </div>
  );
}

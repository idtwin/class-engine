import styles from "./page.module.css";
import Link from "next/link";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <span className="label-caps" style={{ color: 'var(--accent)', letterSpacing: '0.2em' }}>Project S.E.R.U</span>
        <h1 className={`${styles.title} neon`}>COMMAND_CENTRAL</h1>
        <p className={styles.subtitle}>Kinetic neural-training modules for the modern classroom.</p>
        <div className={styles.ctas}>
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <button>Start Session</button>
          </Link>
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <button className={styles.btnSecondary}>Manage Classes</button>
          </Link>
        </div>
      </main>
    </div>
  );
}

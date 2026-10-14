"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../join/join.module.css";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(`${error.message} (Or use Quick Demo Access below)`);
        setLoading(false);
      } else {
        document.cookie = "demo_teacher_active=true; path=/; max-age=86400; SameSite=Lax";
        window.location.href = "/games";
      }
    } catch (err: any) {
      setError("Auth error. You can use Quick Demo Access below.");
      setLoading(false);
    }
  };

  const handleDemoAccess = () => {
    localStorage.setItem("demo_teacher_active", "true");
    document.cookie = "demo_teacher_active=true; path=/; max-age=86400; SameSite=Lax";
    window.location.href = "/games";
  };

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={handleLogin}>
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoDot} />
          TEACHER_COMMAND
        </div>

        {/* Hero */}
        <h1 className={styles.title}>Secure Login</h1>
        <p className={styles.subtitle}>Enter your credentials or use Quick Demo Access</p>

        <div className={styles.codeWrap} style={{ gap: '16px' }}>
          <div style={{ width: '100%' }}>
            <label className={styles.fieldLabel}>Email Address</label>
            <input
              type="email"
              className={styles.codeInput}
              style={{ fontSize: '18px', letterSpacing: 'normal', textTransform: 'none', padding: '14px' }}
              placeholder="teacher@school.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div style={{ width: '100%' }}>
            <label className={styles.fieldLabel}>Password</label>
            <input
              type="password"
              className={styles.codeInput}
              style={{ fontSize: '18px', letterSpacing: 'normal', textTransform: 'none', padding: '14px' }}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <div className={styles.error} style={{ fontSize: 12, color: "#ff4444" }}>{error}</div>}

          <button
            className={styles.joinBtn}
            type="submit"
            disabled={loading}
          >
            {loading ? "Authenticating..." : "Access Command Center →"}
          </button>

          <div style={{ textAlign: "center", margin: "12px 0 4px", fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
            — OR FOR DEMO / LOCAL USE —
          </div>

          <button
            type="button"
            className={styles.joinBtn}
            onClick={handleDemoAccess}
            style={{
              background: "rgba(0, 200, 240, 0.12)",
              border: "1px solid rgba(0, 200, 240, 0.4)",
              color: "#00c8f0",
              fontWeight: 800
            }}
          >
            ⚡ Quick Demo Access (No Password) →
          </button>
        </div>
      </form>
    </div>
  );
}

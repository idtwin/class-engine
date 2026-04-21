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

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
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
        <p className={styles.subtitle}>Enter your credentials to access</p>

        <div className={styles.codeWrap} style={{ gap: '16px' }}>
          <div style={{ width: '100%' }}>
            <label className={styles.fieldLabel}>Email Address</label>
            <input
              type="email"
              className={styles.codeInput}
              style={{ fontSize: '20px', letterSpacing: 'normal', textTransform: 'none', padding: '14px' }}
              placeholder="teacher@school.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div style={{ width: '100%' }}>
            <label className={styles.fieldLabel}>Password</label>
            <input
              type="password"
              className={styles.codeInput}
              style={{ fontSize: '20px', letterSpacing: 'normal', textTransform: 'none', padding: '14px' }}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button
            className={styles.joinBtn}
            type="submit"
            disabled={!email || !password || loading}
          >
            {loading ? "Authenticating..." : "Access Command Center →"}
          </button>
        </div>
      </form>
    </div>
  );
}

"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import { Toast } from "@/components/Common/Toast";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    setBusy(true);
    try {
      await authService.login(email.trim(), password);
      if (remember) localStorage.setItem("vgk_remember_user", email.trim());
      else localStorage.removeItem("vgk_remember_user");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-shell">
      <form onSubmit={handleSubmit} className="login-card">
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div className="login-logo">VGK</div>
          <h1 style={{ color: "#0f172a", fontSize: 18, fontWeight: 700 }}>VGK Invoice Manager</h1>
          <p style={{ color: "#64748b", fontSize: 11.5, marginTop: 4 }}>V G K &amp; CO &middot; Surat</p>
        </div>

        {error && <Toast kind="err" message={error} />}

        <div className="login-field">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            aria-label="Email"
            autoFocus
            autoComplete="email"
          />
          <span className="icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </span>
        </div>

        <div className="login-field">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            aria-label="Password"
            autoComplete="current-password"
          />
          <span className="icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="10" width="16" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
          </span>
        </div>

        <label className="login-remember">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} style={{ width: "auto" }} />
          Remember me
        </label>

        <button type="submit" className="pill-btn" disabled={busy}>
          {busy ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}

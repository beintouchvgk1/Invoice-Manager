"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import { Toast } from "@/components/Common/Toast";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError("Username and password are required.");
      return;
    }
    setBusy(true);
    try {
      await authService.login(username.trim(), password);
      if (remember) localStorage.setItem("vgk_remember_user", username.trim());
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
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f4f6fa",
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="fc"
        style={{ width: 340, boxShadow: "0 2px 12px rgba(0,0,0,.12)" }}
      >
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <h1 style={{ color: "#1B3A6B", fontSize: 16, fontWeight: 700 }}>VGK Invoice Manager</h1>
          <p style={{ color: "#C8A84B", fontSize: 11, marginTop: 2 }}>V G K &amp; CO &middot; Surat</p>
        </div>
        {error && <Toast kind="err" message={error} />}
        <div className="fg" style={{ marginBottom: 10 }}>
          <label>Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            autoComplete="username"
          />
        </div>
        <div className="fg" style={{ marginBottom: 12 }}>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#555", marginBottom: 14 }}>
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} style={{ width: "auto" }} />
          Remember me
        </label>
        <button type="submit" className="btn bp" style={{ width: "100%" }} disabled={busy}>
          {busy ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}

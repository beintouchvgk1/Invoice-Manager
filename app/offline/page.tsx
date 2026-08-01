"use client";

// Served by public/sw.js when a navigation request fails offline and there's
// no cached copy of the page being requested — i.e. this exact page was never
// opened on this device while online. Deliberately outside app/(app) and
// app/login (no auth check, no sidebar) — this must render with zero network
// access and zero dependency on anything else having loaded first.
export default function OfflinePage() {
  return (
    <div className="login-shell">
      <div className="login-card" style={{ textAlign: "center" }}>
        <div className="login-logo" style={{ margin: "0 auto 16px" }}>VGK</div>
        <h1 style={{ color: "#0f172a", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
          You&apos;re offline
        </h1>
        <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.6, marginBottom: 18 }}>
          This page hasn&apos;t been opened on this device yet, so there&apos;s nothing saved for it to
          show offline. Connect to the internet once, open it, and it&apos;ll keep working offline after
          that.
        </p>
        <button type="button" className="pill-btn" onClick={() => window.location.reload()}>
          Try Again
        </button>
      </div>
    </div>
  );
}

"use client";
import { ReactNode } from "react";
import { useSidebarContext } from "@/components/Layout/SidebarContext";
import { SyncIndicator } from "@/components/Offline/SyncIndicator";

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function Header({ title, actions }: { title: string; actions?: ReactNode }) {
  const { openMobile } = useSidebarContext();

  return (
    <div id="tb">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button type="button" className="hamburger-btn" onClick={openMobile} aria-label="Open menu">
          <MenuIcon />
        </button>
        <h2 id="ttl">{title}</h2>
      </div>
      <div id="ta" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <SyncIndicator />
        {actions}
      </div>
    </div>
  );
}

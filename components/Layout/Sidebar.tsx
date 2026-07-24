"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import { useSidebarContext } from "@/components/Layout/SidebarContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ROLES } from "@/lib/constants";

function Icon({ path }: { path: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

function initialsFromEmail(email: string): string {
  const local = email.split("@")[0].replace(/[^a-zA-Z]/g, "");
  return (local.slice(0, 2) || "?").toUpperCase();
}

function humanizeRole(role: string): string {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const ICONS = {
  dashboard: "M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z",
  invoices: "M9 12h6M9 16h6M9 8h1M7 21h10a2 2 0 0 0 2-2V6.5L14.5 2H7a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2Z",
  clients: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  groups: "M4 20V8a2 2 0 0 1 2-2h3l2-2h2l2 2h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z",
  payments: "M2 8h20M2 8v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2M6 16h4",
  reports: "M4 19h16M6 19V9m6 10V5m6 14v-7",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-3a8 8 0 0 0-.15-1.55l2-1.55-2-3.46-2.36.95a7.97 7.97 0 0 0-2.68-1.55L16.4 2h-4l-.4 2.84a7.97 7.97 0 0 0-2.69 1.55L6.95 5.44l-2 3.46 2 1.55a8.14 8.14 0 0 0 0 3.1l-2 1.55 2 3.46 2.36-.95c.79.68 1.7 1.2 2.69 1.55L12.4 22h4l.4-2.84c.98-.35 1.9-.87 2.68-1.55l2.36.95 2-3.46-2-1.55c.1-.51.16-1.03.16-1.55Z",
  roles: "M12 2 3 6v6c0 5 3.5 8.5 9 10 5.5-1.5 9-5 9-10V6l-9-4Zm0 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 8c2.2 0 6.5 1.1 6.5 3.3V19H5.5v-1.7C5.5 15.1 9.8 14 12 14Z",
  users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  collapseLeft: "M11 19l-7-7 7-7M19 19l-7-7 7-7",
  collapseRight: "M13 5l7 7-7 7M5 5l7 7-7 7",
  close: "M18 6 6 18M6 6l12 12",
};

const NAV = [
  { id: "da", href: "/dashboard", icon: ICONS.dashboard, label: "Dashboard" },
  { id: "iv", href: "/invoices", icon: ICONS.invoices, label: "Invoices" },
  { id: "cl", href: "/customers", icon: ICONS.clients, label: "Clients" },
  { id: "gr", href: "/groups", icon: ICONS.groups, label: "Groups" },
  { id: "py", href: "/payments", icon: ICONS.payments, label: "Payments" },
  { id: "rp", href: "/reports", icon: ICONS.reports, label: "Reports" },
  { id: "st", href: "/settings", icon: ICONS.settings, label: "Settings" },
];

const SUPER_ADMIN_NAV = [
  { id: "rl", href: "/roles", icon: ICONS.roles, label: "Roles" },
  { id: "us", href: "/users", icon: ICONS.users, label: "Users" },
];

const COLLAPSE_KEY = "vgk_sidebar_collapsed";
const MOBILE_QUERY = "(max-width: 1024px)";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { mobileOpen, closeMobile } = useSidebarContext();
  const { email, role } = useCurrentUser();
  const nav = role === ROLES.SUPER_ADMIN ? [...NAV, ...SUPER_ADMIN_NAV] : NAV;

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    const mq = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!isMobile) closeMobile();
  }, [isMobile, closeMobile]);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

  async function handleLogout() {
    await authService.logout().catch(() => {});
    router.push("/login");
    router.refresh();
  }

  // On mobile the drawer always shows full labels; the rail-collapse preference only applies on desktop.
  const railCollapsed = !isMobile && collapsed;

  return (
    <>
      <div
        className={`sidebar-backdrop${isMobile && mobileOpen ? " show" : ""}`}
        onClick={closeMobile}
        aria-hidden="true"
      />
      <div id="sb" className={[railCollapsed ? "collapsed" : "", isMobile && mobileOpen ? "mobile-open" : ""].filter(Boolean).join(" ")}>
        <div className="br1">
          <div className="logo-badge">VGK</div>
          {!railCollapsed && (
            <div>
              <h1>Invoice Manager</h1>
              <p>V G K &amp; CO &middot; Surat</p>
            </div>
          )}
          {isMobile && (
            <button type="button" className="sidebar-close" onClick={closeMobile} aria-label="Close menu">
              <Icon path={ICONS.close} />
            </button>
          )}
        </div>
        <nav>
          {nav.map((item) => (
            <Link
              key={item.id}
              id={`n-${item.id}`}
              href={item.href}
              className={pathname.startsWith(item.href) ? "active" : ""}
              title={railCollapsed ? item.label : undefined}
              onClick={closeMobile}
            >
              <Icon path={item.icon} />
              {!railCollapsed && item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          {!isMobile && (
            <button type="button" className="collapse-toggle" onClick={toggleCollapsed} title={collapsed ? "Expand" : undefined}>
              <Icon path={collapsed ? ICONS.collapseRight : ICONS.collapseLeft} />
              {!collapsed && "Collapse"}
            </button>
          )}
          {email && (
            <div className="sidebar-user">
              <div className="sidebar-user-avatar">{initialsFromEmail(email)}</div>
              {!railCollapsed && (
                <div className="sidebar-user-info">
                  <div className="sidebar-user-email" title={email}>{email}</div>
                  <div className="sidebar-user-role">{role ? humanizeRole(role) : ""}</div>
                </div>
              )}
              <button type="button" className="sidebar-user-logout" onClick={handleLogout} title="Logout" aria-label="Logout">
                <Icon path={ICONS.logout} />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

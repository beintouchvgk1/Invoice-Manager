"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import { useSidebarContext } from "@/components/Layout/SidebarContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { ConfirmModal } from "@/components/Common/ConfirmModal";
import { wipeOfflineCache } from "@/lib/offline/db";

function Icon({ path }: { path: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

// Bg_26: prefer the user's actual name — initials from "Smit Gajera" read as
// "SG", which is far more recognizable than initials off an email local-part.
// Falls back to the email for accounts created before name existed.
function initialsFor(name: string | null, email: string): string {
  if (name?.trim()) {
    const words = name.trim().split(/\s+/);
    return ((words[0]?.[0] || "") + (words[1]?.[0] || "")).toUpperCase();
  }
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
  chevronDown: "M6 9l6 6 6-6",
};

// Same nav items, same hrefs/icons/permissions as before — only grouped under
// section headings now. A heading is presentational: it isn't a link and has no
// permission of its own; it's hidden whenever every item beneath it is (see the
// render below), so a limited role never sees an empty "Administration" label.
const NAV_GROUPS = [
  {
    id: "home",
    label: "Home",
    items: [{ id: "da", href: "/dashboard", icon: ICONS.dashboard, label: "Dashboard", perm: "dashboard.view" }],
  },
  {
    id: "task",
    label: "Task",
    items: [
      { id: "iv", href: "/invoices", icon: ICONS.invoices, label: "Invoices", perm: "invoices.view" },
      { id: "cl", href: "/customers", icon: ICONS.clients, label: "Clients", perm: "customers.view" },
      { id: "gr", href: "/groups", icon: ICONS.groups, label: "Groups", perm: "groups.view" },
      { id: "py", href: "/payments", icon: ICONS.payments, label: "Payments", perm: "payments.view" },
      { id: "rp", href: "/reports", icon: ICONS.reports, label: "Reports", perm: "reports.view" },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    items: [
      { id: "us", href: "/users", icon: ICONS.users, label: "Users", perm: "users.view" },
      { id: "rl", href: "/roles", icon: ICONS.roles, label: "Roles & Permissions", perm: "roles.view" },
      { id: "st", href: "/settings", icon: ICONS.settings, label: "Settings", perm: "settings.view" },
    ],
  },
];

const COLLAPSE_KEY = "vgk_sidebar_collapsed";
// Which nav groups are expanded, remembered across visits like the rail
// preference above. Stored as the list of COLLAPSED group ids so a brand-new
// user (and the server render) starts with everything open.
const NAV_GROUPS_KEY = "vgk_sidebar_closed_groups";
const MOBILE_QUERY = "(max-width: 1024px)";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { mobileOpen, closeMobile } = useSidebarContext();
  const { name, email, role, can } = useCurrentUser();
  const online = useOnlineStatus();
  const { pendingCount, conflictCount, failedCount } = useSyncStatus();
  const unsyncedCount = pendingCount + conflictCount + failedCount;
  const [showLogoutWarning, setShowLogoutWarning] = useState(false);
  // Starts empty (= everything expanded) so the server render and the first
  // client render agree; the saved preference is applied in an effect below,
  // same approach as the rail-collapse state above.
  const [closedGroups, setClosedGroups] = useState<string[]>([]);
  // Filter items by permission exactly as before, then drop any group left with
  // nothing in it so its heading doesn't hang there on its own.
  const navGroups = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((item) => can(item.perm)) })).filter(
    (g) => g.items.length > 0
  );

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    try {
      const saved = JSON.parse(localStorage.getItem(NAV_GROUPS_KEY) || "[]");
      if (Array.isArray(saved)) setClosedGroups(saved.filter((v): v is string => typeof v === "string"));
    } catch {
      /* corrupt/absent value — just leave every group expanded */
    }
    const mq = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!isMobile) closeMobile();
  }, [isMobile, closeMobile]);

  // Opens whichever group owns the page being viewed. Keyed on pathname only —
  // deliberately NOT on closedGroups, so collapsing the group you're currently
  // in stays collapsed instead of instantly springing back open. It reopens on
  // the next navigation into that group (e.g. arriving by URL or redirect,
  // which is the only way to reach a link inside a collapsed group).
  useEffect(() => {
    const owner = NAV_GROUPS.find((g) => g.items.some((i) => pathname.startsWith(i.href)));
    if (!owner) return;
    setClosedGroups((prev) => {
      if (!prev.includes(owner.id)) return prev;
      const next = prev.filter((id) => id !== owner.id);
      localStorage.setItem(NAV_GROUPS_KEY, JSON.stringify(next));
      return next;
    });
  }, [pathname]);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

  function toggleGroup(groupId: string) {
    setClosedGroups((prev) => {
      const next = prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId];
      localStorage.setItem(NAV_GROUPS_KEY, JSON.stringify(next));
      return next;
    });
  }

  // Logging out deliberately wipes the offline cache (a stale financial
  // snapshot must not outlive the session) — but that also destroys anything
  // still queued and unsynced, permanently and silently. Warn first when
  // there's unsynced work; with a clean queue this is unchanged from before.
  async function doLogout() {
    await authService.logout().catch(() => {});
    await wipeOfflineCache().catch(() => {});
    router.push("/login");
    router.refresh();
  }

  function handleLogout() {
    if (unsyncedCount > 0) {
      setShowLogoutWarning(true);
      return;
    }
    void doLogout();
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
          <div className="logo-badge">
            VGK
            <span className={`conn-dot${online ? "" : " offline"}`} title={online ? "Online" : "Offline"} />
          </div>
          {!railCollapsed && (
            <div style={{ minWidth: 0 }}>
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
          {navGroups.map((group) => {
            // On the icon-only rail the headings are hidden, so there's no way
            // to expand a group — always show every item there, otherwise its
            // links would be unreachable until the sidebar is expanded again.
            const isOpen = railCollapsed || !closedGroups.includes(group.id);
            return (
              <div className="nav-group" key={group.id}>
                {!railCollapsed && (
                  <button
                    type="button"
                    className="nav-group-label"
                    aria-expanded={isOpen}
                    aria-controls={`nav-group-${group.id}`}
                    onClick={() => toggleGroup(group.id)}
                  >
                    <span>{group.label}</span>
                    <span className={`nav-group-chevron${isOpen ? " open" : ""}`}>
                      <Icon path={ICONS.chevronDown} />
                    </span>
                  </button>
                )}
                {isOpen && (
                  <div id={`nav-group-${group.id}`} className="nav-group-items">
                    {group.items.map((item) => (
                      <Link
                        key={item.id}
                        id={`n-${item.id}`}
                        href={item.href}
                        className={pathname.startsWith(item.href) ? "active" : ""}
                        title={railCollapsed ? item.label : undefined}
                        onClick={closeMobile}
                      >
                        <Icon path={item.icon} />
                        {!railCollapsed && <span className="nav-label">{item.label}</span>}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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
              <div className="sidebar-user-avatar">{initialsFor(name, email)}</div>
              {!railCollapsed && (
                <div className="sidebar-user-info">
                  {/* Bg_26: show who the person is, not their login address.
                      Email stays as the tooltip so it's still reachable. */}
                  <div className="sidebar-user-email" title={email}>{name?.trim() || email}</div>
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

      {/* Only mounted while actually warning — otherwise its message sits in the
          DOM reading "0 changes", which screen readers would announce. */}
      {showLogoutWarning && (
      <ConfirmModal
        open={showLogoutWarning}
        title="Unsaved Changes Will Be Lost"
        message={
          `You have ${unsyncedCount} change${unsyncedCount === 1 ? "" : "s"} saved on this device that ` +
          `${unsyncedCount === 1 ? "hasn't" : "haven't"} been sent to the server yet. Logging out erases ` +
          `${unsyncedCount === 1 ? "it" : "them"} permanently. Reconnect to the internet and let ` +
          `${unsyncedCount === 1 ? "it" : "them"} finish syncing first if you want to keep ` +
          `${unsyncedCount === 1 ? "it" : "them"}.`
        }
        confirmLabel="Log Out & Discard"
        cancelLabel="Stay Logged In"
        destructive
        onConfirm={() => {
          setShowLogoutWarning(false);
          void doLogout();
        }}
        onCancel={() => setShowLogoutWarning(false)}
      />
      )}
    </>
  );
}

"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";

function Icon({ path }: { path: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
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
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
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

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await authService.logout().catch(() => {});
    router.push("/login");
    router.refresh();
  }

  return (
    <div id="sb">
      <div className="br1">
        <div className="logo-badge">VGK</div>
        <div>
          <h1>Invoice Manager</h1>
          <p>V G K &amp; CO &middot; Surat</p>
        </div>
      </div>
      <nav>
        {NAV.map((item) => (
          <Link
            key={item.id}
            id={`n-${item.id}`}
            href={item.href}
            className={pathname.startsWith(item.href) ? "active" : ""}
          >
            <Icon path={item.icon} />
            {item.label}
          </Link>
        ))}
        <a className="logout" onClick={handleLogout}>
          <Icon path={ICONS.logout} />
          Logout
        </a>
      </nav>
      <div className="ver">V G K &amp; CO</div>
    </div>
  );
}

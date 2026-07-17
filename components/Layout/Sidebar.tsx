"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";

const NAV = [
  { id: "da", href: "/dashboard", icon: "\u{1F4CA}", label: "Dashboard" },
  { id: "iv", href: "/invoices", icon: "\u{1F4C4}", label: "Invoices" },
  { id: "cl", href: "/customers", icon: "\u{1F465}", label: "Clients" },
  { id: "gr", href: "/groups", icon: "\u{1F4C1}", label: "Groups" },
  { id: "py", href: "/payments", icon: "\u{1F4B0}", label: "Payments" },
  { id: "rp", href: "/reports", icon: "\u{1F4CB}", label: "Reports" },
  { id: "st", href: "/settings", icon: "⚙", label: "Settings" },
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
        <h1>VGK Invoice Manager</h1>
        <p>V G K &amp; CO &middot; Surat</p>
      </div>
      <nav>
        {NAV.map((item) => (
          <Link
            key={item.id}
            id={`n-${item.id}`}
            href={item.href}
            className={pathname.startsWith(item.href) ? "active" : ""}
          >
            {item.icon} {item.label}
          </Link>
        ))}
        <a onClick={handleLogout}>&#x1F6AA; Logout</a>
      </nav>
      <div className="ver">V G K &amp; CO</div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type AdminMenuItem = {
  label: string;
  href: string;
  glyph: string;
};

export const adminMenuItems: AdminMenuItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", glyph: "▣" },
  { label: "Monitoring", href: "/admin/monitoring", glyph: "⌁" },
  { label: "Exam Management", href: "/admin/exam-management", glyph: "▤" },
  { label: "Question Bank", href: "/admin/question-bank", glyph: "▥" },
  { label: "Reports", href: "/admin/reports", glyph: "▥" },
  { label: "Users and Roles", href: "/admin/users-and-roles", glyph: "♙" },
  { label: "Kesan dan Pesan", href: "/admin/kesan-pesan", glyph: "✦" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="admin-dashboard-sidebar">
      <div className="admin-dashboard-sidebar-title">Dashboard<br />Admin</div>
      <nav aria-label="Admin menu" className="admin-dashboard-nav">
        {adminMenuItems.map((item) => (
          <Link className={`admin-dashboard-nav-link ${pathname === item.href ? "active" : ""}`} href={item.href} key={item.href}>
            <span aria-hidden="true" className="admin-dashboard-nav-glyph">{item.glyph}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="admin-dashboard-account"><strong>PROG</strong><span>superadmin</span></div>
    </aside>
  );
}
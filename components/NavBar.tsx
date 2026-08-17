"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/projects", label: "Projects" },
  { href: "/ball-view", label: "Ball View" },
  { href: "/reports", label: "Reports" },
  { href: "/directory", label: "Directory" },
  { href: "/admin", label: "Admin" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-xs)",
        padding: "0 var(--space-lg)",
        height: "44px",
        backgroundColor: "var(--ink-primary)",
        color: "var(--ink-on-dark)",
        fontSize: "13px",
        fontFamily: "var(--font-sans)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <span
        style={{
          fontWeight: 750,
          fontSize: "14px",
          marginRight: "var(--space-lg)",
          letterSpacing: "0.02em",
        }}
      >
        ITSD Tracker
      </span>
      {navItems.map((item) => {
        const isActive = item.href === "/"
          ? pathname === "/"
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              padding: "6px 10px",
              borderRadius: "var(--radius-md)",
              textDecoration: "none",
              color: isActive ? "#FFFFFF" : "var(--ink-tertiary)",
              backgroundColor: isActive ? "rgba(255,255,255,0.1)" : "transparent",
              fontSize: "13px",
              transition: "background-color 0.15s",
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)";
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

const navItems = [
  { id: "dashboard", label: "Admin Dashboard", href: "/admin-dashboard/dashboard", icon: (
      <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <rect x="12" y="2" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <rect x="2" y="12" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <rect x="12" y="12" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </svg>
    ) },
  { id: "explore", label: "Explore", href: "/admin-dashboard/explore", icon: (
      <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M10 2V6M10 14V18M2 10H6M14 10H18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ) },
  { id: "dictionary", label: "Dictionary", href: "/admin-dashboard/dictionary", icon: (
      <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 5H17V17H3V5Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M7 5V17M11 5V17" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 9H17M3 13H17" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ) },
  { id: "schedule", label: "Schedule", href: "/admin-dashboard/schedule", icon: (
      <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="4" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M7 2V6M13 2V6M3 10H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ) },
  { id: "settings", label: "Settings", href: "/admin-dashboard/settings", icon: (
      <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="2" fill="currentColor" />
        <path d="M10 0V3M10 17V20M0 10H3M17 10H20M2.34 2.34L4.46 4.46M15.54 15.54L17.66 17.66M17.66 2.34L15.54 4.46M4.46 15.54L2.34 17.66" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ) },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const isActive = (path: string) => pathname === path;

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      console.error("Sign out error:", error);
      setIsSigningOut(false);
    }
  };

  return (
    <aside className="admin-sidebar">
      <nav className="admin-sidebar__nav">
        {navItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`admin-sidebar__item ${isActive(item.href) ? "active" : ""}`}
          >
            <span className="admin-sidebar__icon">{item.icon}</span>
            <span className="admin-sidebar__label">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="admin-sidebar__footer">
        <button
          className="admin-sidebar__logout"
          onClick={handleSignOut}
          disabled={isSigningOut}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 16H4C3.44772 16 3 15.5523 3 15V5C3 4.44772 3.44772 4 4 4H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M13 14L17 10L13 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M17 10H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}


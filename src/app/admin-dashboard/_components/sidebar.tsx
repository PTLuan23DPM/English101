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
  { id: "users", label: "Quản Lý Người Dùng", href: "/admin-dashboard/users", icon: (
      <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M13 16V14C13 12.9391 12.5786 11.9217 11.8284 11.1716C11.0783 10.4214 10.0609 10 9 10H5C3.93913 10 2.92172 10.4214 2.17157 11.1716C1.42143 11.9217 1 12.9391 1 14V16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M7 8C9.20914 8 11 6.20914 11 4C11 1.79086 9.20914 0 7 0C4.79086 0 3 1.79086 3 4C3 6.20914 4.79086 8 7 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M19 16V14C18.9993 13.1137 18.7044 12.2528 18.1614 11.5523C17.6184 10.8519 16.8581 10.3516 16 10.13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M13 3.13C13.8604 3.35031 14.623 3.85071 15.1676 4.55232C15.7122 5.25392 16.0078 6.11683 16.0078 7.005C16.0078 7.89318 15.7122 8.75608 15.1676 9.45769C14.623 10.1593 13.8604 10.6597 13 10.88" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ) },
  { id: "content", label: "Quản Lý Nội Dung", href: "/admin-dashboard/content", icon: (
      <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 5H17V17H3V5Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <path d="M7 5V17M13 5V17" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M3 9H17M3 13H17" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ) },
  { id: "courses", label: "Quản Lý Khóa Học", href: "/admin-dashboard/courses", icon: (
      <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 6C2 4.89543 2.89543 4 4 4H16C17.1046 4 18 4.89543 18 6V16C18 17.1046 17.1046 18 16 18H4C2.89543 18 2 17.1046 2 16V6Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <path d="M2 8H18M6 4V8M14 4V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M6 12H14M6 15H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ) },
  { id: "analytics", label: "Thống Kê & Báo Cáo", href: "/admin-dashboard/analytics", icon: (
      <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 17V7M10 17V3M17 17V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="3" cy="7" r="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <circle cx="10" cy="3" r="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <circle cx="17" cy="11" r="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      </svg>
    ) },
  { id: "feedback", label: "Feedback & Support", href: "/admin-dashboard/feedback", icon: (
      <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 11.6569 2.67157 13.1569 3.75736 14.2426L2 18L5.75736 16.2426C6.84315 17.3284 8.34315 18 10 18Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M7 8H13M7 12H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
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


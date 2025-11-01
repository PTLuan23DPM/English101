"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import LanguageSelector from "@/components/LanguageSelector";

const PAGE_TITLES: Record<string, string> = {
  "/english/dashboard": "Dashboard",
  "/english/listening": "Listening Practice",
  "/english/reading": "Reading Practice",
  "/english/writing": "Writing Practice",
  "/english/speaking": "Speaking Practice",
  "/english/support": "Support & Help",
  "/english/profile": "Profile Settings",
  "/english/progress": "My Progress",
  "/english/goals": "Goals & Targets",
  "/english/settings": "Settings",
};

export default function DashboardHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [streak, setStreak] = useState(7); // TODO: Fetch from API
  const menuRef = useRef<HTMLDivElement>(null);

  const pageTitle = PAGE_TITLES[pathname] || "English101";

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <h1 className="page-title">{pageTitle}</h1>
      </div>
      
      <div className="header-right">
        {/* Language Selector */}
        <LanguageSelector />
        
        {/* Streak Display */}
        <div className="streak-badge" title="Current learning streak">
          <svg className="streak-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2L13 8L19 9L14.5 13.5L15.5 19.5L10 16.5L4.5 19.5L5.5 13.5L1 9L7 8L10 2Z" fill="currentColor"/>
          </svg>
          <span className="streak-count">{streak}</span>
          <span className="streak-text">days</span>
        </div>

        {/* Notifications */}
        <button className="header-action-btn" aria-label="Notifications">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2C6.68629 2 4 4.68629 4 8V11.5858L2.29289 13.2929C2.10536 13.4804 2 13.7348 2 14V16C2 16.5523 2.44772 17 3 17H17C17.5523 17 18 16.5523 18 16V14C18 13.7348 17.8946 13.4804 17.7071 13.2929L16 11.5858V8C16 4.68629 13.3137 2 10 2Z" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 17C8 18.1046 8.89543 19 10 19C11.1046 19 12 18.1046 12 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span className="notification-badge">3</span>
        </button>

        {/* User Menu */}
        <div className="user-menu-wrapper" ref={menuRef}>
          <button
            className="user-avatar-btn"
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-label="User menu"
          >
            {session?.user?.image ? (
              <img src={session.user.image} alt={session.user.name || "User"} />
            ) : (
              <div className="avatar-placeholder">
                {session?.user?.name?.charAt(0).toUpperCase() || "U"}
              </div>
            )}
          </button>

          {showUserMenu && (
            <div className="user-dropdown">
              <div className="user-dropdown-header">
                <div className="user-dropdown-avatar">
                  {session?.user?.image ? (
                    <img src={session.user.image} alt={session.user.name || "User"} />
                  ) : (
                    <div className="avatar-placeholder">
                      {session?.user?.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                  )}
                </div>
                <div className="user-dropdown-info">
                  <div className="user-dropdown-name">{session?.user?.name || "User"}</div>
                  <div className="user-dropdown-email">{session?.user?.email}</div>
                </div>
              </div>

              <div className="user-dropdown-divider" />

              <div className="user-dropdown-menu">
                <Link 
                  href="/english/profile" 
                  className="user-dropdown-item"
                  onClick={() => setShowUserMenu(false)}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 8C10.2091 8 12 6.20914 12 4C12 1.79086 10.2091 0 8 0C5.79086 0 4 1.79086 4 4C4 6.20914 5.79086 8 8 8Z" fill="currentColor"/>
                    <path d="M8 10C3.58172 10 0 11.7909 0 14V16H16V14C16 11.7909 12.4183 10 8 10Z" fill="currentColor"/>
                  </svg>
                  <span>Profile Settings</span>
                </Link>
                <Link 
                  href="/english/progress" 
                  className="user-dropdown-item"
                  onClick={() => setShowUserMenu(false)}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 2H14V14H2V2Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <path d="M5 6L8 9L11 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <span>My Progress</span>
                </Link>
                <Link 
                  href="/english/goals" 
                  className="user-dropdown-item"
                  onClick={() => setShowUserMenu(false)}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <path d="M8 4V8L11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <span>Goals & Targets</span>
                </Link>
                <Link 
                  href="/english/settings" 
                  className="user-dropdown-item"
                  onClick={() => setShowUserMenu(false)}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="2" fill="currentColor"/>
                    <path d="M8 0V3M8 13V16M0 8H3M13 8H16M2.34 2.34L4.46 4.46M11.54 11.54L13.66 13.66M13.66 2.34L11.54 4.46M4.46 11.54L2.34 13.66" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                  <span>Settings</span>
                </Link>
              </div>

              <div className="user-dropdown-divider" />

              <button
                className="user-dropdown-item danger"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 14H3C2.44772 14 2 13.5523 2 13V3C2 2.44772 2.44772 2 3 2H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M11 11L14 8L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

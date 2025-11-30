"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

const navItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/english/dashboard",
    icon: (
      <svg viewBox="0 0 20 20" fill="none">
        <rect x="2" y="2" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="12" y="2" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="2" y="12" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="12" y="12" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
];

const coreSkills = [
  {
    id: "listening",
    label: "Listening",
    href: "/english/listening",
    icon: (
      <svg viewBox="0 0 20 20" fill="none">
        <path d="M10 1C5 1 1 5 1 10C1 15 5 19 10 19C15 19 19 15 19 10C19 5 15 1 10 1Z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 5V10L13 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "reading",
    label: "Reading",
    href: "/english/reading",
    icon: (
      <svg viewBox="0 0 20 20" fill="none">
        <path d="M3 16C3 15.4 3.2 14.8 3.6 14.4C4 14 4.6 13.8 5.2 13.8H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M5.2 1H16V18H5.2C4.6 18 4 17.8 3.6 17.4C3.2 17 3 16.4 3 15.8V3.2C3 2.6 3.2 2 3.6 1.6C4 1.2 4.6 1 5.2 1Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "writing",
    label: "Writing",
    href: "/english/writing",
    icon: (
      <svg viewBox="0 0 20 20" fill="none">
        <path d="M9 3H3C2.4 3 2 3.4 2 4V16C2 16.6 2.4 17 3 17H15C15.6 17 16 16.6 16 16V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M15 2L13 4L17 8L19 6C19.4 5.6 19.4 4.8 19 4.4L17.6 3C17.2 2.6 16.4 2.6 16 3L15 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M13 4L8 9L7 13L11 12L17 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "speaking",
    label: "Speaking",
    href: "/english/speaking",
    icon: (
      <svg viewBox="0 0 20 20" fill="none">
        <path d="M10 1V14M7 14H13M6 6C6 3.5 8 2 10 2C12 2 14 3.5 14 6C14 8.5 12 10 10 10M10 10C8 10 6 8.5 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

const advanced = [
  {
    id: "grammar",
    label: "Grammar",
    href: "/english/grammar",
    icon: (
      <svg viewBox="0 0 20 20" fill="none">
        <path d="M4 7H16M4 11H16M4 15H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M2 4H18V16H2V4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "vocabulary",
    label: "Vocabulary",
    href: "/english/vocabulary",
    icon: (
      <svg viewBox="0 0 20 20" fill="none">
        <path d="M7 2H17V18H7C5.9 18 5 17.1 5 16V4C5 2.9 5.9 2 7 2Z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 8H3M5 12H3M5 16H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

const evaluation = [
  {
    id: "test",
    label: "Test",
    href: "/english/test",
    icon: (
      <svg viewBox="0 0 20 20" fill="none">
        <path d="M4 3H16V17H4V3Z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 7H13M7 10H13M7 13H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M12 13L13 14L15 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

const account = [
  {
    id: "notifications",
    label: "Notifications",
    href: "/english/notifications",
    icon: (
      <svg viewBox="0 0 20 20" fill="none">
        <path d="M10 2C6.68629 2 4 4.68629 4 8V11.5858L2.29289 13.2929C2.10536 13.4804 2 13.7348 2 14V16C2 16.5523 2.44772 17 3 17H17C17.5523 17 18 16.5523 18 16V14C18 13.7348 17.8946 13.4804 17.7071 13.2929L16 11.5858V8C16 4.68629 13.3137 2 10 2Z" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    id: "profile",
    label: "Profile Settings",
    href: "/english/profile",
    icon: (
      <svg viewBox="0 0 20 20" fill="none">
        <path d="M10 10C12.7614 10 15 7.76142 15 5C15 2.23858 12.7614 0 10 0C7.23858 0 5 2.23858 5 5C5 7.76142 7.23858 10 10 10Z" fill="currentColor"/>
        <path d="M10 12C5.58172 12 2 14.7909 2 18V20H18V18C18 14.7909 14.4183 12 10 12Z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: "progress",
    label: "My Progress",
    href: "/english/progress",
    icon: (
      <svg viewBox="0 0 20 20" fill="none">
        <path d="M2 10H18V18H2V10Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <path d="M5 6L8 9L11 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      </svg>
    ),
  },
  {
    id: "reports",
    label: "Reports",
    href: "/english/reports",
    icon: (
      <svg viewBox="0 0 20 20" fill="none">
        <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <path d="M7 7H13M7 10H13M7 13H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "goals",
    label: "Goals & Targets",
    href: "/english/goals",
    icon: (
      <svg viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <path d="M10 4V10L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      </svg>
    ),
  },
  {
    id: "settings",
    label: "Settings",
    href: "/english/settings",
    icon: (
      <svg viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="2" fill="currentColor"/>
        <path d="M10 0V3M10 17V20M0 10H3M17 10H20M2.34 2.34L4.46 4.46M15.54 15.54L17.66 17.66M17.66 2.34L15.54 4.46M4.46 15.54L2.34 17.66" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

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
    <aside className={`sidebar-v2 ${isMinimized ? "minimized" : ""}`}>
      {/* Logo + Toggle */}
      <div className="sidebar-v2__header">
        <Link 
          href="/english/dashboard" 
          className="sidebar-v2__logo"
          onClick={(e) => {
            // If already on dashboard, prevent navigation and just scroll
            if (pathname === "/english/dashboard") {
              e.preventDefault();
              window.scrollTo(0, 0);
              document.documentElement.scrollTop = 0;
              document.body.scrollTop = 0;
            }
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
            <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {!isMinimized && <span>English101</span>}
        </Link>
        <button 
          className="sidebar-v2__toggle" 
          onClick={() => setIsMinimized(!isMinimized)}
          aria-label={isMinimized ? "Expand sidebar" : "Minimize sidebar"}
        >
          <svg viewBox="0 0 24 24" fill="none">
            <path d={isMinimized ? "M9 18L15 12L9 6" : "M15 18L9 12L15 6"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-v2__nav">
        {/* Dashboard */}
        {navItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`sidebar-v2__item ${isActive(item.href) ? "active" : ""}`}
            title={isMinimized ? item.label : undefined}
            onClick={(e) => {
              // Scroll to top when navigating to dashboard
              if (item.href === "/english/dashboard" && pathname === "/english/dashboard") {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'instant' });
                document.documentElement.scrollTop = 0;
                document.body.scrollTop = 0;
              }
            }}
          >
            <span className="sidebar-v2__icon">{item.icon}</span>
            {!isMinimized && <span className="sidebar-v2__label">{item.label}</span>}
          </Link>
        ))}

        {/* Core Skills */}
        <div className="sidebar-v2__section">
          {!isMinimized && <div className="sidebar-v2__section-title">Core Skills</div>}
          {coreSkills.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`sidebar-v2__item ${isActive(item.href) ? "active" : ""}`}
              title={isMinimized ? item.label : undefined}
            >
              <span className="sidebar-v2__icon">{item.icon}</span>
              {!isMinimized && <span className="sidebar-v2__label">{item.label}</span>}
            </Link>
          ))}
        </div>

        {/* Advanced */}
        <div className="sidebar-v2__section">
          {!isMinimized && <div className="sidebar-v2__section-title">Advanced</div>}
          {advanced.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`sidebar-v2__item ${isActive(item.href) ? "active" : ""}`}
              title={isMinimized ? item.label : undefined}
            >
              <span className="sidebar-v2__icon">{item.icon}</span>
              {!isMinimized && <span className="sidebar-v2__label">{item.label}</span>}
            </Link>
          ))}
        </div>

        {/* Evaluation */}
        <div className="sidebar-v2__section">
          {!isMinimized && <div className="sidebar-v2__section-title">Evaluation</div>}
          {evaluation.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`sidebar-v2__item ${isActive(item.href) ? "active" : ""}`}
              title={isMinimized ? item.label : undefined}
            >
              <span className="sidebar-v2__icon">{item.icon}</span>
              {!isMinimized && <span className="sidebar-v2__label">{item.label}</span>}
            </Link>
          ))}
        </div>

        {/* Account */}
        <div className="sidebar-v2__section">
          {!isMinimized && <div className="sidebar-v2__section-title">Account</div>}
          {account.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`sidebar-v2__item ${isActive(item.href) ? "active" : ""}`}
              title={isMinimized ? item.label : undefined}
            >
              <span className="sidebar-v2__icon">{item.icon}</span>
              {!isMinimized && <span className="sidebar-v2__label">{item.label}</span>}
            </Link>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="sidebar-v2__footer">
        {status === "loading" ? (
          <div className="sidebar-v2__user-card">
            <div className="sidebar-v2__user-avatar">
              <span>...</span>
            </div>
            {!isMinimized && (
              <div className="sidebar-v2__user-info">
                <div className="sidebar-v2__user-name">Loading...</div>
                <div className="sidebar-v2__user-email">Please wait</div>
              </div>
            )}
          </div>
        ) : session ? (
          <>
            <div className="sidebar-v2__user-card">
              <div className="sidebar-v2__user-avatar">
                {session.user?.image ? (
                  <img src={session.user.image} alt={session.user?.name || "User"} />
                ) : (
                  <span>{session.user?.name?.charAt(0).toUpperCase() || "U"}</span>
                )}
              </div>
              {!isMinimized && (
                <div className="sidebar-v2__user-info">
                  <div className="sidebar-v2__user-name">{session.user?.name || "User"}</div>
                  <div className="sidebar-v2__user-email">{session.user?.email || "No email"}</div>
                </div>
              )}
            </div>
            {!isMinimized && (
              <button
                className="sidebar-v2__signout"
                onClick={handleSignOut}
                disabled={isSigningOut}
                title="Sign out"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 14H3C2.44772 14 2 13.5523 2 13V3C2 2.44772 2.44772 2 3 2H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M11 11L14 8L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {isSigningOut ? "Signing out..." : "Sign Out"}
              </button>
            )}
          </>
        ) : (
          <div className="sidebar-v2__user-card">
            <div className="sidebar-v2__user-avatar">
              <span>?</span>
            </div>
            {!isMinimized && (
              <div className="sidebar-v2__user-info">
                <div className="sidebar-v2__user-name">Not signed in</div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

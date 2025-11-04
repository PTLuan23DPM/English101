"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";

export default function AdminHeader() {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <header className="admin-header">
      <div className="admin-header__left">
        <button className="admin-header__nav-btn" aria-label="Previous">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 4L7 10L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button className="admin-header__nav-btn" aria-label="Next">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M8 4L13 10L8 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="admin-header__search">
          <svg className="admin-header__search-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <path d="M13 13L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="admin-header__search-input"
          />
        </div>
      </div>

      <div className="admin-header__right">
        <button className="admin-header__action-btn" aria-label="Menu">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="3" y="5" width="14" height="2" rx="1" fill="currentColor" />
            <rect x="3" y="9" width="14" height="2" rx="1" fill="currentColor" />
            <rect x="3" y="13" width="14" height="2" rx="1" fill="currentColor" />
          </svg>
        </button>
        <button className="admin-header__action-btn" aria-label="Notifications">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2C6.68629 2 4 4.68629 4 8V11.5858L2.29289 13.2929C2.10536 13.4804 2 13.7348 2 14V16C2 16.5523 2.44772 17 3 17H17C17.5523 17 18 16.5523 18 16V14C18 13.7348 17.8946 13.4804 17.7071 13.2929L16 11.5858V8C16 4.68629 13.3137 2 10 2Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </button>
        <div className="admin-header__avatar">
          {session?.user?.image ? (
            <img src={session.user.image} alt={session.user?.name || "Admin"} />
          ) : (
            <div className="admin-header__avatar-placeholder">
              {session?.user?.name?.charAt(0).toUpperCase() || "A"}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}


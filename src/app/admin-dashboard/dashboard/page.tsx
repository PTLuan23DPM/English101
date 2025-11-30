"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface DashboardStats {
  totalUsers: number;
  totalLessons: number;
  totalVisits: number;
}

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/authentication/login");
      return;
    }
    if (session.user?.role !== "ADMIN") {
      router.push("/english/dashboard");
      return;
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session?.user?.role === "ADMIN") {
      fetchStats();
    }
  }, [session]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin-dashboard/stats");
      if (!response.ok) {
        throw new Error("Failed to fetch statistics");
      }
      const data = await response.json();
      if (data.success && data.stats) {
        setStats(data.stats);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Error fetching stats:", err);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="admin-loading">
        <div>Loading...</div>
      </div>
    );
  }

  if (!session || session.user?.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard__main">
        {/* Dashboard Overview Section */}
        <section className="admin-section">
          <div className="admin-section__header">
            <h2 className="admin-section__title">Dashboard Tổng Quan</h2>
          </div>
          {loading ? (
            <div className="stats-loading">
              <p>Đang tải dữ liệu...</p>
            </div>
          ) : error ? (
            <div className="stats-error">
              <p>Lỗi: {error}</p>
              <button onClick={fetchStats} className="retry-button">
                Thử lại
              </button>
            </div>
          ) : stats ? (
            <div className="stats-grid">
              <div className="stat-card stat-card--users">
                <div className="stat-card__icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="stat-card__content">
                  <h3 className="stat-card__label">Tổng Số User</h3>
                  <p className="stat-card__value">{stats.totalUsers.toLocaleString("vi-VN")}</p>
                </div>
              </div>

              <div className="stat-card stat-card--lessons">
                <div className="stat-card__icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 19.5C4 18.837 4.26339 18.2011 4.73223 17.7322C5.20107 17.2634 5.83696 17 6.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M6.5 2H20V22H6.5C5.83696 22 5.20107 21.7366 4.73223 21.2678C4.26339 20.7989 4 20.163 4 19.5V4.5C4 3.83696 4.26339 3.20107 4.73223 2.73223C5.20107 2.26339 5.83696 2 6.5 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 7H16M8 11H16M8 15H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="stat-card__content">
                  <h3 className="stat-card__label">Tổng Số Bài Học</h3>
                  <p className="stat-card__value">{stats.totalLessons.toLocaleString("vi-VN")}</p>
                </div>
              </div>

              <div className="stat-card stat-card--visits">
                <div className="stat-card__icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="stat-card__content">
                  <h3 className="stat-card__label">Lượt Truy Cập</h3>
                  <p className="stat-card__value">{stats.totalVisits.toLocaleString("vi-VN")}</p>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <section className="admin-section">
          <div className="admin-section__header">
            <h2 className="admin-section__title">Word Sets</h2>
          </div>
          <div className="word-sets-grid">
            <div className="word-set-card word-set-card--purple-teal"><h3 className="word-set-card__title">Books and Library</h3></div>
            <div className="word-set-card word-set-card--purple-blue"><h3 className="word-set-card__title">Countries and cities</h3></div>
            <div className="word-set-card word-set-card--blue-pink"><h3 className="word-set-card__title">What is o&apos;clock now?</h3></div>
          </div>
        </section>
        <section className="admin-section">
          <div className="admin-section__header"><h2 className="admin-section__title">Statistics</h2></div>
          <div className="statistics-card"><div className="statistics-chart" /></div>
        </section>
      </div>
      <aside className="admin-dashboard__sidebar">
        <div className="user-profile-card"><div className="user-profile-card__avatar"><div className="user-profile-card__avatar-placeholder">A</div></div><h3 className="user-profile-card__name">Admin User</h3><p className="user-profile-card__email">admin@example.com</p></div>
        <div className="quick-start-section"><h3 className="quick-start-section__title">Quick Start</h3></div>
      </aside>
    </div>
  );
}


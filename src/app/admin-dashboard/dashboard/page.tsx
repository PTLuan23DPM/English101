"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

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
      {/* Keep the same content as original admin dashboard */}
      <div className="admin-dashboard__main">
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


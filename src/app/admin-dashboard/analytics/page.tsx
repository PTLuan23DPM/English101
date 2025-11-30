"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NewUsersChart from "./_components/NewUsersChart";
import TopLearnersTable from "./_components/TopLearnersTable";

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
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
    setLoading(false);
  }, [session, status, router]);

  if (status === "loading" || loading) {
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
    <div className="analytics-page">
      <div className="analytics-header">
        <h1 className="analytics-title">Thống Kê & Báo Cáo</h1>
      </div>

      <div className="analytics-content">
        <section className="analytics-section">
          <div className="analytics-section-header">
            <h2 className="analytics-section-title">Lượng Người Dùng Mới Đăng Ký</h2>
          </div>
          <NewUsersChart />
        </section>

        <section className="analytics-section">
          <div className="analytics-section-header">
            <h2 className="analytics-section-title">Bảng Xếp Hạng Người Học Nổi Bật</h2>
          </div>
          <TopLearnersTable />
        </section>
      </div>
    </div>
  );
}


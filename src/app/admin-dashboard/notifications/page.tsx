"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AutomaticNotificationsManager from "./_components/AutomaticNotificationsManager";
import ManualNotificationsManager from "./_components/ManualNotificationsManager";

type NotificationTab = "AUTOMATIC" | "MANUAL";

export default function NotificationManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<NotificationTab>("AUTOMATIC");

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
    <div className="notification-management-page">
      <div className="notification-management-header">
        <h1 className="notification-management-title">Quản lí thông báo</h1>
      </div>

      <div className="notification-tabs" style={{ display: "flex", gap: "8px", marginBottom: "24px", borderBottom: "2px solid #e5e7eb" }}>
        <button
          className={`notification-tab ${activeTab === "AUTOMATIC" ? "active" : ""}`}
          onClick={() => setActiveTab("AUTOMATIC")}
          style={{
            padding: "12px 24px",
            border: "none",
            background: "none",
            cursor: "pointer",
            borderBottom: activeTab === "AUTOMATIC" ? "2px solid #8b5cf6" : "2px solid transparent",
            color: activeTab === "AUTOMATIC" ? "#8b5cf6" : "#6b7280",
            fontWeight: activeTab === "AUTOMATIC" ? 600 : 400,
            marginBottom: "-2px",
          }}
        >
          Thông Báo Tự Động
        </button>
        <button
          className={`notification-tab ${activeTab === "MANUAL" ? "active" : ""}`}
          onClick={() => setActiveTab("MANUAL")}
          style={{
            padding: "12px 24px",
            border: "none",
            background: "none",
            cursor: "pointer",
            borderBottom: activeTab === "MANUAL" ? "2px solid #8b5cf6" : "2px solid transparent",
            color: activeTab === "MANUAL" ? "#8b5cf6" : "#6b7280",
            fontWeight: activeTab === "MANUAL" ? 600 : 400,
            marginBottom: "-2px",
          }}
        >
          Thông Báo Thủ Công
        </button>
      </div>

      <div className="notification-content">
        {activeTab === "AUTOMATIC" ? (
          <AutomaticNotificationsManager />
        ) : (
          <ManualNotificationsManager />
        )}
      </div>
    </div>
  );
}


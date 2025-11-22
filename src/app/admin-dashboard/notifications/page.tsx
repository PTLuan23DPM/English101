"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SendNotificationModal from "./_components/SendNotificationModal";
import SentNotificationsList from "./_components/SentNotificationsList";

export default function NotificationManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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
        <button
          onClick={() => setShowNotificationModal(true)}
          className="btn btn-primary"
        >
          + Gửi Thông Báo Mới
        </button>
      </div>

      <div className="notification-content">
        <SentNotificationsList refreshKey={refreshKey} />
      </div>

      {showNotificationModal && (
        <SendNotificationModal
          onClose={() => setShowNotificationModal(false)}
          onSuccess={() => {
            setShowNotificationModal(false);
            // Refresh the notification list
            setRefreshKey((prev) => prev + 1);
          }}
        />
      )}
    </div>
  );
}


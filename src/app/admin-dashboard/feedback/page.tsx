"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FeedbackManager from "./_components/FeedbackManager";
import RatingsStats from "./_components/RatingsStats";
import SendNotificationModal from "./_components/SendNotificationModal";

export default function FeedbackSupportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"feedback" | "ratings" | "notifications">("feedback");
  const [showNotificationModal, setShowNotificationModal] = useState(false);

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
    <div className="feedback-support-page">
      <div className="feedback-support-header">
        <h1 className="feedback-support-title">Feedback & Support</h1>
        {activeTab === "notifications" && (
          <button
            onClick={() => setShowNotificationModal(true)}
            className="btn btn-primary"
          >
            + Gửi Thông Báo
          </button>
        )}
      </div>

      <div className="feedback-tabs">
        <button
          className={`feedback-tab ${activeTab === "feedback" ? "active" : ""}`}
          onClick={() => setActiveTab("feedback")}
        >
          Feedback
        </button>
        <button
          className={`feedback-tab ${activeTab === "ratings" ? "active" : ""}`}
          onClick={() => setActiveTab("ratings")}
        >
          Đánh Giá & Thống Kê
        </button>
        <button
          className={`feedback-tab ${activeTab === "notifications" ? "active" : ""}`}
          onClick={() => setActiveTab("notifications")}
        >
          Gửi Thông Báo
        </button>
      </div>

      <div className="feedback-tab-content">
        {activeTab === "feedback" && <FeedbackManager />}
        {activeTab === "ratings" && <RatingsStats />}
        {activeTab === "notifications" && (
          <div className="notifications-section">
            <p>Nhấn nút "Gửi Thông Báo" ở trên để gửi thông báo tới người dùng.</p>
          </div>
        )}
      </div>

      {showNotificationModal && (
        <SendNotificationModal
          onClose={() => setShowNotificationModal(false)}
          onSuccess={() => {
            setShowNotificationModal(false);
          }}
        />
      )}
    </div>
  );
}


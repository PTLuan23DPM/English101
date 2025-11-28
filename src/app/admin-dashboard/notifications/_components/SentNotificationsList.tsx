"use client";

import { useEffect, useState } from "react";

interface NotificationHistory {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  sentAt: string;
  totalSent: number;
  readCount: number;
  unreadCount: number;
  recipients: Array<{
    id: string;
    name: string | null;
    email: string | null;
    read: boolean;
  }>;
}

export default function SentNotificationsList({ refreshKey }: { refreshKey?: number }) {
  const [notifications, setNotifications] = useState<NotificationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin-dashboard/notifications/history");
      
      if (!res.ok) {
        throw new Error("Failed to fetch notification history");
      }
      
      const data = await res.json();
      if (data.success && data.notifications) {
        setNotifications(data.notifications);
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.error("Error fetching notification history:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [refreshKey]); // Refetch when refreshKey changes

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      info: "ℹ️",
      success: "✅",
      warning: "⚠️",
      error: "❌",
    };
    return icons[type] || "📢";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("vi-VN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  if (loading) {
    return (
      <div className="notifications-list-placeholder" style={{ textAlign: "center", padding: "40px" }}>
        <div>Đang tải lịch sử thông báo...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="notifications-list-placeholder" style={{ textAlign: "center", padding: "40px" }}>
        <div style={{ color: "red" }}>Lỗi: {error}</div>
        <button onClick={fetchHistory} className="btn btn-secondary" style={{ marginTop: "16px" }}>
          Thử lại
        </button>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="notifications-list-placeholder" style={{ textAlign: "center", padding: "40px" }}>
        <p>Chưa có thông báo nào được gửi.</p>
      </div>
    );
  }

  return (
    <div className="sent-notifications-list" style={{ marginTop: "24px" }}>
      <div className="notifications-table" style={{ 
        background: "white", 
        borderRadius: "8px", 
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ 
              background: "#f8f9fa", 
              borderBottom: "2px solid #e9ecef" 
            }}>
              <th style={{ 
                padding: "12px 16px", 
                textAlign: "left", 
                fontWeight: "600",
                fontSize: "14px",
                color: "#495057"
              }}>Thông báo</th>
              <th style={{ 
                padding: "12px 16px", 
                textAlign: "left", 
                fontWeight: "600",
                fontSize: "14px",
                color: "#495057"
              }}>Loại</th>
              <th style={{ 
                padding: "12px 16px", 
                textAlign: "center", 
                fontWeight: "600",
                fontSize: "14px",
                color: "#495057"
              }}>Người nhận</th>
              <th style={{ 
                padding: "12px 16px", 
                textAlign: "center", 
                fontWeight: "600",
                fontSize: "14px",
                color: "#495057"
              }}>Đã đọc</th>
              <th style={{ 
                padding: "12px 16px", 
                textAlign: "left", 
                fontWeight: "600",
                fontSize: "14px",
                color: "#495057"
              }}>Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {notifications.map((notif) => (
              <tr 
                key={notif.id} 
                style={{ 
                  borderBottom: "1px solid #e9ecef",
                  transition: "background 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#f8f9fa"}
                onMouseLeave={(e) => e.currentTarget.style.background = "white"}
              >
                <td style={{ padding: "16px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ fontWeight: "600", fontSize: "15px", color: "#212529" }}>
                      {notif.title}
                    </div>
                    <div style={{ 
                      fontSize: "13px", 
                      color: "#6c757d",
                      maxWidth: "400px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}>
                      {notif.message}
                    </div>
                    {notif.link && (
                      <a 
                        href={notif.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ 
                          fontSize: "12px", 
                          color: "#6366f1",
                          textDecoration: "none"
                        }}
                      >
                        🔗 {notif.link}
                      </a>
                    )}
                  </div>
                </td>
                <td style={{ padding: "16px" }}>
                  <span style={{ 
                    display: "inline-flex", 
                    alignItems: "center", 
                    gap: "4px",
                    fontSize: "14px"
                  }}>
                    {getTypeIcon(notif.type)} {notif.type}
                  </span>
                </td>
                <td style={{ padding: "16px", textAlign: "center" }}>
                  <span style={{ 
                    fontWeight: "600", 
                    color: "#495057",
                    fontSize: "14px"
                  }}>
                    {notif.totalSent}
                  </span>
                </td>
                <td style={{ padding: "16px", textAlign: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "center" }}>
                    <span style={{ 
                      fontWeight: "600", 
                      color: "#10b981",
                      fontSize: "14px"
                    }}>
                      {notif.readCount}
                    </span>
                    {notif.unreadCount > 0 && (
                      <span style={{ 
                        fontSize: "12px", 
                        color: "#ef4444"
                      }}>
                        {notif.unreadCount} chưa đọc
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ padding: "16px" }}>
                  <span style={{ 
                    fontSize: "13px", 
                    color: "#6c757d"
                  }}>
                    {formatDate(notif.sentAt)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


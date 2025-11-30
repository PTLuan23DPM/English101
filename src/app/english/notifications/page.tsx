"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import "./notifications.css";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  read: boolean;
  readAt?: Date | null;
  createdAt: Date;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        // API returns { success, notifications, unreadCount }
        if (data.success && data.notifications && Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
        } else if (data.notifications && Array.isArray(data.notifications)) {
          // Fallback: if notifications exist but no success field
          setNotifications(data.notifications);
        } else {
          console.warn("Unexpected API response format:", data);
          setNotifications([]);
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error("Failed to fetch notifications:", res.status, errorData);
        setNotifications([]);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId, read: true }),
      });

      if (res.ok) {
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.id === notificationId ? { ...notif, read: true } : notif
          )
        );
      }
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    for (const id of unreadIds) {
      await markAsRead(id);
    }
  };

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, string> = {
      achievement: "🏆",
      reminder: "⏰",
      feedback: "💬",
      system: "⚙️",
      streak: "🔥",
      info: "ℹ️",
      success: "✅",
      warning: "⚠️",
      error: "❌",
    };
    return icons[type] || "📢";
  };

  if (loading) {
    return (
      <div className="notifications-page">
        <div className="notifications-loading">Loading notifications...</div>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <div>
          <h1>Notifications</h1>
          <p>
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
              : "All caught up!"}
          </p>
        </div>
        <div className="header-actions">
          {unreadCount > 0 && (
            <button className="btn outline sm" onClick={markAllAsRead}>
              Mark all as read
            </button>
          )}
          <Link href="/english/dashboard" className="btn outline sm">
            Back to Dashboard
          </Link>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="notifications-empty">
          <div className="empty-icon">🔔</div>
          <h3>No notifications yet</h3>
          <p>We&apos;ll notify you when something important happens</p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-item ${notification.read ? "read" : "unread"}`}
              onClick={() => !notification.read && markAsRead(notification.id)}
            >
              <div className="notification-icon">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="notification-content">
                <h4 className="notification-title">
                  {notification.link ? (
                    <a 
                      href={notification.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: "inherit", textDecoration: "none" }}
                    >
                      {notification.title}
                    </a>
                  ) : (
                    notification.title
                  )}
                </h4>
                <p className="notification-message">{notification.message}</p>
                {notification.link && (
                  <a 
                    href={notification.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="notification-link"
                    style={{ 
                      color: "#6366f1", 
                      textDecoration: "underline",
                      fontSize: "0.875rem",
                      marginTop: "4px",
                      display: "inline-block"
                    }}
                  >
                    Xem thêm →
                  </a>
                )}
                <span className="notification-time">
                  {new Date(notification.createdAt).toLocaleString()}
                </span>
              </div>
              {!notification.read && <div className="notification-unread-dot" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


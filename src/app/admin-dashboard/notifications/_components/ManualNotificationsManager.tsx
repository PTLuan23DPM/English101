"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

interface ManualNotification {
  id: string;
  title: string;
  message: string;
  target: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

export default function ManualNotificationsManager() {
  const [notifications, setNotifications] = useState<ManualNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingNotification, setEditingNotification] = useState<ManualNotification | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    target: "all",
    active: true,
  });

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin-dashboard/notifications/manual");
      if (!res.ok) throw new Error("Failed to fetch manual notifications");
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error("Error fetching manual notifications:", err);
      toast.error("Không thể tải danh sách thông báo");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (notification?: ManualNotification) => {
    if (notification) {
      setEditingNotification(notification);
      setFormData({
        title: notification.title,
        message: notification.message,
        target: notification.target,
        active: notification.active,
      });
    } else {
      setEditingNotification(null);
      setFormData({
        title: "",
        message: "",
        target: "all",
        active: true,
      });
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingNotification(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingNotification
        ? `/api/admin-dashboard/notifications/manual/${editingNotification.id}`
        : "/api/admin-dashboard/notifications/manual";
      const method = editingNotification ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save notification");
      }

      const data = await res.json();
      if (data.success) {
        toast.success(editingNotification ? "Đã cập nhật thông báo" : "Đã tạo thông báo");
        handleCloseForm();
        fetchNotifications();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa thông báo này?")) return;

    try {
      const res = await fetch(`/api/admin-dashboard/notifications/manual/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete notification");
      toast.success("Đã xóa thông báo");
      fetchNotifications();
    } catch (err) {
      toast.error("Không thể xóa thông báo");
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/admin-dashboard/notifications/manual/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !currentActive }),
      });

      if (!res.ok) throw new Error("Failed to toggle notification");
      toast.success(currentActive ? "Đã tắt thông báo" : "Đã bật thông báo");
      fetchNotifications();
    } catch (err) {
      toast.error("Không thể cập nhật trạng thái");
    }
  };

  if (loading) {
    return <div className="manager-loading">Đang tải dữ liệu...</div>;
  }

  return (
    <div className="manual-notifications-manager">
      <div className="manager-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h2>Thông Báo Thủ Công</h2>
        <button className="btn primary" onClick={() => handleOpenForm()}>
          + Tạo Thông Báo Mới
        </button>
      </div>

      <div className="notifications-list">
        {notifications.length === 0 ? (
          <div className="empty-state">Chưa có thông báo nào. Hãy tạo thông báo mới.</div>
        ) : (
          notifications.map((notification) => (
            <div key={notification.id} className="card" style={{ marginBottom: "16px", padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
                <div>
                  <h3 style={{ margin: 0, marginBottom: "4px" }}>{notification.title}</h3>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "8px" }}>
                    <span className="tag" style={{ background: "#6b7280", color: "white" }}>
                      {notification.target === "all" ? "Tất cả" : notification.target}
                    </span>
                    {!notification.active && (
                      <span className="tag" style={{ background: "#ef4444", color: "white" }}>
                        Đã tắt
                      </span>
                    )}
                    <span style={{ fontSize: "12px", color: "#9ca3af" }}>
                      Tạo bởi: {notification.author.name || notification.author.email}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button className="btn outline" onClick={() => handleOpenForm(notification)}>
                    Sửa
                  </button>
                  <button
                    className="btn outline"
                    onClick={() => handleToggleActive(notification.id, notification.active)}
                  >
                    {notification.active ? "Tắt" : "Bật"}
                  </button>
                  <button className="btn warn" onClick={() => handleDelete(notification.id)}>
                    Xóa
                  </button>
                </div>
              </div>
              <p style={{ margin: "8px 0", color: "#6b7280" }}>{notification.message}</p>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={handleCloseForm}
        >
          <div
            className="card"
            style={{
              maxWidth: "600px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: "20px" }}>
              {editingNotification ? "Sửa Thông Báo" : "Tạo Thông Báo Mới"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>
                    Tiêu đề *
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>
                    Nội dung *
                  </label>
                  <textarea
                    className="input"
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>
                    Đối tượng nhận
                  </label>
                  <select
                    className="select"
                    value={formData.target}
                    onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                  >
                    <option value="all">Tất cả người dùng</option>
                    <option value="A1">A1</option>
                    <option value="A2">A2</option>
                    <option value="B1">B1</option>
                    <option value="B2">B2</option>
                    <option value="C1">C1</option>
                    <option value="C2">C2</option>
                  </select>
                </div>

                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  />
                  <label htmlFor="active" style={{ cursor: "pointer" }}>
                    Kích hoạt thông báo này
                  </label>
                </div>

                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                  <button type="button" className="btn outline" onClick={handleCloseForm}>
                    Hủy
                  </button>
                  <button type="submit" className="btn primary">
                    {editingNotification ? "Cập nhật" : "Tạo"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


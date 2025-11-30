"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

interface AutomaticNotification {
  id: string;
  title: string;
  message: string;
  trigger: "STREAK_WARNING" | "PRACTICE_REMINDER" | "STREAK_EXPIRED";
  active: boolean;
  conditions?: {
    streakThreshold?: number; // Số ngày streak còn lại để cảnh báo
    hoursSinceLastActivity?: number; // Số giờ không hoạt động để nhắc nhở
    daysWithoutPractice?: number; // Số ngày không làm bài tập
  };
  targetUserIds?: string[] | null; // Danh sách user IDs (null = tất cả users)
  createdAt: string;
  updatedAt: string;
}

export default function AutomaticNotificationsManager() {
  const [notifications, setNotifications] = useState<AutomaticNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [users, setUsers] = useState<Array<{ id: string; name: string | null; email: string | null }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    trigger: "STREAK_WARNING" as AutomaticNotification["trigger"],
    active: true,
    conditions: {
      streakThreshold: 1,
      hoursSinceLastActivity: 24,
      daysWithoutPractice: 1,
    },
    targetUserIds: null as string[] | null, // null = tất cả users, array = chỉ gửi cho users đã chọn
  });

  useEffect(() => {
    fetchNotifications();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch("/api/admin-dashboard/users?limit=1000");
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = await response.json();
      if (data.success) {
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin-dashboard/notifications/automatic");
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
      } else {
        throw new Error(data.error || "Failed to fetch notifications");
      }
    } catch (err) {
      console.error("Error fetching automatic notifications:", err);
      const errorMessage = err instanceof Error ? err.message : "Không thể tải danh sách thông báo tự động";
      toast.error(errorMessage);
      setNotifications([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (notification: AutomaticNotification) => {
    setEditingId(notification.id);
    setFormData({
      title: notification.title,
      message: notification.message,
      trigger: notification.trigger,
      active: notification.active,
      conditions: {
        streakThreshold: notification.conditions?.streakThreshold ?? 1,
        hoursSinceLastActivity: notification.conditions?.hoursSinceLastActivity ?? 24,
        daysWithoutPractice: notification.conditions?.daysWithoutPractice ?? 1,
      },
      targetUserIds: notification.targetUserIds || null,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      title: "",
      message: "",
      trigger: "STREAK_WARNING",
      active: true,
      conditions: {
        streakThreshold: 1,
        hoursSinceLastActivity: 24,
        daysWithoutPractice: 1,
      },
      targetUserIds: null,
    });
  };

  const handleUserToggle = (userId: string) => {
    setFormData((prev) => {
      const currentIds = prev.targetUserIds || [];
      const newIds = currentIds.includes(userId)
        ? currentIds.filter((id) => id !== userId)
        : [...currentIds, userId];
      return {
        ...prev,
        targetUserIds: newIds.length > 0 ? newIds : null,
      };
    });
  };

  const handleSelectAll = () => {
    if (formData.targetUserIds && formData.targetUserIds.length === users.length) {
      setFormData((prev) => ({ ...prev, targetUserIds: null }));
    } else {
      setFormData((prev) => ({
        ...prev,
        targetUserIds: users.map((u) => u.id),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = editingId && editingId !== "new";
      const url = isEdit
        ? `/api/admin-dashboard/notifications/automatic/${editingId}`
        : "/api/admin-dashboard/notifications/automatic";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || `Failed to save: ${res.status} ${res.statusText}`;
        console.error("[AutomaticNotificationsManager] API Error:", {
          status: res.status,
          statusText: res.statusText,
          error: errorData,
        });
        throw new Error(errorMessage);
      }

      const data = await res.json();
      if (data.success) {
        toast.success(isEdit ? "Đã cập nhật thông báo" : "Đã tạo thông báo tự động");
        handleCancel();
        fetchNotifications();
      } else {
        throw new Error(data.error || "Operation failed");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Có lỗi xảy ra";
      console.error("[AutomaticNotificationsManager] Submit error:", err);
      toast.error(errorMessage);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/admin-dashboard/notifications/automatic/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !currentActive }),
      });

      if (!res.ok) throw new Error("Failed to toggle notification");
      toast.success(currentActive ? "Đã tắt thông báo" : "Đã bật thông báo");
      fetchNotifications();
    } catch {
      toast.error("Không thể cập nhật trạng thái");
    }
  };

  const getTriggerLabel = (trigger: string) => {
    const labels: Record<string, string> = {
      STREAK_WARNING: "Cảnh báo sắp hết chuỗi",
      PRACTICE_REMINDER: "Nhắc nhở làm bài tập",
      STREAK_EXPIRED: "Nhắc học để giữ chuỗi",
    };
    return labels[trigger] || trigger;
  };

  if (loading) {
    return <div className="manager-loading">Đang tải dữ liệu...</div>;
  }

  return (
    <div className="automatic-notifications-manager">
      <div className="manager-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h2>Thông Báo Tự Động</h2>
        {!editingId && (
          <button
            className="btn primary"
            onClick={() => setEditingId("new")}
          >
            + Tạo Thông Báo Tự Động
          </button>
        )}
      </div>

      {editingId && (
        <div className="card" style={{ marginBottom: "24px", padding: "24px" }}>
          <h3 style={{ marginBottom: "16px" }}>
            {editingId === "new" ? "Tạo Thông Báo Tự Động" : "Sửa Thông Báo"}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>
                  Loại Thông Báo *
                </label>
                <select
                  className="select"
                  value={formData.trigger}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      trigger: e.target.value as AutomaticNotification["trigger"],
                    })
                  }
                  required
                >
                  <option value="STREAK_WARNING">Cảnh báo sắp hết chuỗi</option>
                  <option value="PRACTICE_REMINDER">Nhắc nhở làm bài tập</option>
                  <option value="STREAK_EXPIRED">Nhắc học để giữ chuỗi</option>
                </select>
              </div>

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
                  placeholder="Ví dụ: Sắp hết chuỗi học tập!"
                  style={{ width: "100%", minWidth: "100%" }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "10px", fontWeight: 600 }}>
                  Nội dung *
                </label>
                <textarea
                  className="input"
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                  placeholder="Ví dụ: Bạn còn 1 ngày để giữ chuỗi học tập. Hãy vào học ngay!"
                  style={{ width: "100%", minWidth: "100%" }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>
                  Điều Kiện Kích Hoạt
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "12px", background: "#f9fafb", borderRadius: "8px" }}>
                  {formData.trigger === "STREAK_WARNING" && (
                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>
                        Cảnh báo khi còn (ngày):
                      </label>
                      <input
                        type="number"
                        className="input"
                        value={formData.conditions.streakThreshold}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            conditions: {
                              ...formData.conditions,
                              streakThreshold: parseInt(e.target.value) || 1,
                            },
                          })
                        }
                        min="1"
                      />
                    </div>
                  )}
                  {formData.trigger === "PRACTICE_REMINDER" && (
                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>
                        Nhắc nhở sau (giờ) không hoạt động:
                      </label>
                      <input
                        type="number"
                        className="input"
                        value={formData.conditions.hoursSinceLastActivity}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            conditions: {
                              ...formData.conditions,
                              hoursSinceLastActivity: parseInt(e.target.value) || 24,
                            },
                          })
                        }
                        min="1"
                      />
                    </div>
                  )}
                  {formData.trigger === "STREAK_EXPIRED" && (
                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>
                        Nhắc nhở sau (ngày) không làm bài tập:
                      </label>
                      <input
                        type="number"
                        className="input"
                        value={formData.conditions.daysWithoutPractice}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            conditions: {
                              ...formData.conditions,
                              daysWithoutPractice: parseInt(e.target.value) || 1,
                            },
                          })
                        }
                        min="1"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label style={{ display: "block", fontWeight: 600 }}>
                    Chọn Người Nhận (Tùy chọn)
                  </label>
                  <button
                    type="button"
                    className="btn outline"
                    onClick={handleSelectAll}
                    style={{ fontSize: "12px", padding: "4px 8px" }}
                  >
                    {formData.targetUserIds && formData.targetUserIds.length === users.length
                      ? "Bỏ chọn tất cả"
                      : "Chọn tất cả"}
                  </button>
                </div>
                <small style={{ color: "#6b7280", fontSize: "12px", display: "block", marginBottom: "8px" }}>
                  Để trống để gửi cho tất cả user thỏa mãn điều kiện. Chọn user cụ thể để chỉ gửi cho những user đó.
                </small>
                {loadingUsers ? (
                  <div style={{ padding: "12px", textAlign: "center", color: "#6b7280" }}>
                    Đang tải danh sách người dùng...
                  </div>
                ) : (
                  <div
                    style={{
                      maxHeight: "200px",
                      overflowY: "auto",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      padding: "8px",
                      background: "#f9fafb",
                    }}
                  >
                    {users.length === 0 ? (
                      <div style={{ padding: "12px", textAlign: "center", color: "#6b7280" }}>
                        Không có người dùng nào
                      </div>
                    ) : (
                      users.map((user) => (
                        <label
                          key={user.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "8px",
                            cursor: "pointer",
                            borderRadius: "4px",
                            transition: "background 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#f3f4f6";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={formData.targetUserIds?.includes(user.id) || false}
                            onChange={() => handleUserToggle(user.id)}
                          />
                          <span style={{ fontSize: "14px" }}>
                            {user.name || user.email} {user.email && user.name && `(${user.email})`}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                )}
                {formData.targetUserIds && formData.targetUserIds.length > 0 && (
                  <div style={{ marginTop: "8px", fontSize: "12px", color: "#3b82f6" }}>
                    Đã chọn: {formData.targetUserIds.length} người dùng
                  </div>
                )}
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
                <button type="button" className="btn outline" onClick={handleCancel}>
                  Hủy
                </button>
                <button type="submit" className="btn primary">
                  {editingId === "new" ? "Tạo" : "Cập nhật"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="notifications-list">
        {notifications.length === 0 ? (
          <div className="empty-state">Chưa có thông báo tự động nào. Hãy tạo thông báo mới.</div>
        ) : (
          notifications.map((notification) => (
            <div key={notification.id} className="card" style={{ marginBottom: "16px", padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
                <div>
                  <h3 style={{ margin: 0, marginBottom: "4px" }}>{notification.title}</h3>
                  <span className="tag" style={{ background: "#3b82f6", color: "white" }}>
                    {getTriggerLabel(notification.trigger)}
                  </span>
                  {!notification.active && (
                    <span className="tag" style={{ background: "#ef4444", color: "white", marginLeft: "8px" }}>
                      Đã tắt
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    className="btn outline"
                    onClick={() => handleEdit(notification)}
                  >
                    Sửa
                  </button>
                  <button
                    className="btn outline"
                    onClick={() => handleToggleActive(notification.id, notification.active)}
                  >
                    {notification.active ? "Tắt" : "Bật"}
                  </button>
                </div>
              </div>
              <p style={{ margin: "8px 0", color: "#6b7280" }}>{notification.message}</p>
              {notification.conditions && (
                <div style={{ marginTop: "12px", padding: "12px", background: "#f9fafb", borderRadius: "8px", fontSize: "14px" }}>
                  <strong>Điều kiện:</strong>
                  {notification.conditions.streakThreshold && (
                    <div>Cảnh báo khi còn {notification.conditions.streakThreshold} ngày</div>
                  )}
                  {notification.conditions.hoursSinceLastActivity && (
                    <div>Nhắc nhở sau {notification.conditions.hoursSinceLastActivity} giờ không hoạt động</div>
                  )}
                  {notification.conditions.daysWithoutPractice && (
                    <div>Nhắc nhở sau {notification.conditions.daysWithoutPractice} ngày không làm bài tập</div>
                  )}
                </div>
              )}
              {notification.targetUserIds && notification.targetUserIds.length > 0 && (
                <div style={{ marginTop: "8px", padding: "8px", background: "#eff6ff", borderRadius: "8px", fontSize: "14px" }}>
                  <strong>Gửi cho:</strong> {notification.targetUserIds.length} người dùng đã chọn
                </div>
              )}
              {(!notification.targetUserIds || notification.targetUserIds.length === 0) && (
                <div style={{ marginTop: "8px", padding: "8px", background: "#f0fdf4", borderRadius: "8px", fontSize: "14px" }}>
                  <strong>Gửi cho:</strong> Tất cả người dùng thỏa mãn điều kiện
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}


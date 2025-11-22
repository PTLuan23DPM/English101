"use client";

import { useState, useEffect } from "react";

interface SendNotificationModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function SendNotificationModal({
  onClose,
  onSuccess,
}: SendNotificationModalProps) {
  const [formData, setFormData] = useState({
    userIds: [] as string[],
    title: "",
    message: "",
    type: "info",
    link: "",
  });
  const [users, setUsers] = useState<Array<{ id: string; name: string | null; email: string | null }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch("/api/admin-dashboard/users?limit=100");
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleUserToggle = (userId: string) => {
    setFormData((prev) => ({
      ...prev,
      userIds: prev.userIds.includes(userId)
        ? prev.userIds.filter((id) => id !== userId)
        : [...prev.userIds, userId],
    }));
  };

  const handleSelectAll = () => {
    if (formData.userIds.length === users.length) {
      setFormData((prev) => ({ ...prev, userIds: [] }));
    } else {
      setFormData((prev) => ({
        ...prev,
        userIds: users.map((u) => u.id),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.userIds.length === 0) {
      setError("Vui lòng chọn ít nhất một người dùng");
      return;
    }
    if (!formData.title.trim() || !formData.message.trim()) {
      setError("Tiêu đề và nội dung là bắt buộc");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin-dashboard/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: formData.userIds,
          title: formData.title.trim(),
          message: formData.message.trim(),
          type: formData.type,
          link: formData.link.trim() || null,
        }),
      });

      if (!response.ok) {
        let errorMessage = "Failed to send notification";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (data.success) {
        alert(`Đã gửi thông báo tới ${data.count} người dùng!`);
        onSuccess();
      } else {
        throw new Error(data.error || "Failed to send notification");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Gửi Thông Báo</h2>
          <button onClick={onClose} className="modal-close-btn">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="send-notification-form">
          <div className="form-group">
            <label htmlFor="title">Tiêu đề *</label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="Nhập tiêu đề thông báo"
            />
          </div>

          <div className="form-group">
            <label htmlFor="message">Nội dung *</label>
            <textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={5}
              required
              placeholder="Nhập nội dung thông báo"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="type">Loại thông báo</label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="info">Thông tin</option>
                <option value="success">Thành công</option>
                <option value="warning">Cảnh báo</option>
                <option value="error">Lỗi</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="link">Link (tùy chọn)</label>
              <input
                id="link"
                type="url"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
          </div>

          <div className="form-group">
            <div className="user-select-header">
              <label>Chọn người nhận *</label>
              <button
                type="button"
                onClick={handleSelectAll}
                className="btn btn-sm btn-secondary"
              >
                {formData.userIds.length === users.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
              </button>
            </div>
            {loadingUsers ? (
              <div className="users-loading">Đang tải danh sách người dùng...</div>
            ) : (
              <div className="user-select-list">
                {users.map((user) => (
                  <label key={user.id} className="user-select-item">
                    <input
                      type="checkbox"
                      checked={formData.userIds.includes(user.id)}
                      onChange={() => handleUserToggle(user.id)}
                    />
                    <span>
                      {user.name || user.email} {user.email && `(${user.email})`}
                    </span>
                  </label>
                ))}
              </div>
            )}
            {formData.userIds.length > 0 && (
              <div className="selected-count">
                Đã chọn: {formData.userIds.length} người dùng
              </div>
            )}
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || loadingUsers}>
              {loading ? "Đang gửi..." : "Gửi thông báo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


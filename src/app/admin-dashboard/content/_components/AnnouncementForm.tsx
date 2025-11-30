"use client";

import { useState, useEffect } from "react";

interface Announcement {
  id: string;
  title: string;
  content: string;
  summary: string | null;
  isPublished: boolean;
  priority: number;
  startDate: Date | null;
  endDate: Date | null;
  imageUrl: string | null;
}

interface AnnouncementFormProps {
  announcement: Announcement | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AnnouncementForm({
  announcement,
  onClose,
  onSuccess,
}: AnnouncementFormProps) {
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    summary: "",
    isPublished: false,
    priority: 0,
    startDate: "",
    endDate: "",
    imageUrl: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (announcement) {
      setFormData({
        title: announcement.title,
        content: announcement.content,
        summary: announcement.summary || "",
        isPublished: announcement.isPublished,
        priority: announcement.priority,
        startDate: announcement.startDate
          ? new Date(announcement.startDate).toISOString().split("T")[0]
          : "",
        endDate: announcement.endDate
          ? new Date(announcement.endDate).toISOString().split("T")[0]
          : "",
        imageUrl: announcement.imageUrl || "",
      });
    }
  }, [announcement]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = announcement
        ? `/api/admin-dashboard/announcements/${announcement.id}`
        : "/api/admin-dashboard/announcements";
      const method = announcement ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title.trim(),
          content: formData.content.trim(),
          summary: formData.summary.trim() || null,
          isPublished: formData.isPublished,
          priority: parseInt(formData.priority.toString()) || 0,
          startDate: formData.startDate || null,
          endDate: formData.endDate || null,
          imageUrl: formData.imageUrl.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save announcement");
      }

      onSuccess();
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
          <h2 className="modal-title">
            {announcement ? "Chỉnh Sửa Thông Báo" : "Tạo Thông Báo Mới"}
          </h2>
          <button onClick={onClose} className="modal-close-btn">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="announcement-form">
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
            <label htmlFor="summary">Tóm tắt</label>
            <textarea
              id="summary"
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              rows={3}
              placeholder="Tóm tắt ngắn gọn về thông báo"
            />
          </div>

          <div className="form-group">
            <label htmlFor="content">Nội dung *</label>
            <textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={10}
              required
              placeholder="Nhập nội dung thông báo"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="priority">Độ ưu tiên</label>
              <input
                id="priority"
                type="number"
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })
                }
                min="0"
              />
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.isPublished}
                  onChange={(e) =>
                    setFormData({ ...formData, isPublished: e.target.checked })
                  }
                />
                Xuất bản ngay
              </label>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startDate">Ngày bắt đầu</label>
              <input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label htmlFor="endDate">Ngày kết thúc</label>
              <input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="imageUrl">URL hình ảnh</label>
            <input
              id="imageUrl"
              type="url"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


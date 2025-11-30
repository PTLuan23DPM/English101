"use client";

import { useState, useEffect } from "react";

interface PageContent {
  id: string;
  slug: string;
  title: string;
  content: string;
  isPublished: boolean;
}

interface PageContentFormProps {
  page: PageContent;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PageContentForm({
  page,
  onClose,
  onSuccess,
}: PageContentFormProps) {
  const [formData, setFormData] = useState({
    title: page.title,
    content: page.content,
    isPublished: page.isPublished,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = page.id
        ? `/api/admin-dashboard/page-content/${page.slug}`
        : "/api/admin-dashboard/page-content";
      const method = page.id ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: page.slug,
          title: formData.title.trim(),
          content: formData.content.trim(),
          isPublished: formData.isPublished,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save page");
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
          <h2 className="modal-title">Chỉnh Sửa: {page.title}</h2>
          <button onClick={onClose} className="modal-close-btn">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="page-content-form">
          <div className="form-group">
            <label htmlFor="title">Tiêu đề *</label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="content">Nội dung *</label>
            <textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={20}
              required
              placeholder="Nhập nội dung (HTML được hỗ trợ)"
            />
            <small className="form-hint">
              Bạn có thể sử dụng HTML để định dạng nội dung
            </small>
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
              Xuất bản
            </label>
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


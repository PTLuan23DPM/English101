"use client";

import { useState, useEffect } from "react";
import AnnouncementForm from "./AnnouncementForm";

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
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
}

export default function AnnouncementsManager() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, [page, filter]);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });
      if (filter === "published") params.append("published", "true");
      if (filter === "draft") params.append("published", "false");

      const response = await fetch(`/api/admin-dashboard/announcements?${params}`);
      
      // Check if response is ok before parsing
      if (!response.ok) {
        // Try to get error message from response body
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If response is not JSON, use status text
          const text = await response.text().catch(() => "");
          if (text) {
            errorMessage = text;
          }
        }
        throw new Error(errorMessage);
      }
      
      // Only parse JSON if response is ok
      const data = await response.json();
      if (data.success) {
        setAnnouncements(data.announcements);
        setTotalPages(data.pagination.totalPages);
      } else {
        throw new Error(data.error || "Invalid response format");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      console.error("Error fetching announcements:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingAnnouncement(null);
    setShowForm(true);
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa thông báo này?")) return;

    try {
      const response = await fetch(`/api/admin-dashboard/announcements/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        let errorMessage = "Failed to delete announcement";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If response is not JSON, use status text
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      fetchAnnouncements();
    } catch (err) {
      alert("Lỗi khi xóa: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  const handleTogglePublish = async (announcement: Announcement) => {
    try {
      const response = await fetch(`/api/admin-dashboard/announcements/${announcement.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isPublished: !announcement.isPublished,
        }),
      });

      if (!response.ok) {
        let errorMessage = "Failed to update announcement";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If response is not JSON, use status text
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      fetchAnnouncements();
    } catch (err) {
      alert("Lỗi khi cập nhật: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingAnnouncement(null);
    fetchAnnouncements();
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Không có";
    return new Date(date).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="announcements-manager">
      <div className="manager-header">
        <div className="manager-filters">
          <button
            className={`filter-btn ${filter === "all" ? "active" : ""}`}
            onClick={() => {
              setFilter("all");
              setPage(1);
            }}
          >
            Tất cả
          </button>
          <button
            className={`filter-btn ${filter === "published" ? "active" : ""}`}
            onClick={() => {
              setFilter("published");
              setPage(1);
            }}
          >
            Đã xuất bản
          </button>
          <button
            className={`filter-btn ${filter === "draft" ? "active" : ""}`}
            onClick={() => {
              setFilter("draft");
              setPage(1);
            }}
          >
            Bản nháp
          </button>
        </div>
        <button onClick={handleCreate} className="btn btn-primary">
          + Tạo Thông Báo Mới
        </button>
      </div>

      {loading ? (
        <div className="manager-loading">
          <p>Đang tải dữ liệu...</p>
        </div>
      ) : error ? (
        <div className="manager-error">
          <p><strong>Lỗi:</strong> {error}</p>
          {(error.includes("Database table not found") || error.includes("migrations") || error.includes("does not exist")) ? (
            <div className="error-help">
              <p>Bạn cần chạy migration để tạo các bảng trong database:</p>
              <code className="error-code">
                npx prisma migrate dev --name add_content_management
              </code>
              <p className="error-hint">Hoặc: npm run db:migrate</p>
            </div>
          ) : error.includes("Prisma Client not generated") || error.includes("npx prisma generate") ? (
            <div className="error-help">
              <p>Bạn cần generate Prisma Client để sử dụng các models mới:</p>
              <code className="error-code">
                npx prisma generate
              </code>
              <p className="error-hint">Sau đó restart dev server: npm run dev</p>
            </div>
          ) : null}
          <button onClick={fetchAnnouncements} className="retry-button">
            Thử lại
          </button>
        </div>
      ) : (
        <>
          <div className="announcements-list">
            {announcements.length === 0 ? (
              <div className="empty-state">
                <p>Chưa có thông báo nào</p>
              </div>
            ) : (
              announcements.map((announcement) => (
                <div key={announcement.id} className="announcement-card">
                  <div className="announcement-header">
                    <div className="announcement-title-row">
                      <h3 className="announcement-title">{announcement.title}</h3>
                      <div className="announcement-badges">
                        {announcement.isPublished ? (
                          <span className="badge badge--published">Đã xuất bản</span>
                        ) : (
                          <span className="badge badge--draft">Bản nháp</span>
                        )}
                        {announcement.priority > 0 && (
                          <span className="badge badge--priority">
                            Ưu tiên: {announcement.priority}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="announcement-meta">
                      <span>Tạo bởi: {announcement.author?.name || announcement.author?.email || "N/A"}</span>
                      <span>•</span>
                      <span>{formatDate(announcement.createdAt)}</span>
                    </div>
                  </div>
                  {announcement.summary && (
                    <p className="announcement-summary">{announcement.summary}</p>
                  )}
                  <div className="announcement-actions">
                    <button
                      onClick={() => handleTogglePublish(announcement)}
                      className="btn btn-sm btn-secondary"
                    >
                      {announcement.isPublished ? "Ẩn" : "Xuất bản"}
                    </button>
                    <button
                      onClick={() => handleEdit(announcement)}
                      className="btn btn-sm btn-primary"
                    >
                      Chỉnh sửa
                    </button>
                    <button
                      onClick={() => handleDelete(announcement.id)}
                      className="btn btn-sm btn-danger"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="pagination-btn"
              >
                Trước
              </button>
              <span className="pagination-info">
                Trang {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="pagination-btn"
              >
                Sau
              </button>
            </div>
          )}
        </>
      )}

      {showForm && (
        <AnnouncementForm
          announcement={editingAnnouncement}
          onClose={() => {
            setShowForm(false);
            setEditingAnnouncement(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}


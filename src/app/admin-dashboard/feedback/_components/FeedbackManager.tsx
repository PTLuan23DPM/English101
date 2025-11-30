"use client";

import { useState, useEffect } from "react";
import FeedbackReplyModal from "./FeedbackReplyModal";

interface Feedback {
  id: string;
  userId: string;
  type: string;
  subject: string;
  message: string;
  status: string;
  priority: number;
  reply: string | null;
  repliedAt: Date | null;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
  repliedByUser: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
}

export default function FeedbackManager() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [replyingFeedback, setReplyingFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    fetchFeedbacks();
  }, [page, statusFilter, typeFilter]);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });
      if (statusFilter) params.append("status", statusFilter);
      if (typeFilter) params.append("type", typeFilter);

      const response = await fetch(`/api/admin-dashboard/feedback?${params}`);
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          const text = await response.text().catch(() => "");
          if (text) errorMessage = text;
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      if (data.success) {
        setFeedbacks(data.feedbacks);
        setTotalPages(data.pagination.totalPages);
      } else {
        throw new Error(data.error || "Invalid response format");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      console.error("Error fetching feedbacks:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (feedback: Feedback, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin-dashboard/feedback/${feedback.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      fetchFeedbacks();
    } catch (err) {
      alert("Lỗi khi cập nhật: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Chưa có";
    return new Date(date).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; class: string }> = {
      pending: { label: "Chờ xử lý", class: "status-badge--pending" },
      in_progress: { label: "Đang xử lý", class: "status-badge--in-progress" },
      resolved: { label: "Đã giải quyết", class: "status-badge--resolved" },
      closed: { label: "Đã đóng", class: "status-badge--closed" },
    };
    const statusInfo = statusMap[status] || { label: status, class: "" };
    return (
      <span className={`status-badge ${statusInfo.class}`}>
        {statusInfo.label}
      </span>
    );
  };

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      general: "Chung",
      bug: "Lỗi",
      feature_request: "Yêu cầu tính năng",
      question: "Câu hỏi",
      complaint: "Khiếu nại",
    };
    return typeMap[type] || type;
  };

  const getPriorityBadge = (priority: number) => {
    if (priority === 0) return null;
    if (priority === 1) return <span className="priority-badge priority-badge--high">Cao</span>;
    if (priority === 2) return <span className="priority-badge priority-badge--urgent">Khẩn cấp</span>;
    return null;
  };

  return (
    <div className="feedback-manager">
      <div className="manager-header">
        <div className="manager-filters">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="filter-select"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ xử lý</option>
            <option value="in_progress">Đang xử lý</option>
            <option value="resolved">Đã giải quyết</option>
            <option value="closed">Đã đóng</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="filter-select"
          >
            <option value="">Tất cả loại</option>
            <option value="general">Chung</option>
            <option value="bug">Lỗi</option>
            <option value="feature_request">Yêu cầu tính năng</option>
            <option value="question">Câu hỏi</option>
            <option value="complaint">Khiếu nại</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="manager-loading">
          <p>Đang tải dữ liệu...</p>
        </div>
      ) : error ? (
        <div className="manager-error">
          <p><strong>Lỗi:</strong> {error}</p>
          {error.includes("table not found") || error.includes("does not exist") ? (
            <div className="error-help">
              <p className="error-hint">
                <strong>Bảng database chưa được tạo.</strong> Vui lòng chạy migration:
              </p>
              <code className="error-code">npm run db:migrate</code>
              <p className="error-hint">hoặc</p>
              <code className="error-code">npx prisma migrate dev</code>
            </div>
          ) : error.includes("Prisma Client not generated") ? (
            <div className="error-help">
              <p className="error-hint">
                <strong>Prisma Client chưa được generate.</strong> Vui lòng chạy:
              </p>
              <code className="error-code">npx prisma generate</code>
            </div>
          ) : null}
          <button onClick={fetchFeedbacks} className="retry-button">
            Thử lại
          </button>
        </div>
      ) : (
        <>
          <div className="feedbacks-list">
            {feedbacks.length === 0 ? (
              <div className="empty-state">
                <p>Chưa có feedback nào</p>
              </div>
            ) : (
              feedbacks.map((feedback) => (
                <div key={feedback.id} className="feedback-card">
                  <div className="feedback-header">
                    <div className="feedback-title-row">
                      <h3 className="feedback-subject">{feedback.subject}</h3>
                      <div className="feedback-badges">
                        {getStatusBadge(feedback.status)}
                        {getPriorityBadge(feedback.priority)}
                        <span className="type-badge">{getTypeLabel(feedback.type)}</span>
                      </div>
                    </div>
                    <div className="feedback-meta">
                      <span>Từ: {feedback.user.name || feedback.user.email}</span>
                      <span>•</span>
                      <span>{formatDate(feedback.createdAt)}</span>
                    </div>
                  </div>
                  <div className="feedback-message">
                    <p>{feedback.message}</p>
                  </div>
                  {feedback.reply && (
                    <div className="feedback-reply">
                      <div className="feedback-reply-header">
                        <strong>Phản hồi từ admin:</strong>
                        <span>{formatDate(feedback.repliedAt)}</span>
                      </div>
                      <p>{feedback.reply}</p>
                    </div>
                  )}
                  <div className="feedback-actions">
                    {!feedback.reply && (
                      <button
                        onClick={() => setReplyingFeedback(feedback)}
                        className="btn btn-sm btn-primary"
                      >
                        Trả lời
                      </button>
                    )}
                    <select
                      value={feedback.status}
                      onChange={(e) => handleUpdateStatus(feedback, e.target.value)}
                      className="status-select"
                    >
                      <option value="pending">Chờ xử lý</option>
                      <option value="in_progress">Đang xử lý</option>
                      <option value="resolved">Đã giải quyết</option>
                      <option value="closed">Đã đóng</option>
                    </select>
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

      {replyingFeedback && (
        <FeedbackReplyModal
          feedback={replyingFeedback}
          onClose={() => setReplyingFeedback(null)}
          onSuccess={() => {
            setReplyingFeedback(null);
            fetchFeedbacks();
          }}
        />
      )}
    </div>
  );
}


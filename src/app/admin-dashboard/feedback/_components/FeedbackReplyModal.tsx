"use client";

import { useState } from "react";

interface Feedback {
  id: string;
  subject: string;
  message: string;
  status: string;
}

interface FeedbackReplyModalProps {
  feedback: Feedback;
  onClose: () => void;
  onSuccess: () => void;
}

export default function FeedbackReplyModal({
  feedback,
  onClose,
  onSuccess,
}: FeedbackReplyModalProps) {
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState(feedback.status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) {
      setError("Vui lòng nhập phản hồi");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin-dashboard/feedback/${feedback.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reply: reply.trim(),
          status: status,
        }),
      });

      if (!response.ok) {
        let errorMessage = "Failed to send reply";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
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
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Trả Lời Feedback</h2>
          <button onClick={onClose} className="modal-close-btn">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="feedback-reply-form">
          <div className="form-group">
            <label>Chủ đề:</label>
            <div className="form-readonly">{feedback.subject}</div>
          </div>

          <div className="form-group">
            <label>Nội dung feedback:</label>
            <div className="form-readonly">{feedback.message}</div>
          </div>

          <div className="form-group">
            <label htmlFor="reply">Phản hồi *</label>
            <textarea
              id="reply"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={6}
              required
              placeholder="Nhập phản hồi của bạn..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="status">Trạng thái</label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="pending">Chờ xử lý</option>
              <option value="in_progress">Đang xử lý</option>
              <option value="resolved">Đã giải quyết</option>
              <option value="closed">Đã đóng</option>
            </select>
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Đang gửi..." : "Gửi phản hồi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


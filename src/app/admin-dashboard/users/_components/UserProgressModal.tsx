"use client";

import { useState, useEffect } from "react";

interface User {
  id: string;
  name: string | null;
  email: string | null;
}

interface UserProgressModalProps {
  user: User;
  onClose: () => void;
}

interface ProgressData {
  id: string;
  unitTitle: string;
  moduleTitle: string;
  moduleType: string;
  skill: string;
  level: string;
  status: string;
  scoreSum: number | null;
  lastSeen: Date | null;
}

interface AttemptData {
  id: string;
  activityTitle: string;
  skill: string;
  level: string;
  score: number | null;
  maxScore: number | null;
  submittedAt: Date | null;
}

interface ProgressStats {
  totalUnits: number;
  completedUnits: number;
  inProgressUnits: number;
  totalScore: number;
}

export default function UserProgressModal({
  user,
  onClose,
}: UserProgressModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressData[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<AttemptData[]>([]);
  const [stats, setStats] = useState<ProgressStats | null>(null);

  useEffect(() => {
    fetchProgress();
  }, [user.id]);

  const fetchProgress = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin-dashboard/users/${user.id}/progress`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch progress");
      }
      const data = await response.json();
      if (data.success) {
        setProgress(data.progress);
        setRecentAttempts(data.recentAttempts);
        setStats(data.stats);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
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
      not_started: { label: "Chưa bắt đầu", class: "status-badge--not-started" },
      in_progress: { label: "Đang học", class: "status-badge--in-progress" },
      completed: { label: "Hoàn thành", class: "status-badge--completed" },
    };
    const statusInfo = statusMap[status] || { label: status, class: "" };
    return (
      <span className={`status-badge ${statusInfo.class}`}>
        {statusInfo.label}
      </span>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            Tiến Trình Học: {user.name || user.email}
          </h2>
          <button onClick={onClose} className="modal-close-btn">
            ✕
          </button>
        </div>

        {loading ? (
          <div className="modal-loading">
            <p>Đang tải dữ liệu...</p>
          </div>
        ) : error ? (
          <div className="modal-error">
            <p>Lỗi: {error}</p>
            <button onClick={fetchProgress} className="retry-button">
              Thử lại
            </button>
          </div>
        ) : (
          <div className="user-progress-content">
            {stats && (
              <div className="progress-stats-grid">
                <div className="progress-stat-card">
                  <div className="progress-stat-label">Tổng bài học</div>
                  <div className="progress-stat-value">{stats.totalUnits}</div>
                </div>
                <div className="progress-stat-card">
                  <div className="progress-stat-label">Đã hoàn thành</div>
                  <div className="progress-stat-value progress-stat-value--success">
                    {stats.completedUnits}
                  </div>
                </div>
                <div className="progress-stat-card">
                  <div className="progress-stat-label">Đang học</div>
                  <div className="progress-stat-value progress-stat-value--warning">
                    {stats.inProgressUnits}
                  </div>
                </div>
                <div className="progress-stat-card">
                  <div className="progress-stat-label">Tổng điểm</div>
                  <div className="progress-stat-value">{stats.totalScore}</div>
                </div>
              </div>
            )}

            <div className="progress-sections">
              <section className="progress-section">
                <h3 className="progress-section-title">Tiến Trình Bài Học</h3>
                {progress.length === 0 ? (
                  <p className="progress-empty">Chưa có tiến trình nào</p>
                ) : (
                  <div className="progress-list">
                    {progress.map((p) => (
                      <div key={p.id} className="progress-item">
                        <div className="progress-item-header">
                          <h4 className="progress-item-title">{p.unitTitle}</h4>
                          {getStatusBadge(p.status)}
                        </div>
                        <div className="progress-item-details">
                          <span>{p.moduleTitle}</span>
                          <span className="progress-item-separator">•</span>
                          <span>{p.skill}</span>
                          <span className="progress-item-separator">•</span>
                          <span>{p.level}</span>
                          {p.scoreSum !== null && (
                            <>
                              <span className="progress-item-separator">•</span>
                              <span className="progress-item-score">
                                Điểm: {p.scoreSum}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="progress-item-meta">
                          Lần cuối: {formatDate(p.lastSeen)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="progress-section">
                <h3 className="progress-section-title">Bài Tập Gần Đây</h3>
                {recentAttempts.length === 0 ? (
                  <p className="progress-empty">Chưa có bài tập nào</p>
                ) : (
                  <div className="attempts-list">
                    {recentAttempts.map((attempt) => (
                      <div key={attempt.id} className="attempt-item">
                        <div className="attempt-item-header">
                          <h4 className="attempt-item-title">
                            {attempt.activityTitle}
                          </h4>
                          {attempt.score !== null && attempt.maxScore !== null && (
                            <span className="attempt-item-score">
                              {attempt.score}/{attempt.maxScore}
                            </span>
                          )}
                        </div>
                        <div className="attempt-item-details">
                          <span>{attempt.skill}</span>
                          <span className="attempt-item-separator">•</span>
                          <span>{attempt.level}</span>
                          <span className="attempt-item-separator">•</span>
                          <span>{formatDate(attempt.submittedAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


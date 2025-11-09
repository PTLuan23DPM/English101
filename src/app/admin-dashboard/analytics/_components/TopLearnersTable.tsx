"use client";

import { useState, useEffect } from "react";

interface TopLearner {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  streak: number;
  longestStreak: number;
  cefrLevel: string | null;
  lastActive: Date | null;
  rank: number;
  stats: {
    totalProgress: number;
    completedProgress: number;
    totalAttempts: number;
    totalScore: number;
    avgScore: number;
  };
}

export default function TopLearnersTable() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [learners, setLearners] = useState<TopLearner[]>([]);
  const [sortBy, setSortBy] = useState("streak");

  useEffect(() => {
    fetchData();
  }, [sortBy]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin-dashboard/analytics/top-learners?sortBy=${sortBy}&limit=20`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }
      const result = await response.json();
      if (result.success) {
        setLearners(result.data.users);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Error fetching top learners:", err);
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
    });
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  const getRankBadgeClass = (rank: number) => {
    if (rank === 1) return "rank-badge--gold";
    if (rank === 2) return "rank-badge--silver";
    if (rank === 3) return "rank-badge--bronze";
    return "";
  };

  if (loading) {
    return (
      <div className="table-loading">
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="table-error">
        <p>Lỗi: {error}</p>
        <button onClick={fetchData} className="retry-button">
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="top-learners-container">
      <div className="table-controls">
        <div className="sort-selector">
          <label>Sắp xếp theo:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="streak">Streak (ngày liên tiếp)</option>
            <option value="progress">Số bài học hoàn thành</option>
            <option value="score">Tổng điểm</option>
            <option value="attempts">Số bài tập đã làm</option>
          </select>
        </div>
      </div>

      <div className="learners-table-container">
        <table className="learners-table">
          <thead>
            <tr>
              <th>Hạng</th>
              <th>Người học</th>
              <th>Streak</th>
              <th>Bài học</th>
              <th>Bài tập</th>
              <th>Tổng điểm</th>
              <th>Điểm TB</th>
              <th>Cấp độ</th>
              <th>Hoạt động cuối</th>
            </tr>
          </thead>
          <tbody>
            {learners.length === 0 ? (
              <tr>
                <td colSpan={9} className="table-empty">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              learners.map((learner) => (
                <tr key={learner.id}>
                  <td>
                    <span
                      className={`rank-badge ${getRankBadgeClass(learner.rank)}`}
                    >
                      {getRankBadge(learner.rank)}
                    </span>
                  </td>
                  <td>
                    <div className="learner-user">
                      {learner.image ? (
                        <img
                          src={learner.image}
                          alt={learner.name || "User"}
                          className="learner-avatar"
                        />
                      ) : (
                        <div className="learner-avatar-placeholder">
                          {(learner.name || learner.email || "U")[0].toUpperCase()}
                        </div>
                      )}
                      <div className="learner-info">
                        <div className="learner-name">
                          {learner.name || "Chưa có tên"}
                        </div>
                        <div className="learner-email">{learner.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="learner-streak">
                      <span className="streak-current">🔥 {learner.streak}</span>
                      {learner.longestStreak > learner.streak && (
                        <span className="streak-best">
                          (Tốt nhất: {learner.longestStreak})
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="learner-progress">
                      <span className="progress-completed">
                        {learner.stats.completedProgress}
                      </span>
                      <span className="progress-separator">/</span>
                      <span className="progress-total">
                        {learner.stats.totalProgress}
                      </span>
                    </div>
                  </td>
                  <td>{learner.stats.totalAttempts}</td>
                  <td>
                    <span className="score-value">{learner.stats.totalScore}</span>
                  </td>
                  <td>
                    <span className="avg-score-value">
                      {learner.stats.avgScore.toFixed(1)}
                    </span>
                  </td>
                  <td>
                    {learner.cefrLevel ? (
                      <span className="learner-level-badge">
                        {learner.cefrLevel}
                      </span>
                    ) : (
                      <span className="learner-level-badge learner-level-badge--none">
                        Chưa test
                      </span>
                    )}
                  </td>
                  <td>{formatDate(learner.lastActive)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


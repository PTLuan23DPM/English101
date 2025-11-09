"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface Rating {
  id: string;
  rating: number;
  comment: string | null;
  helpful: boolean | null;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
  unit: {
    id: string;
    title: string;
  } | null;
  activity: {
    id: string;
    title: string;
  } | null;
}

interface RatingStats {
  _count: number;
  averageRating: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  helpfulCount: number;
  helpfulPercentage: number;
}

const COLORS = ["#EF4444", "#F59E0B", "#FCD34D", "#10B981", "#3B82F6"];

export default function RatingsStats() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [stats, setStats] = useState<RatingStats | null>(null);

  useEffect(() => {
    fetchRatings();
  }, []);

  const fetchRatings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/admin-dashboard/ratings");
      
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
        setRatings(data.ratings);
        setStats(data.stats);
      } else {
        throw new Error(data.error || "Invalid response format");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      console.error("Error fetching ratings:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const renderStars = (rating: number) => {
    return "⭐".repeat(rating) + "☆".repeat(5 - rating);
  };

  if (loading) {
    return (
      <div className="ratings-loading">
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ratings-error">
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
        <button onClick={fetchRatings} className="retry-button">
          Thử lại
        </button>
      </div>
    );
  }

  const distributionData = stats
    ? [
        { name: "1 sao", value: stats.distribution[1], color: COLORS[0] },
        { name: "2 sao", value: stats.distribution[2], color: COLORS[1] },
        { name: "3 sao", value: stats.distribution[3], color: COLORS[2] },
        { name: "4 sao", value: stats.distribution[4], color: COLORS[3] },
        { name: "5 sao", value: stats.distribution[5], color: COLORS[4] },
      ]
    : [];

  return (
    <div className="ratings-stats-container">
      {stats && (
        <div className="ratings-stats-grid">
          <div className="rating-stat-card">
            <div className="rating-stat-label">Tổng đánh giá</div>
            <div className="rating-stat-value">{stats._count}</div>
          </div>
          <div className="rating-stat-card">
            <div className="rating-stat-label">Điểm trung bình</div>
            <div className="rating-stat-value rating-stat-value--average">
              {stats.averageRating.toFixed(1)} ⭐
            </div>
          </div>
          <div className="rating-stat-card">
            <div className="rating-stat-label">Hữu ích</div>
            <div className="rating-stat-value rating-stat-value--helpful">
              {stats.helpfulPercentage}%
            </div>
          </div>
        </div>
      )}

      {stats && (
        <div className="ratings-charts">
          <div className="chart-section">
            <h3 className="chart-title">Phân Bố Đánh Giá</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={distributionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-section">
            <h3 className="chart-title">Tỷ Lệ Đánh Giá</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="ratings-list-section">
        <h3 className="section-title">Đánh Giá Gần Đây</h3>
        {ratings.length === 0 ? (
          <div className="empty-state">
            <p>Chưa có đánh giá nào</p>
          </div>
        ) : (
          <div className="ratings-list">
            {ratings.map((rating) => (
              <div key={rating.id} className="rating-card">
                <div className="rating-header">
                  <div className="rating-user">
                    <span className="rating-user-name">
                      {rating.user.name || rating.user.email}
                    </span>
                    <span className="rating-stars">{renderStars(rating.rating)}</span>
                  </div>
                  <span className="rating-date">{formatDate(rating.createdAt)}</span>
                </div>
                {(rating.unit || rating.activity) && (
                  <div className="rating-target">
                    {rating.unit && <span>Bài học: {rating.unit.title}</span>}
                    {rating.activity && <span>Bài tập: {rating.activity.title}</span>}
                  </div>
                )}
                {rating.comment && (
                  <div className="rating-comment">
                    <p>{rating.comment}</p>
                  </div>
                )}
                {rating.helpful !== null && (
                  <div className="rating-helpful">
                    {rating.helpful ? "✅ Hữu ích" : "❌ Không hữu ích"}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


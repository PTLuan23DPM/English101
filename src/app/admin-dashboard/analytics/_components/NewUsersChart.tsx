"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ChartData {
  date: string;
  count: number;
}

interface Totals {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
}

export default function NewUsersChart() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [period, setPeriod] = useState("30");

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin-dashboard/analytics/new-users?period=${period}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }
      const result = await response.json();
      if (result.success) {
        setChartData(result.data.chartData);
        setTotals(result.data.totals);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Error fetching new users data:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", { day: "numeric", month: "short" });
  };

  if (loading) {
    return (
      <div className="chart-loading">
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chart-error">
        <p>Lỗi: {error}</p>
        <button onClick={fetchData} className="retry-button">
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="new-users-chart-container">
      <div className="chart-controls">
        <div className="period-selector">
          <label>Khoảng thời gian:</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="period-select"
          >
            <option value="7">7 ngày qua</option>
            <option value="30">30 ngày qua</option>
            <option value="90">90 ngày qua</option>
            <option value="365">1 năm qua</option>
          </select>
        </div>
      </div>

      {totals && (
        <div className="chart-stats-grid">
          <div className="chart-stat-card">
            <div className="chart-stat-label">Hôm nay</div>
            <div className="chart-stat-value">{totals.today}</div>
          </div>
          <div className="chart-stat-card">
            <div className="chart-stat-label">Tuần này</div>
            <div className="chart-stat-value">{totals.thisWeek}</div>
          </div>
          <div className="chart-stat-card">
            <div className="chart-stat-label">Tháng này</div>
            <div className="chart-stat-value">{totals.thisMonth}</div>
          </div>
          <div className="chart-stat-card">
            <div className="chart-stat-label">Tổng cộng</div>
            <div className="chart-stat-value chart-stat-value--total">
              {totals.total}
            </div>
          </div>
        </div>
      )}

      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#6B7280"
              style={{ fontSize: "12px" }}
            />
            <YAxis stroke="#6B7280" style={{ fontSize: "12px" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
              }}
              labelFormatter={(value) => formatDate(value)}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="count"
              name="Số người dùng mới"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={{ fill: "#3B82F6", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}


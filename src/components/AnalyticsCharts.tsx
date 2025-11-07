"use client";

import { useEffect, useState } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface SkillsData {
  skill: string;
  completed: number;
  avgScore: number;
}

interface AnalyticsChartsProps {
  skillsBreakdown: SkillsData[];
  timeFilter?: "all" | "month" | "week";
}

interface SkillChartData {
  skill: string;
  value: number;
  fullMark: number;
}

interface PerformanceChartData {
  skill: string;
  completed: number;
  avgScore: number;
}

export default function AnalyticsCharts({
  skillsBreakdown,
}: AnalyticsChartsProps) {
  const [skillsData, setSkillsData] = useState<SkillChartData[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceChartData[]>([]);

  useEffect(() => {
    // Prepare skills radar chart data
    const skills = skillsBreakdown.map((item) => ({
      skill: item.skill.replace("_", " "),
      value: item.avgScore || 0,
      fullMark: 100,
    }));

    // Prepare performance bar chart data
    const performance = skillsBreakdown.map((item) => ({
      skill: item.skill.replace("_", " "),
      completed: item.completed,
      avgScore: item.avgScore || 0,
    }));

    setSkillsData(skills);
    setPerformanceData(performance);
  }, [skillsBreakdown]);

  if (skillsData.length === 0) {
    return (
      <div className="analytics-charts">
        <div className="chart-container" style={{ textAlign: "center", padding: "40px" }}>
          <p style={{ color: "#666" }}>No data available yet. Complete some exercises to see your analytics!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-charts">
      <div className="chart-container">
        <h4 style={{ marginBottom: "16px", fontSize: "16px", fontWeight: "600" }}>
          Skills Performance
        </h4>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={skillsData}>
            <PolarGrid />
            <PolarAngleAxis
              dataKey="skill"
              tick={{ fontSize: 12, fill: "#666" }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: "#999" }}
            />
            <Radar
              name="Score"
              dataKey="value"
              stroke="#667eea"
              fill="#667eea"
              fillOpacity={0.6}
            />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-container">
        <h4 style={{ marginBottom: "16px", fontSize: "16px", fontWeight: "600" }}>
          Activity & Scores
        </h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={performanceData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="skill"
              tick={{ fontSize: 12, fill: "#666" }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis yAxisId="left" tick={{ fontSize: 12, fill: "#666" }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: "#666" }} />
            <Tooltip />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="completed"
              fill="#667eea"
              name="Completed"
            />
            <Bar
              yAxisId="right"
              dataKey="avgScore"
              fill="#10b981"
              name="Avg Score"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}


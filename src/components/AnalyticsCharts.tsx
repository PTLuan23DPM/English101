"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
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

  const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"];

  useEffect(() => {
    // Format skill names
    const formatSkillName = (skill: string) => {
      return skill
        .replace(/_/g, " ")
        .replace("WRITING", "Writing")
        .replace("READING", "Reading")
        .replace("LISTENING", "Listening")
        .replace("SPEAKING", "Speaking")
        .replace("GRAMMAR", "Grammar")
        .replace("VOCABULARY", "Vocabulary")
        .replace("PRONUNCIATION", "Pronunciation");
    };

    // Prepare skills chart data (sorted by score for better visualization)
    const skills = skillsBreakdown
      .map((item) => ({
        skill: formatSkillName(item.skill),
        value: item.avgScore || 0,
        fullMark: 100,
      }))
      .sort((a, b) => b.value - a.value); // Sort by score descending

    // Prepare performance bar chart data
    const performance = skillsBreakdown
      .map((item) => ({
        skill: formatSkillName(item.skill),
        completed: item.completed,
        avgScore: item.avgScore || 0,
      }))
      .sort((a, b) => b.avgScore - a.avgScore); // Sort by score descending

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
    <div className="analytics-charts-modern">
      {/* Average Score by Skill - Radial Bar Chart */}
      <div className="chart-card">
        <div className="chart-header">
          <div>
            <h4>📊 Skills Performance</h4>
            <p>Your strengths across different skills</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={skillsData} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
            <defs>
              <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.6} />
            <XAxis 
              dataKey="skill"
              tick={{ fontSize: 13, fill: "#1e293b", fontWeight: 600 }}
              axisLine={{ stroke: "#cbd5e1", strokeWidth: 2 }}
              tickLine={{ stroke: "#cbd5e1" }}
            />
            <YAxis 
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: "#64748b", fontWeight: 500 }}
              axisLine={{ stroke: "#cbd5e1", strokeWidth: 2 }}
              tickLine={{ stroke: "#cbd5e1" }}
              label={{ 
                value: "Score (%)", 
                angle: -90, 
                position: "insideLeft",
                style: { fill: "#64748b", fontWeight: 600, fontSize: 13 }
              }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.98)",
                border: "none",
                borderRadius: "12px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                padding: "12px 16px",
              }}
              labelStyle={{ fontWeight: 700, color: "#1e293b", marginBottom: "4px" }}
              cursor={{ strokeDasharray: "3 3" }}
            />
            <Area 
              type="monotone"
              dataKey="value"
              stroke="#6366f1"
              strokeWidth={0}
              fill="url(#colorArea)"
              name="Score"
            />
            <Line 
              type="monotone"
              dataKey="value" 
              stroke="#6366f1"
              strokeWidth={3}
              dot={{ 
                fill: "#6366f1", 
                strokeWidth: 3, 
                r: 6,
                stroke: "white"
              }}
              activeDot={{ 
                r: 8,
                stroke: "#6366f1",
                strokeWidth: 3,
                fill: "white"
              }}
              name="Score"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Activities & Performance Comparison */}
      <div className="chart-card">
        <div className="chart-header">
          <div>
            <h4>📈 Activity Progress & Performance</h4>
            <p>Completed exercises and average scores</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={performanceData} margin={{ top: 20 }}>
            <defs>
              <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1}/>
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0.8}/>
              </linearGradient>
              <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={1}/>
                <stop offset="100%" stopColor="#059669" stopOpacity={0.8}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.6} />
            <XAxis 
              dataKey="skill" 
              tick={{ fontSize: 13, fill: "#1e293b", fontWeight: 600 }}
              axisLine={{ stroke: "#cbd5e1" }}
            />
            <YAxis 
              yAxisId="left"
              tick={{ fontSize: 12, fill: "#64748b" }}
              axisLine={{ stroke: "#cbd5e1" }}
              label={{ value: "Completed", angle: -90, position: "insideLeft", style: { fill: "#64748b", fontWeight: 600 } }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: "#64748b" }}
              axisLine={{ stroke: "#cbd5e1" }}
              label={{ value: "Score", angle: 90, position: "insideRight", style: { fill: "#64748b", fontWeight: 600 } }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.98)",
                border: "none",
                borderRadius: "12px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                padding: "12px 16px",
              }}
              labelStyle={{ fontWeight: 700, color: "#1e293b", marginBottom: "8px" }}
              cursor={{ fill: "rgba(99, 102, 241, 0.05)" }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: "20px" }}
              iconType="circle"
            />
            <Bar 
              yAxisId="left"
              dataKey="completed" 
              name="Activities Completed" 
              fill="url(#completedGrad)"
              radius={[8, 8, 0, 0]}
              barSize={40}
            />
            <Bar 
              yAxisId="right"
              dataKey="avgScore" 
              name="Average Score (%)" 
              fill="url(#scoreGrad)"
              radius={[8, 8, 0, 0]}
              barSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}


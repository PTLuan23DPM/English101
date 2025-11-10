"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import "./reports.css";

interface Activity {
  id: string;
  skill: string;
  activityType: string;
  score: number;
  completed: boolean;
  date: string;
  metadata: any;
}

export default function ReportsPage() {
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, writing, reading, listening, speaking

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const res = await fetch("/api/user/stats");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.stats.recentActivities) {
          setActivities(data.stats.recentActivities);
        }
      }
    } catch (error) {
      console.error("Failed to fetch activities:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredActivities =
    filter === "all"
      ? activities
      : activities.filter((act) => act.skill.toLowerCase() === filter);

  const getSkillIcon = (skill: string) => {
    const icons: Record<string, string> = {
      writing: "✍️",
      reading: "📚",
      listening: "🎧",
      speaking: "🎤",
      grammar: "📖",
      vocabulary: "📝",
    };
    return icons[skill.toLowerCase()] || "📚";
  };

  const getScoreBadgeClass = (score: number) => {
    if (score >= 80) return "excellent";
    if (score >= 70) return "good";
    if (score >= 50) return "average";
    return "needs-improvement";
  };

  if (loading) {
    return (
      <div className="reports-page">
        <div className="reports-loading">Loading your reports...</div>
      </div>
    );
  }

  return (
    <div className="reports-page">
      <div className="reports-header">
        <div>
          <h1>My Reports</h1>
          <p>View all your completed activities and performance history</p>
        </div>
        <Link href="/english/dashboard" className="btn outline">
          Back to Dashboard
        </Link>
      </div>

      <div className="reports-filters">
        <button
          className={`filter-btn ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All Activities
        </button>
        <button
          className={`filter-btn ${filter === "writing" ? "active" : ""}`}
          onClick={() => setFilter("writing")}
        >
          ✍️ Writing
        </button>
        <button
          className={`filter-btn ${filter === "reading" ? "active" : ""}`}
          onClick={() => setFilter("reading")}
        >
          📚 Reading
        </button>
        <button
          className={`filter-btn ${filter === "listening" ? "active" : ""}`}
          onClick={() => setFilter("listening")}
        >
          🎧 Listening
        </button>
        <button
          className={`filter-btn ${filter === "speaking" ? "active" : ""}`}
          onClick={() => setFilter("speaking")}
        >
          🎤 Speaking
        </button>
      </div>

      {filteredActivities.length === 0 ? (
        <div className="reports-empty">
          <div className="empty-icon">📊</div>
          <h3>No reports found</h3>
          <p>Complete some activities to see your reports here</p>
          <Link href="/english/writing" className="btn primary">
            Start Practicing
          </Link>
        </div>
      ) : (
        <div className="reports-list">
          {filteredActivities.map((activity) => (
            <div key={activity.id} className="report-card">
              <div className="report-header">
                <div className="report-skill">
                  <span className="skill-icon">{getSkillIcon(activity.skill)}</span>
                  <span className="skill-name">{activity.skill}</span>
                </div>
                <span className="report-date">
                  {new Date(activity.date).toLocaleDateString()}
                </span>
              </div>
              <div className="report-body">
                <div className="report-title">
                  {activity.metadata?.taskId || "Practice Activity"}
                </div>
                {activity.metadata?.level && (
                  <span className="level-badge">{activity.metadata.level}</span>
                )}
              </div>
              <div className="report-footer">
                <div className={`score-badge-large ${getScoreBadgeClass(activity.score * 10)}`}>
                  {Math.round(activity.score * 10)}%
                </div>
                {activity.metadata?.wordCount && (
                  <span className="word-count">{activity.metadata.wordCount} words</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


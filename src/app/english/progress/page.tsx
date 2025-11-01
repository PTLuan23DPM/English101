"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface ProgressStats {
  cefrLevel: string;
  totalActivities: number;
  completedActivities: number;
  streak: number;
  longestStreak: number;
  skillBreakdown: {
    reading: number;
    writing: number;
    listening: number;
    speaking: number;
    grammar: number;
    vocabulary: number;
  };
  recentActivities: Array<{
    date: string;
    skill: string;
    activityType: string;
    score?: number;
  }>;
}

export default function ProgressPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      const response = await fetch("/api/progress/stats");
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Failed to load progress:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="progress-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading your progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="progress-page">
      <div className="progress-container">
        <h1>My Progress</h1>
        <p className="subtitle">Track your learning journey</p>

        {/* Level & Streak */}
        <div className="stats-grid">
          <div className="stat-card level-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-content">
              <div className="stat-value">{stats?.cefrLevel || "A1"}</div>
              <div className="stat-label">Current Level</div>
            </div>
          </div>

          <div className="stat-card streak-card">
            <div className="stat-icon">🔥</div>
            <div className="stat-content">
              <div className="stat-value">{stats?.streak || 0} days</div>
              <div className="stat-label">Current Streak</div>
              <div className="stat-note">
                Best: {stats?.longestStreak || 0} days
              </div>
            </div>
          </div>

          <div className="stat-card activities-card">
            <div className="stat-icon">📚</div>
            <div className="stat-content">
              <div className="stat-value">{stats?.completedActivities || 0}</div>
              <div className="stat-label">Completed Activities</div>
            </div>
          </div>
        </div>

        {/* Skills Breakdown */}
        <section className="card">
          <h2>Skills Progress</h2>
          <div className="skills-grid">
            {Object.entries(stats?.skillBreakdown || {}).map(([skill, count]) => (
              <div key={skill} className="skill-item">
                <div className="skill-header">
                  <span className="skill-name">
                    {skill.charAt(0).toUpperCase() + skill.slice(1)}
                  </span>
                  <span className="skill-count">{count} activities</span>
                </div>
                <div className="skill-bar">
                  <div
                    className="skill-fill"
                    style={{ width: `${Math.min((count / 20) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Activity */}
        <section className="card">
          <h2>Recent Activity</h2>
          {stats?.recentActivities && stats.recentActivities.length > 0 ? (
            <div className="activity-list">
              {stats.recentActivities.map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-date">
                    {new Date(activity.date).toLocaleDateString()}
                  </div>
                  <div className="activity-info">
                    <span className="activity-skill">{activity.skill}</span>
                    <span className="activity-type">{activity.activityType}</span>
                  </div>
                  {activity.score !== undefined && (
                    <div className="activity-score">{activity.score}%</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No activities yet. Start practicing to see your progress!</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}


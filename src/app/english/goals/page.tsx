"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

interface Goal {
  id: string;
  type: string;
  target: number;
  current: number;
  deadline?: string;
  completed: boolean;
}

export default function GoalsPage() {
  const { data: session } = useSession();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const response = await fetch("/api/goals/list");
      const data = await response.json();
      setGoals(data.goals || []);
    } catch (error) {
      console.error("Failed to load goals:", error);
    } finally {
      setLoading(false);
    }
  };

  // Mock analytics data
  const skillData = [
    { skill: "Reading", score: 75, target: 100 },
    { skill: "Writing", score: 60, target: 100 },
    { skill: "Listening", score: 80, target: 100 },
    { skill: "Speaking", score: 55, target: 100 },
    { skill: "Grammar", score: 70, target: 100 },
    { skill: "Vocabulary", score: 65, target: 100 },
  ];

  const weeklyProgress = [
    { day: "Mon", activities: 3 },
    { day: "Tue", activities: 5 },
    { day: "Wed", activities: 2 },
    { day: "Thu", activities: 4 },
    { day: "Fri", activities: 6 },
    { day: "Sat", activities: 1 },
    { day: "Sun", activities: 3 },
  ];

  return (
    <div className="goals-page">
      <div className="goals-container">
        <div className="page-header">
          <div>
            <h1>Goals & Targets</h1>
            <p className="subtitle">Track your learning goals and analyze your performance</p>
          </div>
          <button className="btn primary" onClick={() => {/* TODO: Implement create goal modal */}}>
            + New Goal
          </button>
        </div>

        {/* Analytics Overview */}
        <div className="analytics-grid">
          <section className="card chart-card">
            <h2>Weekly Activity</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={weeklyProgress}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="activities" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </section>

          <section className="card chart-card">
            <h2>Skills Analysis</h2>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={skillData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="skill" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar
                  name="Current"
                  dataKey="score"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.6}
                />
              </RadarChart>
            </ResponsiveContainer>
          </section>
        </div>

        {/* Strengths & Weaknesses */}
        <div className="insights-grid">
          <section className="card">
            <h2>💪 Strengths</h2>
            <div className="insight-list">
              <div className="insight-item strength">
                <div className="insight-icon">📖</div>
                <div className="insight-content">
                  <div className="insight-title">Listening</div>
                  <div className="insight-desc">80% accuracy - Keep it up!</div>
                </div>
              </div>
              <div className="insight-item strength">
                <div className="insight-icon">📚</div>
                <div className="insight-content">
                  <div className="insight-title">Reading</div>
                  <div className="insight-desc">75% accuracy - Strong comprehension</div>
                </div>
              </div>
            </div>
          </section>

          <section className="card">
            <h2>🎯 Areas to Improve</h2>
            <div className="insight-list">
              <div className="insight-item weakness">
                <div className="insight-icon">💬</div>
                <div className="insight-content">
                  <div className="insight-title">Speaking</div>
                  <div className="insight-desc">55% - Practice more conversations</div>
                </div>
              </div>
              <div className="insight-item weakness">
                <div className="insight-icon">✍️</div>
                <div className="insight-content">
                  <div className="insight-title">Writing</div>
                  <div className="insight-desc">60% - Focus on structure & vocabulary</div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Active Goals */}
        <section className="card">
          <h2>Your Goals</h2>
          {goals.length > 0 ? (
            <div className="goals-list">
              {goals.map((goal) => (
                <div key={goal.id} className="goal-item">
                  <div className="goal-info">
                    <div className="goal-type">{goal.type.replace("_", " ")}</div>
                    <div className="goal-progress-text">
                      {goal.current} / {goal.target}
                    </div>
                  </div>
                  <div className="goal-bar">
                    <div
                      className="goal-fill"
                      style={{ width: `${(goal.current / goal.target) * 100}%` }}
                    />
                  </div>
                  {goal.deadline && (
                    <div className="goal-deadline">
                      Due: {new Date(goal.deadline).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No goals yet. Create your first goal to start tracking!</p>
              <button className="btn primary" onClick={() => {/* TODO: Implement create goal modal */}}>
                Create Goal
              </button>
            </div>
          )}
        </section>

        {/* Predictions */}
        <section className="card">
          <h2>📈 Predictions</h2>
          <div className="prediction-grid">
            <div className="prediction-item">
              <div className="prediction-icon">🎯</div>
              <div className="prediction-content">
                <div className="prediction-title">Next Level</div>
                <div className="prediction-value">~3 months</div>
                <div className="prediction-desc">
                  At your current pace, you&apos;ll reach {" "}
                  {(session?.user as { cefrLevel?: string })?.cefrLevel === "A1" ? "A2" : "next level"} in about 3 months
                </div>
              </div>
            </div>

            <div className="prediction-item">
              <div className="prediction-icon">📚</div>
              <div className="prediction-content">
                <div className="prediction-title">Weekly Goal</div>
                <div className="prediction-value">24/30 activities</div>
                <div className="prediction-desc">
                  6 more activities to reach your weekly target
                </div>
              </div>
            </div>

            <div className="prediction-item">
              <div className="prediction-icon">🔥</div>
              <div className="prediction-content">
                <div className="prediction-title">Streak Potential</div>
                <div className="prediction-value">30 days</div>
                <div className="prediction-desc">
                  Keep practicing daily to reach a 30-day streak
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}


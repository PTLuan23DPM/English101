"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import Link from "next/link";
import "./goals.css";

interface Goal {
  id: string;
  type: string;
  target: number;
  current: number;
  deadline: string | null;
  completed: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

const GOAL_TYPES = [
  { value: "daily_exercises", label: "Daily Exercises", icon: "📚", unit: "exercises" },
  { value: "weekly_hours", label: "Weekly Study Hours", icon: "⏰", unit: "hours" },
  { value: "target_level", label: "Target CEFR Level", icon: "🎯", unit: "level" },
  { value: "skill_improvement", label: "Skill Improvement", icon: "📈", unit: "%" },
  { value: "writing_tasks", label: "Writing Tasks", icon: "✍️", unit: "tasks" },
  { value: "reading_tasks", label: "Reading Tasks", icon: "📖", unit: "tasks" },
  { value: "listening_tasks", label: "Listening Tasks", icon: "🎧", unit: "tasks" },
  { value: "speaking_tasks", label: "Speaking Tasks", icon: "🎤", unit: "tasks" },
];

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    type: "daily_exercises",
    target: 5,
    deadline: "",
  });

  useEffect(() => {
    fetchGoals();
    const interval = setInterval(fetchGoals, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchGoals = async () => {
    try {
      const res = await fetch("/api/goals");
      if (res.ok) {
        const data = await res.json();
        setGoals(data.goals || []);
      }
    } catch (error) {
      console.error("Failed to fetch goals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newGoal.target <= 0) {
      toast.error("Target must be greater than 0");
      return;
    }

    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newGoal),
      });

      if (!res.ok) {
        throw new Error("Failed to create goal");
      }

      toast.success("Goal created successfully!");
      setShowCreateModal(false);
      setNewGoal({ type: "daily_exercises", target: 5, deadline: "" });
      fetchGoals();
    } catch (error) {
      console.error("Create goal error:", error);
      toast.error("Failed to create goal");
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm("Are you sure you want to delete this goal?")) return;

    try {
      const res = await fetch(`/api/goals/${goalId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete goal");
      }

      toast.success("Goal deleted!");
      fetchGoals();
    } catch (error) {
      console.error("Delete goal error:", error);
      toast.error("Failed to delete goal");
    }
  };

  const getGoalTypeInfo = (type: string) => {
    return GOAL_TYPES.find((t) => t.value === type) || GOAL_TYPES[0];
  };

  const getProgress = (goal: Goal) => {
    return Math.min(100, Math.round((goal.current / goal.target) * 100));
  };

  const getDaysRemaining = (deadline: string | null) => {
    if (!deadline) return null;
    const days = Math.ceil(
      (new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return days > 0 ? days : 0;
  };

  if (loading) {
    return (
      <div className="goals-page">
        <div className="goals-loading">Loading your goals...</div>
      </div>
    );
  }

  return (
    <div className="goals-page">
      <div className="goals-header">
        <div>
          <h1>Goals & Targets</h1>
          <p>Set and track your learning goals</p>
        </div>
        <div className="header-actions">
          <button className="btn primary" onClick={() => setShowCreateModal(true)}>
            + Create New Goal
          </button>
          <Link href="/english/dashboard" className="btn outline">
            Back to Dashboard
          </Link>
        </div>
      </div>

      {goals.length === 0 ? (
        <div className="goals-empty">
          <div className="empty-icon">🎯</div>
          <h3>No goals yet</h3>
          <p>Create your first goal to start tracking your progress!</p>
          <button className="btn primary" onClick={() => setShowCreateModal(true)}>
            Create Your First Goal
          </button>
        </div>
      ) : (
        <div className="goals-grid">
          {goals.map((goal) => {
            const typeInfo = getGoalTypeInfo(goal.type);
            const progress = getProgress(goal);
            const daysRemaining = getDaysRemaining(goal.deadline);

            return (
              <div
                key={goal.id}
                className={`goal-card ${goal.completed ? "completed" : ""}`}
              >
                <div className="goal-header">
                  <div className="goal-icon">{typeInfo.icon}</div>
                  <button
                    className="goal-delete"
                    onClick={() => handleDeleteGoal(goal.id)}
                  >
                    ×
                  </button>
                </div>
                <h3>{typeInfo.label}</h3>
                <div className="goal-progress">
                  <div className="goal-stats">
                    <span className="current">{goal.current}</span>
                    <span className="separator">/</span>
                    <span className="target">
                      {goal.target} {typeInfo.unit}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="progress-text">{progress}% Complete</div>
                </div>
                {daysRemaining !== null && (
                  <div className="goal-deadline">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle
                        cx="8"
                        cy="8"
                        r="6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M8 4V8L10 10"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    {daysRemaining === 0
                      ? "Deadline today!"
                      : daysRemaining === 1
                      ? "1 day remaining"
                      : `${daysRemaining} days remaining`}
                  </div>
                )}
                {goal.completed && (
                  <div className="goal-completed-badge">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="10" fill="#10b981" />
                      <path
                        d="M6 10L9 13L14 7"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                    Completed!
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Goal Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Goal</h2>
              <button
                className="modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateGoal}>
              <div className="form-group">
                <label>Goal Type</label>
                <select
                  value={newGoal.type}
                  onChange={(e) =>
                    setNewGoal((prev) => ({ ...prev, type: e.target.value }))
                  }
                >
                  {GOAL_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Target ({getGoalTypeInfo(newGoal.type).unit})</label>
                <input
                  type="number"
                  min="1"
                  value={newGoal.target}
                  onChange={(e) =>
                    setNewGoal((prev) => ({
                      ...prev,
                      target: parseInt(e.target.value) || 0,
                    }))
                  }
                  placeholder="Enter target value"
                />
              </div>
              <div className="form-group">
                <label>Deadline (Optional)</label>
                <input
                  type="date"
                  value={newGoal.deadline}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) =>
                    setNewGoal((prev) => ({ ...prev, deadline: e.target.value }))
                  }
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn outline"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn primary">
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

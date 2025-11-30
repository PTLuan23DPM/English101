"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type CEFRLevel = "A1-A2" | "B1-B2" | "C1" | "all";

interface GrammarTopic {
  id: string;
  title: string;
  level: string;
  introduction: string;
  exampleCount: number;
  exerciseCount: number;
}

export default function GrammarPage() {
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel>("all");
  const [topics, setTopics] = useState<GrammarTopic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTopics() {
      try {
        const url = selectedLevel !== "all" 
          ? `/api/grammar/lessons?level=${selectedLevel}`
          : "/api/grammar/lessons";
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setTopics(data.lessons || []);
        }
      } catch (error) {
        console.error("Error loading topics:", error);
      } finally {
        setLoading(false);
      }
    }

    loadTopics();
  }, [selectedLevel]);

  const stats = {
    total: topics.length,
    completed: 0, // TODO: Track completion from user progress
    inProgress: topics.length,
  };

  return (
    <div className="dashboard-content">
      {/* Page Header */}
      <section className="card page-head">
        <div>
          <h1>Grammar & Structure</h1>
          <p className="muted">
            Master English grammar from basic to advanced levels
          </p>
        </div>

        <div className="head-actions">
          <div className="stats" style={{ gap: "16px" }}>
            <div className="stat">
              <span className="stat-val">{stats.completed}</span>
              <span className="stat-lbl">Completed</span>
            </div>
            <div className="stat">
              <span className="stat-val">{stats.inProgress}</span>
              <span className="stat-lbl">In Progress</span>
            </div>
            <div className="stat">
              <span className="stat-val">{stats.total}</span>
              <span className="stat-lbl">Total Topics</span>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="card">
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: "1", minWidth: "200px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
              Level
            </label>
            <select
              className="select"
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value as CEFRLevel)}
              style={{ width: "100%" }}
            >
              <option value="all">All Levels</option>
              <option value="A1-A2">A1-A2 - Beginner to Elementary</option>
              <option value="B1-B2">B1-B2 - Intermediate to Upper Intermediate</option>
              <option value="C1">C1 - Advanced</option>
            </select>
          </div>

        </div>
      </section>

      {/* Grammar Topics Grid */}
      {loading ? (
        <div className="empty-state">
          <p>Loading grammar lessons...</p>
        </div>
      ) : (
        <>
          <div className="module-grid">
            {topics.map((topic) => (
              <Link
                href={`/english/grammar/${topic.id}`}
                key={topic.id}
                className="module-card"
                style={{ textDecoration: "none" }}
              >
                <div className="module-card-header">
                  <div className="module-meta">
                    <span className={`level-badge level-${topic.level.toLowerCase().replace("-", "")}`}>
                      {topic.level}
                    </span>
                  </div>
                </div>

                <h3 className="module-title">{topic.title}</h3>
                <p className="module-description">
                  {topic.introduction.substring(0, 150)}
                  {topic.introduction.length > 150 ? "..." : ""}
                </p>

                <div className="module-stats">
                  <div className="module-stat">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M2 4H14V12H2V4Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      <path d="M5 7H11M5 9H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <span>{topic.exampleCount} examples</span>
                  </div>
                  <div className="module-stat">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      <path d="M6 8L7.5 9.5L10 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>{topic.exerciseCount} exercises</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {topics.length === 0 && (
            <div className="empty-state">
              <p>No grammar topics found for the selected level.</p>
              <button
                className="btn primary"
                onClick={() => setSelectedLevel("all")}
              >
                Clear Filter
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}


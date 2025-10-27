"use client";

import { useState } from "react";
import Link from "next/link";

type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

interface FunctionalTopic {
  id: string;
  title: string;
  level: CEFRLevel;
  description: string;
  situations: number;
  completed: boolean;
}

const FUNCTIONAL_TOPICS: FunctionalTopic[] = [
  { id: "1", title: "Greetings & Introductions", level: "A1", description: "Basic social interactions", situations: 8, completed: true },
  { id: "2", title: "Making Requests & Asking Permission", level: "A2", description: "Polite requests in daily life", situations: 12, completed: false },
  { id: "3", title: "Giving Opinions & Agreeing/Disagreeing", level: "B1", description: "Express your views clearly", situations: 10, completed: false },
  { id: "4", title: "Apologizing & Making Excuses", level: "A2", description: "Handle social situations gracefully", situations: 8, completed: false },
  { id: "5", title: "Making Suggestions & Recommendations", level: "B1", description: "Offer ideas and advice", situations: 10, completed: false },
  { id: "6", title: "Negotiating & Persuading", level: "B2", description: "Business and professional skills", situations: 15, completed: false },
  { id: "7", title: "Complaining & Problem Solving", level: "B1", description: "Handle complaints effectively", situations: 12, completed: false },
  { id: "8", title: "Socializing & Small Talk", level: "B1", description: "Build relationships through conversation", situations: 14, completed: false },
];

export default function FunctionalPage() {
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel | "all">("all");
  const filteredTopics = FUNCTIONAL_TOPICS.filter(t => selectedLevel === "all" || t.level === selectedLevel);
  const stats = { total: FUNCTIONAL_TOPICS.length, completed: FUNCTIONAL_TOPICS.filter(t => t.completed).length };

  return (
    <div className="dashboard-content">
      <section className="card page-head">
        <div>
          <h1>Functional Language</h1>
          <p className="muted">Learn language for real-life communication situations</p>
        </div>
        <div className="head-actions">
          <div className="stats" style={{ gap: "16px" }}>
            <div className="stat"><span className="stat-val">{stats.completed}</span><span className="stat-lbl">Completed</span></div>
            <div className="stat"><span className="stat-val">{stats.total}</span><span className="stat-lbl">Total</span></div>
          </div>
        </div>
      </section>

      <section className="card">
        <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>Level</label>
        <select className="select" value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value as CEFRLevel | "all")} style={{ width: "100%", maxWidth: "300px" }}>
          <option value="all">All Levels</option>
          <option value="A1">A1</option><option value="A2">A2</option><option value="B1">B1</option><option value="B2">B2</option><option value="C1">C1</option><option value="C2">C2</option>
        </select>
      </section>

      <div className="module-grid">
        {filteredTopics.map(topic => (
          <Link href={`/english/functional/${topic.id}`} key={topic.id} className="module-card" style={{ textDecoration: "none" }}>
            <div className="module-card-header">
              <div className="module-meta">
                <span className={`level-badge level-${topic.level.toLowerCase()}`}>{topic.level}</span>
              </div>
              {topic.completed && <span className="completion-badge">✓ Completed</span>}
            </div>
            <h3 className="module-title">{topic.title}</h3>
            <p className="module-description">{topic.description}</p>
            <div className="module-stats">
              <div className="module-stat"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4H14V12H2V4Z" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg><span>{topic.situations} situations</span></div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}


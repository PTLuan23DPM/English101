"use client";

import { useState } from "react";
import Link from "next/link";

type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

interface MediationTopic {
  id: string;
  title: string;
  level: CEFRLevel;
  description: string;
  exercises: number;
  completed: boolean;
}

const MEDIATION_TOPICS: MediationTopic[] = [
  { id: "1", title: "Summarizing Short Texts", level: "B1", description: "Extract and present key information", exercises: 10, completed: false },
  { id: "2", title: "Relaying Information", level: "B1", description: "Pass on messages accurately", exercises: 8, completed: false },
  { id: "3", title: "Explaining Data & Visuals", level: "B2", description: "Describe charts and graphs clearly", exercises: 12, completed: false },
  { id: "4", title: "Translating Simple Texts", level: "B2", description: "Transfer meaning between languages", exercises: 10, completed: false },
  { id: "5", title: "Facilitating Communication", level: "C1", description: "Bridge understanding between speakers", exercises: 15, completed: false },
  { id: "6", title: "Interpreting Complex Concepts", level: "C1", description: "Explain technical or abstract ideas", exercises: 14, completed: false },
  { id: "7", title: "Note-taking & Summarizing", level: "B2", description: "Capture essential information efficiently", exercises: 12, completed: false },
];

export default function MediationPage() {
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel | "all">("all");
  const filteredTopics = MEDIATION_TOPICS.filter(t => selectedLevel === "all" || t.level === selectedLevel);
  const stats = { total: MEDIATION_TOPICS.length, completed: MEDIATION_TOPICS.filter(t => t.completed).length };

  return (
    <div className="dashboard-content">
      <section className="card page-head">
        <div>
          <h1>Mediation & Communication</h1>
          <p className="muted">Develop skills to relay, summarize, and interpret information</p>
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
          <Link href={`/english/mediation/${topic.id}`} key={topic.id} className="module-card" style={{ textDecoration: "none" }}>
            <div className="module-card-header">
              <div className="module-meta">
                <span className={`level-badge level-${topic.level.toLowerCase()}`}>{topic.level}</span>
              </div>
              {topic.completed && <span className="completion-badge">✓ Completed</span>}
            </div>
            <h3 className="module-title">{topic.title}</h3>
            <p className="module-description">{topic.description}</p>
            <div className="module-stats">
              <div className="module-stat"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M6 8L7.5 9.5L10 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg><span>{topic.exercises} exercises</span></div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}


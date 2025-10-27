"use client";

import { useState } from "react";
import Link from "next/link";

type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

interface PronunTopic {
  id: string;
  title: string;
  level: CEFRLevel;
  description: string;
  sounds: number;
  exercises: number;
  completed: boolean;
}

const PRONUN_TOPICS: PronunTopic[] = [
  { id: "1", title: "Vowel Sounds - Short vs Long", level: "A1", description: "Basic vowel discrimination", sounds: 12, exercises: 8, completed: true },
  { id: "2", title: "Consonant Sounds - /θ/ and /ð/", level: "A2", description: "TH sounds in English", sounds: 2, exercises: 6, completed: false },
  { id: "3", title: "Word Stress Patterns", level: "B1", description: "Stress in multi-syllable words", sounds: 0, exercises: 12, completed: false },
  { id: "4", title: "Sentence Intonation", level: "B1", description: "Rising and falling tones", sounds: 0, exercises: 10, completed: false },
  { id: "5", title: "Connected Speech & Linking", level: "B2", description: "Natural speech patterns", sounds: 0, exercises: 15, completed: false },
  { id: "6", title: "Minimal Pairs Practice", level: "A2", description: "Distinguishing similar sounds", sounds: 20, exercises: 18, completed: false },
  { id: "7", title: "Sentence Rhythm", level: "B2", description: "Stress-timed rhythm in English", sounds: 0, exercises: 12, completed: false },
  { id: "8", title: "Weak Forms & Schwa", level: "C1", description: "Reduced pronunciation in natural speech", sounds: 10, exercises: 14, completed: false },
];

export default function PronunciationPage() {
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel | "all">("all");
  const filteredTopics = PRONUN_TOPICS.filter(t => selectedLevel === "all" || t.level === selectedLevel);
  const stats = { total: PRONUN_TOPICS.length, completed: PRONUN_TOPICS.filter(t => t.completed).length };

  return (
    <div className="dashboard-content">
      <section className="card page-head">
        <div>
          <h1>Pronunciation & Phonetics</h1>
          <p className="muted">Master English sounds, stress, and intonation</p>
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
          <Link href={`/english/pronunciation/${topic.id}`} key={topic.id} className="module-card" style={{ textDecoration: "none" }}>
            <div className="module-card-header">
              <div className="module-meta">
                <span className={`level-badge level-${topic.level.toLowerCase()}`}>{topic.level}</span>
              </div>
              {topic.completed && <span className="completion-badge">✓ Completed</span>}
            </div>
            <h3 className="module-title">{topic.title}</h3>
            <p className="module-description">{topic.description}</p>
            <div className="module-stats">
              {topic.sounds > 0 && <div className="module-stat"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg><span>{topic.sounds} sounds</span></div>}
              <div className="module-stat"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M6 8L7.5 9.5L10 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg><span>{topic.exercises} exercises</span></div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}


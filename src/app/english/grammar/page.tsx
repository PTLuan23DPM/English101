"use client";

import { useState } from "react";
import Link from "next/link";

type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
type GrammarCategory = "tenses" | "modals" | "conditionals" | "passive" | "articles" | "prepositions";

interface GrammarTopic {
  id: string;
  title: string;
  category: GrammarCategory;
  level: CEFRLevel;
  description: string;
  examples: number;
  exercises: number;
  completed: boolean;
}

const GRAMMAR_TOPICS: GrammarTopic[] = [
  {
    id: "1",
    title: "Present Simple Tense",
    category: "tenses",
    level: "A1",
    description: "Basic present tense for habits, routines, and facts",
    examples: 12,
    exercises: 8,
    completed: true,
  },
  {
    id: "2",
    title: "Present Continuous",
    category: "tenses",
    level: "A1",
    description: "Actions happening now or around now",
    examples: 10,
    exercises: 6,
    completed: true,
  },
  {
    id: "3",
    title: "Past Simple Tense",
    category: "tenses",
    level: "A2",
    description: "Completed actions in the past",
    examples: 15,
    exercises: 10,
    completed: false,
  },
  {
    id: "4",
    title: "Present Perfect",
    category: "tenses",
    level: "B1",
    description: "Past actions with present relevance",
    examples: 18,
    exercises: 12,
    completed: false,
  },
  {
    id: "5",
    title: "Modal Verbs - Can/Could",
    category: "modals",
    level: "A2",
    description: "Ability, permission, and possibility",
    examples: 14,
    exercises: 8,
    completed: false,
  },
  {
    id: "6",
    title: "Modal Verbs - Should/Must",
    category: "modals",
    level: "B1",
    description: "Advice, obligation, and necessity",
    examples: 16,
    exercises: 10,
    completed: false,
  },
  {
    id: "7",
    title: "First Conditional",
    category: "conditionals",
    level: "B1",
    description: "Real future possibilities",
    examples: 12,
    exercises: 8,
    completed: false,
  },
  {
    id: "8",
    title: "Second Conditional",
    category: "conditionals",
    level: "B1",
    description: "Hypothetical situations in the present/future",
    examples: 14,
    exercises: 9,
    completed: false,
  },
  {
    id: "9",
    title: "Passive Voice - Present",
    category: "passive",
    level: "B1",
    description: "Focus on the action rather than the doer",
    examples: 16,
    exercises: 11,
    completed: false,
  },
  {
    id: "10",
    title: "Articles: A, An, The",
    category: "articles",
    level: "A2",
    description: "Definite and indefinite articles",
    examples: 20,
    exercises: 15,
    completed: false,
  },
];

export default function GrammarPage() {
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel | "all">("all");
  const [selectedCategory, setSelectedCategory] = useState<GrammarCategory | "all">("all");

  const filteredTopics = GRAMMAR_TOPICS.filter((topic) => {
    if (selectedLevel !== "all" && topic.level !== selectedLevel) return false;
    if (selectedCategory !== "all" && topic.category !== selectedCategory) return false;
    return true;
  });

  const stats = {
    total: GRAMMAR_TOPICS.length,
    completed: GRAMMAR_TOPICS.filter((t) => t.completed).length,
    inProgress: GRAMMAR_TOPICS.filter((t) => !t.completed).length,
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
              onChange={(e) => setSelectedLevel(e.target.value as CEFRLevel | "all")}
              style={{ width: "100%" }}
            >
              <option value="all">All Levels</option>
              <option value="A1">A1 - Beginner</option>
              <option value="A2">A2 - Elementary</option>
              <option value="B1">B1 - Intermediate</option>
              <option value="B2">B2 - Upper Intermediate</option>
              <option value="C1">C1 - Advanced</option>
              <option value="C2">C2 - Proficient</option>
            </select>
          </div>

          <div style={{ flex: "1", minWidth: "200px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
              Category
            </label>
            <select
              className="select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as GrammarCategory | "all")}
              style={{ width: "100%" }}
            >
              <option value="all">All Categories</option>
              <option value="tenses">Tenses</option>
              <option value="modals">Modal Verbs</option>
              <option value="conditionals">Conditionals</option>
              <option value="passive">Passive Voice</option>
              <option value="articles">Articles</option>
              <option value="prepositions">Prepositions</option>
            </select>
          </div>
        </div>
      </section>

      {/* Grammar Topics Grid */}
      <div className="module-grid">
        {filteredTopics.map((topic) => (
          <Link
            href={`/english/grammar/${topic.id}`}
            key={topic.id}
            className="module-card"
            style={{ textDecoration: "none" }}
          >
            <div className="module-card-header">
              <div className="module-meta">
                <span className={`level-badge level-${topic.level.toLowerCase()}`}>
                  {topic.level}
                </span>
                <span className="category-badge">{topic.category}</span>
              </div>
              {topic.completed && (
                <span className="completion-badge">✓ Completed</span>
              )}
            </div>

            <h3 className="module-title">{topic.title}</h3>
            <p className="module-description">{topic.description}</p>

            <div className="module-stats">
              <div className="module-stat">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4H14V12H2V4Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  <path d="M5 7H11M5 9H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span>{topic.examples} examples</span>
              </div>
              <div className="module-stat">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  <path d="M6 8L7.5 9.5L10 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>{topic.exercises} exercises</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filteredTopics.length === 0 && (
        <div className="empty-state">
          <p>No grammar topics found for the selected filters.</p>
          <button
            className="btn primary"
            onClick={() => {
              setSelectedLevel("all");
              setSelectedCategory("all");
            }}
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}


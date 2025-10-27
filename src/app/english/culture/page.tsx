"use client";

import { useState } from "react";
import Link from "next/link";

type TopicCategory = "culture" | "society" | "science" | "environment" | "technology" | "history";

interface CultureTopic {
  id: string;
  title: string;
  category: TopicCategory;
  description: string;
  articles: number;
  videos: number;
  completed: boolean;
}

const CULTURE_TOPICS: CultureTopic[] = [
  { id: "1", title: "British vs American English", category: "culture", description: "Differences in vocabulary, spelling, and pronunciation", articles: 8, videos: 5, completed: true },
  { id: "2", title: "English-Speaking Countries", category: "culture", description: "Explore cultures of English-speaking nations", articles: 12, videos: 8, completed: false },
  { id: "3", title: "Climate Change & Sustainability", category: "environment", description: "Global environmental challenges", articles: 15, videos: 10, completed: false },
  { id: "4", title: "Technology & Innovation", category: "technology", description: "Latest tech trends and innovations", articles: 18, videos: 12, completed: false },
  { id: "5", title: "Social Media & Communication", category: "society", description: "Impact of social media on modern life", articles: 10, videos: 7, completed: false },
  { id: "6", title: "Space Exploration", category: "science", description: "Advances in space technology", articles: 12, videos: 9, completed: false },
  { id: "7", title: "World History & Civilization", category: "history", description: "Major historical events and their impact", articles: 20, videos: 15, completed: false },
  { id: "8", title: "Healthcare & Medicine", category: "science", description: "Medical breakthroughs and healthcare systems", articles: 14, videos: 8, completed: false },
];

export default function CulturePage() {
  const [selectedCategory, setSelectedCategory] = useState<TopicCategory | "all">("all");
  const filteredTopics = CULTURE_TOPICS.filter(t => selectedCategory === "all" || t.category === selectedCategory);
  const stats = { total: CULTURE_TOPICS.length, completed: CULTURE_TOPICS.filter(t => t.completed).length };

  return (
    <div className="dashboard-content">
      <section className="card page-head">
        <div>
          <h1>Culture & Topics</h1>
          <p className="muted">Explore authentic content on culture, society, science, and more</p>
        </div>
        <div className="head-actions">
          <div className="stats" style={{ gap: "16px" }}>
            <div className="stat"><span className="stat-val">{stats.completed}</span><span className="stat-lbl">Completed</span></div>
            <div className="stat"><span className="stat-val">{stats.total}</span><span className="stat-lbl">Topics</span></div>
          </div>
        </div>
      </section>

      <section className="card">
        <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>Category</label>
        <select className="select" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value as TopicCategory | "all")} style={{ width: "100%", maxWidth: "300px" }}>
          <option value="all">All Categories</option>
          <option value="culture">Culture</option>
          <option value="society">Society</option>
          <option value="science">Science</option>
          <option value="environment">Environment</option>
          <option value="technology">Technology</option>
          <option value="history">History</option>
        </select>
      </section>

      <div className="module-grid">
        {filteredTopics.map(topic => (
          <Link href={`/english/culture/${topic.id}`} key={topic.id} className="module-card" style={{ textDecoration: "none" }}>
            <div className="module-card-header">
              <div className="module-meta">
                <span className="category-badge">{topic.category}</span>
              </div>
              {topic.completed && <span className="completion-badge">✓ Completed</span>}
            </div>
            <h3 className="module-title">{topic.title}</h3>
            <p className="module-description">{topic.description}</p>
            <div className="module-stats">
              <div className="module-stat"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4H14V12H2V4Z" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M5 7H11M5 9H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg><span>{topic.articles} articles</span></div>
              <div className="module-stat"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M6 7L10 9.5L6 12V7Z" fill="currentColor"/></svg><span>{topic.videos} videos</span></div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}


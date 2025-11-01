"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type DashboardStats = {
  user: {
    name: string | null;
    email: string | null;
    image: string | null;
  };
  stats: {
    streak: number;
    completedUnits: number;
    inProgressUnits: number;
    totalAttempts: number;
    avgScore: number;
  };
  skillsBreakdown: Array<{
    skill: string;
    completed: number;
    avgScore: number;
  }>;
  recentProgress: Array<{
    id: string;
    unitTitle: string;
    skill: string;
    level: string;
    status: string;
    lastSeen: Date | null;
  }>;
  recentAttempts: Array<{
    id: string;
    activityTitle: string;
    skill: string;
    level: string;
    score: number | null;
    maxScore: number | null;
    submittedAt: Date | null;
  }>;
};

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Quick Dictionary
  const [quickWord, setQuickWord] = useState("");
  const [quickResult, setQuickResult] = useState<any>(null);
  const [quickSearching, setQuickSearching] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const res = await fetch("/api/dashboard/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        // Use mock data if API fails or no data
        setStats(getMockStats());
      }
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
      setStats(getMockStats());
    } finally {
      setLoading(false);
    }
  };

  const searchQuickWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickWord.trim()) return;

    setQuickSearching(true);
    setQuickResult(null);

    try {
      const response = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${quickWord.trim()}`
      );

      if (response.ok) {
        const data = await response.json();
        setQuickResult(data[0]);
        toast.success(`Found "${data[0].word}"`);
      } else {
        toast.error("Word not found", {
          description: "Try another word",
        });
      }
    } catch (error) {
      toast.error("Search failed", {
        description: "Please check your connection",
      });
    } finally {
      setQuickSearching(false);
    }
  };

  const getMockStats = (): DashboardStats => ({
    user: {
      name: "Student",
      email: "student@example.com",
      image: null,
    },
    stats: {
      streak: 7,
      completedUnits: 12,
      inProgressUnits: 3,
      totalAttempts: 45,
      avgScore: 85,
    },
    skillsBreakdown: [
      { skill: "LISTENING", completed: 10, avgScore: 82 },
      { skill: "READING", completed: 12, avgScore: 88 },
      { skill: "WRITING", completed: 8, avgScore: 79 },
      { skill: "SPEAKING", completed: 7, avgScore: 85 },
    ],
    recentProgress: [],
    recentAttempts: [],
  });

  if (loading) {
    return (
      <div className="dashboard-content" style={{ padding: "40px", textAlign: "center" }}>
        <div className="loading">Loading your progress...</div>
      </div>
    );
  }

  return (
      <div className="dashboard-content">
        {/* Welcome & Usage Stats */}
        <div className="welcome-section">
          <div className="welcome-card">
            <div className="welcome-text">
              <h2>🔥 <span id="current-streak">{stats?.stats.streak || 0}</span> days streak!</h2>
              <button className="upgrade-btn">Keep up your streak</button>
            </div>
            <div className="usage-stats">
              <div className="stat">
                <span className="stat-val">{stats?.stats.completedUnits || 0}</span>
                <span className="stat-lbl">Completed</span>
              </div>
              <div className="stat">
                <span className="stat-val">{stats?.stats.inProgressUnits || 0}</span>
                <span className="stat-lbl">In Progress</span>
              </div>
              <div className="stat">
                <span className="stat-val">{stats?.stats.avgScore || 0}%</span>
                <span className="stat-lbl">Avg Score</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Chatbot Section */}
        <div className="chatbot-section">
          <div className="chatbot-card">
            <div className="chatbot-header">
              <div className="bot-avatar">🤖</div>
              <div className="bot-greeting">
                <h3>Hey, I&apos;m LearnBot!</h3>
                <p>I&apos;m here to make English learning fun and effective for you ✨</p>
              </div>
            </div>
            <div className="chatbot-input">
              <input type="text" placeholder="Ask anything in your language" className="chat-input" />
              <div className="chat-actions">
                <button className="chat-btn">Ask</button>
                <button className="chat-btn">Learn</button>
                <button className="chat-btn">Support</button>
              </div>
            </div>
          </div>
        </div>

        {/* Getting Started & Start Practice - Side by Side */}
        <div className="dashboard-grid-2col">
          {/* Getting Started */}
          <div className="progress-card">
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z" fill="#6366f1"/>
              </svg>
              <div>
                <h3 style={{ margin: 0 }}>Getting Started</h3>
                <span className="progress-percent">25%</span>
              </div>
            </div>
            
            <div className="progress-bar" style={{ marginBottom: "20px" }}>
              <div className="progress-fill" style={{ width: "25%" }} />
            </div>

            <div className="checklist">
              <div className="checklist-item completed">
                <div className="check-icon-wrapper">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="10" fill="#10b981"/>
                    <path d="M6 10L9 13L14 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="check-text">Add your target score</span>
              </div>

              <Link href="/english/assessment" className="checklist-item current">
                <div className="check-icon-wrapper">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="9" stroke="#6366f1" strokeWidth="2" fill="white"/>
                  </svg>
                </div>
                <span className="check-text">Learn your speaking level</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginLeft: "auto" }}>
                  <path d="M6 4L10 8L6 12" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>

              <Link href="/english/assessment" className="checklist-item">
                <div className="check-icon-wrapper">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="9" stroke="#64748b" strokeWidth="2" fill="white"/>
                  </svg>
                </div>
                <span className="check-text">Learn your writing level</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginLeft: "auto" }}>
                  <path d="M6 4L10 8L6 12" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>

              <div className="checklist-item locked">
                <div className="check-icon-wrapper">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="9" stroke="#cbd5e1" strokeWidth="2" fill="#f1f5f9"/>
                    <path d="M10 7V10M10 13H10.01" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="check-text" style={{ color: "#94a3b8" }}>View premium sample reports</span>
              </div>
            </div>
          </div>

          {/* Start Practice */}
          <div className="practice-card-container">
            <h3 style={{ marginBottom: "16px" }}>Start Practice</h3>
            <div className="practice-cards-compact">
              <div className="practice-card listening-card">
                <div className="practice-icon">🎧</div>
                <div className="practice-content">
                  <h4>Listening</h4>
                  <p>Practice exercises from basic to advanced</p>
                  <small>A1-C2 Levels</small>
                </div>
                <button 
                  className="practice-btn"
                  onClick={() => router.push("/english/listening")}
                >
                  Start
                </button>
              </div>
              <div className="practice-card reading-card">
                <div className="practice-icon">📚</div>
                <div className="practice-content">
                  <h4>Reading</h4>
                  <p>Comprehension and vocabulary building</p>
                  <small>A1-C2 Levels</small>
                </div>
                <button 
                  className="practice-btn"
                  onClick={() => router.push("/english/reading")}
                >
                  Start
                </button>
              </div>
              <div className="practice-card writing-card">
                <div className="practice-icon">✍️</div>
                <div className="practice-content">
                  <h4>Writing</h4>
                  <p>Improve your writing skills</p>
                  <small>A1-C2 Levels</small>
                </div>
                <button 
                  className="practice-btn"
                  onClick={() => router.push("/english/writing")}
                >
                  Start
                </button>
              </div>
              <div className="practice-card speaking-card">
                <div className="practice-icon">🎤</div>
                <div className="practice-content">
                  <h4>Speaking</h4>
                  <p>Practice pronunciation and fluency</p>
                  <small>A1-C2 Levels</small>
                </div>
                <button 
                  className="practice-btn"
                  onClick={() => router.push("/english/speaking")}
                >
                  Start
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Dictionary */}
        <div className="quick-dictionary-section" style={{ marginBottom: "32px" }}>
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 style={{ marginBottom: "8px" }}>📖 Quick Dictionary</h3>
                <p className="muted" style={{ fontSize: "14px" }}>Look up any English word instantly</p>
              </div>
              <Link href="/english/vocabulary" className="btn outline">
                Go to Vocabulary →
              </Link>
            </div>

            <form onSubmit={searchQuickWord} style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", gap: "12px" }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Type a word..."
                  value={quickWord}
                  onChange={(e) => setQuickWord(e.target.value)}
                  disabled={quickSearching}
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn primary" disabled={quickSearching}>
                  {quickSearching ? "Searching..." : "🔍 Search"}
                </button>
              </div>
            </form>

            {quickResult && (
              <div style={{ padding: "16px", background: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                <div style={{ marginBottom: "12px" }}>
                  <h4 style={{ fontSize: "24px", fontWeight: "600", marginBottom: "4px", textTransform: "capitalize" }}>
                    {quickResult.word}
                  </h4>
                  {quickResult.phonetic && (
                    <div style={{ fontSize: "16px", color: "#6b7280" }}>{quickResult.phonetic}</div>
                  )}
                </div>

                {quickResult.meanings.slice(0, 2).map((meaning: any, idx: number) => (
                  <div key={idx} style={{ marginBottom: "12px" }}>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#6366f1", marginBottom: "6px" }}>
                      {meaning.partOfSpeech}
                    </div>
                    <div style={{ fontSize: "14px", paddingLeft: "12px", borderLeft: "2px solid #e5e7eb" }}>
                      {meaning.definitions[0].definition}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="activity-section">
          <div className="activity-header">
            <h3>Recent Activity</h3>
            <p>Your latest learning progress and completed exercises</p>
          </div>
          <div className="activity-table-header">
            <span>Time</span><span>Task</span><span>Task Description</span><span>Status</span><span>Progress</span>
          </div>
          <div className="activity-empty">
            <div className="empty-illustration">🌱🦕</div>
            <h4>You don&apos;t have any completed activities yet</h4>
            <p>Check out sample reports to see feedback examples for premium users</p>
            <button className="sample-reports-btn">View Premium Sample Reports</button>
            <p className="activity-footer">Free users can see up to 5 completed records. Upgrade to see more results</p>
            <a href="#" className="view-all-link">View all in My Reports →</a>
          </div>
        </div>

        {/* Analytics */}
        <div className="analytics-section">
          <div className="analytics-header">
            <h3>Your Strengths and Weaknesses</h3>
            <p>Identify your strengths and weaknesses for each criterion, with detailed insights</p>
            <select className="time-filter">
              <option>All Time</option>
              <option>Last Month</option>
              <option>Last Week</option>
            </select>
          </div>
          <div className="analytics-charts">
            <div className="chart-container"><canvas id="skills-radar-chart" width={300} height={300} /></div>
            <div className="chart-container"><canvas id="performance-radar-chart" width={300} height={300} /></div>
          </div>
        </div>
      </div>
  );
}

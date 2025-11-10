"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import AIAssistant from "@/components/AIAssistant";
import AnalyticsCharts from "@/components/AnalyticsCharts";

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
  interface DictionaryResult {
    word: string;
    phonetic?: string;
    phonetics?: Array<{ audio?: string }>;
    meanings?: Array<{
      partOfSpeech: string;
      definitions: Array<{ definition: string; example?: string }>;
    }>;
  }
  const [quickResult, setQuickResult] = useState<DictionaryResult | null>(null);
  const [quickSearching, setQuickSearching] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Fetch user stats from API
      const res = await fetch("/api/user/stats");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // Transform API data to dashboard format
          const transformedStats = {
            user: {
              name: data.stats.name || "Student",
              email: data.stats.email || "student@example.com",
              image: data.stats.image || null,
            },
            stats: {
              streak: data.stats.streak || 0,
              completedUnits: 0, // Can be calculated from activities
              inProgressUnits: 0,
              totalAttempts: data.stats.totalActivities || 0,
              avgScore: data.stats.avgScore || 0,
            },
            skillsBreakdown: Object.entries(data.stats.skillScores || {}).map(([skill, scoreData]: [string, any]) => ({
              skill: skill.toUpperCase(),
              completed: scoreData.count,
              avgScore: Math.round(scoreData.avg * 10), // Convert to percentage
            })),
            recentProgress: [],
            recentAttempts: data.stats.recentActivities?.map((act: any) => ({
              id: act.id,
              activityTitle: act.metadata?.taskId || "Practice Activity",
              skill: act.skill,
              level: act.metadata?.level || "B1",
              score: act.score ? Math.round(act.score * 10) : null,
              maxScore: 100,
              submittedAt: act.date,
            })) || [],
          };
          setStats(transformedStats);
          return;
        }
      }
      // Fallback to mock data
      setStats(getMockStats());
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
            <div className="streak-badge-card">
              <div className="streak-icon-wrapper">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z" fill="url(#streak-gradient)" stroke="url(#streak-gradient)" strokeWidth="1"/>
                  <defs>
                    <linearGradient id="streak-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#ef4444" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div className="streak-content">
                <div className="streak-label">Current Streak</div>
                <div className="streak-value">{stats?.stats.streak || 0} days</div>
                <div className="streak-message">Keep practicing daily!</div>
              </div>
              <button className="streak-action-btn">Continue</button>
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
        <AIAssistant />

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
              <Link href="/english/goals" className="checklist-item completed">
                <div className="check-icon-wrapper">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="10" fill="#10b981"/>
                    <path d="M6 10L9 13L14 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="check-text">Set your learning goals</span>
              </Link>

              <Link href="/english/test" className="checklist-item current">
                <div className="check-icon-wrapper">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="9" stroke="#6366f1" strokeWidth="2" fill="white"/>
                  </svg>
                </div>
                <span className="check-text">Take placement test</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginLeft: "auto" }}>
                  <path d="M6 4L10 8L6 12" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>

              <Link href="/english/writing" className="checklist-item">
                <div className="check-icon-wrapper">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="9" stroke="#64748b" strokeWidth="2" fill="white"/>
                  </svg>
                </div>
                <span className="check-text">Complete your first writing task</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginLeft: "auto" }}>
                  <path d="M6 4L10 8L6 12" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>

              <Link href="/english/progress" className="checklist-item">
                <div className="check-icon-wrapper">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="9" stroke="#64748b" strokeWidth="2" fill="white"/>
                  </svg>
                </div>
                <span className="check-text">Review your progress</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginLeft: "auto" }}>
                  <path d="M6 4L10 8L6 12" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
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
          <div className="card dictionary-card">
            <div className="dictionary-header">
              <div className="dictionary-title-section">
                <div className="dictionary-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <h3 className="dictionary-title">Quick Dictionary</h3>
                  <p className="dictionary-subtitle">Look up any English word instantly</p>
                </div>
              </div>
              <Link href="/english/vocabulary" className="btn outline sm">
                Vocabulary →
              </Link>
            </div>

            <form onSubmit={searchQuickWord} className="dictionary-search-form">
              <div className="dictionary-search-wrapper">
                <svg className="dictionary-search-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M13 13L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <input
                  type="text"
                  className="dictionary-search-input"
                  placeholder="Type a word to search..."
                  value={quickWord}
                  onChange={(e) => setQuickWord(e.target.value)}
                  disabled={quickSearching}
                />
                {quickWord && (
                  <button
                    type="button"
                    className="dictionary-clear-btn"
                    onClick={() => {
                      setQuickWord("");
                      setQuickResult(null);
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                )}
                <button type="submit" className="dictionary-search-btn" disabled={quickSearching || !quickWord.trim()}>
                  {quickSearching ? (
                    <>
                      <svg className="spinner-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="24" strokeDashoffset="12" strokeLinecap="round"/>
                      </svg>
                      Searching...
                    </>
                  ) : (
                    "Search"
                  )}
                </button>
              </div>
            </form>

            {quickResult && (
              <div className="dictionary-result">
                <div className="dictionary-result-header">
                  <div>
                    <h4 className="dictionary-word">{quickResult.word}</h4>
                    {quickResult.phonetic && (
                      <div className="dictionary-phonetic">{quickResult.phonetic}</div>
                    )}
                  </div>
                  {quickResult.phonetics?.find((p) => p.audio) && (
                    <button
                      className="dictionary-audio-btn"
                      onClick={() => {
                        const audioUrl = quickResult.phonetics?.find((p) => p.audio)?.audio;
                        if (audioUrl) {
                          const audio = new Audio(audioUrl);
                          audio.play();
                        }
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M10 2V10L13 12M10 18C5 18 1 14 1 9C1 4 5 0 10 0C15 0 19 4 19 9C19 14 15 18 10 18Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </button>
                  )}
                </div>

                <div className="dictionary-meanings">
                  {quickResult.meanings?.slice(0, 2).map((meaning, idx: number) => (
                    <div key={idx} className="dictionary-meaning">
                      <div className="dictionary-part-of-speech">{meaning.partOfSpeech}</div>
                      <div className="dictionary-definition">
                        {meaning.definitions[0].definition}
                      </div>
                      {meaning.definitions[0].example && (
                        <div className="dictionary-example">
                          <span className="dictionary-example-label">Example:</span> &quot;{meaning.definitions[0].example}&quot;
                        </div>
                      )}
                    </div>
                  ))}
                </div>
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
          
          {stats?.recentAttempts && stats.recentAttempts.length > 0 ? (
            <>
              <div className="modern-table">
                <div className="table-header">
                  <div className="th time-col">Time</div>
                  <div className="th task-col">Task</div>
                  <div className="th description-col">Task Description</div>
                  <div className="th status-col">Status</div>
                  <div className="th progress-col">Progress</div>
                </div>
                <div className="table-body">
                  {stats.recentAttempts.map((attempt, index) => (
                    <div key={attempt.id} className={`table-row ${index % 2 === 0 ? 'even' : 'odd'}`}>
                      <div className="td time-col">
                        <div className="time-display">
                          <span className="time-value">
                            {attempt.submittedAt
                              ? new Date(attempt.submittedAt).toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "N/A"}
                          </span>
                          <span className="date-value">
                            {attempt.submittedAt
                              ? new Date(attempt.submittedAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })
                              : ""}
                          </span>
                        </div>
                      </div>
                      <div className="td task-col">
                        <div className="task-info">
                          <span className="task-icon-modern">
                            {attempt.skill === "writing" ? "✍️" : 
                             attempt.skill === "reading" ? "📚" : 
                             attempt.skill === "listening" ? "🎧" : "🎤"}
                          </span>
                          <span className="task-name-modern">
                            {attempt.skill.charAt(0).toUpperCase() + attempt.skill.slice(1)}
                          </span>
                        </div>
                      </div>
                      <div className="td description-col">
                        <div className="description-content">
                          <span className="description-title">
                            {attempt.metadata?.taskTitle || attempt.activityTitle}
                          </span>
                          {attempt.metadata?.taskType && (
                            <span className="description-type">{attempt.metadata.taskType}</span>
                          )}
                          {attempt.level && (
                            <span className="level-badge-modern">{attempt.level}</span>
                          )}
                          {attempt.metadata?.targetWords && (
                            <span className="word-count-badge">{attempt.metadata.targetWords}</span>
                          )}
                        </div>
                      </div>
                      <div className="td status-col">
                        <span className="status-badge-modern completed">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <circle cx="7" cy="7" r="6" fill="currentColor" opacity="0.2"/>
                            <path d="M4 7L6 9L10 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                          Completed
                        </span>
                      </div>
                      <div className="td progress-col">
                        {attempt.score !== null ? (
                          <div className="score-display">
                            <div className="score-bar">
                              <div 
                                className="score-fill" 
                                style={{ 
                                  width: `${attempt.score}%`,
                                  background: attempt.score >= 70 ? '#10b981' : attempt.score >= 50 ? '#f59e0b' : '#ef4444'
                                }}
                              />
                            </div>
                            <span className={`score-value ${attempt.score >= 70 ? 'high' : attempt.score >= 50 ? 'medium' : 'low'}`}>
                              {attempt.score.toFixed(1)}
                            </span>
                          </div>
                        ) : (
                          <span className="score-na">—</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Link href="/english/reports" className="view-all-link">
                View all in My Reports →
              </Link>
            </>
          ) : (
            <div className="activity-empty">
              <div className="empty-illustration">🌱</div>
              <h4>You don&apos;t have any completed activities yet</h4>
              <p>Start practicing to see your progress here!</p>
              <Link href="/english/writing" className="btn primary">
                Start Your First Exercise
              </Link>
            </div>
          )}
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
          <AnalyticsCharts skillsBreakdown={stats?.skillsBreakdown || []} />
        </div>
      </div>
  );
}

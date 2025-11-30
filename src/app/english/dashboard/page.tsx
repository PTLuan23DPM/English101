"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useState } from "react";
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
    metadata?: { taskTitle?: string; taskType?: string; targetWords?: string };
  }>;
  gettingStarted?: {
    tasks: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      link: string;
      completed: boolean;
      order: number;
    }>;
    progress: number;
    totalTasks: number;
    completedTasks: number;
  };
};

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [streakGlow, setStreakGlow] = useState(false);
  
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

  // Use useLayoutEffect to scroll before paint
  useLayoutEffect(() => {
    // Force scroll to top immediately
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    // Also try after a microtask
    Promise.resolve().then(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
  }, []);

  useEffect(() => {
    fetchDashboardStats();
    fetchGettingStartedTasks();
    
    // Check if there's activity completed today and trigger glow
    checkTodayActivity();
    
    // Additional scroll attempts after render
    const scrollToTop = () => {
      window.scrollTo(0, 0);
      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
      }
      if (document.body) {
        document.body.scrollTop = 0;
      }
    };
    
    // Scroll multiple times to ensure it works
    scrollToTop();
    const timeout1 = setTimeout(scrollToTop, 0);
    const timeout2 = setTimeout(scrollToTop, 50);
    const timeout3 = setTimeout(scrollToTop, 100);
    const timeout4 = setTimeout(scrollToTop, 200);
    
    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
      clearTimeout(timeout4);
    };
  }, []);

  // Check if user has completed activity today
  const checkTodayActivity = async () => {
    try {
      const res = await fetch("/api/progress/stats");
      if (res.ok) {
        const data = await res.json();
        if (data.completedActivities > 0 && data.streak > 0) {
          // Show glow if there's activity today
          setStreakGlow(true);
          // Remove glow after animation
          setTimeout(() => setStreakGlow(false), 3000);
        }
      }
    } catch (error) {
      console.error("Error checking today activity:", error);
    }
  };

  // Listen for activity completion events to refresh streak
  useEffect(() => {
    const handleActivityCompleted = async () => {
      console.log('[Dashboard] Activity completed event received, refreshing stats...');
      // Small delay to ensure database is fully updated
      await new Promise(resolve => setTimeout(resolve, 300));
      // Refresh stats and show glow
      await fetchDashboardStats(true);
      // Also refresh getting started tasks
      await fetchGettingStartedTasks();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'activityCompleted' && e.newValue === 'true') {
        console.log('[Dashboard] Storage event detected, refreshing stats...');
        handleActivityCompleted();
        localStorage.removeItem('activityCompleted');
      }
    };

    // Listen for custom event (same tab)
    window.addEventListener('activityCompleted', handleActivityCompleted);
    // Listen for storage event (other tabs)
    window.addEventListener('storage', handleStorageChange);
    
    // Also check localStorage periodically (fallback)
    const checkInterval = setInterval(() => {
      if (localStorage.getItem('activityCompleted') === 'true') {
        console.log('[Dashboard] Polling detected activity completion, refreshing stats...');
        handleActivityCompleted();
        localStorage.removeItem('activityCompleted');
      }
    }, 2000);

    return () => {
      window.removeEventListener('activityCompleted', handleActivityCompleted);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(checkInterval);
    };
  }, []);

  const fetchGettingStartedTasks = async () => {
    try {
      const res = await fetch("/api/getting-started");
      if (res.ok) {
        const data = await res.json();
        if (data.tasks) {
          setStats(prev => ({
            ...prev!,
            gettingStarted: data,
          }));
        }
      }
    } catch (error) {
      console.error("Failed to fetch getting started tasks:", error);
    }
  };

  const fetchDashboardStats = async (showGlow = false) => {
    try {
      console.log('[Dashboard] Fetching stats...');
      // Fetch user stats from API with cache busting
      const res = await fetch("/api/user/stats", {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      if (!res.ok) {
        const errorText = await res.text().catch(() => 'Unknown error');
        console.error('[Dashboard] API request failed:', {
          status: res.status,
          statusText: res.statusText,
          error: errorText
        });
        throw new Error(`API request failed: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log('[Dashboard] Stats received:', data);
      
      if (data.success && data.data?.stats) {
        // Use data.data.stats instead of data.stats (from createSuccessResponse)
        const statsData = data.data.stats;
        // Check if streak increased
        if (showGlow && stats && statsData?.streak && statsData.streak > (stats.stats?.streak || 0)) {
          setStreakGlow(true);
          setTimeout(() => setStreakGlow(false), 3000);
        }
        
        // Transform API data to dashboard format
        const transformedStats: DashboardStats = {
          user: {
            name: statsData?.name || "Student",
            email: statsData?.email || "student@example.com",
            image: statsData?.image || null,
          },
          stats: {
            streak: statsData?.streak || 0,
            completedUnits: statsData?.completedUnits || 0, // Days with completed activities
            inProgressUnits: 0,
            totalAttempts: statsData?.totalActivities || 0, // Total completed activities
            avgScore: statsData?.avgScore || 0,
          },
          skillsBreakdown: Object.entries(statsData?.skillScores || {})
              .map(([skill, scoreData]) => {
                  const score = scoreData as { count?: number; avg?: number };
                  // avg is already in 0-10 scale, convert to percentage (0-100)
                  const avgPercent = score.avg ? Math.round(score.avg * 10) : 0;
                  return {
                      skill: skill.toUpperCase(),
                      completed: score.count || 0,
                      avgScore: avgPercent,
                  };
              })
              .sort((a, b) => b.avgScore - a.avgScore), // Sort by score descending
          recentProgress: [],
          recentAttempts: statsData?.recentActivities?.map((act: unknown, idx: number) => {
              const activity = act as { 
                  id?: string; 
                  skill?: string; 
                  activityType?: string;
                  score?: number | null; 
                  date?: string | null;
                  metadata?: { 
                      taskId?: string; 
                      taskTitle?: string;
                      taskType?: string;
                      level?: string; 
                      targetWords?: string;
                  }; 
              };
              
              // Convert score from 0-10 to percentage (0-100)
              const scorePercent = activity.score !== null && activity.score !== undefined 
                  ? Math.round(activity.score * 10) 
                  : null;
              
              // Format skill name
              const skillName = activity.skill?.toLowerCase() || "unknown";
              
              return {
                  id: activity.id || `activity_${Date.now()}_${idx}`,
                  activityTitle: activity.metadata?.taskTitle || activity.metadata?.taskId || `${skillName.charAt(0).toUpperCase() + skillName.slice(1)} Exercise`,
                  skill: skillName,
                  level: activity.metadata?.level || "B1",
                  score: scorePercent,
                  maxScore: 100,
                  submittedAt: activity.date || null,
                  metadata: {
                      ...activity.metadata,
                      taskType: activity.metadata?.taskType || activity.activityType,
                  },
              };
          }) || [],
          gettingStarted: stats?.gettingStarted, // Preserve getting started data
        };
        console.log('[Dashboard] Updating stats state:', transformedStats);
        setStats(transformedStats);
        return;
      } else {
        console.warn('[Dashboard] API returned success=false or no stats:', data);
        if (data.error) {
          console.error('[Dashboard] API error:', data.error, data.code, data.details);
        }
      }
      
      // If we reach here, something went wrong - set empty state
      console.error("Failed to fetch dashboard stats: API returned error or no data");
      setStats({
        user: {
          name: null,
          email: null,
          image: null,
        },
        stats: {
          streak: 0,
          completedUnits: 0,
          inProgressUnits: 0,
          totalAttempts: 0,
          avgScore: 0,
        },
        skillsBreakdown: [],
        recentProgress: [],
        recentAttempts: [],
        gettingStarted: stats?.gettingStarted, // Preserve getting started data
      });
    } catch (error) {
      // Don't use mock data - show empty state instead
      console.error("Failed to fetch dashboard stats:", error);
      setStats({
        user: {
          name: null,
          email: null,
          image: null,
        },
        stats: {
          streak: 0,
          completedUnits: 0,
          inProgressUnits: 0,
          totalAttempts: 0,
          avgScore: 0,
        },
        skillsBreakdown: [],
        recentProgress: [],
        recentAttempts: [],
        gettingStarted: stats?.gettingStarted, // Preserve getting started data
      });
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
            <div className={`streak-badge-card ${streakGlow ? 'streak-glow' : ''}`}>
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
                <span className="progress-percent">{stats?.gettingStarted?.progress || 0}%</span>
              </div>
            </div>
            
            <div className="progress-bar" style={{ marginBottom: "20px" }}>
              <div className="progress-fill" style={{ width: `${stats?.gettingStarted?.progress || 0}%` }} />
            </div>

            <div className="checklist">
              {stats?.gettingStarted?.tasks && stats.gettingStarted.tasks.length > 0 ? (
                stats.gettingStarted.tasks.map((task, index) => {
                  const isCompleted = task.completed;
                  const isCurrent = !isCompleted && index === stats.gettingStarted.tasks.findIndex(t => !t.completed);
                  
                  return (
                    <Link 
                      key={task.id} 
                      href={task.link} 
                      className={`checklist-item ${isCompleted ? 'completed' : isCurrent ? 'current' : ''}`}
                      onClick={async () => {
                        // Refresh getting started tasks when navigating
                        setTimeout(() => {
                          fetchGettingStartedTasks();
                        }, 1000);
                      }}
                    >
                      <div className="check-icon-wrapper">
                        {isCompleted ? (
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <circle cx="10" cy="10" r="10" fill="#10b981"/>
                            <path d="M6 10L9 13L14 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <circle cx="10" cy="10" r="9" stroke={isCurrent ? "#6366f1" : "#64748b"} strokeWidth="2" fill="white"/>
                          </svg>
                        )}
                      </div>
                      <span className="check-text">{task.title}</span>
                      {!isCompleted && (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginLeft: "auto" }}>
                          <path d="M6 4L10 8L6 12" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </Link>
                  );
                })
              ) : (
                // Fallback to default tasks while loading
                <>
                  <Link href="/english/goals" className="checklist-item">
                    <div className="check-icon-wrapper">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <circle cx="10" cy="10" r="9" stroke="#64748b" strokeWidth="2" fill="white"/>
                      </svg>
                    </div>
                    <span className="check-text">Set your learning goals</span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginLeft: "auto" }}>
                      <path d="M6 4L10 8L6 12" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </Link>
                  <Link href="/english/test" className="checklist-item">
                    <div className="check-icon-wrapper">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <circle cx="10" cy="10" r="9" stroke="#64748b" strokeWidth="2" fill="white"/>
                      </svg>
                    </div>
                    <span className="check-text">Take placement test</span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginLeft: "auto" }}>
                      <path d="M6 4L10 8L6 12" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </Link>
                </>
              )}
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

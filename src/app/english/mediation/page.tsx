"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

interface MediationActivity {
  id: string;
  title: string;
  level: CEFRLevel;
  instruction: string | null;
  type: string;
  unitTitle: string;
  moduleTitle: string;
  questionCount: number;
}

// Fallback static data
const FALLBACK_TOPICS = [
  { id: "1", title: "Summarizing Short Texts", level: "B1" as CEFRLevel, description: "Extract and present key information", exercises: 10, completed: false },
  { id: "2", title: "Relaying Information", level: "B1" as CEFRLevel, description: "Pass on messages accurately", exercises: 8, completed: false },
  { id: "3", title: "Explaining Data & Visuals", level: "B2" as CEFRLevel, description: "Describe charts and graphs clearly", exercises: 12, completed: false },
  { id: "4", title: "Translating Simple Texts", level: "B2" as CEFRLevel, description: "Transfer meaning between languages", exercises: 10, completed: false },
  { id: "5", title: "Facilitating Communication", level: "C1" as CEFRLevel, description: "Bridge understanding between speakers", exercises: 15, completed: false },
  { id: "6", title: "Interpreting Complex Concepts", level: "C1" as CEFRLevel, description: "Explain technical or abstract ideas", exercises: 14, completed: false },
  { id: "7", title: "Note-taking & Summarizing", level: "B2" as CEFRLevel, description: "Capture essential information efficiently", exercises: 12, completed: false },
];

export default function MediationPage() {
  const { data: session } = useSession();
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel | "all">("all");
  const [activities, setActivities] = useState<MediationActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    if (session?.user) {
      fetchActivities();
    } else {
      setUseFallback(true);
      setLoading(false);
    }
  }, [session, selectedLevel]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const levelParam = selectedLevel !== "all" ? `?level=${selectedLevel}` : "";
      const response = await fetch(`/api/mediation/activities${levelParam}`);
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
        setUseFallback(data.activities?.length === 0);
      } else {
        setUseFallback(true);
      }
    } catch (error) {
      console.error("Error fetching mediation activities:", error);
      setUseFallback(true);
    } finally {
      setLoading(false);
    }
  };

  const displayActivities = useFallback
    ? FALLBACK_TOPICS.filter(t => selectedLevel === "all" || t.level === selectedLevel)
    : activities.filter(a => selectedLevel === "all" || a.level === selectedLevel);

  const stats = {
    total: displayActivities.length,
    completed: 0, // TODO: Track completion from user progress
  };

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

      {loading ? (
        <section className="card">
          <p>Loading activities...</p>
        </section>
      ) : (
        <div className="module-grid">
          {displayActivities.map((item) => {
            const isFallback = useFallback && 'description' in item;
            return (
              <Link 
                href={useFallback ? `/english/mediation/${item.id}` : `/english/mediation/activity/${item.id}`} 
                key={item.id} 
                className="module-card" 
                style={{ textDecoration: "none" }}
              >
                <div className="module-card-header">
                  <div className="module-meta">
                    <span className={`level-badge level-${item.level.toLowerCase()}`}>{item.level}</span>
                  </div>
                </div>
                <h3 className="module-title">{item.title}</h3>
                <p className="module-description">
                  {isFallback 
                    ? (item as any).description 
                    : item.instruction || item.moduleTitle || "Practice mediation skills"}
                </p>
                <div className="module-stats">
                  <div className="module-stat">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      <path d="M6 8L7.5 9.5L10 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>{isFallback ? (item as any).exercises : item.questionCount} {isFallback ? 'exercises' : 'questions'}</span>
                  </div>
                </div>
              </Link>
            );
          })}
          {displayActivities.length === 0 && !loading && (
            <section className="card">
              <p>No activities available. Check back later or contact support.</p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}


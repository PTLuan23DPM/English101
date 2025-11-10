"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

type TopicCategory = "culture" | "society" | "science" | "environment" | "technology" | "history";

interface CultureActivity {
  id: string;
  title: string;
  level: string;
  instruction: string | null;
  unitTitle: string;
  moduleTitle: string;
  questionCount: number;
  topics: Array<{ id: string; slug: string; title: string }>;
}

// Fallback static data
const FALLBACK_TOPICS = [
  { id: "1", title: "British vs American English", category: "culture" as TopicCategory, description: "Differences in vocabulary, spelling, and pronunciation", articles: 8, videos: 5, completed: true },
  { id: "2", title: "English-Speaking Countries", category: "culture" as TopicCategory, description: "Explore cultures of English-speaking nations", articles: 12, videos: 8, completed: false },
  { id: "3", title: "Climate Change & Sustainability", category: "environment" as TopicCategory, description: "Global environmental challenges", articles: 15, videos: 10, completed: false },
  { id: "4", title: "Technology & Innovation", category: "technology" as TopicCategory, description: "Latest tech trends and innovations", articles: 18, videos: 12, completed: false },
  { id: "5", title: "Social Media & Communication", category: "society" as TopicCategory, description: "Impact of social media on modern life", articles: 10, videos: 7, completed: false },
  { id: "6", title: "Space Exploration", category: "science" as TopicCategory, description: "Advances in space technology", articles: 12, videos: 9, completed: false },
  { id: "7", title: "World History & Civilization", category: "history" as TopicCategory, description: "Major historical events and their impact", articles: 20, videos: 15, completed: false },
  { id: "8", title: "Healthcare & Medicine", category: "science" as TopicCategory, description: "Medical breakthroughs and healthcare systems", articles: 14, videos: 8, completed: false },
];

export default function CulturePage() {
  const { data: session } = useSession();
  const [selectedCategory, setSelectedCategory] = useState<TopicCategory | "all">("all");
  const [activities, setActivities] = useState<CultureActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    if (session?.user) {
      fetchActivities();
    } else {
      setUseFallback(true);
      setLoading(false);
    }
  }, [session, selectedCategory]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const topicParam = selectedCategory !== "all" ? `?topic=${selectedCategory}` : "";
      const response = await fetch(`/api/culture/activities${topicParam}`);
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
        setUseFallback(data.activities?.length === 0);
      } else {
        setUseFallback(true);
      }
    } catch (error) {
      console.error("Error fetching culture activities:", error);
      setUseFallback(true);
    } finally {
      setLoading(false);
    }
  };

  const displayActivities = useFallback
    ? FALLBACK_TOPICS.filter(t => selectedCategory === "all" || t.category === selectedCategory)
    : activities.filter(a => {
        if (selectedCategory === "all") return true;
        return a.topics.some(t => t.slug === selectedCategory);
      });

  const stats = {
    total: displayActivities.length,
    completed: useFallback ? FALLBACK_TOPICS.filter(t => t.completed).length : 0, // TODO: Track completion
  };

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

      {loading ? (
        <section className="card">
          <p>Loading activities...</p>
        </section>
      ) : (
        <div className="module-grid">
          {displayActivities.map((item) => {
            const isFallback = useFallback && 'category' in item;
            const category = isFallback 
              ? (item as any).category 
              : item.topics[0]?.slug || "general";
            
            return (
              <Link 
                href={useFallback ? `/english/culture/${item.id}` : `/english/culture/activity/${item.id}`} 
                key={item.id} 
                className="module-card" 
                style={{ textDecoration: "none" }}
              >
                <div className="module-card-header">
                  <div className="module-meta">
                    <span className="category-badge">{category}</span>
                  </div>
                </div>
                <h3 className="module-title">{item.title}</h3>
                <p className="module-description">
                  {isFallback 
                    ? (item as any).description 
                    : item.instruction || item.moduleTitle || "Explore authentic content"}
                </p>
                <div className="module-stats">
                  {isFallback ? (
                    <>
                      <div className="module-stat">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M2 4H14V12H2V4Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                          <path d="M5 7H11M5 9H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        <span>{(item as any).articles} articles</span>
                      </div>
                      <div className="module-stat">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <rect x="2" y="3" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                          <path d="M6 7L10 9.5L6 12V7Z" fill="currentColor"/>
                        </svg>
                        <span>{(item as any).videos} videos</span>
                      </div>
                    </>
                  ) : (
                    <div className="module-stat">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                        <path d="M6 8L7.5 9.5L10 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>{item.questionCount} questions</span>
                    </div>
                  )}
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


"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";

interface ListeningTask {
  id: string;
  icon: string;
  title: string;
  type: string;
  level: string;
  description: string;
  duration: string;
  speakers: string;
  accent: string;
  questions: number;
  tags: string[];
  recommended?: boolean;
  attempts: number;
  color: string;
}

const LISTENING_TASKS: ListeningTask[] = [
  // Conversations
  {
    id: "conv-restaurant",
      icon: "🍴",
      title: "At the Restaurant",
    type: "Conversation",
      level: "A2",
    description: "A conversation between customer and waiter",
    duration: "2:30",
      speakers: "2 speakers",
      accent: "🇺🇸 American",
    questions: 6,
      tags: ["Dining", "Daily Life"],
    recommended: true,
    attempts: 0,
      color: "blue",
    },
    {
    id: "conv-job-interview",
      icon: "💼",
      title: "Job Interview Practice",
    type: "Conversation",
      level: "B1",
    description: "Formal interview between employer and candidate",
    duration: "4:15",
      speakers: "2 speakers",
      accent: "🇬🇧 British",
    questions: 10,
      tags: ["Business", "Career"],
    recommended: true,
    attempts: 0,
    color: "blue",
  },
  {
    id: "conv-doctor",
    icon: "🏥",
    title: "Doctor's Appointment",
    type: "Conversation",
    level: "A2",
    description: "Patient talking to doctor about symptoms",
    duration: "3:20",
    speakers: "2 speakers",
    accent: "🇺🇸 American",
    questions: 8,
    tags: ["Healthcare", "Daily Life"],
    attempts: 0,
    color: "blue",
  },
  {
    id: "conv-shopping",
    icon: "🛍️",
    title: "Shopping for Clothes",
    type: "Conversation",
    level: "A2",
    description: "Customer asking for help in a clothing store",
    duration: "3:00",
    speakers: "2 speakers",
    accent: "🇦🇺 Australian",
    questions: 7,
    tags: ["Shopping", "Daily Life"],
    attempts: 0,
    color: "blue",
  },
  // Podcasts
  {
    id: "podcast-tech",
      icon: "🎧",
    title: "Technology Trends 2024",
    type: "Podcast",
      level: "C1",
    description: "Discussion about AI and future technology",
    duration: "12:00",
      speakers: "3 speakers",
      accent: "🌍 Mixed accents",
    questions: 15,
      tags: ["Technology", "AI", "Future"],
    recommended: true,
    attempts: 0,
    color: "green",
  },
  {
    id: "podcast-reading",
    icon: "📚",
    title: "The Reading Corner",
    type: "Podcast",
    level: "B2",
    description: "Authors discussing their latest books",
    duration: "18:30",
    speakers: "2 speakers",
    accent: "🇬🇧 British",
    questions: 12,
    tags: ["Literature", "Culture"],
    attempts: 0,
    color: "green",
  },
  {
    id: "podcast-health",
    icon: "💪",
    title: "Health & Wellness",
    type: "Podcast",
    level: "B2",
    description: "Expert advice on maintaining a healthy lifestyle",
    duration: "15:45",
    speakers: "2 speakers",
    accent: "🇺🇸 American",
    questions: 12,
    tags: ["Health", "Lifestyle"],
    attempts: 0,
    color: "green",
  },
  // News
  {
    id: "news-climate",
    icon: "🌍",
    title: "Global Climate Summit",
    type: "News Report",
    level: "B2",
    description: "Latest news on environmental policies",
    duration: "5:45",
    speakers: "News anchor",
    accent: "🇺🇸 American",
    questions: 8,
    tags: ["Environment", "Politics"],
    attempts: 0,
    color: "purple",
  },
  {
    id: "news-market",
    icon: "💹",
    title: "Stock Market Update",
    type: "News Report",
    level: "C1",
    description: "Analysis of today's market movements",
    duration: "6:20",
    speakers: "Financial analyst",
    accent: "🇬🇧 British",
    questions: 10,
    tags: ["Finance", "Economy"],
    attempts: 0,
    color: "purple",
  },
  {
    id: "news-sports",
    icon: "⚽",
    title: "Sports Headlines",
    type: "News Report",
    level: "B1",
    description: "Recap of the week's major sporting events",
    duration: "4:30",
    speakers: "Sports reporter",
    accent: "🇬🇧 British",
    questions: 7,
    tags: ["Sports", "News"],
    attempts: 0,
    color: "purple",
  },
  // Lectures
  {
    id: "lecture-physics",
    icon: "🔬",
    title: "Introduction to Quantum Physics",
    type: "Lecture",
    level: "C2",
    description: "Basic principles and applications",
    duration: "25:00",
    speakers: "Professor",
    accent: "🇺🇸 American",
    questions: 20,
    tags: ["Science", "Physics", "Academic"],
    attempts: 0,
    color: "teal",
  },
  {
    id: "lecture-art",
    icon: "🎨",
    title: "Renaissance Art History",
    type: "Lecture",
    level: "B2",
    description: "Evolution of art during the Renaissance period",
    duration: "15:30",
    speakers: "Art historian",
    accent: "🇬🇧 British",
    questions: 12,
    tags: ["History", "Art", "Culture"],
    attempts: 0,
    color: "teal",
  },
  {
    id: "lecture-economics",
    icon: "📊",
    title: "Introduction to Economics",
    type: "Lecture",
    level: "B2",
    description: "Basic economic principles and market behavior",
    duration: "20:00",
    speakers: "Professor",
    accent: "🇺🇸 American",
    questions: 15,
    tags: ["Economics", "Business", "Academic"],
    attempts: 0,
    color: "teal",
  },
];

export default function ListeningPage() {
  const [filterType, setFilterType] = useState<string>("All types");
  const [selectedTask, setSelectedTask] = useState<ListeningTask | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(true);
  const [speed, setSpeed] = useState("1x");
  const [volume, setVolume] = useState(75);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Filter tasks by type
  const filteredTasks = filterType === "All types" 
    ? LISTENING_TASKS 
    : LISTENING_TASKS.filter(task => task.type === filterType);

  const uniqueTypes = ["All types", ...Array.from(new Set(LISTENING_TASKS.map(t => t.type)))];

  const playAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };


  // Player view
  if (showPlayer && selectedTask) {
    return (
      <div className="dashboard-content">
          <section className="card player">
            <div className="player-meta">
              <div>
              <h2 className="h2">{selectedTask.title}</h2>
              <p className="muted">
                {selectedTask.level} Level • {selectedTask.speakers} • {selectedTask.accent}
              </p>
              </div>
            <button className="btn btn--outline" onClick={() => { setShowPlayer(false); setSelectedTask(null); }}>
              ← Back to list
            </button>
            </div>

            {/* waveform */}
            <div className="wave">
              <div className="bars">
                {Array.from({length: 40}).map((_,i)=>(
                  <div key={i} className="bar" style={{height: `${20 + (i%10)*4}px`}} />
                ))}
              </div>
              <div className="cursor" />
            </div>

          {/* controls */}
          <div className="player-ctrls">
            <button className="btn btn-skip btn-skip-back">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 2L1 4L3 6M1 4H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M11 2L9 4L11 6M9 4H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M1 7V12C1 12.5523 1.44772 13 2 13H4C4.55228 13 5 12.5523 5 12V7C5 6.44772 4.55228 6 4 6H2C1.44772 6 1 6.44772 1 7Z" fill="currentColor"/>
              </svg>
              <span>10s</span>
            </button>
            <button className="btn btn-play-main" onClick={playAudio}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                {isPlaying ? (
                  <>
                    <rect x="6" y="4" width="3" height="12" rx="1.5" fill="currentColor"/>
                    <rect x="11" y="4" width="3" height="12" rx="1.5" fill="currentColor"/>
                  </>
                ) : (
                  <path d="M7 5L15 10L7 15V5Z" fill="currentColor"/>
                )}
              </svg>
              <span>{isPlaying ? "Pause" : "Play"}</span>
            </button>
            <button className="btn btn-skip btn-skip-forward">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M11 2L13 4L11 6M13 4H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 2L5 4L3 6M5 4H1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13 7V12C13 12.5523 12.5523 13 12 13H10C9.44772 13 9 12.5523 9 12V7C9 6.44772 9.44772 6 10 6H12C12.5523 6 13 6.44772 13 7Z" fill="currentColor"/>
              </svg>
              <span>10s</span>
            </button>

              <div className="grow" />
            <span className="mono muted">0:00 / {selectedTask.duration}</span>

              <select className="select sm" value={speed} onChange={(e)=>setSpeed(e.target.value)}>
                <option>1x</option><option>0.75x</option><option>1.25x</option><option>1.5x</option>
              </select>

              <div className="vol">
                <span>🔊</span>
                <input type="range" min={0} max={100} value={volume} onChange={(e)=>setVolume(+e.target.value)} />
              </div>
            </div>
          </section>

          <section className="player-split">
            {/* Question panel */}
            <aside className="card qpanel">
            <h3 className="h3">Comprehension Questions</h3>
            <p className="muted">Listen to the audio and answer the questions below.</p>
            
            <div className="qcard">
              <div className="qhead">
                <span>Question 1 of {selectedTask.questions}</span>
                <span className="muted">Multiple Choice</span>
              </div>
              <div className="qtext">What is the main topic of the conversation?</div>
              <div className="qopts">
                {["Ordering food at a restaurant", "Making a reservation", "Asking for directions", "Complaining about service"].map((opt, i) => (
                  <label key={i} className="qopt">
                    <input type="radio" name="q1" />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
              <div className="row">
                <button className="btn btn-nav btn-nav-prev grow">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Previous</span>
                </button>
                <button className="btn btn-nav btn-nav-next grow">
                  <span>Next</span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
              </div>
            </aside>

            {/* Transcript */}
            <section className="card transcript">
              <div className="row">
                <h3 className="h3">Transcript</h3>
                <button className="btn sm" onClick={()=>setTranscriptOpen(v=>!v)}>
                  {transcriptOpen ? "Hide" : "Show"}
                </button>
              </div>

              {transcriptOpen && (
                <div className="lines">
                  {[
                    ["[0:05]","Waiter:","Good evening! Welcome to our restaurant. How many people are in your party?"],
                    ["[0:12]","Customer:","Hi, thank you. It's just me tonight. Table for one, please."],
                    ["[0:18]","Waiter:","Perfect! Right this way. Here's your table by the window."],
                  ].map((l, i)=>(
                    <div key={i} className="line">
                      <span className="ts">{l[0]}</span>
                      <div><strong>{l[1]}</strong> <span className="content">{l[2]}</span></div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </section>
      </div>
    );
  }

  // Task selection view
  return (
    <div className="dashboard-content">
      {/* Page Header */}
      <section className="card page-head">
        <div>
          <h1>🎧 Listening Practice</h1>
          <p className="muted">Improve listening comprehension from conversations to lectures</p>
        </div>

        <div className="head-actions">
          <div className="stats" style={{ gap: "16px" }}>
            <div className="stat">
              <span className="stat-val">42</span>
              <span className="stat-lbl">Completed</span>
            </div>
            <div className="stat">
              <span className="stat-val">86%</span>
              <span className="stat-lbl">Accuracy</span>
            </div>
          </div>
        </div>
      </section>

      {/* Filter dropdown */}
      <div className="card" style={{ padding: "16px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <label htmlFor="type-filter" style={{ fontWeight: 600 }}>
            Filter by type:
          </label>
          <select
            id="type-filter"
            className="select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ width: "250px" }}
          >
            {uniqueTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <span className="muted" style={{ marginLeft: "auto" }}>
            {filteredTasks.length} audio{filteredTasks.length !== 1 ? "s" : ""} available
          </span>
        </div>
      </div>

      {/* Task Cards Grid */}
      <section className="card">
        <h3 className="section-title" style={{ marginBottom: "20px" }}>
          Choose a Listening Task
        </h3>
        <div className="task-grid">
          {filteredTasks.map((task) => (
            <div key={task.id} className={`task-card task-card-${task.color}`}>
              {task.recommended && (
                <div className="task-badge">
                  <span>⭐ Recommended</span>
                </div>
              )}
              
              <div className="task-header">
                <div className={`task-level-badge task-level-${task.level.toLowerCase()}`}>
                  {task.level}
                </div>
                <div className={`task-color-indicator task-color-${task.color}`}></div>
              </div>
              
              <div className="task-content">
                <h4 className="task-title">{task.title}</h4>
                <span className={`task-type ${task.color}`}>{task.type}</span>
                <p className="muted" style={{ fontSize: "13px", marginTop: "8px" }}>
                  {task.description}
                </p>
              </div>

              <div className="task-meta">
                <span className="chip">{task.level} Level</span>
                <span className="chip">🕐 {task.duration}</span>
                <span className="chip">👥 {task.speakers}</span>
                <span className="chip">🧠 {task.questions} Qs</span>
              </div>

              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "8px" }}>
                {task.tags.map((tag) => (
                  <span key={tag} className="tag" style={{ fontSize: "11px", padding: "3px 8px" }}>
                    {tag}
                  </span>
                ))}
              </div>

              <div style={{ fontSize: "13px", marginTop: "8px", color: "#6b7280" }}>
                {task.accent}
              </div>

              <div className="task-status">
                {task.attempts > 0 ? (
                  <span className="status-text">{task.attempts} attempt{task.attempts !== 1 ? "s" : ""}</span>
                ) : (
                  <span className="status-text muted">No attempts yet</span>
                )}
              </div>

              <button
                className="btn primary w-full"
                onClick={() => {
                  setSelectedTask(task);
                  setShowPlayer(true);
                }}
              >
                ▶ Start Listening
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

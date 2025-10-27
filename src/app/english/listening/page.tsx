"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

type TabKey = "conversations" | "podcasts" | "news" | "lectures";

interface Activity {
  id: string;
  title: string;
  instruction: string;
  level: string;
  type: string;
  maxScore: number;
  timeLimitSec: number;
  unitTitle: string;
  questionCount: number;
  audioDuration: number;
  hasAudio: boolean;
}

interface Question {
  id: string;
  order: number;
  type: string;
  prompt: string;
  score: number;
  audioUrl?: string;
  audioDuration?: number;
  choices: Array<{
    id: string;
    order: number;
    text: string;
    value: string;
  }>;
}

interface ActivityDetail {
  activity: Activity & {
    audioUrl: string;
    audioDuration: number;
    audioMeta: any;
  };
  questions: Question[];
}

type AudioContent = {
  icon: string;
  title: string;
  desc: string;
  level: string;
  dur: string;
  speakers: string;
  accent: string;
  qs: number;
  tags: string[];
  color: string;
};

const AUDIO_LIBRARY: Record<TabKey, AudioContent[]> = {
  conversations: [
    {
      icon: "🍴",
      title: "At the Restaurant",
      desc: "A conversation between customer and waiter",
      level: "A2",
      dur: "2:30",
      speakers: "2 speakers",
      accent: "🇺🇸 American",
      qs: 6,
      tags: ["Dining", "Daily Life"],
      color: "blue",
    },
    {
      icon: "💼",
      title: "Job Interview Practice",
      desc: "Formal interview between employer and candidate",
      level: "B1",
      dur: "4:15",
      speakers: "2 speakers",
      accent: "🇬🇧 British",
      qs: 10,
      tags: ["Business", "Career"],
      color: "green",
    },
    {
      icon: "🏥",
      title: "Doctor's Appointment",
      desc: "Patient talking to doctor about symptoms",
      level: "A2",
      dur: "3:20",
      speakers: "2 speakers",
      accent: "🇺🇸 American",
      qs: 8,
      tags: ["Healthcare", "Daily Life"],
      color: "pink",
    },
  ],
  podcasts: [
    {
      icon: "🎧",
      title: "Technology Trends 2024",
      desc: "Discussion about AI and future technology",
      level: "C1",
      dur: "12:00",
      speakers: "3 speakers",
      accent: "🌍 Mixed accents",
      qs: 15,
      tags: ["Technology", "AI", "Future"],
      color: "amber",
    },
    {
      icon: "📚",
      title: "The Reading Corner",
      desc: "Authors discussing their latest books",
      level: "B2",
      dur: "18:30",
      speakers: "2 speakers",
      accent: "🇬🇧 British",
      qs: 12,
      tags: ["Literature", "Culture"],
      color: "indigo",
    },
  ],
  news: [
    {
      icon: "🌍",
      title: "Global Climate Summit",
      desc: "Latest news on environmental policies",
      level: "B2",
      dur: "5:45",
      speakers: "News anchor",
      accent: "🇺🇸 American",
      qs: 8,
      tags: ["Environment", "Politics"],
      color: "green",
    },
    {
      icon: "💹",
      title: "Stock Market Update",
      desc: "Analysis of today's market movements",
      level: "C1",
      dur: "6:20",
      speakers: "Financial analyst",
      accent: "🇬🇧 British",
      qs: 10,
      tags: ["Finance", "Economy"],
      color: "blue",
    },
  ],
  lectures: [
    {
      icon: "🔬",
      title: "Introduction to Quantum Physics",
      desc: "Basic principles and applications",
      level: "C2",
      dur: "25:00",
      speakers: "Professor",
      accent: "🇺🇸 American",
      qs: 20,
      tags: ["Science", "Physics", "Academic"],
      color: "purple",
    },
    {
      icon: "🎨",
      title: "Renaissance Art History",
      desc: "Evolution of art during the Renaissance period",
      level: "B2",
      dur: "15:30",
      speakers: "Art historian",
      accent: "🇬🇧 British",
      qs: 12,
      tags: ["History", "Art", "Culture"],
      color: "pink",
    },
  ],
};

export default function ListeningPage() {
  const { data: session } = useSession();
  const [tab, setTab] = useState<TabKey>("conversations");
  const [showPlayer, setShowPlayer] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(true);
  const [speed, setSpeed] = useState("1x");
  const [volume, setVolume] = useState(75);
  const [selectedAudio, setSelectedAudio] = useState<AudioContent | null>(null);
  
  // Real data from API
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityDetail, setActivityDetail] = useState<ActivityDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [listenCount, setListenCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const startTimeRef = useRef(new Date().toISOString());

  const cards = AUDIO_LIBRARY[tab];

  // Fetch activities on mount
  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/listening/activities");
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadActivity = async (activityId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/listening/${activityId}`);
      if (res.ok) {
        const data = await res.json();
        setActivityDetail(data);
        setShowPlayer(true);
        setCurrentQuestionIndex(0);
        setAnswers({});
        startTimeRef.current = new Date().toISOString();
        setListenCount(0);
      }
    } catch (error) {
      console.error("Error loading activity:", error);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswers = async () => {
    if (!activityDetail) return;

    try {
      setLoading(true);
      const answerArray = Object.entries(answers).map(([questionId, chosenIds]) => ({
        questionId,
        chosenIds,
      }));

      const res = await fetch(`/api/listening/${activityDetail.activity.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: answerArray,
          startTime: startTimeRef.current,
          listenCount,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        alert(`Score: ${result.totalScore}/${result.maxScore} (${result.percentage}%)\n\n${result.feedback.overall}`);
        setShowPlayer(false);
        setActivityDetail(null);
        fetchActivities(); // Refresh
      }
    } catch (error) {
      console.error("Error submitting:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId: string, choiceId: string, isMulti: boolean) => {
    setAnswers((prev) => {
      if (isMulti) {
        const current = prev[questionId] || [];
        const newVal = current.includes(choiceId)
          ? current.filter((id) => id !== choiceId)
          : [...current, choiceId];
        return { ...prev, [questionId]: newVal };
      } else {
        return { ...prev, [questionId]: [choiceId] };
      }
    });
  };

  const playAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
        setListenCount((c) => c + 1);
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const currentQuestion = activityDetail?.questions[currentQuestionIndex];

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

      {/* Tabs */}
      <div className="card tabs">
        {[
          ["conversations","Conversations","Hội thoại"],
          ["podcasts","Podcasts & Interviews","Podcast"],
          ["news","News & Reports","Tin tức"],
          ["lectures","Lectures & Talks","Bài giảng"],
        ].map(([k, label, sub]) => (
          <button
            key={k}
            className={`tab ${tab===k ? "active":""}`}
            onClick={() => setTab(k as TabKey)}
          >
            {label}<br/><small className="tab-sub">{sub}</small>
          </button>
        ))}
      </div>

      {/* Audio cards */}
      {!showPlayer && (
        <section className="card">
          <h2 className="section-title">Available Audio Content</h2>
          
          {/* Show real activities from DB if available */}
          {activities.length > 0 && (
            <div className="grid-audios" style={{ marginBottom: '2rem' }}>
              <h3 className="h3" style={{ gridColumn: '1/-1', marginBottom: '1rem' }}>
                📚 From Your Curriculum
              </h3>
              {activities.slice(0, 6).map((activity) => (
                <div key={activity.id} className="audio-card">
                  <div className="audio-head">
                    <div className="aicon blue">🎧</div>
                    <div>
                      <h3 className="h3">{activity.title}</h3>
                      <p className="muted">{activity.instruction?.substring(0, 60)}...</p>
                    </div>
                  </div>

                  <div className="chips">
                    <span className="chip chip-level">{activity.level} Level</span>
                    <span className="chip">
                      🕐 {Math.floor(activity.audioDuration / 60)}:{(activity.audioDuration % 60).toString().padStart(2, '0')}
                    </span>
                    <span className="chip">🧠 {activity.questionCount} questions</span>
                    <span className="chip">📝 {activity.maxScore} points</span>
                  </div>

                  <button
                    className="btn btn--primary w-full"
                    onClick={() => loadActivity(activity.id)}
                    disabled={loading}
                  >
                    {loading ? "Loading..." : "Start Listening"}
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Demo/Mock content */}
          <div className="grid-audios">
            <h3 className="h3" style={{ gridColumn: '1/-1', marginBottom: '1rem' }}>
              🎯 Practice Library
            </h3>
            {cards.map((c, i) => (
              <div key={i} className="audio-card">
                <div className="audio-head">
                  <div className={`aicon ${c.color}`}>{c.icon}</div>
                  <div>
                    <h3 className="h3">{c.title}</h3>
                    <p className="muted">{c.desc}</p>
                  </div>
                </div>

                <div className="chips">
                  <span className="chip chip-level">{c.level} Level</span>
                  <span className="chip">🕐 {c.dur}</span>
                  <span className="chip">👥 {c.speakers}</span>
                  <span className="chip">{c.accent}</span>
                  <span className="chip">🧠 {c.qs} questions</span>
                </div>

                <div className="tags">
                  {c.tags.map(t => <span key={t} className="tag">{t}</span>)}
                </div>

                <button
                  className="btn btn--outline w-full"
                  onClick={() => {
                    setSelectedAudio(c);
                    setShowPlayer(true);
                  }}
                >
                  Preview (Demo)
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Player + Question panel */}
      {showPlayer && selectedAudio && (
        <>
          <section className="card player">
            <div className="player-meta">
              <div>
                <h2 className="h2">{selectedAudio.icon} {selectedAudio.title}</h2>
                <p className="muted">
                  {selectedAudio.level} Level • {selectedAudio.speakers} • {selectedAudio.accent}
                </p>
              </div>
              <button className="btn btn--outline" onClick={() => { setShowPlayer(false); setSelectedAudio(null); }}>
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
              <button className="btn sm">⏪ -10s</button>
              <button className="btn big play">▶️</button>
              <button className="btn sm">+10s ⏩</button>

              <div className="grow" />
              <span className="mono muted">1:30 / 2:30</span>

              <select className="select sm" value={speed} onChange={(e)=>setSpeed(e.target.value)}>
                <option>1x</option><option>0.75x</option><option>1.25x</option><option>1.5x</option>
              </select>

              <div className="vol">
                <span>🔊</span>
                <input type="range" min={0} max={100} value={volume} onChange={(e)=>setVolume(+e.target.value)} />
              </div>
            </div>
          </section>

          {/* Hidden audio element */}
          {activityDetail && (
            <audio
              ref={audioRef}
              src={activityDetail.activity.audioUrl}
              onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
              onEnded={() => setIsPlaying(false)}
            />
          )}

          <section className="player-split">
            {/* Question panel */}
            <aside className="card qpanel">
              {currentQuestion && (
                <>
                  <h3 className="h3">
                    Question {currentQuestionIndex + 1} of {activityDetail?.questions.length || 0}
                  </h3>
                  <p className="qtext">{currentQuestion.prompt}</p>

                  <div className="qopts">
                    {currentQuestion.choices.map((choice) => {
                      const isMulti = currentQuestion.type === 'MULTI_CHOICE';
                      const isChecked = answers[currentQuestion.id]?.includes(choice.id);
                      
                      return (
                        <label key={choice.id} className="qopt">
                          <input
                            type={isMulti ? "checkbox" : "radio"}
                            name={currentQuestion.id}
                            checked={isChecked}
                            onChange={() => handleAnswer(currentQuestion.id, choice.id, isMulti)}
                          />
                          <span>{choice.text}</span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="row">
                    <button className="btn btn--outline grow" onClick={playAudio}>
                      {isPlaying ? "⏸️ Pause" : "▶️ Play"}
                    </button>
                    
                    {currentQuestionIndex < (activityDetail?.questions.length || 0) - 1 ? (
                      <button
                        className="btn btn--primary grow"
                        onClick={() => setCurrentQuestionIndex((i) => i + 1)}
                      >
                        Next →
                      </button>
                    ) : (
                      <button
                        className="btn btn--success grow"
                        onClick={submitAnswers}
                        disabled={loading}
                      >
                        {loading ? "Submitting..." : "Submit ✓"}
                      </button>
                    )}
                  </div>
                  
                  {currentQuestionIndex > 0 && (
                    <button
                      className="btn btn--ghost w-full"
                      onClick={() => setCurrentQuestionIndex((i) => i - 1)}
                    >
                      ← Previous
                    </button>
                  )}
                </>
              )}
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
        </>
      )}
    </div>
  );
}

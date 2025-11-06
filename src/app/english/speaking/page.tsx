"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface SpeakingTask {
  id: string;
  icon: string;
  title: string;
  type: string;
  level: string;
  prompt: string;
  timeLimit: string;
  tips: string[];
  vocab: Array<{ word: string; ipa: string }>;
  phrases: string[];
  recommended?: boolean;
  attempts: number;
  color: string;
}

const SPEAKING_TASKS: SpeakingTask[] = [
  // Pronunciation
  {
    id: "pron-intro",
    icon: "👋",
    title: "Self Introduction",
    type: "Pronunciation",
    level: "A2",
    prompt: "Introduce yourself to a new colleague at work. Include your name, job position, and something interesting about yourself.",
    timeLimit: "2 min",
    tips: [
      "Speak clearly and at moderate pace",
      "Use natural intonation",
      "Pause between main ideas",
    ],
    vocab: [
      { word: "introduce", ipa: "/ˌɪntrəˈdjuːs/" },
      { word: "colleague", ipa: "/ˈkɒliːɡ/" },
      { word: "position", ipa: "/pəˈzɪʃn/" },
    ],
    phrases: [
      "✓ Hi, I'm... and I work as...",
      "✓ Nice to meet you",
      "✓ I've been working here for...",
      "✓ In my free time, I enjoy...",
    ],
    recommended: true,
    attempts: 0,
    color: "blue",
  },
  {
    id: "pron-numbers",
    icon: "🔢",
    title: "Numbers & Dates",
    type: "Pronunciation",
    level: "A2",
    prompt: "Practice pronouncing numbers, prices, dates, and times correctly. Read aloud the provided examples.",
    timeLimit: "3 min",
    tips: [
      "Pay attention to stress patterns",
      "Practice -teen vs -ty sounds",
      "Use rising intonation for dates",
    ],
    vocab: [
      { word: "thirteen", ipa: "/ˌθɜːrˈtiːn/" },
      { word: "thirty", ipa: "/ˈθɜːrti/" },
      { word: "receipt", ipa: "/rɪˈsiːt/" },
    ],
    phrases: [
      "✓ The meeting is at 2:30 PM",
      "✓ My birthday is on March 15th",
      "✓ That costs $13.50",
    ],
    attempts: 0,
    color: "blue",
  },
  // Topic Discussion
  {
    id: "topic-season",
    icon: "🌸",
    title: "Favorite Season",
    type: "Topic Discussion",
    level: "B1",
    prompt: "Talk about your favorite season of the year. Explain why you prefer it and what activities you enjoy during that time.",
    timeLimit: "3 min",
    tips: [
      "Organize your ideas: introduction, reasons, conclusion",
      "Use descriptive adjectives",
      "Give specific examples",
    ],
    vocab: [
      { word: "season", ipa: "/ˈsiːzn/" },
      { word: "prefer", ipa: "/prɪˈfɜːr/" },
      { word: "activity", ipa: "/ækˈtɪvɪti/" },
    ],
    phrases: [
      "✓ My favorite season is...",
      "✓ I prefer it because...",
      "✓ During this time, I usually...",
      "✓ What I love most is...",
    ],
    recommended: true,
    attempts: 0,
    color: "green",
  },
  {
    id: "topic-technology",
    icon: "💻",
    title: "Technology in Daily Life",
    type: "Topic Discussion",
    level: "B2",
    prompt: "Discuss how technology has changed your daily life. Talk about both positive and negative aspects.",
    timeLimit: "4 min",
    tips: [
      "Present balanced viewpoint",
      "Use linking words (however, moreover)",
      "Support opinions with examples",
    ],
    vocab: [
      { word: "convenient", ipa: "/kənˈviːniənt/" },
      { word: "rely", ipa: "/rɪˈlaɪ/" },
      { word: "distraction", ipa: "/dɪˈstrækʃn/" },
    ],
    phrases: [
      "✓ On one hand..., on the other hand...",
      "✓ Technology has made it possible to...",
      "✓ However, there are some downsides...",
    ],
    attempts: 0,
    color: "green",
  },
  // Role Play
  {
    id: "role-restaurant",
    icon: "🍴",
    title: "At the Restaurant",
    type: "Role Play",
    level: "A2",
    prompt: "You are at a restaurant. Order a meal, ask about ingredients, and request a drink. Be polite and natural.",
    timeLimit: "2-3 min",
    tips: [
      "Use polite expressions: Could I have..., I'd like...",
      "Ask clarifying questions",
      "Show appreciation: Thank you, That sounds great",
    ],
    vocab: [
      { word: "order", ipa: "/ˈɔːrdər/" },
      { word: "ingredient", ipa: "/ɪnˈɡriːdiənt/" },
      { word: "recommend", ipa: "/ˌrekəˈmend/" },
    ],
    phrases: [
      "✓ Could I have..., please?",
      "✓ What do you recommend?",
      "✓ Does this contain...?",
      "✓ I'd like to order...",
    ],
    recommended: true,
    attempts: 0,
    color: "purple",
  },
  {
    id: "role-doctor",
    icon: "🏥",
    title: "Doctor Appointment",
    type: "Role Play",
    level: "B1",
    prompt: "You are visiting a doctor. Describe your symptoms and answer questions about your health.",
    timeLimit: "3 min",
    tips: [
      "Describe symptoms clearly",
      "Answer questions with details",
      "Use medical vocabulary appropriately",
    ],
    vocab: [
      { word: "symptom", ipa: "/ˈsɪmptəm/" },
      { word: "prescribe", ipa: "/prɪˈskraɪb/" },
      { word: "allergy", ipa: "/ˈælərdʒi/" },
    ],
    phrases: [
      "✓ I've been feeling...",
      "✓ It started about... ago",
      "✓ Do I need any medication?",
    ],
    attempts: 0,
    color: "purple",
  },
  // Picture Description
  {
    id: "pic-coffee-shop",
    icon: "☕",
    title: "Busy Coffee Shop",
    type: "Picture Description",
    level: "B1",
    prompt: "Describe the scene you imagine: A busy coffee shop on a weekend morning. Include details about people, atmosphere, and activities.",
    timeLimit: "2 min",
    tips: [
      "Start with an overview",
      "Use present continuous: people are sitting, someone is ordering",
      "Describe from general to specific details",
    ],
    vocab: [
      { word: "atmosphere", ipa: "/ˈætməsfɪər/" },
      { word: "crowded", ipa: "/ˈkraʊdɪd/" },
      { word: "background", ipa: "/ˈbækɡraʊnd/" },
    ],
    phrases: [
      "✓ In this scene, I can see...",
      "✓ In the foreground/background...",
      "✓ There are several people who are...",
      "✓ The atmosphere seems...",
    ],
    attempts: 0,
    color: "teal",
  },
  {
    id: "pic-park",
    icon: "🏞️",
    title: "Park Activities",
    type: "Picture Description",
    level: "B2",
    prompt: "Describe a busy park scene with various activities. Include weather, people's emotions, and background details.",
    timeLimit: "3 min",
    tips: [
      "Use varied vocabulary for colors and emotions",
      "Include weather and time of day",
      "Describe spatial relationships",
    ],
    vocab: [
      { word: "leisure", ipa: "/ˈleʒər/" },
      { word: "stroll", ipa: "/stroʊl/" },
      { word: "vicinity", ipa: "/vəˈsɪnəti/" },
    ],
    phrases: [
      "✓ It appears to be...",
      "✓ Next to/near/in front of...",
      "✓ The people seem to be enjoying...",
    ],
    attempts: 0,
    color: "teal",
  },
  // Interview Practice
  {
    id: "interview-job",
    icon: "💼",
    title: "Job Interview",
    type: "Interview Practice",
    level: "B2",
    prompt: "Practice answering common job interview questions. Explain your strengths, experience, and why you're a good fit.",
    timeLimit: "5 min",
    tips: [
      "Use STAR method (Situation, Task, Action, Result)",
      "Be specific with examples",
      "Show enthusiasm and confidence",
    ],
    vocab: [
      { word: "strength", ipa: "/streŋkθ/" },
      { word: "collaborate", ipa: "/kəˈlæbəreɪt/" },
      { word: "achievement", ipa: "/əˈtʃiːvmənt/" },
    ],
    phrases: [
      "✓ My greatest strength is...",
      "✓ I have experience in...",
      "✓ For example, in my previous role...",
      "✓ I'm particularly interested in this position because...",
    ],
    recommended: true,
    attempts: 0,
    color: "indigo",
  },
];

export default function SpeakingPage() {
  const [filterType, setFilterType] = useState<string>("All types");
  const [selectedTask, setSelectedTask] = useState<SpeakingTask | null>(null);
  const [listening, setListening] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [transcript, setTranscript] = useState("");
  const [micPermission, setMicPermission] = useState<"granted" | "denied" | "prompt" | "checking">("prompt");
  const [micError, setMicError] = useState<string>("");

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Filter tasks by type
  const filteredTasks = filterType === "All types" 
    ? SPEAKING_TASKS 
    : SPEAKING_TASKS.filter(task => task.type === filterType);

  const uniqueTypes = ["All types", ...Array.from(new Set(SPEAKING_TASKS.map(t => t.type)))];

  // Check microphone permission on mount
  useEffect(() => {
    checkMicrophonePermission();
  }, []);

  const checkMicrophonePermission = async () => {
    setMicPermission("checking");
    try {
      if ('permissions' in navigator) {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setMicPermission(permissionStatus.state as "granted" | "denied" | "prompt");
        
        permissionStatus.onchange = () => {
          setMicPermission(permissionStatus.state as "granted" | "denied" | "prompt");
        };
      } else {
        setMicPermission("prompt");
      }
    } catch (error) {
      console.error("Error checking microphone permission:", error);
      setMicPermission("prompt");
    }
  };

  const requestMicrophoneAccess = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission("granted");
      setMicError("");
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error: any) {
      console.error("Microphone access error:", error);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setMicPermission("denied");
        setMicError("Microphone access denied. Please allow microphone access in your browser settings.");
      } else if (error.name === 'NotFoundError') {
        setMicError("No microphone found. Please connect a microphone and try again.");
      } else {
        setMicError("Could not access microphone. Please check your device settings.");
      }
      return false;
    }
  };

  // Timer for recording
  useEffect(() => {
    if (recording) {
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recording]);

  const mmss = useMemo(() => {
    const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const ss = String(elapsed % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }, [elapsed]);

  const toggleListen = () => setListening((v) => !v);
  
  const startRec = async () => {
    if (micPermission !== "granted") {
      const hasAccess = await requestMicrophoneAccess();
      if (!hasAccess) return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const audioChunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        console.log("Recording stopped, audio blob size:", audioBlob.size);
        
        // Mock transcript generation
        setTimeout(() => {
          setTranscript(
            "Hello, my name is John and I work as a software engineer. I've been with this company for about two years now. In my free time, I really enjoy reading and playing chess. Nice to meet you!"
          );
        }, 500);

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
    setElapsed(0);
    setRecording(true);
      setMicError("");
    } catch (error: any) {
      console.error("Recording error:", error);
      setMicError("Failed to start recording. Please check your microphone.");
    }
  };

  const stopRec = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };
  
  const retry = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    setElapsed(0);
    setTranscript("");
    setMicError("");
  };

  // Task detail view
  if (selectedTask) {
  return (
      <div className="dashboard-content">
        {/* Back button and header */}
      <section className="card page-head">
        <div>
            <button 
              className="btn outline" 
              onClick={() => {
                setSelectedTask(null);
                setRecording(false);
                setTranscript("");
                setElapsed(0);
              }}
            >
              ← Back to Tasks
            </button>
            <h1 style={{ marginTop: "12px" }}>{selectedTask.title}</h1>
            <p className="muted">{selectedTask.type} • {selectedTask.level} Level</p>
        </div>
      </section>

      {/* Main Grid */}
      <div className="spk-grid">
        {/* Left column */}
        <div className="left-col">
          {/* Prompt */}
          <section className="card">
              <h3 className="section-title">{selectedTask.title}</h3>
            <div className="prompt">
                <p>{selectedTask.prompt}</p>
            </div>
            <div className="chips">
                <span className="chip blue">Level: {selectedTask.level}</span>
                <span className="chip amber">Time Limit: {selectedTask.timeLimit}</span>
                <span className="chip indigo">Type: {selectedTask.type}</span>
            </div>
          </section>

          {/* Listen example */}
          <section className="card">
              <h3 className="section-title">Listen to Example First</h3>
            <div className="listen-row">
              <button
                  className={`btn btn-play ${listening ? "playing" : ""}`}
                onClick={toggleListen}
                aria-label="Play example"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  {listening ? (
                    <>
                      <rect x="5" y="3" width="2" height="10" rx="1" fill="currentColor"/>
                      <rect x="9" y="3" width="2" height="10" rx="1" fill="currentColor"/>
                    </>
                  ) : (
                    <path d="M6 4L12 8L6 12V4Z" fill="currentColor"/>
                  )}
                </svg>
                <span>{listening ? "Pause" : "Play"}</span>
              </button>

              <div className="wave">
                {Array.from({ length: 16 }).map((_, i) => (
                  <div key={i} className="bar" />
                ))}
              </div>

              <div className="mono muted">0:45</div>
            </div>
          </section>

          {/* Recording */}
          <section className="card">
              <h3 className="section-title">Your Recording</h3>
              
              {/* Microphone Status */}
              {micPermission === "checking" && (
                <div style={{ padding: "16px", background: "#f1f5f9", borderRadius: "8px", marginBottom: "16px" }}>
                  Checking microphone access...
                </div>
              )}
              {micPermission === "denied" && (
                <div style={{ padding: "16px", background: "#fee2e2", borderRadius: "8px", marginBottom: "16px", color: "#991b1b" }}>
                  <strong>Microphone access denied.</strong> Please allow microphone access in your browser settings and refresh the page.
                </div>
              )}
              {micPermission === "prompt" && !recording && (
                <div style={{ padding: "16px", background: "#fef3c7", borderRadius: "8px", marginBottom: "16px", color: "#92400e" }}>
                  <strong>Microphone permission required.</strong> Click the record button to enable microphone access.
                </div>
              )}
              {micError && (
                <div style={{ padding: "16px", background: "#fee2e2", borderRadius: "8px", marginBottom: "16px", color: "#991b1b" }}>
                  {micError}
                </div>
              )}

            <div className="rec-wrap">
              <button
                className={`rec-btn ${recording ? "rec-on" : ""}`}
                onClick={recording ? stopRec : startRec}
                aria-label="Record"
                title={recording ? "Stop" : "Record"}
                  disabled={micPermission === "checking"}
              >
                {recording ? "⏹" : "⏺"}
              </button>
              <div className="timer mono">{mmss}</div>
              <div className="rec-actions">
                  <button className="btn btn-retry" onClick={retry} disabled={micPermission === "checking"}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M13.65 2.35C12.2 0.9 10.2 0 8 0C3.58 0 0 3.58 0 8C0 12.42 3.58 16 8 16C11.73 16 14.84 13.45 15.73 10H13.65C12.83 12.33 10.61 14 8 14C4.69 14 2 11.31 2 8C2 4.69 4.69 2 8 2C9.66 2 11.14 2.69 12.22 3.78L10 6H16V0L13.65 2.35Z" fill="currentColor"/>
                    </svg>
                    <span>Retry</span>
                  </button>
                  <button className="btn btn-analyze" onClick={stopRec} disabled={!recording}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="3" y="3" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      <path d="M6 6L10 10M10 6L6 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <span>Stop & Analyze</span>
                  </button>
                </div>
            </div>
          </section>

            {/* Transcript */}
            <section className="card">
              <h3 className="section-title">Your Transcript</h3>
              <div className="transcript" style={{ color: transcript ? "inherit" : "var(--dash-muted)" }}>
                {transcript || "Your speech will appear here after recording..."}
              </div>
              {transcript && (
                <div style={{ marginTop: "16px", padding: "12px", background: "var(--color-bg-3)", borderRadius: "8px" }}>
                  <div style={{ fontSize: "32px", fontWeight: "bold", textAlign: "center", marginBottom: "8px", color: "var(--dash-accent)" }}>
                    8.5/10
                  </div>
                  <p className="small muted" style={{ textAlign: "center" }}>
                    Great fluency! Minor pronunciation improvements recommended.
                  </p>
            </div>
              )}
          </section>
        </div>

        {/* Right column */}
        <aside className="right-col">
          {/* Vocabulary */}
          <section className="card no-pad">
            <div className="card-head indigo">
              <h3>📚 Key Vocabulary</h3>
            </div>
            <div className="pad">
                {selectedTask.vocab.map(({ word, ipa }) => (
                  <div key={word} className="vocab">
                  <div className="row">
                      <span className="w">{word}</span>
                      <button 
                        className="icon-btn"
                        onClick={async () => {
                          try {
                            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
                            if (response.ok) {
                              const data = await response.json();
                              const audioUrl = data[0]?.phonetics?.find((p: any) => p.audio)?.audio;
                              if (audioUrl) {
                                const audio = new Audio(audioUrl);
                                audio.play();
                              } else {
                                alert("No audio available for this word");
                              }
                            }
                          } catch (e) {
                            console.error("Dictionary API error:", e);
                          }
                        }}
                        title="Play pronunciation"
                      >
                        🔊
                      </button>
                  </div>
                  <div className="ipa indigo-t">{ipa}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Phrases */}
          <section className="card no-pad">
            <div className="card-head green">
              <h3>💬 Useful Phrases</h3>
            </div>
            <div className="pad">
                {selectedTask.phrases.map((p, i) => (
                <div key={i} className="phrase">{p}</div>
              ))}
            </div>
          </section>

          {/* Tips */}
          <section className="card no-pad">
            <div className="card-head amber">
                <h3>💡 Speaking Tips</h3>
            </div>
            <div className="pad">
                {selectedTask.tips.map((t, i) => (
                <div key={i} className="tip">• {t}</div>
              ))}
            </div>
          </section>
        </aside>
        </div>
      </div>
    );
  }

  // Task selection view
  return (
    <div className="dashboard-content">
      {/* Header */}
      <section className="card page-head">
        <div>
          <h1>🎤 Speaking Practice</h1>
          <p className="muted">
            Practice speaking and improve your pronunciation and fluency
          </p>
        </div>

        <div className="head-actions">
          <div className="stats" style={{ gap: "16px" }}>
            <div className="stat">
              <span className="stat-val">32</span>
              <span className="stat-lbl">Sessions</span>
            </div>
            <div className="stat">
              <span className="stat-val">8.2</span>
              <span className="stat-lbl">Avg Score</span>
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
            {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""} available
          </span>
        </div>
      </div>

      {/* Task Cards Grid */}
      <section className="card">
        <h3 className="section-title" style={{ marginBottom: "20px" }}>
          Choose a Speaking Task
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
              </div>

              <div className="task-meta">
                <span className="chip">{task.level} Level</span>
                <span className="chip">⏱️ {task.timeLimit}</span>
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
                onClick={() => setSelectedTask(task)}
              >
                ▶ Start
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SPEAKING_TASKS, SpeakingTask } from "./data/speakingTasks";

export default function SpeakingPage() {
  const [filterType, setFilterType] = useState<string>("All types");
  const [selectedTask, setSelectedTask] = useState<SpeakingTask | null>(null);
  const [listening, setListening] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [transcript, setTranscript] = useState("");
  const [micPermission, setMicPermission] = useState<"granted" | "denied" | "prompt" | "checking">("prompt");
  const [micError, setMicError] = useState<string>("");
  const [conversation, setConversation] = useState<string[]>([]);
  const [conversationSegments, setConversationSegments] = useState<Array<{speaker: string; text: string}>>([]);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState<number | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("All levels");

  // Filter tasks by type, level, and search
  const filteredTasks = useMemo(() => {
    return SPEAKING_TASKS.filter(task => {
      const matchesType = filterType === "All types" || task.type === filterType;
      const matchesLevel = levelFilter === "All levels" || task.level === levelFilter;
      const matchesSearch = !searchTerm || 
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.type.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesLevel && matchesSearch;
    });
  }, [filterType, levelFilter, searchTerm]);

  const uniqueTypes = ["All types", ...Array.from(new Set(SPEAKING_TASKS.map(t => t.type)))];
  const uniqueLevels = ["All levels", ...Array.from(new Set(SPEAKING_TASKS.map(t => t.level)))];

  // Check microphone permission on mount
  useEffect(() => {
    checkMicrophonePermission();
  }, []);

  // Load conversation when task is selected
  useEffect(() => {
    if (selectedTask) {
      loadConversation(selectedTask.id);
    } else {
      setConversation([]);
      setConversationSegments([]);
      setCurrentLineIndex(null);
    }
  }, [selectedTask]);

  const loadConversation = async (taskId: string) => {
    setLoadingConversation(true);
    try {
      // Map task IDs to JSON filenames (new format)
      const filenameMap: Record<string, string> = {
        "conv-budget-cuts": "1_Budget_Cuts_speaking.json",
        "conv-interview": "2_The_Interview_speaking.json",
        "conv-he-said-she-said": "3_He_Said_-_She_Said_speaking.json",
        "conv-circus": "4_Run_Away_With_the_Circus!_speaking.json",
        "conv-vacation": "5_Greatest_Vacation_of_All_Time_speaking.json",
        "conv-float": "6_Will_It_Float_speaking.json",
        "conv-tour-guide": "7_Tip_Your_Tour_Guide_speaking.json",
        "conv-pets": "8_Pets_Are_Family,_Too!_speaking.json",
      };

      const filename = filenameMap[taskId];
      if (!filename) {
        console.warn(`No conversation file found for task: ${taskId}`);
        setConversation([]);
        setConversationSegments([]);
        return;
      }

      // Fetch from API
      const response = await fetch(`/api/speaking/conversation?file=${encodeURIComponent(filename)}`);
      if (response.ok) {
        const data = await response.json();
        setConversation(data.conversation || []);
        setConversationSegments(data.segments || []);
      } else {
        console.error("Failed to load conversation");
        setConversation([]);
        setConversationSegments([]);
      }
    } catch (error) {
      console.error("Error loading conversation:", error);
      setConversation([]);
    } finally {
      setLoadingConversation(false);
    }
  };

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
    } catch (error) {
      console.error("Microphone access error:", error);
      const errorObj = error as { name?: string };
      if (errorObj.name === 'NotAllowedError' || errorObj.name === 'PermissionDeniedError') {
        setMicPermission("denied");
        setMicError("Microphone access denied. Please allow microphone access in your browser settings.");
      } else if (errorObj.name === 'NotFoundError') {
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
    } catch (error) {
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

          {/* Conversation Text - Main Content */}
          {loadingConversation && (
            <section className="card">
              <div style={{ padding: "16px", textAlign: "center", color: "#64748b" }}>
                Loading conversation...
              </div>
            </section>
          )}

          {(conversationSegments.length > 0 || conversation.length > 0) && (
            <section className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h3 className="section-title" style={{ margin: 0 }}>Conversation Text</h3>
                <span className="muted" style={{ fontSize: "0.85rem" }}>
                  {conversationSegments.length > 0 ? conversationSegments.length : conversation.length} lines
                </span>
              </div>
              <p className="muted" style={{ marginBottom: "16px", fontSize: "0.9rem" }}>
                Read along with the conversation. Click on a line to highlight it as you read.
              </p>
              <div
                style={{
                  maxHeight: "500px",
                  overflowY: "auto",
                  padding: "20px",
                  background: "#ffffff",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "inset 0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                {((conversationSegments.length > 0 ? conversationSegments : conversation.map((text) => ({ speaker: "", text })))).map((item, index) => (
                  <div
                    key={index}
                    onClick={() => setCurrentLineIndex(index)}
                    style={{
                      padding: "12px 16px",
                      marginBottom: "8px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      backgroundColor: currentLineIndex === index ? "#eff6ff" : "transparent",
                      borderLeft: currentLineIndex === index ? "4px solid #2563eb" : "4px solid transparent",
                      fontSize: "1rem",
                      lineHeight: "1.7",
                      border: currentLineIndex === index ? "1px solid #bfdbfe" : "1px solid transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (currentLineIndex !== index) {
                        e.currentTarget.style.backgroundColor = "#f8fafc";
                        e.currentTarget.style.borderColor = "#e2e8f0";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentLineIndex !== index) {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.borderColor = "transparent";
                      }
                    }}
                  >
                    {item.speaker && (
                      <span style={{ 
                        fontWeight: 700, 
                        color: "#1e40af",
                        marginRight: "12px",
                        display: "inline-block",
                        minWidth: "120px",
                        fontSize: "0.95rem",
                        textTransform: "none",
                      }}>
                        {item.speaker}:
                      </span>
                    )}
                    <span style={{ color: "#1f2937" }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

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
              <h3>Key Vocabulary</h3>
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
                              interface PhoneticData { audio?: string; }
                              const audioUrl = data[0]?.phonetics?.find((p: PhoneticData) => p.audio)?.audio;
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
              <h3>Useful Phrases</h3>
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
                <h3>Speaking Tips</h3>
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
      {/* Page header */}
      <section className="card">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
            alignItems: "center",
          }}
        >
          <div style={{ flex: 1, minWidth: "240px" }}>
            <h1 style={{ marginBottom: "4px" }}>Speaking Practice</h1>
            <p className="muted">
              Practice speaking and improve your pronunciation and fluency
            </p>
          </div>
          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              minWidth: "260px",
            }}
          >
            <StatsCard label="Tasks" value={SPEAKING_TASKS.length.toString()} />
            <StatsCard label="Avg. length" value="~3 min" />
            <StatsCard label="Skill focus" value="Pronunciation • Fluency • Expression" />
          </div>
        </div>
      </section>

      {/* Search and filters */}
      <section
        className="card"
        style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}
      >
        <input
          type="text"
          placeholder="Search by title or topic…"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="input"
          style={{ flex: 1, minWidth: "220px" }}
        />
        <select
          className="select"
          value={levelFilter}
          onChange={(event) => setLevelFilter(event.target.value)}
          style={{ minWidth: "160px" }}
        >
          {uniqueLevels.map((option) => (
            <option value={option} key={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={filterType}
          onChange={(event) => setFilterType(event.target.value)}
          style={{ minWidth: "200px" }}
        >
          {uniqueTypes.map((type) => (
            <option value={type} key={type}>
              {type}
            </option>
          ))}
        </select>
      </section>

      {/* Task Cards Grid */}
      <section
        className="card"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
          gap: "16px",
        }}
      >
        {filteredTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onSelect={() => {
              setSelectedTask(task);
            }}
          />
        ))}
        {!filteredTasks.length && (
          <div className="card soft" style={{ gridColumn: "1/-1" }}>
            No tasks found matching your filters.
          </div>
        )}
      </section>
    </div>
  );
}

function StatsCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        borderRadius: "12px",
        padding: "12px 16px",
        background: "rgba(255,255,255,0.4)",
        minWidth: "140px",
      }}
    >
      <div style={{ fontSize: "0.8rem", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function TaskCard({
  task,
  onSelect,
}: {
  task: SpeakingTask;
  onSelect: () => void;
}) {
  return (
    <div className="card soft" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="chip">{task.level}</span>
        {task.recommended && (
          <span className="chip" style={{ background: "#fef3c7", color: "#92400e" }}>
            Recommended
          </span>
        )}
      </div>
      <div>
        <h3 style={{ marginBottom: "4px" }}>{task.title}</h3>
        <p className="muted" style={{ marginBottom: "8px" }}>
          {task.prompt.substring(0, 100)}{task.prompt.length > 100 ? "..." : ""}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          <span className="tag">{task.type}</span>
          <span className="tag">{task.timeLimit}</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: "8px", fontSize: "0.9rem" }}>
        <span>{task.timeLimit}</span>
        {task.attempts > 0 && <span>{task.attempts} attempt{task.attempts !== 1 ? "s" : ""}</span>}
      </div>
      <button className="btn primary" onClick={onSelect}>
        Start Practice
      </button>
    </div>
  );
}

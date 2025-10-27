"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type TabKey = "pronunciation" | "topic" | "roleplay" | "picture";

const SPEAKING_PROMPTS: Record<TabKey, {
  title: string;
  prompt: string;
  timeLimit: string;
  tips: string[];
  vocab: Array<{word: string; ipa: string}>;
  phrases: string[];
}> = {
  pronunciation: {
    title: "Pronunciation Practice",
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
  },
  topic: {
    title: "Topic Discussion",
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
  },
  roleplay: {
    title: "Role Play",
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
  },
  picture: {
    title: "Picture Description",
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
  },
};

export default function SpeakingPage() {
  const [tab, setTab] = useState<TabKey>("topic");
  const [listening, setListening] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [transcript, setTranscript] = useState("");
  const [micPermission, setMicPermission] = useState<"granted" | "denied" | "prompt" | "checking">("prompt");
  const [micError, setMicError] = useState<string>("");

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const currentPrompt = SPEAKING_PROMPTS[tab];

  // Check microphone permission on mount
  useEffect(() => {
    checkMicrophonePermission();
  }, []);

  const checkMicrophonePermission = async () => {
    setMicPermission("checking");
    try {
      // Check if Permissions API is supported
      if ('permissions' in navigator) {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setMicPermission(permissionStatus.state as "granted" | "denied" | "prompt");
        
        // Listen for permission changes
        permissionStatus.onchange = () => {
          setMicPermission(permissionStatus.state as "granted" | "denied" | "prompt");
        };
      } else {
        // Fallback: try to access microphone directly
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
      // Stop the stream immediately as we just needed to request permission
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

  // simple timer for recording
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
    // Check/request microphone permission first
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
        // Here you would typically upload to server or process the audio
        console.log("Recording stopped, audio blob size:", audioBlob.size);
        
        // Mock transcript generation
        setTimeout(() => {
          setTranscript(
            "Hello, my name is John and I work as a software engineer. I've been with this company for about two years now. In my free time, I really enjoy reading and playing chess. Nice to meet you!"
          );
        }, 500);

        // Clean up
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

      {/* Tabs */}
      <div className="card tabs">
        {[
          { key: "pronunciation", label: "Pronunciation", sub: "Phát âm" },
          { key: "topic", label: "Topic Discussion", sub: "Thảo luận" },
          { key: "roleplay", label: "Role Play", sub: "Đóng vai" },
          { key: "picture", label: "Picture Description", sub: "Mô tả" },
        ].map((t) => (
          <button
            key={t.key}
            className={`tab ${tab === (t.key as TabKey) ? "active" : ""}`}
            onClick={() => setTab(t.key as TabKey)}
          >
            {t.label}
            <br />
            <span className="tab-sub">{t.sub}</span>
          </button>
        ))}
      </div>

      {/* Main Grid */}
      <div className="spk-grid">
        {/* Left column */}
        <div className="left-col">
          {/* Prompt */}
          <section className="card">
            <h3 className="section-title">📝 {currentPrompt.title}</h3>
            <div className="prompt">
              <p>{currentPrompt.prompt}</p>
            </div>
            <div className="chips">
              <span className="chip blue">Level: B1</span>
              <span className="chip amber">Time Limit: {currentPrompt.timeLimit}</span>
              <span className="chip indigo">Type: {currentPrompt.title}</span>
            </div>
          </section>

          {/* Listen example */}
          <section className="card">
            <h3 className="section-title">🎧 Listen to Example First</h3>
            <div className="listen-row">
              <button
                className={`btn circle primary ${listening ? "pulse" : ""}`}
                onClick={toggleListen}
                aria-label="Play example"
              >
                {listening ? "⏸" : "▶️"}
              </button>

              <div className="wave">
                {/* decorative bars */}
                {Array.from({ length: 16 }).map((_, i) => (
                  <div key={i} className="bar" />
                ))}
              </div>

              <div className="mono muted">0:45</div>
            </div>
          </section>

          {/* Recording */}
          <section className="card">
            <h3 className="section-title">🎤 Your Recording</h3>
            
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
                <button className="btn ghost" onClick={retry} disabled={micPermission === "checking"}>
                  🔄 Retry
                </button>
                <button className="btn primary" onClick={stopRec} disabled={!recording}>
                  ⏹ Stop &amp; Analyze
                </button>
              </div>
            </div>
          </section>

          {/* Transcript */}
          <section className="card">
            <h3 className="section-title">📝 Your Transcript</h3>
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
              {currentPrompt.vocab.map(({ word, ipa }) => (
                <div key={word} className="vocab">
                  <div className="row">
                    <span className="w">{word}</span>
                    <button className="icon-btn">🔊</button>
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
              {currentPrompt.phrases.map((p, i) => (
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
              {currentPrompt.tips.map((t, i) => (
                <div key={i} className="tip">• {t}</div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {/* History */}
      <section className="card">
        <h2 className="hist-title">📊 Speaking History</h2>
        <div className="hist-grid">
          {[
            ["Describe Your Hometown", "Oct 18, 2024 • Duration: 2:15", "success", "8.2/10"],
            ["Job Interview Practice", "Oct 17, 2024 • Duration: 3:42", "warn", "7.8/10"],
          ].map(([title, meta, tone, score]) => (
            <article key={title as string} className="hist-card">
              <h4>{title}</h4>
              <div className="meta">{meta}</div>
              <div className="row-end">
                <span className={`badge ${tone}`}>Score: {score}</span>
                <div className="btns">
                  <button className="btn indigo">▶️ Play</button>
                  <button className="btn ghost">📝 Review</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

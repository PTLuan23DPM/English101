"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type TabKey = "pronunciation" | "topic" | "roleplay" | "picture";

export default function SpeakingPage() {
  const [tab, setTab] = useState<TabKey>("pronunciation");
  const [listening, setListening] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds

  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
  const startRec = () => {
    setElapsed(0);
    setRecording(true);
  };
  const stopRec = () => setRecording(false);
  const retry = () => {
    setRecording(false);
    setElapsed(0);
  };

  return (
    <div id="speaking-page" className="spk">
      {/* Header */}
      <section className="card page-head">
        <div>
          <h1>🎤 Speaking Practice</h1>
          <p className="muted">
            Practice speaking and improve your pronunciation and fluency
          </p>
        </div>

        <div className="head-actions">
          <select className="select">
            <option>Select Level: All</option>
            <option>A1</option><option>A2</option>
            <option>B1</option><option>B2</option>
            <option>C1</option><option>C2</option>
          </select>
          <span className="small muted">24 Sessions | 180 Total Minutes | 7.5 Avg Score</span>
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
            <h3 className="section-title">Speaking Prompt</h3>
            <div className="prompt">
              <p>
                “Introduce yourself to a new colleague at work. Include your name,
                job position, and something interesting about yourself.”
              </p>
            </div>
            <div className="chips">
              <span className="chip blue">Level: B1</span>
              <span className="chip amber">Time Limit: 2 min</span>
              <span className="chip indigo">Type: Description</span>
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
            <div className="rec-wrap">
              <button
                className={`rec-btn ${recording ? "rec-on" : ""}`}
                onClick={recording ? stopRec : startRec}
                aria-label="Record"
                title={recording ? "Stop" : "Record"}
              >
                {recording ? "⏹" : "⏺"}
              </button>
              <div className="timer mono">{mmss}</div>
              <div className="rec-actions">
                <button className="btn ghost" onClick={retry}>🔄 Retry</button>
                <button className="btn primary" onClick={stopRec}>⏹ Stop &amp; Analyze</button>
              </div>
            </div>
          </section>

          {/* Transcript */}
          <section className="card">
            <h3 className="section-title">📝 Your Transcript</h3>
            <div className="transcript muted">
              Your speech will appear here after recording...
            </div>
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
              {[
                ["introduce", "/ˌɪntrəˈdjuːs/"],
                ["colleague", "/ˈkɒliːɡ/"],
                ["position", "/pəˈzɪʃn/"],
              ].map(([w, ipa]) => (
                <div key={w} className="vocab">
                  <div className="row">
                    <span className="w">{w}</span>
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
              {[
                `✓ "Hi, I'm... and I work as..."`,
                `✓ "Nice to meet you"`,
                `✓ "I've been working here for..."`,
                `✓ "In my free time, I enjoy..."`,
              ].map((p, i) => (
                <div key={i} className="phrase">{p}</div>
              ))}
            </div>
          </section>

          {/* Tips */}
          <section className="card no-pad">
            <div className="card-head amber">
              <h3>💡 Pronunciation Tips</h3>
            </div>
            <div className="pad">
              {[
                "Speak clearly and at moderate pace",
                "Use natural intonation",
                "Pause between main ideas",
              ].map((t, i) => (
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

"use client";

import { useState } from "react";

type TabKey = "conversations" | "podcasts" | "news" | "lectures";

export default function ListeningPage() {
  const [tab, setTab] = useState<TabKey>("conversations");
  const [showPlayer, setShowPlayer] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(true);
  const [speed, setSpeed] = useState("1x");
  const [volume, setVolume] = useState(75);

  const cards = [
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
      icon: "🎧",
      title: "Technology Podcast",
      desc: "Discussion about AI and future technology",
      level: "C1",
      dur: "12:00",
      speakers: "3 speakers",
      accent: "🌍 Mixed accents",
      qs: 15,
      tags: ["Technology", "AI", "Future"],
      color: "amber",
    },
  ];

  return (
    <div id="listening-page" className="skill-page">
      {/* Page Header */}
      <section className="card page-head">
        <div className="page-intro">
          <h1>🎧 Listening Practice</h1>
          <p className="muted">Improve listening comprehension from conversations to lectures</p>
          <div className="controls">
            <select className="select">
              <option>Select Level: All</option>
              <option>A1</option><option>A2</option><option>B1</option>
              <option>B2</option><option>C1</option><option>C2</option>
            </select>
            <select className="select">
              <option>All Content</option>
              <option>Conversations</option>
              <option>News</option>
              <option>Podcasts</option>
              <option>Lectures</option>
            </select>
            <span className="muted small">28 Hours • 67 Exercises • 82% Accuracy</span>
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
          <div className="grid-audios">
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

                <button className="btn btn--primary w-full" onClick={() => setShowPlayer(true)}>
                  Start Listening
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Player + Question panel */}
      {showPlayer && (
        <>
          <section className="card player">
            <div className="player-meta">
              <div>
                <h2 className="h2">At the Restaurant</h2>
                <p className="muted">A2 Level • 2 speakers • American accent</p>
              </div>
              <button className="btn btn--outline" onClick={() => setShowPlayer(false)}>← Back to list</button>
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

          <section className="player-split">
            {/* Question panel */}
            <aside className="card qpanel">
              <h3 className="h3">Question 1 of 6</h3>
              <p className="qtext">How many people are dining tonight?</p>

              <div className="qopts">
                {["Two people","One person","Three people","Four people"].map((t,i)=>(
                  <label key={i} className="qopt">
                    <input type="radio" name="q1" /> <span>{t}</span>
                  </label>
                ))}
              </div>

              <div className="row">
                <button className="btn btn--outline grow">🔄 Replay</button>
                <button className="btn btn--primary grow">Next →</button>
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
        </>
      )}
    </div>
  );
}

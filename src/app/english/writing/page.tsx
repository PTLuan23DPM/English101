"use client";

import { useMemo, useState } from "react";

type TabKey = "sentence" | "paragraph" | "email" | "essay";

export default function WritingPage() {
  const [tab, setTab] = useState<TabKey>("sentence");
  const [text, setText] = useState("");

  const wordCount = useMemo(() => {
    const t = text.trim();
    return t ? t.split(/\s+/).length : 0;
  }, [text]);
  const charCount = text.length;

  return (
    <div id="writing-page" className="writing">
      {/* Page header */}
      <section className="card page-head">
        <div>
          <h1>📝 Writing Practice</h1>
          <p className="muted">Improve your writing skills from sentences to essays</p>
        </div>

        <div className="head-actions">
          <select className="select">
            <option>Select Level: All</option>
            <option>A1</option>
            <option>A2</option>
            <option>B1</option>
            <option>B2</option>
            <option>C1</option>
            <option>C2</option>
          </select>
          <span className="small muted">12 Completed | 3 In Progress | 48 Total Essays</span>
        </div>
      </section>

      {/* Tabs */}
      <div className="card tabs">
        {[
          { key: "sentence", label: "Sentence Building", sub: "Xây dựng câu" },
          { key: "paragraph", label: "Paragraph Writing", sub: "Viết đoạn văn" },
          { key: "email", label: "Email & Letters", sub: "Email & Thư" },
          { key: "essay", label: "Essay Writing", sub: "Viết bài luận" },
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

      {/* Main grid */}
      <div className="writing-grid">
        {/* Left column */}
        <div className="left-col">
          {/* Prompt */}
          <section className="card">
            <h3 className="section-title">Writing Prompt</h3>
            <div className="prompt">
              <p>
                “Describe your favorite hobby and explain why you enjoy it. Include
                details about how you got started and what you have learned from this
                hobby.”
              </p>
            </div>
            <div className="chips">
              <span className="chip blue">Level: A2</span>
              <span className="chip amber">Target: 100–150 words</span>
              <span className="chip indigo">Type: {tab === "email" ? "Email" : tab === "essay" ? "Essay" : tab === "paragraph" ? "Paragraph" : "Sentence"}</span>
            </div>
          </section>

          {/* Editor */}
          <section className="card">
            <div className="editor-toolbar">
              <button className="btn-ghost b">B</button>
              <button className="btn-ghost i">I</button>
              <button className="btn-ghost u">U</button>
              <div className="divider" />
              <button className="btn primary">🤖 AI Assistant</button>
              <button className="btn success">✓ Grammar Check</button>
              <button className="btn warn">⏱️ Timer</button>
            </div>

            <textarea
              className="editor"
              placeholder="Start writing here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />

            <div className="editor-footer">
              <div className="small muted">
                <span>{wordCount}</span> words • <span>{charCount}</span> characters
              </div>
              <div className="actions">
                <button className="btn outline">Save Draft</button>
                <button className="btn primary">Submit for Review</button>
              </div>
            </div>
          </section>

          {/* Recent submissions */}
          <section className="card">
            <h3 className="section-title">Recent Submissions</h3>
            <div className="submissions">
              <article className="submission">
                <h4>My Hometown</h4>
                <div className="meta">Oct 18, 2024 • Paragraph • 142 words</div>
                <div className="row-end">
                  <span className="badge success">Score: 8.5/10</span>
                  <button className="btn indigo">View Feedback</button>
                </div>
              </article>

              <article className="submission">
                <h4>Job Application Email</h4>
                <div className="meta">Oct 17, 2024 • Email • 186 words</div>
                <div className="row-end">
                  <span className="badge warn-alt">Pending Review</span>
                  <button className="btn disabled">Pending</button>
                </div>
              </article>
            </div>
          </section>
        </div>

        {/* Right column */}
        <aside className="right-col">
          {/* Key Vocabulary */}
          <section className="card no-pad">
            <div className="card-head indigo">
              <h4>📚 Key Vocabulary</h4>
            </div>
            <div className="pad">
              <div className="pill-group">
                <span className="pill indigo">hobby</span>
                <span className="pill green">enjoy</span>
                <span className="pill amber">passionate</span>
                <span className="pill pink">experience</span>
                <span className="pill green">skill</span>
              </div>
            </div>
          </section>

          {/* Grammar */}
          <section className="card no-pad">
            <div className="card-head green">
              <h4>📝 Grammar Structures</h4>
            </div>
            <div className="pad">
              <div className="grammar">• Present tense: “I enjoy…”</div>
              <div className="grammar">• Past tense: “I started…”</div>
              <div className="grammar">• Present perfect: “I have learned…”</div>
            </div>
          </section>

          {/* Phrases */}
          <section className="card no-pad">
            <div className="card-head amber">
              <h4>💬 Useful Phrases</h4>
            </div>
            <div className="pad">
              <div className="phrase">“One of my favorite hobbies is…”</div>
              <div className="phrase">“What I love most about…”</div>
              <div className="phrase">“This hobby has taught me…”</div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

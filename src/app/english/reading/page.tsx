"use client";

import { useMemo, useState } from "react";

type TabKey = "stories" | "news" | "academic" | "essays" | "practical";

export default function ReadingPage() {
  const [tab, setTab] = useState<TabKey>("stories");
  const [level, setLevel] = useState("All");
  const [genre, setGenre] = useState("All");
  const [showReader, setShowReader] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const progress = 0.6;

  const article = useMemo(
    () => ({
      title: "The Benefits of Learning Languages",
      readMins: 5,
      words: 350,
      questions: 8,
      level: "B1",
      tags: ["Education", "Career"],
      body: [
        `Learning a new language is one of the most rewarding experiences you can have. Not only does it open doors to new cultures and opportunities, but it also provides numerous cognitive benefits that can enhance your daily life.`,
        `Research has shown that bilingual individuals have improved executive function, better problem-solving skills, and enhanced creativity. These cognitive advantages extend beyond language use and can improve performance in many areas of life.`,
        `From a career perspective, multilingual professionals often have access to better job opportunities and higher salaries. In our increasingly globalized world, companies value employees who can communicate with international clients and partners.`,
        `Additionally, learning languages helps build empathy and cultural understanding. When you speak someone's native language, you gain deeper insights into their way of thinking and cultural values.`,
      ],
      vocab: [{ word: "rewarding", def: "giving satisfaction; worthwhile" }],
    }),
    []
  );

  const decFont = () => setFontScale((n) => Math.max(0.8, +(n - 0.1).toFixed(2)));
  const incFont = () => setFontScale((n) => Math.min(1.5, +(n + 0.1).toFixed(2)));

  return (
    <div id="reading-page" className="skill-page">
      {/* Page header */}
      <section className="card page-head">
        <div className="page-intro">
          <h1>📚 Reading Practice</h1>
          <p className="muted">Enhance your reading comprehension and vocabulary</p>
          <div className="controls">
            <select className="select" value={level} onChange={(e) => setLevel(e.target.value)}>
              <option>All</option><option>A1</option><option>A2</option>
              <option>B1</option><option>B2</option><option>C1</option><option>C2</option>
            </select>
            <select className="select" value={genre} onChange={(e) => setGenre(e.target.value)}>
              <option>All</option><option>News</option><option>Stories</option>
              <option>Academic</option><option>Business</option>
            </select>
          </div>
        </div>

        <div className="stats">
          <div className="stat"><span className="stat-val">45</span><span className="stat-lbl">Articles Read</span></div>
          <div className="stat"><span className="stat-val">320</span><span className="stat-lbl">Vocabulary Learned</span></div>
          <div className="stat"><span className="stat-val">85%</span><span className="stat-lbl">Avg Score</span></div>
        </div>
      </section>

      {/* Tabs */}
      <div className="card tabs">
        {[
          ["stories","Short Stories","Truyện ngắn"],
          ["news","News Articles","Bài báo"],
          ["academic","Academic Texts","Văn bản học thuật"],
          ["essays","Essays & Opinions","Bài luận & Quan điểm"],
          ["practical","Practical Texts","Văn bản thực tế"],
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

      {/* Article list (hidden when reader open) */}
      {!showReader && (
        <section className="card">
          <h3>Available Articles</h3>
          <div className="articles">
            {[article, article, article].map((a, i) => (
              <article key={i} className="article">
                <div className="thumb"><div className="ph">{["📚","🌍","💻"][i]}</div></div>
                <div className="content">
                  <h4>{a.title}</h4>
                  <p className="muted">Discover how learning multiple languages can boost your career and cognitive abilities...</p>
                  <div className="meta">
                    <span className={`level level-${a.level.toLowerCase()}`}>{a.level}</span>
                    <span>🕐 {a.readMins} min</span>
                    <span>{a.words} words</span>
                    <span>🧠 {a.questions} questions</span>
                  </div>
                  <div className="tags">
                    {a.tags.map(t => <span key={t} className="tag">{t}</span>)}
                  </div>
                  <button className="btn btn--primary" onClick={() => setShowReader(true)}>Start Reading</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Reader */}
      {showReader && (
        <section className="reader">
          <div className="reader-main card">
            <div className="toolbar">
              <button className="btn sm">🔊 Text-to-Speech</button>
              <button className="btn sm">🔖 Dictionary</button>
              <div className="spacer" />
              <div className="font">
                <button className="btn sm" onClick={decFont}>A-</button>
                <button className="btn sm" onClick={incFont}>A+</button>
              </div>
              <button className="btn sm">🔖 Bookmark</button>
            </div>
            <div className="progress">
              <div className="fill" style={{ width: `${progress*100}%` }} />
            </div>

            <div className="reading" style={{ fontSize: `${fontScale}rem` }}>
              <h2>{article.title}</h2>
              {article.body.map((p, i) => <p key={i}>{p}</p>)}

              <div className="vocab card soft">
                <h4>New Vocabulary</h4>
                {article.vocab.map(v => (
                  <div key={v.word} className="vocab-row">
                    <div className="w">{v.word}</div>
                    <div className="d">{v.def}</div>
                    <button className="btn xs">+ Add to My List</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="reader-side card">
            <h3>Comprehension Questions</h3>
            <div className="qcard">
              <div className="qhead">
                <span>Question 1 of 8</span>
                <span className="muted">Multiple Choice</span>
              </div>
              <div className="qtext">
                According to the article, what is one of the main benefits of being bilingual?
              </div>
              <div className="opts">
                {["Better memory skills","Improved executive function","Faster reading speed","Better handwriting"].map((o,i)=>(
                  <label key={i} className="opt">
                    <input type="radio" name="q1" /> <span>{o}</span>
                  </label>
                ))}
              </div>
              <div className="qactions">
                <button className="btn btn--outline" onClick={()=>setShowReader(false)}>Back</button>
                <button className="btn btn--primary">Next Question</button>
              </div>
            </div>
          </aside>
        </section>
      )}
    </div>
  );
}

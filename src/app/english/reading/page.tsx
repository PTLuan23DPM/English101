"use client";

import { useState } from "react";
import Link from "next/link";

type TabKey = "stories" | "news" | "academic" | "essays" | "practical";

// Sample articles data
const SAMPLE_ARTICLES = [
  {
    id: "1",
      title: "The Benefits of Learning Languages",
    description: "Discover how learning multiple languages can boost your career and cognitive abilities. Research shows bilingual individuals have improved executive function.",
      readMins: 5,
      words: 350,
      questions: 8,
    level: "B1" as const,
      tags: ["Education", "Career"],
    icon: "📚",
      body: [
        `Learning a new language is one of the most rewarding experiences you can have. Not only does it open doors to new cultures and opportunities, but it also provides numerous cognitive benefits that can enhance your daily life.`,
        `Research has shown that bilingual individuals have improved executive function, better problem-solving skills, and enhanced creativity. These cognitive advantages extend beyond language use and can improve performance in many areas of life.`,
        `From a career perspective, multilingual professionals often have access to better job opportunities and higher salaries. In our increasingly globalized world, companies value employees who can communicate with international clients and partners.`,
        `Additionally, learning languages helps build empathy and cultural understanding. When you speak someone's native language, you gain deeper insights into their way of thinking and cultural values.`,
      ],
    vocab: [
      { word: "rewarding", def: "giving satisfaction; worthwhile", example: "Teaching is a rewarding career." },
      { word: "cognitive", def: "related to mental processes", example: "Cognitive abilities improve with practice." },
      { word: "executive function", def: "mental skills for planning and focus", example: "Good executive function helps with time management." },
    ],
    questions: [
      {
        id: "q1",
        text: "According to the article, what is one of the main benefits of being bilingual?",
        options: [
          "Better memory skills",
          "Improved executive function",
          "Faster reading speed",
          "Better handwriting"
        ],
        correctIndex: 1,
      },
      {
        id: "q2",
        text: "What does the article say about multilingual professionals?",
        options: [
          "They work longer hours",
          "They have access to better job opportunities",
          "They must travel frequently",
          "They prefer remote work"
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "2",
    title: "Climate Change and Technology",
    description: "How modern technology is helping us combat climate change. From renewable energy to smart cities, innovation is key to a sustainable future.",
    readMins: 7,
    words: 480,
    questions: 10,
    level: "B2" as const,
    tags: ["Environment", "Technology"],
    icon: "🌍",
    body: [
      `Climate change is one of the most pressing challenges of our time, but technology is offering new hope. From renewable energy sources to artificial intelligence, innovative solutions are emerging that could help us reduce our carbon footprint and protect the planet for future generations.`,
      `Solar and wind energy have become increasingly affordable and efficient. Many countries are now investing heavily in renewable infrastructure, with some nations already generating more than 50% of their electricity from clean sources.`,
      `Smart cities use Internet of Things (IoT) technology to optimize energy consumption, reduce waste, and improve quality of life. Sensors monitor everything from traffic flow to air quality, allowing cities to respond dynamically to changing conditions.`,
    ],
    vocab: [
      { word: "pressing", def: "urgent; requiring immediate attention", example: "We must address this pressing issue." },
      { word: "carbon footprint", def: "total greenhouse gas emissions caused by an individual or organization", example: "Reducing your carbon footprint helps the environment." },
      { word: "dynamically", def: "in a changing or responsive way", example: "The system adjusts dynamically to user needs." },
    ],
    questions: [
      {
        id: "q1",
        text: "What is the main topic of this article?",
        options: [
          "The history of technology",
          "How technology helps fight climate change",
          "The problems with renewable energy",
          "Future predictions about cities"
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    id: "3",
    title: "The Art of Effective Communication",
    description: "Master the skills needed for clear and persuasive communication in professional settings. Learn how body language, tone, and timing impact your message.",
    readMins: 6,
    words: 420,
    questions: 9,
    level: "C1" as const,
    tags: ["Business", "Skills"],
    icon: "💼",
    body: [
      `Effective communication is the cornerstone of professional success. Whether you're presenting to clients, collaborating with colleagues, or negotiating with partners, the ability to convey your ideas clearly and persuasively can make or break your career.`,
      `Research indicates that only 7% of communication is verbal. The remaining 93% consists of body language (55%) and tone of voice (38%). This means that what you say is far less important than how you say it.`,
      `Active listening is equally crucial. By fully concentrating on the speaker, understanding their message, and responding thoughtfully, you build trust and rapport. This creates an environment where open dialogue can flourish.`,
    ],
    vocab: [
      { word: "cornerstone", def: "fundamental basis; essential element", example: "Trust is the cornerstone of any relationship." },
      { word: "persuasive", def: "able to convince someone", example: "She gave a persuasive argument." },
      { word: "rapport", def: "harmonious relationship; connection", example: "They quickly established a good rapport." },
    ],
    questions: [
      {
        id: "q1",
        text: "According to the article, what percentage of communication is verbal?",
        options: ["7%", "38%", "55%", "93%"],
        correctIndex: 0,
      },
    ],
  },
];

export default function ReadingPage() {
  const [tab, setTab] = useState<TabKey>("stories");
  const [selectedArticle, setSelectedArticle] = useState<typeof SAMPLE_ARTICLES[0] | null>(null);
  const [fontScale, setFontScale] = useState(1);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);

  const filteredArticles = SAMPLE_ARTICLES; // In production, filter by tab

  const decFont = () => setFontScale((n) => Math.max(0.8, +(n - 0.1).toFixed(2)));
  const incFont = () => setFontScale((n) => Math.min(1.5, +(n + 0.1).toFixed(2)));

  const handleAnswerSelect = (questionId: string, answerIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answerIndex }));
  };

  const handleSubmitAnswers = () => {
    setShowResults(true);
  };

  const calculateScore = () => {
    if (!selectedArticle) return 0;
    let correct = 0;
    selectedArticle.questions.forEach((q) => {
      if (answers[q.id] === q.correctIndex) correct++;
    });
    return Math.round((correct / selectedArticle.questions.length) * 100);
  };

  if (selectedArticle) {
    const currentQ = selectedArticle.questions[currentQuestion];
    const totalQuestions = selectedArticle.questions.length;
    const progress = ((currentQuestion + 1) / totalQuestions) * 100;

    return (
      <div className="dashboard-content">
        <section className="reader">
          {/* Left: Article Content */}
          <div className="reader-main card">
            <div className="toolbar">
              <button 
                className="btn sm"
                onClick={() => setSelectedArticle(null)}
              >
                ← Back to List
              </button>
              <button className="btn sm">🔊 Text-to-Speech</button>
              <button className="btn sm">🔖 Dictionary</button>
              <div className="spacer" />
              <div className="font-controls">
                <button className="btn sm" onClick={decFont}>A-</button>
                <button className="btn sm" onClick={incFont}>A+</button>
              </div>
              <button className="btn sm">🔖 Bookmark</button>
            </div>
            
            <div className="progress">
              <div className="fill" style={{ width: `100%` }} />
            </div>

            <div className="reading" style={{ fontSize: `${fontScale}rem` }}>
              <h2>{selectedArticle.title}</h2>
              {selectedArticle.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}

              <div className="vocab-section card soft">
                <h4>📚 Vocabulary</h4>
                {selectedArticle.vocab.map((v) => (
                  <div key={v.word} className="vocab-row">
                    <div className="w">{v.word}</div>
                    <div className="d">{v.def}</div>
                    <button className="btn xs">+ Add to List</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Questions */}
          <aside className="reader-side card">
            <h3>Comprehension Questions</h3>
            
            {!showResults ? (
              <>
                <div className="progress" style={{ marginBottom: "16px" }}>
                  <div className="fill" style={{ width: `${progress}%` }} />
                </div>

            <div className="qcard">
              <div className="qhead">
                    <span>Question {currentQuestion + 1} of {totalQuestions}</span>
                <span className="muted">Multiple Choice</span>
              </div>
                  <div className="qtext">{currentQ.text}</div>
              <div className="opts">
                    {currentQ.options.map((option, i) => (
                  <label key={i} className="opt">
                        <input
                          type="radio"
                          name={`q${currentQuestion}`}
                          checked={answers[currentQ.id] === i}
                          onChange={() => handleAnswerSelect(currentQ.id, i)}
                        />
                        <span>{option}</span>
                  </label>
                ))}
              </div>
              <div className="qactions">
                    <button
                      className="btn btn--outline"
                      disabled={currentQuestion === 0}
                      onClick={() => setCurrentQuestion((q) => Math.max(0, q - 1))}
                    >
                      Previous
                    </button>
                    {currentQuestion < totalQuestions - 1 ? (
                      <button
                        className="btn btn--primary"
                        onClick={() => setCurrentQuestion((q) => q + 1)}
                      >
                        Next
                      </button>
                    ) : (
                      <button
                        className="btn btn--primary"
                        onClick={handleSubmitAnswers}
                      >
                        Submit
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="results-card">
                <div className="success-icon" style={{ fontSize: "48px", marginBottom: "16px" }}>
                  {calculateScore() >= 70 ? "🎉" : "📝"}
                </div>
                <h3>Your Score</h3>
                <div style={{ fontSize: "48px", fontWeight: "bold", color: "var(--dash-accent)", marginBottom: "16px" }}>
                  {calculateScore()}%
                </div>
                <p className="muted">
                  You got {Object.keys(answers).filter(k => answers[k] === selectedArticle.questions.find(q => q.id === k)?.correctIndex).length} out of {totalQuestions} questions correct!
                </p>
                <button
                  className="btn btn--primary w-full"
                  style={{ marginTop: "20px" }}
                  onClick={() => {
                    setSelectedArticle(null);
                    setAnswers({});
                    setShowResults(false);
                    setCurrentQuestion(0);
                  }}
                >
                  Try Another Article
                </button>
              </div>
            )}
          </aside>
        </section>
      </div>
    );
  }

  return (
    <div className="dashboard-content">
      {/* Page Header */}
      <section className="card page-head">
        <div className="page-intro">
          <h1>📚 Reading Practice</h1>
          <p className="muted">Enhance your reading comprehension and vocabulary</p>
        </div>

        <div className="stats">
          <div className="stat">
            <span className="stat-val">12</span>
            <span className="stat-lbl">Articles Read</span>
          </div>
          <div className="stat">
            <span className="stat-val">156</span>
            <span className="stat-lbl">Vocabulary Learned</span>
          </div>
          <div className="stat">
            <span className="stat-val">85%</span>
            <span className="stat-lbl">Avg Score</span>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="card tabs">
        {[
          ["stories", "Short Stories", "Truyện ngắn"],
          ["news", "News Articles", "Bài báo"],
          ["academic", "Academic Texts", "Văn bản học thuật"],
          ["essays", "Essays & Opinions", "Bài luận"],
          ["practical", "Practical Texts", "Văn bản thực tế"],
        ].map(([k, label, sub]) => (
          <button
            key={k}
            className={`tab ${tab === k ? "active" : ""}`}
            onClick={() => setTab(k as TabKey)}
          >
            {label}
            <br />
            <small className="tab-sub">{sub}</small>
          </button>
        ))}
      </div>

      {/* Articles List */}
      <section className="card">
        <h3>Available Articles</h3>
        <div className="articles">
          {filteredArticles.map((article) => (
            <article key={article.id} className="article">
              <div className="thumb">
                <div className="ph">{article.icon}</div>
              </div>
              <div className="content">
                <h4>{article.title}</h4>
                <p className="muted">{article.description}</p>
                <div className="meta">
                  <span className={`level level-${article.level.toLowerCase()}`}>
                    {article.level}
                  </span>
                  <span>🕐 {article.readMins} min</span>
                  <span>{article.words} words</span>
                  <span>🧠 {article.questions.length} questions</span>
                </div>
                <div className="tags">
                  {article.tags.map((t) => (
                    <span key={t} className="tag">
                      {t}
                    </span>
                  ))}
                </div>
                <button
                  className="btn btn--primary"
                  onClick={() => setSelectedArticle(article)}
                >
                  Start Reading
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

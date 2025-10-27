"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import TimerModal from "./components/TimerModal";
import AIAssistant from "./components/AIAssistant";

type TabKey = "sentence" | "paragraph" | "email" | "essay";

interface DetailedScore {
  score: number;
  feedback: string[];
}

interface ScoringResult {
  ielts_score: number;
  overall_score: number;
  cefr_level: string;
  cefr_description: string;
  detailed_scores: {
    task_response: DetailedScore;
    coherence_cohesion: DetailedScore;
    lexical_resource: DetailedScore;
    grammatical_range: DetailedScore;
  };
  word_count: number;
  statistics: {
    words: number;
    characters: number;
    sentences: number;
    paragraphs: number;
    unique_words: number;
  };
}

const WRITING_PROMPTS: Record<TabKey, { title: string; prompt: string; targetWords: string; tips: string[] }> = {
  sentence: {
    title: "Sentence Building",
    prompt: "Write 5-7 sentences about your daily morning routine. Use simple present tense and time expressions.",
    targetWords: "50-80 words",
    tips: [
      "Use time expressions: in the morning, at 7 AM, after breakfast",
      "Use simple present tense: I wake up, I have breakfast",
      "Connect sentences with: then, after that, finally",
    ],
  },
  paragraph: {
    title: "Paragraph Writing",
    prompt: "Describe your favorite hobby and explain why you enjoy it. Include details about how you got started and what you have learned.",
    targetWords: "100-150 words",
    tips: [
      "Start with a topic sentence introducing your hobby",
      "Use specific examples and details",
      "End with a concluding sentence",
    ],
  },
  email: {
    title: "Email Writing",
    prompt: "Write a formal email to your professor requesting an extension for your assignment. Explain your situation politely.",
    targetWords: "120-180 words",
    tips: [
      "Start with: Dear Professor [Name],",
      "Be polite and professional",
      "End with: Best regards, [Your name]",
    ],
  },
  essay: {
    title: "Essay Writing",
    prompt: "Some people prefer to work from home, while others prefer to work in an office. Discuss both views and give your opinion.",
    targetWords: "250-300 words",
    tips: [
      "Introduction: state the topic and your thesis",
      "Body paragraph 1: advantages of working from home",
      "Body paragraph 2: advantages of office work",
      "Conclusion: summarize and state your opinion",
    ],
  },
};

export default function WritingPage() {
  const [tab, setTab] = useState<TabKey>("paragraph");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [scoringResult, setScoringResult] = useState<ScoringResult | null>(null);

  // Timer state
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timerExpired, setTimerExpired] = useState(false);

  const currentPrompt = WRITING_PROMPTS[tab];

  const wordCount = useMemo(() => {
    const t = text.trim();
    return t ? t.split(/\s+/).length : 0;
  }, [text]);
  const charCount = text.length;

  // Timer countdown effect
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          setTimerExpired(true);
          toast.warning("Time's up!", {
            description: "You can no longer edit your text. Please submit now.",
          });
          return 0;
        }

        // Warning at 5 minutes
        if (prev === 300) {
          toast.info("5 minutes remaining!", {
            description: "Wrap up your writing soon.",
          });
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft]);

  const startTimer = (minutes: number) => {
    setTimeLeft(minutes * 60);
    setTimerExpired(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSubmit = async () => {
    if (wordCount < 10) {
      toast.error("Not enough text", {
        description: "Please write at least 10 words before submitting.",
      });
      return;
    }

    setSubmitting(true);
    toast.loading("Scoring your writing...", { id: "scoring" });

    try {
      // Call Python scoring service
      const response = await fetch("http://localhost:5001/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text,
          prompt: currentPrompt.prompt,
        }),
      });

      if (!response.ok) {
        throw new Error("Scoring service unavailable");
      }

      const result: ScoringResult = await response.json();
      setScoringResult(result);
      setSubmitted(true);

      toast.success("Scoring complete!", {
        id: "scoring",
        description: `Your CEFR level: ${result.cefr_level}`,
      });
    } catch (error) {
      console.error("Scoring error:", error);
      toast.error("Scoring failed", {
        id: "scoring",
        description: "Make sure Python service is running on port 5001",
      });

      // Fallback to mock scoring
      setScoringResult({
        ielts_score: 6.5,
        overall_score: 6.5,
        cefr_level: "B2",
        cefr_description: "Upper Intermediate",
        detailed_scores: {
          task_response: {
            score: 6.5,
            feedback: ["✓ Good word count", "Consider adding more examples"],
          },
          coherence_cohesion: {
            score: 6.5,
            feedback: ["✓ Good organization", "Use more linking words"],
          },
          lexical_resource: {
            score: 6.5,
            feedback: ["✓ Adequate vocabulary", "Try more academic words"],
          },
          grammatical_range: {
            score: 6.5,
            feedback: ["✓ Good variety", "Watch for minor errors"],
          },
        },
        word_count: wordCount,
        statistics: {
          words: wordCount,
          characters: charCount,
          sentences: text.split(/[.!?]+/).length,
          paragraphs: text.split("\n\n").filter((p) => p.trim()).length,
          unique_words: new Set(text.toLowerCase().split(/\s+/)).size,
        },
      });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setText("");
    setSubmitted(false);
    setScoringResult(null);
    setTimeLeft(null);
    setTimerExpired(false);
  };

  return (
    <div className="dashboard-content">
      {/* Page header */}
      <section className="card page-head">
        <div>
          <h1>📝 Writing Practice</h1>
          <p className="muted">AI-powered writing assessment with CEFR scoring</p>
        </div>

        <div className="head-actions">
          {/* Timer Display */}
          {timeLeft !== null && (
            <div
              className={`timer-display ${
                timeLeft < 300 ? "warning" : ""
              } ${timerExpired ? "expired" : ""}`}
            >
              ⏱️ {formatTime(timeLeft)}
            </div>
          )}

          <div className="stats" style={{ gap: "16px" }}>
            <div className="stat">
              <span className="stat-val">24</span>
              <span className="stat-lbl">Completed</span>
            </div>
            <div className="stat">
              <span className="stat-val">B2</span>
              <span className="stat-lbl">Avg Level</span>
            </div>
          </div>
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
            <h3 className="section-title">{currentPrompt.title}</h3>
            <div className="prompt">
              <p>{currentPrompt.prompt}</p>
            </div>
            <div className="chips">
              <span className="chip blue">Target: {currentPrompt.targetWords}</span>
              <span className="chip indigo">Type: {currentPrompt.title}</span>
            </div>
          </section>

          {/* Editor */}
          <section className="card">
            <div className="editor-toolbar">
              <button
                className="btn warn"
                onClick={() => setShowTimerModal(true)}
                disabled={timerExpired}
              >
                ⏱️ {timeLeft === null ? "Set Timer" : "Timer Active"}
              </button>
              <div style={{ flex: 1 }} />
              <span className="small muted">
                {wordCount} words • {charCount} chars
              </span>
            </div>

            <textarea
              className={`editor ${timerExpired ? "disabled" : ""}`}
              placeholder="Start writing here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={timerExpired}
            />

            <div className="editor-footer">
              <div className="small muted">
                {wordCount > 0 && (
                  <span>
                    Progress:{" "}
                    {Math.min(
                      100,
                      Math.round(
                        (wordCount / parseInt(currentPrompt.targetWords.split("-")[1])) * 100
                      )
                    )}
                    %
                  </span>
                )}
                {timerExpired && (
                  <span style={{ color: "#ef4444", fontWeight: 600, marginLeft: "12px" }}>
                    ⚠️ Time expired - editing disabled
                  </span>
                )}
              </div>
              <div className="actions">
                <button className="btn outline" onClick={handleReset}>
                  Reset
                </button>
                <button
                  className="btn primary"
                  onClick={handleSubmit}
                  disabled={submitting || submitted || wordCount < 10}
                >
                  {submitting ? "Scoring..." : submitted ? "Submitted ✓" : "Submit for AI Review"}
                </button>
              </div>
            </div>
          </section>

          {/* Scoring Results */}
          {submitted && scoringResult && (
            <section className="card">
              <h3 className="section-title">🎯 AI Scoring Results</h3>

              {/* CEFR Level Display */}
              <div style={{ textAlign: "center", marginBottom: "32px" }}>
                <div
                  style={{
                    display: "inline-block",
                    padding: "24px 48px",
                    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                    borderRadius: "16px",
                    color: "white",
                  }}
                >
                  <div style={{ fontSize: "48px", fontWeight: "bold", marginBottom: "8px" }}>
                    {scoringResult.cefr_level}
                  </div>
                  <div style={{ fontSize: "16px", opacity: 0.9 }}>
                    {scoringResult.cefr_description}
                  </div>
                  <div style={{ fontSize: "14px", opacity: 0.8, marginTop: "8px" }}>
                    IELTS Band: {scoringResult.ielts_score}
                  </div>
                </div>
              </div>

              {/* Detailed Scores */}
              <div className="scoring-grid">
                {/* Task Response */}
                <div className="score-card">
                  <h4>📝 Task Response</h4>
                  <div className="score-value">{scoringResult.detailed_scores.task_response.score}</div>
                  <div className="score-feedback">
                    {scoringResult.detailed_scores.task_response.feedback.map((item, i) => (
                      <div key={i}>{item}</div>
                    ))}
                  </div>
                </div>

                {/* Coherence & Cohesion */}
                <div className="score-card">
                  <h4>🔗 Coherence & Cohesion</h4>
                  <div className="score-value">{scoringResult.detailed_scores.coherence_cohesion.score}</div>
                  <div className="score-feedback">
                    {scoringResult.detailed_scores.coherence_cohesion.feedback.map((item, i) => (
                      <div key={i}>{item}</div>
                    ))}
                  </div>
                </div>

                {/* Lexical Resource */}
                <div className="score-card">
                  <h4>📚 Lexical Resource</h4>
                  <div className="score-value">{scoringResult.detailed_scores.lexical_resource.score}</div>
                  <div className="score-feedback">
                    {scoringResult.detailed_scores.lexical_resource.feedback.map((item, i) => (
                      <div key={i}>{item}</div>
                    ))}
                  </div>
                </div>

                {/* Grammatical Range */}
                <div className="score-card">
                  <h4>✍️ Grammatical Range</h4>
                  <div className="score-value">{scoringResult.detailed_scores.grammatical_range.score}</div>
                  <div className="score-feedback">
                    {scoringResult.detailed_scores.grammatical_range.feedback.map((item, i) => (
                      <div key={i}>{item}</div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div style={{ marginTop: "24px", padding: "16px", background: "#f9fafb", borderRadius: "12px" }}>
                <h4 style={{ marginBottom: "12px" }}>📊 Statistics</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "16px" }}>
                  <div>
                    <div style={{ fontSize: "24px", fontWeight: "600" }}>{scoringResult.statistics.words}</div>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>Words</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "24px", fontWeight: "600" }}>{scoringResult.statistics.sentences}</div>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>Sentences</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "24px", fontWeight: "600" }}>{scoringResult.statistics.paragraphs}</div>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>Paragraphs</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "24px", fontWeight: "600" }}>{scoringResult.statistics.unique_words}</div>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>Unique Words</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "24px", fontWeight: "600" }}>
                      {Math.round((scoringResult.statistics.unique_words / scoringResult.statistics.words) * 100)}%
                    </div>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>Lexical Diversity</div>
                  </div>
                </div>
              </div>

              <button
                className="btn primary w-full"
                style={{ marginTop: "24px" }}
                onClick={handleReset}
              >
                Try Another Prompt
              </button>
            </section>
          )}
        </div>

        {/* Right column */}
        <aside className="right-col">
          {/* Writing Tips */}
          <section className="card no-pad">
            <div className="card-head amber">
              <h4>💡 Writing Tips</h4>
            </div>
            <div className="pad">
              {currentPrompt.tips.map((tip, i) => (
                <div key={i} className="tip">
                  • {tip}
                </div>
              ))}
            </div>
          </section>

          {/* Word Count Guide */}
          <section className="card">
            <h4>📊 Progress</h4>
            <div style={{ marginTop: "12px" }}>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((wordCount / parseInt(currentPrompt.targetWords.split("-")[1])) * 100)
                    )}%`,
                  }}
                />
              </div>
              <p className="small muted" style={{ marginTop: "8px" }}>
                Target: {currentPrompt.targetWords}
              </p>
            </div>
          </section>

          {/* Quick Grammar Reference */}
          <section className="card no-pad">
            <div className="card-head green">
              <h4>📝 Grammar Reference</h4>
            </div>
            <div className="pad">
              <div className="grammar">• Use varied sentence structures</div>
              <div className="grammar">• Check subject-verb agreement</div>
              <div className="grammar">• Use proper punctuation</div>
              <div className="grammar">• Avoid run-on sentences</div>
              <div className="grammar">• Use linking words (however, moreover)</div>
            </div>
          </section>
        </aside>
      </div>

      {/* Timer Modal */}
      <TimerModal
        isOpen={showTimerModal}
        onClose={() => setShowTimerModal(false)}
        onStart={startTimer}
      />

      {/* AI Assistant */}
      <AIAssistant text={text} />
    </div>
  );
}

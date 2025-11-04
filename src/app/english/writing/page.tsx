"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import TimerModal from "./components/TimerModal";
import AIAssistant from "./components/AIAssistant";

interface DetailedScore {
  score: number;
  feedback: string[];
}

interface ScoringResult {
  score_10: number;
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

interface WritingTask {
  id: string;
  icon: string;
  title: string;
  type: string;
  level: string;
  prompt: string;
  targetWords: string;
  tips: string[];
  recommended?: boolean;
  attempts: number;
  color: string;
}

const WRITING_TASKS: WritingTask[] = [
  // Sentence Building
  {
    id: "sentence-daily",
    icon: "📝",
    title: "Daily Routine",
    type: "Sentence Building",
    level: "A2",
    prompt: "Write 5-7 sentences about your daily morning routine. Use simple present tense and time expressions.",
    targetWords: "50-80 words",
    tips: [
      "Use time expressions: in the morning, at 7 AM, after breakfast",
      "Use simple present tense: I wake up, I have breakfast",
      "Connect sentences with: then, after that, finally",
    ],
    recommended: true,
    attempts: 0,
    color: "blue",
  },
  {
    id: "sentence-weekend",
    icon: "☀️",
    title: "Weekend Activities",
    type: "Sentence Building",
    level: "A2",
    prompt: "Describe what you usually do on weekends. Write 5-7 complete sentences.",
    targetWords: "50-80 words",
    tips: [
      "Use frequency adverbs: usually, sometimes, often",
      "Mention different activities",
      "Use linking words to connect ideas",
    ],
    attempts: 0,
    color: "blue",
  },
  // Paragraph Writing
  {
    id: "para-hobby",
    icon: "🎨",
    title: "My Favorite Hobby",
    type: "Paragraph Writing",
    level: "B1",
    prompt: "Describe your favorite hobby and explain why you enjoy it. Include details about how you got started and what you have learned.",
    targetWords: "100-150 words",
    tips: [
      "Start with a topic sentence introducing your hobby",
      "Use specific examples and details",
      "End with a concluding sentence",
    ],
    recommended: true,
    attempts: 0,
    color: "green",
  },
  {
    id: "para-travel",
    icon: "✈️",
    title: "A Memorable Trip",
    type: "Paragraph Writing",
    level: "B1",
    prompt: "Write about a memorable trip or vacation. Describe where you went, what you did, and why it was special.",
    targetWords: "120-150 words",
    tips: [
      "Use past tense to describe events",
      "Include sensory details (what you saw, heard, felt)",
      "Explain why this experience was meaningful",
    ],
    attempts: 0,
    color: "green",
  },
  // Email Writing
  {
    id: "email-formal",
    icon: "📧",
    title: "Extension Request",
    type: "Email Writing",
    level: "B1",
    prompt: "Write a formal email to your professor requesting an extension for your assignment. Explain your situation politely.",
    targetWords: "120-180 words",
    tips: [
      "Start with: Dear Professor [Name],",
      "Be polite and professional",
      "End with: Best regards, [Your name]",
    ],
    attempts: 0,
    color: "purple",
  },
  {
    id: "email-complaint",
    icon: "💼",
    title: "Product Complaint",
    type: "Email Writing",
    level: "B2",
    prompt: "Write a formal complaint email to a company about a defective product you purchased. Request a refund or replacement.",
    targetWords: "150-200 words",
    tips: [
      "State the problem clearly",
      "Include relevant details (order number, date)",
      "Be firm but polite",
      "Clearly state what you want",
    ],
    attempts: 0,
    color: "purple",
  },
  // Essay Writing - Task 2 Types
  {
    id: "essay-discussion",
    icon: "💬",
    title: "Work From Home vs Office",
    type: "Discussion",
    level: "B2",
    prompt: "Some people prefer to work from home, while others prefer to work in an office. Discuss both views and give your opinion.",
    targetWords: "250-300 words",
    tips: [
      "Introduction: state the topic and your thesis",
      "Body paragraph 1: advantages of working from home",
      "Body paragraph 2: advantages of office work",
      "Conclusion: summarize and state your opinion",
    ],
    recommended: true,
    attempts: 0,
    color: "teal",
  },
  {
    id: "essay-advantage",
    icon: "⚖️",
    title: "Online Shopping",
    type: "Advantage-Disadvantage",
    level: "B2",
    prompt: "Online shopping is becoming increasingly popular. Discuss the advantages and disadvantages of buying products online.",
    targetWords: "250-300 words",
    tips: [
      "Introduction: introduce the topic",
      "Body 1: discuss advantages with examples",
      "Body 2: discuss disadvantages with examples",
      "Conclusion: balanced summary",
    ],
    recommended: true,
    attempts: 0,
    color: "teal",
  },
  {
    id: "essay-opinion",
    icon: "📊",
    title: "University Education",
    type: "Opinion",
    level: "B2",
    prompt: "Some people believe university education should be free for all students. To what extent do you agree or disagree?",
    targetWords: "250-300 words",
    tips: [
      "Introduction: clearly state your position",
      "Body: provide 2-3 main arguments",
      "Use examples and evidence",
      "Conclusion: restate your opinion",
    ],
    attempts: 0,
    color: "teal",
  },
  {
    id: "essay-problem",
    icon: "🌍",
    title: "Environmental Pollution",
    type: "Problem-Solution",
    level: "C1",
    prompt: "Environmental pollution is a growing concern. What are the main causes of this problem and what solutions can you suggest?",
    targetWords: "250-300 words",
    tips: [
      "Introduction: present the problem",
      "Body 1: discuss main causes",
      "Body 2: propose practical solutions",
      "Conclusion: summarize key points",
    ],
    attempts: 0,
    color: "teal",
  },
  {
    id: "essay-two-part",
    icon: "❓",
    title: "Technology and Children",
    type: "Multi-Part",
    level: "B2",
    prompt: "Many children spend several hours per day on screens. Why is this the case? What are the effects on their development?",
    targetWords: "250-300 words",
    tips: [
      "Introduction: acknowledge both questions",
      "Body 1: answer first question (reasons)",
      "Body 2: answer second question (effects)",
      "Conclusion: brief summary",
    ],
    attempts: 0,
    color: "teal",
  },
];

export default function WritingPage() {
  const [filterType, setFilterType] = useState<string>("All types");
  const [selectedTask, setSelectedTask] = useState<WritingTask | null>(null);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [scoringResult, setScoringResult] = useState<ScoringResult | null>(null);

  // Timer state
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timerExpired, setTimerExpired] = useState(false);

  // Filter tasks by type
  const filteredTasks = filterType === "All types" 
    ? WRITING_TASKS 
    : WRITING_TASKS.filter(task => task.type === filterType);

  const uniqueTypes = ["All types", ...Array.from(new Set(WRITING_TASKS.map(t => t.type)))];

  const currentPrompt = selectedTask || null;

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

    if (!selectedTask) return;

    setSubmitting(true);
    toast.loading("Scoring your writing...", { id: "scoring" });

    try {
      // Call Next.js API route which proxies to Python service
      const response = await fetch("/api/writing/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text,
          prompt: selectedTask.prompt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Scoring service unavailable");
      }

      const result: ScoringResult = await response.json();
      setScoringResult(result);
      setSubmitted(true);

      if (result.using_fallback || !result.service_available) {
        toast.success("Scoring complete! (Using fallback mode)", {
          id: "scoring",
          description: `Your CEFR level: ${result.cefr_level}. Python service unavailable.`,
        });
      } else {
        toast.success("Scoring complete!", {
          id: "scoring",
          description: `Your CEFR level: ${result.cefr_level}`,
        });
      }
    } catch (error) {
      console.error("Scoring error:", error);
      toast.error("Scoring failed", {
        id: "scoring",
        description: error instanceof Error ? error.message : "Please try again",
      });

      // Fallback to mock scoring
      setScoringResult({
        score_10: 7.2,
        overall_score: 7.0,
        cefr_level: "B2",
        cefr_description: "Upper Intermediate",
        detailed_scores: {
          task_response: {
            score: 7.5,
            feedback: ["✓ Good word count", "Consider adding more examples"],
          },
          coherence_cohesion: {
            score: 7.2,
            feedback: ["✓ Good organization", "Use more linking words"],
          },
          lexical_resource: {
            score: 6.9,
            feedback: ["✓ Adequate vocabulary", "Try more academic words"],
          },
          grammatical_range: {
            score: 6.7,
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

  // If a task is selected, show the writing editor
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
                setText("");
                setSubmitted(false);
                setScoringResult(null);
              }}
            >
              ← Back to Tasks
            </button>
            <h1 style={{ marginTop: "12px" }}>{selectedTask.icon} {selectedTask.title}</h1>
            <p className="muted">{selectedTask.type} • {selectedTask.level} Level</p>
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
        </div>
      </section>

        {/* Writing interface (existing code continues below) */}
      <div className="writing-grid">
        <div className="left-col">
          {/* Prompt */}
          <section className="card">
              <h3 className="section-title">{selectedTask.title}</h3>
            <div className="prompt">
                <p>{selectedTask.prompt}</p>
            </div>
            <div className="chips">
                <span className="chip blue">Target: {selectedTask.targetWords}</span>
                <span className="chip indigo">Type: {selectedTask.type}</span>
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

              <div className="editor-wrapper" style={{ position: "relative" }}>
                <textarea
                  ref={textareaRef}
                  className={`editor ${timerExpired ? "disabled" : ""}`}
                  placeholder="Start writing here..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  disabled={timerExpired}
                />
              </div>

            <div className="editor-footer">
              <div className="small muted">
                  {wordCount > 0 && (
                    <span>
                      Progress:{" "}
                      {Math.min(
                        100,
                        Math.round(
                          (wordCount / parseInt(selectedTask.targetWords.split("-")[1])) * 100
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
                <h3 className="section-title">🎯 Scoring Results</h3>

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
                    <div style={{ fontSize: "16px", opacity: 0.9, marginBottom: "8px" }}>
                      {scoringResult.cefr_description}
                    </div>
                    <div style={{ fontSize: "24px", fontWeight: "600", opacity: 0.95 }}>
                      Score: {scoringResult.score_10}/10
                    </div>
                  </div>
                </div>

                {/* Detailed Scores */}
                <div className="scoring-grid">
                  {/* Task Response */}
                  <div className="score-card">
                    <h4>📝 Task Response</h4>
                    <div className="score-value">{scoringResult.detailed_scores.task_response.score}/10</div>
                    <div className="score-feedback">
                      {scoringResult.detailed_scores.task_response.feedback.map((item, i) => (
                        <div key={i}>{item}</div>
                      ))}
                    </div>
                  </div>

                  {/* Coherence & Cohesion */}
                  <div className="score-card">
                    <h4>🔗 Coherence & Cohesion</h4>
                    <div className="score-value">{scoringResult.detailed_scores.coherence_cohesion.score}/10</div>
                    <div className="score-feedback">
                      {scoringResult.detailed_scores.coherence_cohesion.feedback.map((item, i) => (
                        <div key={i}>{item}</div>
                      ))}
                    </div>
                  </div>

                  {/* Lexical Resource */}
                  <div className="score-card">
                    <h4>📚 Lexical Resource</h4>
                    <div className="score-value">{scoringResult.detailed_scores.lexical_resource.score}/10</div>
                    <div className="score-feedback">
                      {scoringResult.detailed_scores.lexical_resource.feedback.map((item, i) => (
                        <div key={i}>{item}</div>
                      ))}
                    </div>
                  </div>

                  {/* Grammatical Range */}
                  <div className="score-card">
                    <h4>✍️ Grammatical Range</h4>
                    <div className="score-value">{scoringResult.detailed_scores.grammatical_range.score}/10</div>
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
                  onClick={() => {
                    setSelectedTask(null);
                    setText("");
                    setSubmitted(false);
                    setScoringResult(null);
                  }}
                >
                  Try Another Task
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
                {selectedTask.tips.map((tip, i) => (
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
                        Math.round((wordCount / parseInt(selectedTask.targetWords.split("-")[1])) * 100)
                      )}%`,
                    }}
                  />
                </div>
                <p className="small muted" style={{ marginTop: "8px" }}>
                  Target: {selectedTask.targetWords}
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
        <AIAssistant 
          text={text}
          textareaRef={textareaRef}
          onSuggestionAccept={(replacement, offset, length) => {
            // Get current text from textarea (most up-to-date)
            const currentText = textareaRef.current?.value || text;
            
            // Validate offset
            if (offset < 0 || offset >= currentText.length) {
              console.error("Invalid replacement offset:", offset, "for text length:", currentText.length);
              return;
            }
            
            // Ensure length doesn't exceed text bounds
            const validLength = Math.min(length, currentText.length - offset);
            
            // Get context around replacement area
            const textBefore = currentText.substring(0, offset);
            const textAfter = currentText.substring(offset + validLength);
            
            // Note: replacement is already normalized in AIAssistant
            // Just ensure proper spacing around it
            let finalReplacement = replacement.trim();
            
            // Check if we need space before replacement
            const charBefore = textBefore[textBefore.length - 1];
            const needsSpaceBefore = charBefore && 
              !/\s/.test(charBefore) && 
              !charBefore.match(/[.,!?;:(]/) &&
              !finalReplacement.match(/^[.,!?;:)]/);
            
            // Check if we need space after replacement  
            const charAfter = textAfter[0];
            const needsSpaceAfter = charAfter && 
              !/\s/.test(charAfter) && 
              !charAfter.match(/[.,!?;:)]/) &&
              !finalReplacement.match(/[.,!?;:(]$/);
            
            // Add spaces if needed
            if (needsSpaceBefore) {
              finalReplacement = ' ' + finalReplacement;
            }
            if (needsSpaceAfter) {
              finalReplacement = finalReplacement + ' ';
            }
            
            // Replace text at specific offset and length
            const newText = textBefore + finalReplacement + textAfter;
            setText(newText);
            
            // Set cursor after replaced text with smooth scroll
            if (textareaRef.current) {
              // Use requestAnimationFrame for smooth updates
              requestAnimationFrame(() => {
                const newCursorPos = offset + finalReplacement.length;
                const textarea = textareaRef.current;
                if (textarea) {
                  textarea.focus();
                  textarea.setSelectionRange(newCursorPos, newCursorPos);
                  
                  // Smooth scroll to cursor position
                  const textBeforeCursor = newText.substring(0, newCursorPos);
                  const linesBefore = textBeforeCursor.split('\n').length - 1;
                  const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 24;
                  const paddingTop = parseInt(getComputedStyle(textarea).paddingTop) || 16;
                  const targetScrollTop = linesBefore * lineHeight - paddingTop - 50;
                  
                  textarea.scrollTop = Math.max(0, targetScrollTop);
                  
                  // Trigger input event to update word count
                  textarea.dispatchEvent(new Event('input', { bubbles: true }));
                }
              });
            }
          }}
        />
      </div>
    );
  }

  // Task selection view
  return (
    <div className="dashboard-content">
      {/* Page header */}
      <section className="card page-head">
        <div>
          <h1>📝 Writing Practice</h1>
          <p className="muted">AI-powered writing assessment with CEFR scoring</p>
        </div>

        <div className="head-actions">
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
          Choose a Writing Task
        </h3>
        <div className="task-grid">
          {filteredTasks.map((task) => (
            <div key={task.id} className={`task-card task-card-${task.color}`}>
              {task.recommended && (
                <div className="task-badge">
                  <span>⭐ Recommended</span>
                </div>
              )}
              
              <div className="task-icon">{task.icon}</div>
              
              <div className="task-content">
                <h4 className="task-title">{task.title}</h4>
                <span className={`task-type ${task.color}`}>{task.type}</span>
              </div>

              <div className="task-meta">
                <span className="chip">{task.level} Level</span>
                <span className="chip">{task.targetWords}</span>
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

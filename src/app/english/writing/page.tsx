"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import TimerModal from "./components/TimerModal";
import AIAssistant from "./components/AIAssistant";
import OutlineGenerator from "./components/OutlineGenerator";
import BrainstormPanel from "./components/BrainstormPanel";
import LanguagePackPanel from "./components/LanguagePackPanel";
import RephraseMenu from "./components/RephraseMenu";
import ThesisGenerator from "./components/ThesisGenerator";
import SentenceExpander from "./components/SentenceExpander";
// import SelfReviewModal from "./components/SelfReviewModal";
import NextTaskCard from "./components/NextTaskCard";
import { WRITING_TASKS, WritingTask } from "./data/writingTasks";
import { useWritingLLMUsage } from "@/lib/hooks/useWritingLLMUsage";
import "./components/llm-features.css";

interface DetailedScore {
  score: number;
  feedback: string[];
}

interface ScoringResult {
  score_10?: number;
  overall_score: number;
  cefr_level: string;
  cefr_description?: string;
  detailed_scores: {
    // Traditional scoring system
    task_response?: DetailedScore;
    coherence_cohesion?: DetailedScore;
    lexical_resource?: DetailedScore;
    grammatical_range?: DetailedScore;
    // Modern scoring system
    task_achievement?: DetailedScore;
    language_quality?: DetailedScore;
    content_depth?: DetailedScore;
    fluency_readability?: DetailedScore;
    mechanics?: DetailedScore;
    // New intelligent scoring system
    vocabulary?: DetailedScore;
    grammar?: DetailedScore;
    coherence?: DetailedScore;
  };
  word_count: number;
  statistics?: {
    words: number;
    characters: number;
    sentences: number;
    paragraphs: number;
    unique_words: number;
  };
  scoring_system?: 'traditional' | 'modern';
  scoring_method?: string;
}


export default function WritingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [filterType, setFilterType] = useState<string>("All types");
  const [selectedTask, setSelectedTask] = useState<WritingTask | null>(null);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [scoringResult, setScoringResult] = useState<ScoringResult | null>(null);
  const [serviceAvailable, setServiceAvailable] = useState<boolean | null>(null);

  // LLM Usage tracking
  const { usage, loading: usageLoading, recordUsage, isAvailable, getRemaining } = useWritingLLMUsage(selectedTask?.id || null);

  // Timer state
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timerExpired, setTimerExpired] = useState(false);

  // LLM Features state
  const [selectedText, setSelectedText] = useState("");
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [showRephraseMenu, setShowRephraseMenu] = useState(false);
  const [showExpandMenu, setShowExpandMenu] = useState(false);
  const [showSelfReview, setShowSelfReview] = useState(false);

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

  // Check service availability on mount
  useEffect(() => {
    const checkService = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
        
        const response = await fetch("http://localhost:5001/health", {
          method: "GET",
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          setServiceAvailable(true);
        } else {
          setServiceAvailable(false);
        }
      } catch (error) {
        console.log("Python service not available:", error);
        setServiceAvailable(false);
      }
    };

    checkService();
    // Check service every 30 seconds
    const interval = setInterval(checkService, 30000);
    return () => clearInterval(interval);
  }, []);

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
      // TEMPORARILY DISABLED: Gemini scoring
      // Try Gemini scoring first (more accurate and doesn't require Python service)
      // let response = await fetch("/api/writing/score-gemini", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     text: text,
      //     prompt: selectedTask?.prompt || "",
      //     task: selectedTask ? {
      //       id: selectedTask.id,
      //       type: selectedTask.type,
      //       level: selectedTask.level,
      //       targetWords: selectedTask.targetWords,
      //     } : null,
      //   }),
      // });

      // // If Gemini scoring fails, try Python service as fallback
      // if (!response.ok) {
      //   console.log("Gemini scoring unavailable, trying Python service...");
      //   try {
      //     response = await fetch("http://localhost:5001/score-ai", {
      //       method: "POST",
      //       headers: { "Content-Type": "application/json" },
      //       body: JSON.stringify({
      //         text: text,
      //         prompt: selectedTask?.prompt || "",
      //         task: selectedTask ? {
      //           id: selectedTask.id,
      //           type: selectedTask.type,
      //           level: selectedTask.level,
      //           targetWords: selectedTask.targetWords,
      //         } : null,
      //       }),
      //     });

      //     // If AI endpoint not available, fallback to regular endpoint
      //     if (!response.ok && response.status === 503) {
      //       console.log("AI model not available, using traditional model...");
      //       response = await fetch("http://localhost:5001/score", {
      //         method: "POST",
      //         headers: { "Content-Type": "application/json" },
      //         body: JSON.stringify({
      //           text: text,
      //           prompt: selectedTask?.prompt || "",
      //           task: selectedTask ? {
      //             id: selectedTask.id,
      //             type: selectedTask.type,
      //             level: selectedTask.level,
      //             targetWords: selectedTask.targetWords,
      //           } : null,
      //         }),
      //       });
      //     }

      //     if (response.ok) {
      //       setServiceAvailable(true);
      //     } else {
      //       throw new Error("Python scoring service unavailable");
      //     }
      //   } catch (pythonError) {
      //     console.error("Python service error:", pythonError);
      //     setServiceAvailable(false);
      //     throw new Error("All scoring services unavailable. Please check Gemini API key or Python service.");
      //   }
      // }

      // Use NEW intelligent scoring system (v2)
      // This system is prompt-aware and scalable for any new prompt
      let response = await fetch("http://localhost:5001/score-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text,
          prompt: selectedTask?.prompt || "",
          level: selectedTask?.level || "B2",
          task_type: selectedTask?.type || null,
        }),
      });

      // If v2 not available, fallback to old scoring system
      if (!response.ok && response.status === 503) {
        console.log("Intelligent scoring (v2) not available, using traditional scoring...");
        response = await fetch("http://localhost:5001/score-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: text,
            prompt: selectedTask?.prompt || "",
            task: selectedTask ? {
              id: selectedTask.id,
              type: selectedTask.type,
              level: selectedTask.level,
              targetWords: selectedTask.targetWords,
            } : null,
          }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Scoring service unavailable");
      }

      setServiceAvailable(true); // Update service status on success

      const result: ScoringResult = await response.json();
      
      // Normalize result format - handle both old and new scoring systems
      const normalizedResult: ScoringResult = {
        ...result,
        // Ensure score_10 exists (use overall_score if not)
        score_10: result.score_10 ?? result.overall_score,
        // Calculate statistics if missing (for new scoring system)
        statistics: result.statistics || (() => {
          const words = text.trim().split(/\s+/).filter(w => w.length > 0);
          const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
          const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
          const uniqueWords = new Set(words.map(w => w.toLowerCase()));
          
          return {
            words: words.length,
            characters: text.length,
            sentences: sentences.length || 1,
            paragraphs: paragraphs.length || 1,
            unique_words: uniqueWords.size,
          };
        })(),
      };
      
      setScoringResult(normalizedResult);
      setSubmitted(true);

      // Save completion to database
      try {
        const saveResponse = await fetch("/api/writing/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId: selectedTask?.id,
            taskTitle: selectedTask?.title,
            taskType: selectedTask?.type,
            targetWords: selectedTask?.targetWords,
            score: normalizedResult.overall_score,
            level: selectedTask?.level,
            duration: null, // Can add timer tracking later
            text: text,
            scoringDetails: {
              cefr_level: normalizedResult.cefr_level,
              task_response: normalizedResult.detailed_scores.task_response?.score || normalizedResult.detailed_scores.task_achievement?.score,
              coherence: normalizedResult.detailed_scores.coherence_cohesion?.score || normalizedResult.detailed_scores.coherence?.score,
              lexical: normalizedResult.detailed_scores.lexical_resource?.score || normalizedResult.detailed_scores.vocabulary?.score,
              grammar: normalizedResult.detailed_scores.grammatical_range?.score || normalizedResult.detailed_scores.grammar?.score,
            },
          }),
        });

        if (!saveResponse.ok) {
          const errorData = await saveResponse.json().catch(() => ({}));
          console.error("Failed to save completion:", {
            status: saveResponse.status,
            statusText: saveResponse.statusText,
            error: errorData.error || "Unknown error",
          });
        } else {
          const saveData = await saveResponse.json();
          console.log("Completion saved successfully:", saveData);
        }
      } catch (saveError) {
        console.error("Error saving completion:", saveError);
        // Don't show error to user, just log it
      }

      toast.success("Scoring complete!", {
        id: "scoring",
        description: `Your score: ${normalizedResult.overall_score}/10`,
      });
      
      // Show self-review modal after scoring
      // setShowSelfReview(true); // Commented out - self-review disabled
    } catch (error) {
      console.error("Scoring error:", error);
      setServiceAvailable(false);
      toast.error("Scoring failed", {
        id: "scoring",
        description: error instanceof Error ? error.message : "Failed to score your writing. Please try again.",
      });
      // Don't set scoring result or submitted state if service is unavailable
      setScoringResult(null);
      setSubmitted(false);
    } finally {
      setSubmitting(false);
    }
  };

  // Text selection handlers for Rephrase and Expand features
  const handleTextSelection = () => {
    // Get selection from textarea (more reliable than window.getSelection)
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      if (start !== end) {
        const selected = textarea.value.substring(start, end).trim();
        if (selected && selected.length > 5) {
          setSelectedText(selected);
          // Save selection range for later use (in case selection is lost when clicking button)
          setSelectionRange({ start, end });
        } else {
          setSelectedText("");
          setSelectionRange(null);
          setShowRephraseMenu(false);
          setShowExpandMenu(false);
        }
      } else {
        setSelectedText("");
        setSelectionRange(null);
        setShowRephraseMenu(false);
        setShowExpandMenu(false);
      }
    }
  };

  const insertText = (newText: string) => {
    if (!textareaRef.current) return;
    
    const currentText = textareaRef.current.value;
    const cursorPos = textareaRef.current.selectionStart;
    
    const before = currentText.substring(0, cursorPos);
    const after = currentText.substring(cursorPos);
    
    const updatedText = before + newText + after;
    setText(updatedText);
    
    // Update textarea and cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.value = updatedText;
        const newPos = cursorPos + newText.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  const replaceSelectedText = (newText: string) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const currentText = textarea.value;
    
    // Priority 1: Use saved selection range (most reliable, saved before clicking button)
    if (selectionRange) {
      const { start, end } = selectionRange;
      const before = currentText.substring(0, start);
      const after = currentText.substring(end);
      const updatedText = before + newText + after;
      
      setText(updatedText);
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.value = updatedText;
          const newPos = start + newText.length;
          textareaRef.current.setSelectionRange(newPos, newPos);
          textareaRef.current.focus();
        }
      }, 0);
      
      setSelectedText("");
      setSelectionRange(null);
      return;
    }
    
    // Priority 2: Use current selection in textarea
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    if (start !== end) {
      const before = currentText.substring(0, start);
      const after = currentText.substring(end);
      const updatedText = before + newText + after;
      
      setText(updatedText);
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.value = updatedText;
          const newPos = start + newText.length;
          textareaRef.current.setSelectionRange(newPos, newPos);
          textareaRef.current.focus();
        }
      }, 0);
      
      setSelectedText("");
      setSelectionRange(null);
      return;
    }
    
    // Priority 3: Fallback: use selectedText if no selection range available
    if (selectedText) {
      const textIndex = currentText.indexOf(selectedText);
      
      if (textIndex !== -1) {
        const before = currentText.substring(0, textIndex);
        const after = currentText.substring(textIndex + selectedText.length);
        const updatedText = before + newText + after;
        
        setText(updatedText);
        
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.value = updatedText;
            const newPos = textIndex + newText.length;
            textareaRef.current.setSelectionRange(newPos, newPos);
            textareaRef.current.focus();
          }
        }, 0);
      } else {
        // If selectedText not found, just insert at cursor
        insertText(newText);
      }
    } else {
      // No selection and no selectedText, just insert at cursor
      insertText(newText);
    }
    
    setSelectedText("");
    setSelectionRange(null);
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
                // Clear all LLM feature states
                setShowRephraseMenu(false);
                setShowExpandMenu(false);
                setShowSelfReview(false);
                setSelectedText("");
                setSelectionRange(null);
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

          {/* LLM Features Toolbar */}
          <section className="card llm-toolbar">
            <div className="toolbar-title">
              <h4>🤖 AI Writing Assistant</h4>
              <small>
                {usageLoading ? (
                  "Loading usage limits..."
                ) : (
                  <>
                    Click features below to get AI-powered help
                    {session?.user && usage && session.user.cefrLevel && (
                      <span className="usage-summary">
                        • Limits based on your level ({session.user.cefrLevel})
                      </span>
                    )}
                    {session?.user && usage && !session.user.cefrLevel && (
                      <span className="usage-summary">
                        • Complete placement test to see level-based limits
                      </span>
                    )}
                  </>
                )}
              </small>
            </div>
            <div className="llm-features-grid">
              <OutlineGenerator
                level={selectedTask.level}
                type={selectedTask.type}
                topic={selectedTask.prompt}
                onInsert={insertText}
                isAvailable={isAvailable("outline")}
                remaining={getRemaining("outline")}
                onUsage={() => recordUsage("outline", { taskId: selectedTask.id, level: selectedTask.level })}
              />
              <BrainstormPanel
                level={selectedTask.level}
                type={selectedTask.type}
                topic={selectedTask.prompt}
                onInsert={insertText}
                isAvailable={isAvailable("brainstorm")}
                remaining={getRemaining("brainstorm")}
                onUsage={() => recordUsage("brainstorm", { taskId: selectedTask.id, level: selectedTask.level })}
              />
              <ThesisGenerator
                level={selectedTask.level}
                type={selectedTask.type}
                topic={selectedTask.prompt}
                onInsert={insertText}
                isAvailable={isAvailable("thesis")}
                remaining={getRemaining("thesis")}
                onUsage={() => recordUsage("thesis", { taskId: selectedTask.id, level: selectedTask.level })}
              />
              <LanguagePackPanel
                level={selectedTask.level}
                type={selectedTask.type}
                onInsert={insertText}
                isAvailable={isAvailable("language-pack")}
                remaining={getRemaining("language-pack")}
                onUsage={() => recordUsage("language-pack", { taskId: selectedTask.id, level: selectedTask.level })}
              />
              <button
                onClick={() => {
                  if (!isAvailable("rephrase")) {
                    toast.error("Usage limit reached", {
                      description: `You have used all ${getRemaining("rephrase") === 0 ? "available" : getRemaining("rephrase")} uses of this feature.`,
                    });
                    return;
                  }
                  if (selectedText) {
                    setShowRephraseMenu(true);
                    setShowExpandMenu(false);
                  } else {
                    toast.info("Select some text first to rephrase it");
                  }
                }}
                disabled={!isAvailable("rephrase")}
                className={`ai-feature-btn rephrase-btn ${!isAvailable("rephrase") ? "disabled" : ""}`}
                title={!isAvailable("rephrase") ? `Usage limit reached` : "Select text then click to rephrase"}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Rephrase
                {!isAvailable("rephrase") && <span className="usage-badge">Used</span>}
                {isAvailable("rephrase") && getRemaining("rephrase") > 0 && <span className="usage-badge remaining">{getRemaining("rephrase")}</span>}
              </button>
              <button
                onClick={() => {
                  if (!isAvailable("expand")) {
                    toast.error("Usage limit reached", {
                      description: `You have used all ${getRemaining("expand") === 0 ? "available" : getRemaining("expand")} uses of this feature.`,
                    });
                    return;
                  }
                  if (selectedText) {
                    setShowExpandMenu(true);
                    setShowRephraseMenu(false);
                  } else {
                    toast.info("Select a sentence first to expand it");
                  }
                }}
                disabled={!isAvailable("expand")}
                className={`ai-feature-btn expand-btn ${!isAvailable("expand") ? "disabled" : ""}`}
                title={!isAvailable("expand") ? `Usage limit reached` : "Select a sentence then click to expand"}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14m7-7H5" />
                </svg>
                Expand
                {!isAvailable("expand") && <span className="usage-badge">Used</span>}
                {isAvailable("expand") && getRemaining("expand") > 0 && <span className="usage-badge remaining">{getRemaining("expand")}</span>}
              </button>
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
                ref={textareaRef}
                className={`editor ${timerExpired ? "disabled" : ""}`}
              placeholder="Start writing here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onMouseUp={handleTextSelection}
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
                    disabled={submitting || submitted || wordCount < 10 || serviceAvailable === false}
                    title={serviceAvailable === false ? "Python service is not available. Please start the service on port 5001" : ""}
                  >
                    {submitting ? "Scoring..." : submitted ? "Submitted ✓" : "Submit for AI Review"}
                  </button>
                </div>
                {serviceAvailable === false && (
                  <div style={{ 
                    marginTop: "12px", 
                    padding: "12px", 
                    background: "#fef3c7", 
                    border: "1px solid #f59e0b",
                    borderRadius: "8px",
                    color: "#92400e",
                    fontSize: "14px"
                  }}>
                    ⚠️ Python scoring service is not available. Please start the service to enable AI scoring.
              </div>
                )}
            </div>
          </section>

            {/* Scoring Results - Only show if service is available and result exists */}
            {submitted && scoringResult && serviceAvailable && (
          <section className="card">
                <h3 className="section-title">🎯 Scoring Results</h3>

                {/* Score Display */}
                <div style={{ textAlign: "center", marginBottom: "32px" }}>
                  <div
                    style={{
                      display: "inline-block",
                      padding: "32px 64px",
                      background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                      borderRadius: "16px",
                      color: "white",
                    }}
                  >
                    <div style={{ fontSize: "20px", opacity: 0.9, marginBottom: "12px" }}>
                      Overall Score
                    </div>
                    <div style={{ fontSize: "64px", fontWeight: "bold", lineHeight: "1" }}>
                      {scoringResult.overall_score.toFixed(1)}
                    </div>
                    <div style={{ fontSize: "18px", opacity: 0.8, marginTop: "8px" }}>
                      / 10
                    </div>
                  </div>
                </div>

                {/* Detailed Scores */}
                <div className="scoring-grid">
                  {scoringResult.scoring_method === 'intelligent_v2' ? (
                    <>
                      {/* Intelligent Scoring System v2 */}
                      {/* Task Response */}
                      {scoringResult.detailed_scores.task_response && (
                        <div className="score-card">
                          <h4>📝 Task Response</h4>
                          <div className="score-value">{scoringResult.detailed_scores.task_response.score}/10</div>
                          <div className="score-feedback">
                            {scoringResult.detailed_scores.task_response.feedback.map((item, i) => (
                              <div key={i}>{item}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Vocabulary */}
                      {scoringResult.detailed_scores.vocabulary && (
                        <div className="score-card">
                          <h4>📚 Vocabulary</h4>
                          <div className="score-value">{scoringResult.detailed_scores.vocabulary.score}/10</div>
                          <div className="score-feedback">
                            {scoringResult.detailed_scores.vocabulary.feedback.map((item, i) => (
                              <div key={i}>{item}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Grammar */}
                      {scoringResult.detailed_scores.grammar && (
                        <div className="score-card">
                          <h4>✏️ Grammar</h4>
                          <div className="score-value">{scoringResult.detailed_scores.grammar.score}/10</div>
                          <div className="score-feedback">
                            {scoringResult.detailed_scores.grammar.feedback.map((item, i) => (
                              <div key={i}>{item}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Coherence */}
                      {scoringResult.detailed_scores.coherence && (
                        <div className="score-card">
                          <h4>🔗 Coherence</h4>
                          <div className="score-value">{scoringResult.detailed_scores.coherence.score}/10</div>
                          <div className="score-feedback">
                            {scoringResult.detailed_scores.coherence.feedback.map((item, i) => (
                              <div key={i}>{item}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : scoringResult.scoring_system === 'modern' ? (
                    <>
                      {/* Modern Scoring System */}
                      {/* Task Achievement */}
                      {scoringResult.detailed_scores.task_achievement && (
                        <div className="score-card">
                          <h4>🎯 Task Achievement</h4>
                          <div className="score-value">{scoringResult.detailed_scores.task_achievement.score}/10</div>
                          <div className="score-feedback">
                            {scoringResult.detailed_scores.task_achievement.feedback.map((item, i) => (
                              <div key={i}>{item}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Language Quality */}
                      {scoringResult.detailed_scores.language_quality && (
                        <div className="score-card">
                          <h4>💬 Language Quality</h4>
                          <div className="score-value">{scoringResult.detailed_scores.language_quality.score}/10</div>
                          <div className="score-feedback">
                            {scoringResult.detailed_scores.language_quality.feedback.map((item, i) => (
                              <div key={i}>{item}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Content Depth */}
                      {scoringResult.detailed_scores.content_depth && (
                        <div className="score-card">
                          <h4>📖 Content Depth</h4>
                          <div className="score-value">{scoringResult.detailed_scores.content_depth.score}/10</div>
                          <div className="score-feedback">
                            {scoringResult.detailed_scores.content_depth.feedback.map((item, i) => (
                              <div key={i}>{item}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Fluency & Readability */}
                      {scoringResult.detailed_scores.fluency_readability && (
                        <div className="score-card">
                          <h4>🌊 Fluency & Readability</h4>
                          <div className="score-value">{scoringResult.detailed_scores.fluency_readability.score}/10</div>
                          <div className="score-feedback">
                            {scoringResult.detailed_scores.fluency_readability.feedback.map((item, i) => (
                              <div key={i}>{item}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Mechanics */}
                      {scoringResult.detailed_scores.mechanics && (
                        <div className="score-card">
                          <h4>✏️ Mechanics</h4>
                          <div className="score-value">{scoringResult.detailed_scores.mechanics.score}/10</div>
                          <div className="score-feedback">
                            {scoringResult.detailed_scores.mechanics.feedback.map((item, i) => (
                              <div key={i}>{item}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Traditional Scoring System */}
                      {/* Task Response */}
                      {scoringResult.detailed_scores.task_response && (
                        <div className="score-card">
                          <h4>📝 Task Response</h4>
                          <div className="score-value">{scoringResult.detailed_scores.task_response.score}/10</div>
                          <div className="score-feedback">
                            {scoringResult.detailed_scores.task_response.feedback.map((item, i) => (
                              <div key={i}>{item}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Coherence & Cohesion */}
                      {scoringResult.detailed_scores.coherence_cohesion && (
                        <div className="score-card">
                          <h4>🔗 Coherence & Cohesion</h4>
                          <div className="score-value">{scoringResult.detailed_scores.coherence_cohesion.score}/10</div>
                          <div className="score-feedback">
                            {scoringResult.detailed_scores.coherence_cohesion.feedback.map((item, i) => (
                              <div key={i}>{item}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Lexical Resource */}
                      {scoringResult.detailed_scores.lexical_resource && (
                        <div className="score-card">
                          <h4>📚 Lexical Resource</h4>
                          <div className="score-value">{scoringResult.detailed_scores.lexical_resource.score}/10</div>
                          <div className="score-feedback">
                            {scoringResult.detailed_scores.lexical_resource.feedback.map((item, i) => (
                              <div key={i}>{item}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Grammatical Range */}
                      {scoringResult.detailed_scores.grammatical_range && (
                        <div className="score-card">
                          <h4>✍️ Grammatical Range</h4>
                          <div className="score-value">{scoringResult.detailed_scores.grammatical_range.score}/10</div>
                          <div className="score-feedback">
                            {scoringResult.detailed_scores.grammatical_range.feedback.map((item, i) => (
                              <div key={i}>{item}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Statistics */}
                {scoringResult.statistics && (
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
                          {scoringResult.statistics.words > 0 
                            ? Math.round((scoringResult.statistics.unique_words / scoringResult.statistics.words) * 100)
                            : 0}%
                        </div>
                        <div style={{ fontSize: "12px", color: "#6b7280" }}>Lexical Diversity</div>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  className="btn primary w-full"
                  style={{ marginTop: "24px" }}
                  onClick={() => {
                    setSelectedTask(null);
                    setText("");
                    setSubmitted(false);
                    setScoringResult(null);
                    // Clear all LLM feature states
                    setShowRephraseMenu(false);
                    setShowExpandMenu(false);
                    setShowSelfReview(false);
                    setSelectedText("");
                    setSelectionRange(null);
                    setTimeLeft(null);
                    setTimerExpired(false);
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

        {/* Rephrase Menu */}
        {/* Rephrase Menu Modal */}
        {showRephraseMenu && selectedText && selectedTask && (
          <RephraseMenu
            selectedText={selectedText}
            level={selectedTask.level}
            onReplace={replaceSelectedText}
            onClose={() => setShowRephraseMenu(false)}
            isAvailable={isAvailable("rephrase")}
            remaining={getRemaining("rephrase")}
            onUsage={() => recordUsage("rephrase", { taskId: selectedTask.id, level: selectedTask.level })}
          />
        )}

        {/* Sentence Expander Modal */}
        {showExpandMenu && selectedText && (
          <SentenceExpander
            selectedSentence={selectedText}
            onReplace={replaceSelectedText}
            onClose={() => setShowExpandMenu(false)}
            isAvailable={isAvailable("expand")}
            remaining={getRemaining("expand")}
            onUsage={() => recordUsage("expand", { taskId: selectedTask.id, level: selectedTask.level })}
          />
        )}

        {/* Self-Review Modal */}
        {/* Commented out - self-review disabled
        {selectedTask && (
          <SelfReviewModal
            text={text}
            topic={selectedTask.prompt}
            isOpen={showSelfReview}
            onClose={() => setShowSelfReview(false)}
          />
        )}
        */}

        {/* Next Task Recommendation */}
        {submitted && scoringResult && session?.user && (
          <NextTaskCard
            userId={session.user.email || ""}
            level={selectedTask?.level || "B2"}
            lastScore={scoringResult.overall_score}
            errorProfile={{
              taskResponse: scoringResult.detailed_scores.task_response?.score || scoringResult.detailed_scores.task_achievement?.score || 0,
              coherence: scoringResult.detailed_scores.coherence_cohesion?.score || scoringResult.detailed_scores.language_quality?.score || 0,
              lexical: scoringResult.detailed_scores.lexical_resource?.score || scoringResult.detailed_scores.language_quality?.score || 0,
              grammar: scoringResult.detailed_scores.grammatical_range?.score || scoringResult.detailed_scores.language_quality?.score || 0,
            }}
            scoringFeedback={{
              taskResponse: scoringResult.detailed_scores.task_response?.feedback || scoringResult.detailed_scores.task_achievement?.feedback || [],
              coherence: scoringResult.detailed_scores.coherence_cohesion?.feedback || scoringResult.detailed_scores.language_quality?.feedback || [],
              lexical: scoringResult.detailed_scores.lexical_resource?.feedback || scoringResult.detailed_scores.language_quality?.feedback || [],
              grammar: scoringResult.detailed_scores.grammatical_range?.feedback || scoringResult.detailed_scores.language_quality?.feedback || [],
            }}
          />
        )}

        {/* AI Assistant */}
        <AIAssistant 
          text={text}
          textareaRef={textareaRef}
          onSuggestionAccept={(replacement, offset, length) => {
            // Get current text from textarea (most up-to-date)
            if (!textareaRef.current) return;
            
            const currentText = textareaRef.current.value;
            
            // Validate offset is within bounds
            if (offset < 0 || offset >= currentText.length) {
              toast.error("Invalid position", {
                description: "The text position is no longer valid. Please check grammar again.",
              });
              return;
            }
            
            // Ensure length doesn't exceed text bounds
            const validLength = Math.min(length, currentText.length - offset);
            
            // Get the text that will be replaced for verification
            const textToReplace = currentText.substring(offset, offset + validLength);
            
            // Perform replacement
            const newText = currentText.substring(0, offset) + replacement + currentText.substring(offset + validLength);
            setText(newText);
            
            // Update textarea value directly to ensure consistency
            if (textareaRef.current) {
              textareaRef.current.value = newText;
              
              // Set cursor after replaced text
              setTimeout(() => {
                const newCursorPos = offset + replacement.length;
                textareaRef.current?.focus();
                textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
                
                // Trigger input event to update any listeners
                const event = new Event('input', { bubbles: true });
                textareaRef.current?.dispatchEvent(event);
              }, 0);
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
          <p className="muted">AI-powered writing assessment</p>
        </div>

        <div className="head-actions">
          <div className="stats" style={{ gap: "16px" }}>
            <div className="stat">
              <span className="stat-val">24</span>
              <span className="stat-lbl">Completed</span>
            </div>
            <div className="stat">
              <span className="stat-val">7.5</span>
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
                onClick={() => {
                  // Reset all states when selecting a new task
                  setText("");
                  setSubmitted(false);
                  setScoringResult(null);
                  setShowRephraseMenu(false);
                  setShowExpandMenu(false);
                  setShowSelfReview(false);
                  setSelectedText("");
                  setSelectionRange(null);
                  setTimeLeft(null);
                  setTimerExpired(false);
                  setSelectedTask(task);
                }}
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

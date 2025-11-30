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

export default function WritingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [filterType, setFilterType] = useState<string>("All types");
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("All levels");
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

  // Use only hardcoded tasks for user page
  const SOURCE_TASKS: WritingTask[] = WRITING_TASKS;

  // Filter tasks by type, level, and search
  const filteredTasks = useMemo(() => {
    return SOURCE_TASKS.filter(task => {
      const matchesType = filterType === "All types" || task.type === filterType;
      const matchesLevel = levelFilter === "All levels" || task.level === levelFilter;
      const matchesSearch = !searchTerm || 
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.type.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesLevel && matchesSearch;
    });
  }, [SOURCE_TASKS, filterType, levelFilter, searchTerm]);

  const uniqueTypes = ["All types", ...Array.from(new Set(SOURCE_TASKS.map(t => t.type)))];
  const uniqueLevels = ["All levels", ...Array.from(new Set(SOURCE_TASKS.map(t => t.level)))];

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
      // Try Gemini scoring first (more accurate and doesn't require Python service)
      let response: Response | null = null;

      try {
        response = await fetch("/api/writing/score-gemini", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            prompt: selectedTask?.prompt || "",
            task: selectedTask
              ? {
                  id: selectedTask.id,
                  type: selectedTask.type,
                  level: selectedTask.level,
                  targetWords: selectedTask.targetWords,
                }
              : null,
          }),
        });

        if (!response.ok) {
          console.log("Gemini scoring unavailable, will try Python service...");
          response = null;
        }
      } catch (geminiError) {
        console.error("Gemini scoring error:", geminiError);
        response = null;
      }

      // If Gemini scoring fails, try Python service as fallback
      if (!response) {
        // Use Hybrid Deep Model scoring system
        response = await fetch("http://localhost:5001/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: text,
            prompt: selectedTask?.prompt || "",
            task: selectedTask
              ? {
                  id: selectedTask.id,
                  type: selectedTask.type,
                  level: selectedTask.level,
                  targetWords: selectedTask.targetWords,
                }
              : null,
          }),
        });
      }

      if (!response || !response.ok) {
        const errorData = await response?.json().catch(() => ({}));
        throw new Error(errorData?.error || "Scoring service unavailable");
      }

      setServiceAvailable(true); // Update service status on success

      const result: ScoringResult = await response.json();
      
      // DEBUG: Log API response
      console.log("[FE] API Response:", result);
      console.log("[FE] overall_score from API:", result.overall_score);
      console.log("[FE] score_10 from API:", result.score_10);
      
      // Normalize result format - handle both old and new scoring systems
      // CRITICAL: Ensure overall_score is in [0, 10] range (backend already validates, but double-check)
      let overallScore = result.overall_score;
      if (overallScore > 10.0) {
        console.warn("[FE] overall_score > 10.0, dividing by 10:", overallScore);
        overallScore = overallScore / 10.0;
      }
      overallScore = Math.max(0.0, Math.min(10.0, overallScore));
      
      const normalizedResult: ScoringResult = {
        ...result,
        // CRITICAL: Use validated overall_score (ensure it's in [0, 10] range)
        overall_score: overallScore,
        // Ensure score_10 exists (use overall_score if not)
        score_10: result.score_10 ?? overallScore,
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
      
      // DEBUG: Log normalized result
      console.log("[FE] Normalized Result:", normalizedResult);
      console.log("[FE] overall_score after normalize:", normalizedResult.overall_score);
      console.log("[FE] score_10 after normalize:", normalizedResult.score_10);
      console.log("[FE] ✅ Final overall_score to display:", normalizedResult.overall_score, "/ 10");
      
      setScoringResult(normalizedResult);
      setSubmitted(true);

      // Save completion to database
      try {
        const saveResponse = await fetch("/api/writing/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            userId: session?.user?.id,
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
              task_response: normalizedResult.detailed_scores?.task_response?.score || normalizedResult.detailed_scores?.task_achievement?.score || 0,
              coherence: normalizedResult.detailed_scores?.coherence_cohesion?.score || normalizedResult.detailed_scores?.coherence?.score || 0,
              lexical: normalizedResult.detailed_scores?.lexical_resource?.score || normalizedResult.detailed_scores?.vocabulary?.score || 0,
              grammar: normalizedResult.detailed_scores?.grammatical_range?.score || normalizedResult.detailed_scores?.grammar?.score || 0,
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
              Back to Tasks
            </button>
            <h1 style={{ marginTop: "12px" }}>{selectedTask.title}</h1>
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
                {formatTime(timeLeft)}
              </div>
            )}
        </div>
      </section>

        {/* Writing interface - Split view like reading */}
        <div
          className="writing-split-layout"
          style={{
            display: "flex",
            gap: "24px",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <section
            className="card"
            style={{
              flex: 1,
              minWidth: "min(640px, 100%)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
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
                  {timeLeft === null ? "Set Timer" : "Timer Active"}
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
                      Time expired - editing disabled
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
                    {submitting ? "Scoring..." : submitted ? "Submitted" : "Submit for AI Review"}
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
                    Python scoring service is not available. Please start the service to enable AI scoring.
              </div>
                )}
            </div>
          </section>
            </div>
          </section>

          {/* Right column - Sticky sidebar like reading */}
          <aside
            className="card"
            style={{
              width: "520px",
              maxWidth: "100%",
              flex: "0 0 520px",
              position: "sticky",
              top: "96px",
              alignSelf: "flex-start",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              maxHeight: "calc(100vh - 120px)",
              overflowY: "auto",
            }}
          >
            {/* Scoring Results - Only show if service is available and result exists */}
            {submitted && scoringResult && serviceAvailable && (
              <div>
                <h3 style={{ fontSize: "1.65rem", marginBottom: "8px" }}>Scoring Results</h3>
                <p className="muted" style={{ marginBottom: "10px", fontSize: "1rem", lineHeight: 1.4 }}>
                  Detailed feedback on your writing performance
                </p>

                {/* Score Display */}
                <div style={{ textAlign: "center", marginBottom: "24px" }}>
                  <div
                    style={{
                      display: "inline-block",
                      padding: "24px 48px",
                      background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                      borderRadius: "12px",
                      color: "white",
                    }}
                  >
                    <div style={{ fontSize: "18px", opacity: 0.9, marginBottom: "8px" }}>
                      Overall Score
                    </div>
                    <div style={{ fontSize: "48px", fontWeight: "bold", lineHeight: "1" }}>
                      {Math.max(0, Math.min(10, scoringResult.overall_score)).toFixed(1)}
                    </div>
                    <div style={{ fontSize: "16px", opacity: 0.8, marginTop: "4px" }}>
                      / 10
                    </div>
                  </div>
                </div>

                {/* Detailed Scores */}
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {/* IELTS 4 Criteria (Hybrid v3 or Traditional) */}
                  {(scoringResult.scoring_method === 'hybrid_v3_ielts' || 
                    scoringResult.scoring_system === 'traditional' ||
                    (scoringResult.detailed_scores?.coherence_cohesion && scoringResult.detailed_scores?.lexical_resource && scoringResult.detailed_scores?.grammatical_range)) ? (
                    <>
                      {/* IELTS 4 Criteria Scoring System */}
                      {/* Task Response */}
                      {scoringResult.detailed_scores?.task_response && (
                        <div className="score-card">
                          <h4>Task Response</h4>
                          <div className="score-value">{scoringResult.detailed_scores.task_response.score}/10</div>
                          <div className="score-feedback">
                            {scoringResult.detailed_scores.task_response.feedback.map((item, i) => (
                              <div key={i}>{item}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Coherence & Cohesion */}
                      {scoringResult.detailed_scores?.coherence_cohesion && (
                        <div className="score-card">
                          <h4>Coherence & Cohesion</h4>
                          <div className="score-value">{scoringResult.detailed_scores.coherence_cohesion.score}/10</div>
                          <div className="score-feedback">
                            {scoringResult.detailed_scores.coherence_cohesion.feedback.map((item, i) => (
                              <div key={i}>{item}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Lexical Resource */}
                      {scoringResult.detailed_scores?.lexical_resource && (
                        <div className="score-card">
                          <h4>Lexical Resource</h4>
                          <div className="score-value">{scoringResult.detailed_scores.lexical_resource.score}/10</div>
                          <div className="score-feedback">
                            {scoringResult.detailed_scores.lexical_resource.feedback.map((item, i) => (
                              <div key={i}>{item}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Grammatical Range & Accuracy */}
                      {scoringResult.detailed_scores?.grammatical_range && (
                        <div className="score-card">
                          <h4>Grammatical Range & Accuracy</h4>
                          <div className="score-value">{scoringResult.detailed_scores.grammatical_range.score}/10</div>
                          <div className="score-feedback">
                            {scoringResult.detailed_scores.grammatical_range.feedback.map((item, i) => (
                              <div key={i}>{item}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : scoringResult.scoring_method === 'intelligent_v2' ? (
                    <>
                      {/* Intelligent Scoring System v2 */}
                      {/* Task Response */}
                      {scoringResult.detailed_scores?.task_response && (
                        <div className="score-card">
                          <h4>Task Response</h4>
                          <div className="score-value">{scoringResult.detailed_scores.task_response.score}/10</div>
                          <div className="score-feedback">
                            {scoringResult.detailed_scores.task_response.feedback.map((item, i) => (
                              <div key={i}>{item}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Vocabulary */}
                      {scoringResult.detailed_scores?.vocabulary && (
                        <div className="score-card">
                          <h4>Vocabulary</h4>
                          <div className="score-value">{scoringResult.detailed_scores.vocabulary.score}/10</div>
                          <div className="score-feedback">
                            {scoringResult.detailed_scores.vocabulary.feedback.map((item, i) => (
                              <div key={i}>{item}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Grammar */}
                      {scoringResult.detailed_scores?.grammar && (
                        <div className="score-card">
                          <h4>Grammar</h4>
                          <div className="score-value">{scoringResult.detailed_scores.grammar.score}/10</div>
                          <div className="score-feedback">
                            {scoringResult.detailed_scores.grammar.feedback.map((item, i) => (
                              <div key={i}>{item}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Coherence */}
                      {scoringResult.detailed_scores?.coherence && (
                        <div className="score-card">
                          <h4>Coherence</h4>
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
                      {scoringResult.detailed_scores?.task_achievement && (
                        <div className="score-card">
                          <h4>Task Achievement</h4>
                          <div className="score-value">{scoringResult.detailed_scores.task_achievement.score}/10</div>
                          <div className="score-feedback">
                            {scoringResult.detailed_scores.task_achievement.feedback.map((item, i) => (
                              <div key={i}>{item}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Language Quality */}
                      {scoringResult.detailed_scores?.language_quality && (
                        <div className="score-card">
                          <h4>Language Quality</h4>
                          <div className="score-value">{scoringResult.detailed_scores.language_quality.score}/10</div>
                          <div className="score-feedback">
                            {scoringResult.detailed_scores.language_quality.feedback.map((item, i) => (
                              <div key={i}>{item}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Content Depth */}
                      {scoringResult.detailed_scores?.content_depth && (
                        <div className="score-card">
                          <h4>Content Depth</h4>
                          <div className="score-value">{scoringResult.detailed_scores.content_depth.score}/10</div>
                          <div className="score-feedback">
                            {scoringResult.detailed_scores.content_depth.feedback.map((item, i) => (
                              <div key={i}>{item}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Fluency & Readability */}
                      {scoringResult.detailed_scores?.fluency_readability && (
                        <div className="score-card">
                          <h4>Fluency & Readability</h4>
                          <div className="score-value">{scoringResult.detailed_scores.fluency_readability.score}/10</div>
                          <div className="score-feedback">
                            {scoringResult.detailed_scores.fluency_readability.feedback.map((item, i) => (
                              <div key={i}>{item}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Mechanics */}
                      {scoringResult.detailed_scores?.mechanics && (
                        <div className="score-card">
                          <h4>Mechanics</h4>
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
                      {scoringResult.detailed_scores?.task_response && (
                        <div className="score-card">
                          <h4>Task Response</h4>
                          <div className="score-value">{scoringResult.detailed_scores.task_response.score}/10</div>
                          <div className="score-feedback">
                            {scoringResult.detailed_scores.task_response.feedback.map((item, i) => (
                              <div key={i}>{item}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Coherence & Cohesion */}
                      {scoringResult.detailed_scores?.coherence_cohesion && (
                        <div className="score-card">
                          <h4>Coherence & Cohesion</h4>
                          <div className="score-value">{scoringResult.detailed_scores.coherence_cohesion.score}/10</div>
                          <div className="score-feedback">
                            {scoringResult.detailed_scores.coherence_cohesion.feedback.map((item, i) => (
                              <div key={i}>{item}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Lexical Resource */}
                      {scoringResult.detailed_scores?.lexical_resource && (
                        <div className="score-card">
                          <h4>Lexical Resource</h4>
                          <div className="score-value">{scoringResult.detailed_scores.lexical_resource.score}/10</div>
                          <div className="score-feedback">
                            {scoringResult.detailed_scores.lexical_resource.feedback.map((item, i) => (
                              <div key={i}>{item}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Grammatical Range */}
                      {scoringResult.detailed_scores?.grammatical_range && (
                        <div className="score-card">
                          <h4>Grammatical Range</h4>
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
                    <h4 style={{ marginBottom: "12px" }}>Statistics</h4>
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
                  style={{ marginTop: "24px", padding: "12px 20px", fontSize: "1.05rem", fontWeight: 600 }}
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
              </div>
            )}

            {/* Progress */}
            <div className="card soft">
              <h4 style={{ marginBottom: "8px" }}>Progress</h4>
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
            </div>

            {/* Writing Tips */}
            <div className="card soft">
              <h4 style={{ marginBottom: "8px" }}>Writing Tips</h4>
              <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {selectedTask.tips.map((tip, i) => (
                  <div key={i} style={{ fontSize: "0.95rem", lineHeight: 1.5 }}>
                    {tip}
                  </div>
                ))}
              </div>
            </div>

            {/* Grammar Reference */}
            <div className="card soft">
              <h4 style={{ marginBottom: "8px" }}>Grammar Reference</h4>
              <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ fontSize: "0.95rem" }}>• Use varied sentence structures</div>
                <div style={{ fontSize: "0.95rem" }}>• Check subject-verb agreement</div>
                <div style={{ fontSize: "0.95rem" }}>• Use proper punctuation</div>
                <div style={{ fontSize: "0.95rem" }}>• Avoid run-on sentences</div>
                <div style={{ fontSize: "0.95rem" }}>• Use linking words (however, moreover)</div>
              </div>
            </div>
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
              taskResponse: scoringResult.detailed_scores?.task_response?.score || scoringResult.detailed_scores?.task_achievement?.score || 0,
              coherence: scoringResult.detailed_scores?.coherence_cohesion?.score || scoringResult.detailed_scores?.language_quality?.score || 0,
              lexical: scoringResult.detailed_scores?.lexical_resource?.score || scoringResult.detailed_scores?.language_quality?.score || 0,
              grammar: scoringResult.detailed_scores?.grammatical_range?.score || scoringResult.detailed_scores?.language_quality?.score || 0,
            }}
            scoringFeedback={{
              taskResponse: scoringResult.detailed_scores?.task_response?.feedback || scoringResult.detailed_scores?.task_achievement?.feedback || [],
              coherence: scoringResult.detailed_scores?.coherence_cohesion?.feedback || scoringResult.detailed_scores?.language_quality?.feedback || [],
              lexical: scoringResult.detailed_scores?.lexical_resource?.feedback || scoringResult.detailed_scores?.language_quality?.feedback || [],
              grammar: scoringResult.detailed_scores?.grammatical_range?.feedback || scoringResult.detailed_scores?.language_quality?.feedback || [],
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
            <h1 style={{ marginBottom: "4px" }}>Writing Practice</h1>
            <p className="muted">
              AI-powered writing assessment with detailed feedback
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
            <StatsCard label="Tasks" value={WRITING_TASKS.length.toString()} />
            <StatsCard label="Avg. length" value="~15 phút" />
            <StatsCard label="Skill focus" value="Grammar • Vocabulary • Structure" />
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
          placeholder="Tìm theo tiêu đề hoặc chủ đề…"
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
          />
        ))}
        {!filteredTasks.length && (
          <div className="card soft" style={{ gridColumn: "1/-1" }}>
            Không tìm thấy bài viết nào phù hợp với bộ lọc hiện tại.
          </div>
        )}
      </section>
    </div>
  );
}

function TaskCard({
  task,
  onSelect,
}: {
  task: WritingTask;
  onSelect: () => void;
}) {
  return (
    <div className="card soft" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="chip">{task.level}</span>
      </div>
      <div>
        <h3 style={{ marginBottom: "4px" }}>{task.title}</h3>
        <p className="muted" style={{ marginBottom: "8px" }}>
          {task.prompt.substring(0, 100)}{task.prompt.length > 100 ? "..." : ""}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          <span className="tag">{task.type}</span>
          <span className="tag">{task.targetWords}</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: "8px", fontSize: "0.9rem" }}>
        <span>{task.targetWords}</span>
        {task.attempts > 0 && <span>{task.attempts} attempt{task.attempts !== 1 ? "s" : ""}</span>}
      </div>
      <button className="btn primary" onClick={onSelect}>
        Bắt đầu luyện viết
      </button>
    </div>
  );
}

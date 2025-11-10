"use client";

import { useState } from "react";
import { toast } from "sonner";

interface ThesisOption {
  thesis: string;
  mainPoints: string[];
  approach: string;
}

interface ThesisData {
  options: ThesisOption[];
}

interface Props {
  level: string;
  type: string;
  topic: string;
  stance?: string;
  onInsert: (text: string) => void;
  isAvailable?: boolean;
  remaining?: number;
  onUsage?: () => void;
}

export default function ThesisGenerator({ level, type, topic, stance, onInsert, isAvailable = true, remaining = 0, onUsage }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ThesisData | null>(null);

  const generateThesis = async () => {
    if (!isAvailable) {
      toast.error("Usage limit reached", {
        description: "You have already used this feature. This feature can only be used once per task.",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/writing/thesis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, type, topic, stance }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate thesis");
      }

      const result: ThesisData = await response.json();
      setData(result);
      setIsOpen(true);
      
      // Record usage
      if (onUsage) {
        onUsage();
      }
      
      toast.success("Thesis options generated!");
    } catch (error) {
      console.error("Thesis generation error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate thesis";
      
      // Provide helpful error messages with requirements
      if (errorMessage.includes("Gemini API is not configured") || errorMessage.includes("GEMINI_API_KEY")) {
        toast.error("Gemini API not configured", {
          description: "Please add GEMINI_API_KEY to your .env.local file and restart the server.",
        });
      } else if (errorMessage.includes("level") || errorMessage.includes("type") || errorMessage.includes("topic")) {
        toast.error("Missing information", {
          description: "This feature requires a selected writing task with level, type, and topic. Please select a task first.",
        });
      } else {
        toast.error("Failed to generate thesis", {
          description: errorMessage,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const insertThesis = (option: ThesisOption) => {
    const text = `${option.thesis}\n\nMain points:\n${option.mainPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}\n\n`;
    onInsert(text);
    toast.success("Thesis inserted!");
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={generateThesis}
        disabled={loading || !isAvailable}
        className={`ai-feature-btn thesis-btn ${!isAvailable ? "disabled" : ""}`}
        title={!isAvailable ? "Usage limit reached (1 use per task)" : "Generate thesis statement"}
      >
        {loading ? (
          <>
            <svg className="spinner" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
            </svg>
            Generating...
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Generate Thesis
            {!isAvailable && <span className="usage-badge">Used</span>}
          </>
        )}
      </button>

      {isOpen && data && (
        <div className="ai-modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="ai-modal thesis-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ai-modal-header">
              <h3>📖 Thesis Statement Options</h3>
              <button onClick={() => setIsOpen(false)} className="close-btn">
                ×
              </button>
            </div>

            <div className="ai-modal-content">
              {data.options.map((option, idx) => (
                <div key={idx} className="thesis-card">
                  <div className="thesis-number">Option {idx + 1}</div>
                  <p className="thesis-statement">{option.thesis}</p>
                  
                  <div className="thesis-approach">
                    <strong>Approach:</strong> {option.approach}
                  </div>
                  
                  <div className="thesis-points">
                    <strong>Main Points:</strong>
                    <ul>
                      {option.mainPoints.map((point, pidx) => (
                        <li key={pidx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <button onClick={() => insertThesis(option)} className="primary-btn">
                    Use This Thesis
                  </button>
                </div>
              ))}
            </div>

            <div className="ai-modal-footer">
              <button onClick={() => setIsOpen(false)} className="secondary-btn">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


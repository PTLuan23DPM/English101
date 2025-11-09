"use client";

import { useState } from "react";
import { toast } from "sonner";

interface Expansion {
  text: string;
  explanation: string;
}

interface ExpandData {
  expansions: Expansion[];
}

interface Props {
  selectedSentence: string;
  onReplace: (newText: string) => void;
  onClose: () => void;
  isAvailable?: boolean;
  remaining?: number;
  onUsage?: () => void;
}

export default function SentenceExpander({ selectedSentence, onReplace, onClose, isAvailable = true, remaining = 0, onUsage }: Props) {
  const [loading, setLoading] = useState(false);
  const [expansions, setExpansions] = useState<Expansion[] | null>(null);
  const [activeMode, setActiveMode] = useState<"reason" | "example" | "contrast" | null>(null);

  const expand = async (mode: "reason" | "example" | "contrast") => {
    if (!isAvailable) {
      toast.error("Usage limit reached", {
        description: `You have used all ${remaining === 0 ? "available" : remaining} uses of this feature.`,
      });
      return;
    }

    setActiveMode(mode);
    setLoading(true);
    try {
      const response = await fetch("/api/writing/expand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sentence: selectedSentence,
          mode,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to expand");
      }

      const data: ExpandData = await response.json();
      setExpansions(data.expansions);
      
      // Record usage
      if (onUsage) {
        onUsage();
      }
      
      toast.success("Expansions generated!");
    } catch (error) {
      console.error("Expand error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to expand";
      
      // Provide helpful error messages with requirements
      if (errorMessage.includes("Gemini API is not configured") || errorMessage.includes("GEMINI_API_KEY")) {
        toast.error("Gemini API not configured", {
          description: "Please add GEMINI_API_KEY to your .env.local file and restart the server.",
        });
      } else if (errorMessage.includes("sentence") || errorMessage.includes("text")) {
        toast.error("No sentence selected", {
          description: "Please select a sentence in your writing before using the Expand feature.",
        });
      } else {
        toast.error("Failed to expand", {
          description: errorMessage,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInsert = (expansion: string) => {
    // Replace selected sentence with: original sentence + expansion
    // This creates a natural flow: original sentence followed by the expansion
    const expandedText = selectedSentence.trim() + " " + expansion.trim();
    onReplace(expandedText);
    toast.success("Expansion inserted!");
    onClose();
  };

  return (
    <div className="ai-modal-overlay" onClick={onClose}>
      <div className="ai-modal expander-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ai-modal-header">
          <h3>📝 Expand Sentence</h3>
          <button onClick={onClose} className="close-btn">
            ×
          </button>
        </div>

        <div className="ai-modal-content">
          {/* Show selected sentence */}
          <div className="selected-text-preview">
            <h4>Selected Sentence:</h4>
            <p>"{selectedSentence}"</p>
          </div>

          {!expansions ? (
            <div className="expander-modes">
              <h4>Expand with:</h4>
              {!isAvailable && (
                <div className="usage-warning">
                  <p>⚠️ Usage limit reached. You have used all available uses of this feature.</p>
                </div>
              )}
              {isAvailable && remaining > 0 && (
                <div className="usage-info">
                  <p>Remaining uses: <strong>{remaining}</strong></p>
                </div>
              )}
              <div className="mode-buttons">
                <button
                  onClick={() => expand("reason")}
                  disabled={loading || !isAvailable}
                  className={`expander-mode-btn ${!isAvailable ? "disabled" : ""}`}
                >
                  {loading && activeMode === "reason" ? (
                    <svg className="spinner" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                  ) : (
                    "🔍"
                  )}
                  Reason/Why
                </button>
                <button
                  onClick={() => expand("example")}
                  disabled={loading || !isAvailable}
                  className={`expander-mode-btn ${!isAvailable ? "disabled" : ""}`}
                >
                  {loading && activeMode === "example" ? (
                    <svg className="spinner" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                  ) : (
                    "📌"
                  )}
                  Example
                </button>
                <button
                  onClick={() => expand("contrast")}
                  disabled={loading || !isAvailable}
                  className={`expander-mode-btn ${!isAvailable ? "disabled" : ""}`}
                >
                  {loading && activeMode === "contrast" ? (
                    <svg className="spinner" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                  ) : (
                    "⚖️"
                  )}
                  Contrast
                </button>
              </div>
            </div>
          ) : (
            <div className="expansion-options">
              <div className="options-header">
                <h4>Choose an expansion:</h4>
                <button
                  onClick={() => {
                    setExpansions(null);
                    setActiveMode(null);
                  }}
                  className="secondary-btn"
                >
                  ← Back
                </button>
              </div>
              {expansions.map((expansion, idx) => (
                <div key={idx} className="expansion-option-card">
                  <p className="expansion-text">{expansion.text}</p>
                  <small className="expansion-explanation">{expansion.explanation}</small>
                  <button onClick={() => handleInsert(expansion.text)} className="primary-btn">
                    Insert
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="ai-modal-footer">
          <button onClick={onClose} className="secondary-btn">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


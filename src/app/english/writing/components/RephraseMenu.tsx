"use client";

import { useState } from "react";
import { toast } from "sonner";
import { fetchWithRetry, handleLLMError } from "@/lib/utils/llm-retry";

interface RephraseOption {
  text: string;
  notes: string;
}

interface RephraseData {
  options: RephraseOption[];
}

interface Props {
  selectedText: string;
  level: string;
  onReplace: (newText: string) => void;
  onClose: () => void;
  isAvailable?: boolean;
  remaining?: number;
  onUsage?: () => void;
}

export default function RephraseMenu({ selectedText, level, onReplace, onClose, isAvailable = true, remaining = 0, onUsage }: Props) {
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<RephraseOption[] | null>(null);
  const [activeStyle, setActiveStyle] = useState<"simple" | "academic" | "formal" | null>(null);

  const rephrase = async (style: "simple" | "academic" | "formal") => {
    if (!isAvailable) {
      toast.error("Usage limit reached", {
        description: `You have used all ${remaining === 0 ? "available" : remaining} uses of this feature.`,
      });
      return;
    }

    setActiveStyle(style);
    setLoading(true);
    try {
      const response = await fetchWithRetry(
        "/api/writing/rephrase",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: selectedText,
            style,
            targetLevel: level,
          }),
        },
        {
          maxRetries: 3,
          baseDelay: 1000,
          maxDelay: 10000,
          onRetry: (attempt, delay) => {
            toast.info("Service busy, retrying...", {
              description: `Attempt ${attempt}/3. Waiting ${delay / 1000}s...`,
              duration: delay,
            });
          },
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(error.error || "Failed to rephrase");
      }

      const data: RephraseData = await response.json();
      setOptions(data.options);
      
      // Record usage
      if (onUsage) {
        onUsage();
      }
      
      toast.success("Rephrase options generated!");
    } catch (error) {
      console.error("Rephrase error:", error);
      const { title, description } = handleLLMError(error, "rephrase");
      toast.error(title, { description });
    } finally {
      setLoading(false);
    }
  };

  const handleReplace = (newText: string) => {
    onReplace(newText);
    toast.success("Text replaced!");
    onClose();
  };

  return (
    <div className="ai-modal-overlay" onClick={onClose}>
      <div className="ai-modal rephrase-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ai-modal-header">
          <h3>🔄 Rephrase Text</h3>
          <button onClick={onClose} className="close-btn">
            ×
          </button>
        </div>

        <div className="ai-modal-content">
          {/* Show selected text */}
          <div className="selected-text-preview">
            <h4>Selected Text:</h4>
            <p>&quot;{selectedText}&quot;</p>
          </div>

          {!options ? (
            <div className="rephrase-styles">
              <h4>Rephrase as:</h4>
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
              <div className="style-buttons">
                <button
                  onClick={() => rephrase("simple")}
                  disabled={loading || !isAvailable}
                  className={`rephrase-style-btn ${!isAvailable ? "disabled" : ""}`}
                >
                  {loading && activeStyle === "simple" ? (
                    <svg className="spinner" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                  ) : (
                    "📝"
                  )}
                  Simple (A2-B1)
                </button>
                <button
                  onClick={() => rephrase("academic")}
                  disabled={loading || !isAvailable}
                  className={`rephrase-style-btn ${!isAvailable ? "disabled" : ""}`}
                >
                  {loading && activeStyle === "academic" ? (
                    <svg className="spinner" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                  ) : (
                    "🎓"
                  )}
                  Academic (B2-C1)
                </button>
                <button
                  onClick={() => rephrase("formal")}
                  disabled={loading || !isAvailable}
                  className={`rephrase-style-btn ${!isAvailable ? "disabled" : ""}`}
                >
                  {loading && activeStyle === "formal" ? (
                    <svg className="spinner" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                  ) : (
                    "👔"
                  )}
                  Formal (C1+)
                </button>
              </div>
            </div>
          ) : (
            <div className="rephrase-options">
              <div className="options-header">
                <h4>Choose an option:</h4>
                <button
                  onClick={() => {
                    setOptions(null);
                    setActiveStyle(null);
                  }}
                  className="secondary-btn"
                >
                  ← Back
                </button>
              </div>
              {options.map((option, idx) => (
                <div key={idx} className="rephrase-option-card">
                  <p className="option-text">{option.text}</p>
                  <small className="option-notes">{option.notes}</small>
                  <button onClick={() => handleReplace(option.text)} className="primary-btn">
                    Replace
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


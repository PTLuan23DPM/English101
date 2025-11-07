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
  position: { top: number; left: number };
  onInsert: (text: string) => void;
  onClose: () => void;
}

export default function SentenceExpander({ selectedSentence, position, onInsert, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [expansions, setExpansions] = useState<Expansion[] | null>(null);
  const [activeMode, setActiveMode] = useState<"reason" | "example" | "contrast" | null>(null);

  const expand = async (mode: "reason" | "example" | "contrast") => {
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
      toast.success("Expansions generated!");
    } catch (error) {
      console.error("Expand error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to expand");
    } finally {
      setLoading(false);
    }
  };

  const handleInsert = (expansion: string) => {
    onInsert(" " + expansion);
    toast.success("Expansion inserted!");
    onClose();
  };

  return (
    <div
      className="expander-menu"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {!expansions ? (
        <div className="expander-modes">
          <div className="expander-header">
            <h4>Expand with:</h4>
            <button onClick={onClose} className="close-btn-sm">
              ×
            </button>
          </div>
          <button
            onClick={() => expand("reason")}
            disabled={loading}
            className="expander-mode-btn"
          >
            {loading && activeMode === "reason" ? (
              <svg className="spinner-sm" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
              </svg>
            ) : (
              "🔍"
            )}
            Reason/Why
          </button>
          <button
            onClick={() => expand("example")}
            disabled={loading}
            className="expander-mode-btn"
          >
            {loading && activeMode === "example" ? (
              <svg className="spinner-sm" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
              </svg>
            ) : (
              "📌"
            )}
            Example
          </button>
          <button
            onClick={() => expand("contrast")}
            disabled={loading}
            className="expander-mode-btn"
          >
            {loading && activeMode === "contrast" ? (
              <svg className="spinner-sm" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
              </svg>
            ) : (
              "⚖️"
            )}
            Contrast
          </button>
        </div>
      ) : (
        <div className="expansion-options">
          <div className="expander-header">
            <h4>Choose expansion:</h4>
            <button
              onClick={() => {
                setExpansions(null);
                setActiveMode(null);
              }}
              className="back-btn-sm"
            >
              ← Back
            </button>
          </div>
          {expansions.map((expansion, idx) => (
            <div key={idx} className="expansion-option">
              <p className="expansion-text">{expansion.text}</p>
              <small className="expansion-explanation">{expansion.explanation}</small>
              <button onClick={() => handleInsert(expansion.text)} className="insert-btn">
                Insert
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


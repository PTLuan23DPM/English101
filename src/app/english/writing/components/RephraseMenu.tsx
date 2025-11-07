"use client";

import { useState } from "react";
import { toast } from "sonner";

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
  position: { top: number; left: number };
  onReplace: (newText: string) => void;
  onClose: () => void;
}

export default function RephraseMenu({ selectedText, level, position, onReplace, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<RephraseOption[] | null>(null);
  const [activeStyle, setActiveStyle] = useState<"simple" | "academic" | "formal" | null>(null);

  const rephrase = async (style: "simple" | "academic" | "formal") => {
    setActiveStyle(style);
    setLoading(true);
    try {
      const response = await fetch("/api/writing/rephrase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: selectedText,
          style,
          targetLevel: level,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to rephrase");
      }

      const data: RephraseData = await response.json();
      setOptions(data.options);
      toast.success("Rephrase options generated!");
    } catch (error) {
      console.error("Rephrase error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to rephrase");
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
    <div
      className="rephrase-menu"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {!options ? (
        <div className="rephrase-styles">
          <div className="rephrase-header">
            <h4>Rephrase as:</h4>
            <button onClick={onClose} className="close-btn-sm">
              ×
            </button>
          </div>
          <button
            onClick={() => rephrase("simple")}
            disabled={loading}
            className="rephrase-style-btn"
          >
            {loading && activeStyle === "simple" ? (
              <svg className="spinner-sm" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
              </svg>
            ) : (
              "📝"
            )}
            Simple
          </button>
          <button
            onClick={() => rephrase("academic")}
            disabled={loading}
            className="rephrase-style-btn"
          >
            {loading && activeStyle === "academic" ? (
              <svg className="spinner-sm" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
              </svg>
            ) : (
              "🎓"
            )}
            Academic
          </button>
          <button
            onClick={() => rephrase("formal")}
            disabled={loading}
            className="rephrase-style-btn"
          >
            {loading && activeStyle === "formal" ? (
              <svg className="spinner-sm" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
              </svg>
            ) : (
              "👔"
            )}
            Formal
          </button>
        </div>
      ) : (
        <div className="rephrase-options">
          <div className="rephrase-header">
            <h4>Choose option:</h4>
            <button
              onClick={() => {
                setOptions(null);
                setActiveStyle(null);
              }}
              className="back-btn-sm"
            >
              ← Back
            </button>
          </div>
          {options.map((option, idx) => (
            <div key={idx} className="rephrase-option">
              <p className="option-text">{option.text}</p>
              <small className="option-notes">{option.notes}</small>
              <button onClick={() => handleReplace(option.text)} className="replace-btn">
                Replace
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


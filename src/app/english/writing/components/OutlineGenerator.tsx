"use client";

import { useState } from "react";
import { toast } from "sonner";
import { fetchWithRetry, handleLLMError } from "@/lib/utils/llm-retry";

interface OutlineSection {
  section: string;
  points: string[];
}

interface OutlineData {
  outline: OutlineSection[];
  thesisOptions: string[];
}

interface Props {
  level: string;
  type: string;
  topic: string;
  onInsert: (text: string) => void;
  isAvailable?: boolean;
  remaining?: number;
  onUsage?: () => void;
}

export default function OutlineGenerator({ level, type, topic, onInsert, isAvailable = true, remaining = 0, onUsage }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [outline, setOutline] = useState<OutlineData | null>(null);

  const generateOutline = async () => {
    if (!isAvailable) {
      toast.error("Usage limit reached", {
        description: "You have already used this feature. This feature can only be used once per task.",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetchWithRetry(
        "/api/writing/outline",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ level, type, topic }),
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
        throw new Error(error.error?.message || error.error || "Failed to generate outline");
      }

      const data: OutlineData = await response.json();
      setOutline(data);
      setIsOpen(true);
      
      // Record usage
      if (onUsage) {
        onUsage();
      }
      
      toast.success("Outline generated!");
    } catch (error) {
      console.error("Outline generation error:", error);
      const { title, description } = handleLLMError(error, "generate outline");
      toast.error(title, { description });
    } finally {
      setLoading(false);
    }
  };

  const insertOutline = () => {
    if (!outline) return;

    const text = outline.outline
      .map((section) => {
        return `${section.section}:\n${section.points.map((p) => `- ${p}`).join("\n")}\n`;
      })
      .join("\n");

    onInsert(text);
    toast.success("Outline inserted!");
    setIsOpen(false);
  };

  const insertThesis = (thesis: string) => {
    onInsert(thesis + "\n\n");
    toast.success("Thesis inserted!");
  };

  return (
    <>
      <button
        onClick={generateOutline}
        disabled={loading || !isAvailable}
        className={`ai-feature-btn outline-btn ${!isAvailable ? "disabled" : ""}`}
        title={!isAvailable ? "Usage limit reached (1 use per task)" : "Generate essay outline"}
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
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Generate Outline
            {!isAvailable && <span className="usage-badge">Used</span>}
          </>
        )}
      </button>

      {isOpen && outline && (
        <div className="ai-modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="ai-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ai-modal-header">
              <h3>📝 Essay Outline</h3>
              <button onClick={() => setIsOpen(false)} className="close-btn">
                ×
              </button>
            </div>

            <div className="ai-modal-content">
              {/* Thesis Options */}
              <div className="thesis-options">
                <h4>Thesis Statement Options:</h4>
                {outline.thesisOptions.map((thesis, idx) => (
                  <div key={idx} className="thesis-option">
                    <p>{thesis}</p>
                    <button onClick={() => insertThesis(thesis)} className="insert-btn-sm">
                      Insert
                    </button>
                  </div>
                ))}
              </div>

              {/* Outline Sections */}
              <div className="outline-sections">
                {outline.outline.map((section, idx) => (
                  <div key={idx} className="outline-section">
                    <h4>{section.section}</h4>
                    <ul>
                      {section.points.map((point, pidx) => (
                        <li key={pidx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className="ai-modal-footer">
              <button onClick={insertOutline} className="primary-btn">
                Insert Full Outline
              </button>
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


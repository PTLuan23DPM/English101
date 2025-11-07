"use client";

import { useState } from "react";
import { toast } from "sonner";

interface Idea {
  point: string;
  explanation: string;
}

interface Example {
  idea: string;
  example: string;
}

interface BrainstormData {
  ideas: Idea[];
  examples: Example[];
  counterpoints: string[];
}

interface Props {
  level: string;
  type: string;
  topic: string;
  onInsert: (text: string) => void;
}

export default function BrainstormPanel({ level, type, topic, onInsert }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BrainstormData | null>(null);

  const brainstorm = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/writing/brainstorm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, type, topic }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to brainstorm");
      }

      const result: BrainstormData = await response.json();
      setData(result);
      setIsOpen(true);
      toast.success("Ideas generated!");
    } catch (error) {
      console.error("Brainstorm error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to brainstorm");
    } finally {
      setLoading(false);
    }
  };

  const insertIdea = (idea: Idea) => {
    onInsert(`${idea.point}\n${idea.explanation}\n\n`);
    toast.success("Idea inserted!");
  };

  const insertExample = (example: Example) => {
    onInsert(`Example: ${example.example}\n\n`);
    toast.success("Example inserted!");
  };

  return (
    <>
      <button
        onClick={brainstorm}
        disabled={loading}
        className="ai-feature-btn brainstorm-btn"
        title="Brainstorm ideas"
      >
        {loading ? (
          <>
            <svg className="spinner" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
            </svg>
            Brainstorming...
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Brainstorm
          </>
        )}
      </button>

      {isOpen && data && (
        <div className="ai-panel brainstorm-panel">
          <div className="ai-panel-header">
            <h3>💡 Brainstorm Ideas</h3>
            <button onClick={() => setIsOpen(false)} className="close-btn">
              ×
            </button>
          </div>

          <div className="ai-panel-content">
            {/* Ideas */}
            <section className="brainstorm-section">
              <h4>Main Ideas</h4>
              {data.ideas.map((idea, idx) => (
                <div key={idx} className="idea-card">
                  <div className="idea-header">
                    <strong>{idea.point}</strong>
                    <button onClick={() => insertIdea(idea)} className="insert-btn-sm">
                      +
                    </button>
                  </div>
                  <p>{idea.explanation}</p>
                </div>
              ))}
            </section>

            {/* Examples */}
            <section className="brainstorm-section">
              <h4>Examples</h4>
              {data.examples.map((example, idx) => (
                <div key={idx} className="example-card">
                  <div className="example-header">
                    <small>For: {example.idea}</small>
                    <button onClick={() => insertExample(example)} className="insert-btn-sm">
                      +
                    </button>
                  </div>
                  <p>{example.example}</p>
                </div>
              ))}
            </section>

            {/* Counterpoints */}
            {data.counterpoints.length > 0 && (
              <section className="brainstorm-section">
                <h4>Counterpoints</h4>
                {data.counterpoints.map((point, idx) => (
                  <div key={idx} className="counterpoint-card">
                    <p>{point}</p>
                    <button
                      onClick={() => {
                        onInsert(`Counterpoint: ${point}\n\n`);
                        toast.success("Counterpoint inserted!");
                      }}
                      className="insert-btn-sm"
                    >
                      +
                    </button>
                  </div>
                ))}
              </section>
            )}
          </div>
        </div>
      )}
    </>
  );
}


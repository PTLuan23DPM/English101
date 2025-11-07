"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

interface LanguagePack {
  phrases: string[];
  discourseMarkers: {
    contrast: string[];
    addition: string[];
    cause: string[];
    example: string[];
  };
  collocations: string[];
  sentenceStarters: string[];
}

interface Props {
  level: string;
  type: string;
  onInsert: (text: string) => void;
}

export default function LanguagePackPanel({ level, type, onInsert }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<LanguagePack | null>(null);
  const [activeTab, setActiveTab] = useState<"phrases" | "markers" | "collocations" | "starters">(
    "phrases"
  );

  const loadLanguagePack = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/writing/language-pack?level=${encodeURIComponent(level)}&type=${encodeURIComponent(type)}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to load language pack");
      }

      const result: LanguagePack = await response.json();
      setData(result);
      toast.success("Language pack loaded!");
    } catch (error) {
      console.error("Language pack error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to load language pack");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !data) {
      loadLanguagePack();
    }
  }, [isOpen]);

  const insertItem = (item: string) => {
    onInsert(item + " ");
    toast.success("Inserted!");
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="ai-feature-btn language-btn"
        title="Language resources"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
        </svg>
        Language Pack
      </button>

      {isOpen && (
        <div className="ai-panel language-panel">
          <div className="ai-panel-header">
            <h3>📚 Language Resources</h3>
            <button onClick={() => setIsOpen(false)} className="close-btn">
              ×
            </button>
          </div>

          {loading ? (
            <div className="loading-state">
              <svg className="spinner" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
              </svg>
              <p>Loading language pack...</p>
            </div>
          ) : data ? (
            <>
              <div className="language-tabs">
                <button
                  className={activeTab === "phrases" ? "active" : ""}
                  onClick={() => setActiveTab("phrases")}
                >
                  Phrases
                </button>
                <button
                  className={activeTab === "markers" ? "active" : ""}
                  onClick={() => setActiveTab("markers")}
                >
                  Discourse Markers
                </button>
                <button
                  className={activeTab === "collocations" ? "active" : ""}
                  onClick={() => setActiveTab("collocations")}
                >
                  Collocations
                </button>
                <button
                  className={activeTab === "starters" ? "active" : ""}
                  onClick={() => setActiveTab("starters")}
                >
                  Sentence Starters
                </button>
              </div>

              <div className="language-content">
                {activeTab === "phrases" && (
                  <div className="language-items">
                    {data.phrases.map((phrase, idx) => (
                      <div key={idx} className="language-item">
                        <span>{phrase}</span>
                        <button onClick={() => insertItem(phrase)} className="insert-btn-sm">
                          +
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "markers" && (
                  <div className="markers-grid">
                    {Object.entries(data.discourseMarkers).map(([category, markers]) => (
                      <div key={category} className="marker-category">
                        <h5>{category.charAt(0).toUpperCase() + category.slice(1)}</h5>
                        {markers.map((marker, idx) => (
                          <div key={idx} className="language-item">
                            <span>{marker}</span>
                            <button onClick={() => insertItem(marker)} className="insert-btn-sm">
                              +
                            </button>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "collocations" && (
                  <div className="language-items">
                    {data.collocations.map((collocation, idx) => (
                      <div key={idx} className="language-item">
                        <span>{collocation}</span>
                        <button onClick={() => insertItem(collocation)} className="insert-btn-sm">
                          +
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "starters" && (
                  <div className="language-items">
                    {data.sentenceStarters.map((starter, idx) => (
                      <div key={idx} className="language-item">
                        <span>{starter}</span>
                        <button onClick={() => insertItem(starter)} className="insert-btn-sm">
                          +
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}
    </>
  );
}


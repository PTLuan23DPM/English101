"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  addVocabularyEntry,
  getSavedVocabulary,
  removeVocabularyEntry,
  SavedVocabEntry,
  saveVocabulary,
  VOCAB_UPDATED_EVENT,
} from "@/lib/vocabularyStorage";

interface DictionaryPhonetic {
  text: string;
  audio?: string;
}

interface DictionaryDefinition {
  definition: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
}

interface DictionaryMeaning {
  partOfSpeech: string;
  definitions: DictionaryDefinition[];
}

interface DictionaryResult {
  word: string;
  phonetic?: string;
  phonetics: DictionaryPhonetic[];
  meanings: DictionaryMeaning[];
  origin?: string;
}

export default function VocabularyPage() {
  const [savedVocab, setSavedVocab] = useState<SavedVocabEntry[]>([]);
  const [collectionSearch, setCollectionSearch] = useState("");
  const [memoryIndex, setMemoryIndex] = useState(0);
  const [showMemoryMeaning, setShowMemoryMeaning] = useState(false);
  const [audioLoadingId, setAudioLoadingId] = useState<string | null>(null);

  // Dictionary search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [dictionaryResult, setDictionaryResult] = useState<DictionaryResult | null>(null);
  const [searchError, setSearchError] = useState<string>("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load saved vocabulary + subscribe to cross-page updates
  useEffect(() => {
    if (typeof window === "undefined") return;
    setSavedVocab(getSavedVocabulary());

    const handleExternalUpdate = (event: Event) => {
      const detail = (event as CustomEvent<SavedVocabEntry[]>).detail;
      if (Array.isArray(detail)) {
        setSavedVocab(detail);
      } else {
        setSavedVocab(getSavedVocabulary());
      }
    };

    window.addEventListener(VOCAB_UPDATED_EVENT, handleExternalUpdate);
    return () => {
      window.removeEventListener(VOCAB_UPDATED_EVENT, handleExternalUpdate);
    };
  }, []);

  const syncLocalVocabulary = useCallback(
    (updater: SavedVocabEntry[] | ((prev: SavedVocabEntry[]) => SavedVocabEntry[])) => {
      setSavedVocab((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        saveVocabulary(next);
        return next;
      });
    },
    []
  );

  const stats = useMemo(() => {
    const total = savedVocab.length;
    const recent = savedVocab.filter((entry) => {
      const diff = Date.now() - new Date(entry.createdAt).getTime();
      return diff < 7 * 24 * 60 * 60 * 1000; // 7 days
    }).length;
    const uniqueParts = new Set(savedVocab.map((entry) => entry.partOfSpeech).filter(Boolean));
    return { total, recent, uniqueParts: uniqueParts.size };
  }, [savedVocab]);

  const filteredSaved = useMemo(() => {
    if (!collectionSearch.trim()) return savedVocab;
    const term = collectionSearch.toLowerCase();
    return savedVocab.filter(
      (entry) =>
        entry.word.toLowerCase().includes(term) ||
        entry.meaning.toLowerCase().includes(term) ||
        (entry.example && entry.example.toLowerCase().includes(term))
    );
  }, [collectionSearch, savedVocab]);

  useEffect(() => {
    if (filteredSaved.length === 0) {
      setMemoryIndex(0);
      setShowMemoryMeaning(false);
    } else if (memoryIndex >= filteredSaved.length) {
      setMemoryIndex(0);
      setShowMemoryMeaning(false);
    }
  }, [filteredSaved.length, memoryIndex]);

  const activeMemoryCard =
    filteredSaved.length > 0 ? filteredSaved[memoryIndex % filteredSaved.length] : null;

  const handleAddToVocab = () => {
    if (!dictionaryResult) {
      toast.error("Search for a word first.");
      return;
    }

    const coreMeaning = dictionaryResult.meanings[0];
    const coreDefinition = coreMeaning?.definitions[0];

    if (!coreMeaning || !coreDefinition) {
      toast.error("No definition available to save.");
      return;
    }

    const audioUrl = dictionaryResult.phonetics.find((p) => p.audio)?.audio;
    const result = addVocabularyEntry({
      word: dictionaryResult.word,
      phonetic: dictionaryResult.phonetic,
      audioUrl,
      partOfSpeech: coreMeaning.partOfSpeech,
      meaning: coreDefinition.definition,
      example: coreDefinition.example,
    });

    if (!result.added) {
      if (result.reason === "duplicate") {
        toast.info("This word is already in your list.");
      } else if (result.reason === "invalid") {
        toast.error("Missing information to save this word.");
      } else {
        toast.error("Unable to save this word right now.");
      }
      return;
    }

    if (result.entries) {
      setSavedVocab(result.entries);
    }

    toast.success(`Added "${dictionaryResult.word}" to your list.`);
  };

  const handleRemoveWord = (id: string) => {
    const result = removeVocabularyEntry(id);
    if (result.removed && result.entries) {
      setSavedVocab(result.entries);
      toast.success("Removed from your vocabulary list.");
    }
  };

  const handleCopyWord = (entry: SavedVocabEntry) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard
        .writeText(`${entry.word}: ${entry.meaning}${entry.example ? ` (${entry.example})` : ""}`)
        .then(() => toast.success("Copied to clipboard"))
        .catch(() => toast.error("Unable to copy"));
    }
  };

  const fetchWordAudio = async (word: string) => {
    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
      if (!response.ok) return null;
      const data: DictionaryResult[] = await response.json();
      const audio = data?.[0]?.phonetics?.find((p) => p.audio)?.audio;
      return audio || null;
    } catch (error) {
      console.error("Audio fetch error:", error);
      return null;
    }
  };

  const handleMemoryPronounce = async (
    entry: SavedVocabEntry,
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.stopPropagation();
    if (entry.audioUrl) {
      playPronunciation(entry.audioUrl);
      return;
    }

    setAudioLoadingId(entry.id);
    const audio = await fetchWordAudio(entry.word);
    setAudioLoadingId(null);

    if (!audio) {
      toast.error("Pronunciation not available for this word.");
      return;
    }

    syncLocalVocabulary((prev) =>
      prev.map((item) => (item.id === entry.id ? { ...item, audioUrl: audio } : item))
    );
    playPronunciation(audio);
  };

  // Dictionary API functions
  const searchWord = async (word: string) => {
    if (!word.trim()) {
      toast.error("Please enter a word to search");
      return;
    }

    setSearching(true);
    setSearchError("");
    setDictionaryResult(null);

    try {
      const response = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${word.trim()}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          setSearchError(`No definition found for "${word}". Try another word.`);
        } else {
          setSearchError("Failed to fetch definition. Please try again.");
        }
        return;
      }

      const data: DictionaryResult[] = await response.json();
      if (data && data.length > 0) {
        setDictionaryResult(data[0]);
        toast.success(`Found definition for "${data[0].word}"`);
      }
    } catch (error) {
      console.error("Dictionary API error:", error);
      setSearchError("An error occurred. Please check your internet connection.");
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchWord(searchQuery);
  };

  const playPronunciation = (audioUrl: string) => {
    if (audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.play();
    }
  };

  return (
    <div className="dashboard-content">
      {/* Page Header */}
      <section className="card page-head">
        <div>
          <h1>Vocabulary & Lexical</h1>
          <p className="muted">
            Expand your vocabulary from basic to advanced levels
          </p>
        </div>

        <div className="head-actions">
          <div className="stats" style={{ gap: "16px" }}>
            <div className="stat">
              <span className="stat-val">{stats.total}</span>
              <span className="stat-lbl">Saved words</span>
            </div>
            <div className="stat">
              <span className="stat-val">{stats.recent}</span>
              <span className="stat-lbl">This week</span>
            </div>
            <div className="stat">
              <span className="stat-val">{stats.uniqueParts}</span>
              <span className="stat-lbl">Parts of speech</span>
            </div>
          </div>
        </div>
      </section>

      {/* Dictionary Search */}
      <section className="card vocab-dictionary-card">
        <div className="vocab-dictionary-header">
          <div className="vocab-dictionary-title-section">
            <div className="vocab-dictionary-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <h3 className="vocab-dictionary-title">Dictionary Search</h3>
              <p className="vocab-dictionary-subtitle">Look up any English word instantly</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSearch} className="vocab-dictionary-search-form">
          <div className="vocab-dictionary-search-wrapper">
            <svg className="vocab-dictionary-search-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M13 13L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              className="vocab-dictionary-search-input"
              placeholder="Type a word to search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={searching}
            />
            {searchQuery && (
              <button
                type="button"
                className="vocab-dictionary-clear-btn"
                onClick={() => {
                  setSearchQuery("");
                  setDictionaryResult(null);
                  setSearchError("");
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            )}
            <button
              type="submit"
              className="vocab-dictionary-search-btn"
              disabled={searching || !searchQuery.trim()}
            >
              {searching ? (
                <>
                  <svg className="vocab-spinner-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="24" strokeDashoffset="12" strokeLinecap="round"/>
                  </svg>
                  Searching...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Search
                </>
              )}
            </button>
          </div>
        </form>

        {/* Search Error */}
        {searchError && (
          <div className="vocab-dictionary-error">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10 6V10M10 14H10.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span>{searchError}</span>
          </div>
        )}

        {/* Dictionary Results */}
        {dictionaryResult && (
          <div className="vocab-dictionary-result">
            <div className="vocab-dictionary-result-header">
              <div>
                <h4 className="vocab-dictionary-word">{dictionaryResult.word}</h4>
                {dictionaryResult.phonetic && (
                  <div className="vocab-dictionary-phonetic">{dictionaryResult.phonetic}</div>
                )}
              </div>
              {dictionaryResult.phonetics.find((p) => p.audio) && (
                <button
                  className="vocab-dictionary-audio-btn"
                  onClick={() => {
                    const audioUrl = dictionaryResult.phonetics.find((p) => p.audio)?.audio;
                    if (audioUrl) {
                      playPronunciation(audioUrl);
                    }
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 2V10L13 12M10 18C5 18 1 14 1 9C1 4 5 0 10 0C15 0 19 4 19 9C19 14 15 18 10 18Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>

            {dictionaryResult.origin && (
              <div className="vocab-dictionary-origin">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 0L10 6L16 8L10 10L8 16L6 10L0 8L6 6L8 0Z" fill="currentColor"/>
                </svg>
                <div>
                  <strong>Origin:</strong> {dictionaryResult.origin}
                </div>
              </div>
            )}

            {/* Meanings */}
            <div className="vocab-dictionary-meanings">
              {dictionaryResult.meanings.slice(0, 3).map((meaning, idx) => (
                <div key={idx} className="vocab-dictionary-meaning">
                  <div className="vocab-dictionary-part-of-speech">{meaning.partOfSpeech}</div>
                  {meaning.definitions.slice(0, 2).map((def, defIdx) => (
                    <div key={defIdx} className="vocab-dictionary-definition">
                      <div className="vocab-dictionary-definition-text">
                        <span className="vocab-def-number">{defIdx + 1}.</span>
                        {def.definition}
                      </div>
                      {def.example && (
                        <div className="vocab-dictionary-example">
                          <span className="vocab-example-label">Example:</span>
                          &quot;{def.example}&quot;
                        </div>
                      )}
                      {def.synonyms && def.synonyms.length > 0 && (
                        <div className="vocab-dictionary-synonyms">
                          <strong>Synonyms:</strong> {def.synonyms.slice(0, 5).join(", ")}
                        </div>
                      )}
                      {def.antonyms && def.antonyms.length > 0 && (
                        <div className="vocab-dictionary-antonyms">
                          <strong>Antonyms:</strong> {def.antonyms.slice(0, 5).join(", ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <button className="vocab-dictionary-add-btn" onClick={handleAddToVocab}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2V14M2 8H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span>Add to My Vocabulary</span>
            </button>
          </div>
        )}

        {/* Hidden audio element for pronunciation */}
        <audio ref={audioRef} style={{ display: "none" }} />
      </section>

      {/* Saved Vocabulary Collection */}
      <section className="card" style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          <div>
            <h2 style={{ marginBottom: "0.25rem" }}>My Vocabulary List</h2>
            <p className="muted" style={{ margin: 0 }}>
              Words you decided to keep during your study sessions.
            </p>
          </div>
          <div style={{ display: "flex", gap: "1rem" }}>
            <div>
              <div className="stat-val">{stats.total}</div>
              <div className="stat-lbl">Total words</div>
            </div>
            <div>
              <div className="stat-val">{stats.recent}</div>
              <div className="stat-lbl">Added this week</div>
            </div>
            <div>
              <div className="stat-val">{stats.uniqueParts}</div>
              <div className="stat-lbl">Parts of speech</div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <input
            className="input"
            placeholder="Search in your list..."
            value={collectionSearch}
            onChange={(e) => setCollectionSearch(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>

        {filteredSaved.length === 0 ? (
          <div className="empty-state" style={{ margin: 0 }}>
            <p>
              {collectionSearch
                ? "No words match your search."
                : "You haven't saved any vocabulary yet. Look up a word above and add it here!"}
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
              gap: "1rem",
            }}
          >
            {filteredSaved.map((entry) => (
              <div
                key={entry.id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "1rem",
                  padding: "1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  backgroundColor: "#fff",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "baseline" }}>
                  <div>
                    <h3 style={{ margin: 0 }}>{entry.word}</h3>
                    {entry.phonetic && (
                      <div style={{ fontSize: "0.85rem", color: "#64748b" }}>{entry.phonetic}</div>
                    )}
                  </div>
                  {entry.partOfSpeech && (
                    <span
                      style={{
                        borderRadius: "999px",
                        padding: "0.2rem 0.8rem",
                        backgroundColor: "#e0f2fe",
                        color: "#0369a1",
                        fontSize: "0.8rem",
                        textTransform: "capitalize",
                      }}
                    >
                      {entry.partOfSpeech}
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, color: "#0f172a", lineHeight: 1.5 }}>{entry.meaning}</p>
                {entry.example && (
                  <p style={{ margin: 0, fontStyle: "italic", color: "#475569" }}>
                    “{entry.example}”
                  </p>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem", color: "#94a3b8" }}>
                  <span>
                    Added {new Date(entry.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className="btn ghost" style={{ padding: "0.35rem 0.75rem" }} onClick={() => handleCopyWord(entry)}>
                      Copy
                    </button>
                    <button className="btn ghost" style={{ padding: "0.35rem 0.75rem", color: "#b91c1c" }} onClick={() => handleRemoveWord(entry.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Memory Cards */}
      <section className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
            marginBottom: "1rem",
          }}
        >
          <div>
            <h2 style={{ marginBottom: "0.25rem" }}>Memory Cards</h2>
            <p className="muted" style={{ margin: 0 }}>
              {filteredSaved.length > 0
                ? `Card ${memoryIndex + 1}/${filteredSaved.length}`
                : "Tap a saved word to revise it later."}
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className="btn ghost"
              disabled={filteredSaved.length === 0}
              onClick={() => {
                if (filteredSaved.length === 0) return;
                setMemoryIndex((idx) => (idx - 1 + filteredSaved.length) % filteredSaved.length);
                setShowMemoryMeaning(false);
              }}
            >
              Prev
            </button>
            <button
              className="btn ghost"
              disabled={filteredSaved.length === 0}
              onClick={() => {
                if (filteredSaved.length === 0) return;
                setMemoryIndex((idx) => (idx + 1) % filteredSaved.length);
                setShowMemoryMeaning(false);
              }}
            >
              Next
            </button>
            <button
              className="btn primary"
              disabled={filteredSaved.length === 0}
              onClick={() => {
                if (filteredSaved.length === 0) return;
                const randomIndex = Math.floor(Math.random() * filteredSaved.length);
                setMemoryIndex(randomIndex);
                setShowMemoryMeaning(false);
              }}
            >
              Shuffle
            </button>
          </div>
        </div>

        {activeMemoryCard ? (
          <div
            onClick={() => setShowMemoryMeaning((prev) => !prev)}
            style={{
              minHeight: "240px",
              borderRadius: "1.25rem",
              border: "1px solid #c7d2fe",
              background: showMemoryMeaning
                ? "linear-gradient(135deg,#eef2ff,#e0e7ff)"
                : "linear-gradient(135deg,#dbeafe,#bfdbfe)",
              padding: "2rem",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 25px 60px rgba(59,130,246,0.25)",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "1rem",
                right: "1.5rem",
                fontSize: "0.75rem",
                color: "#1d4ed8",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              {showMemoryMeaning ? "Meaning" : "Word"}
            </div>
            {showMemoryMeaning ? (
              <div style={{ textAlign: "center", marginTop: "1rem" }}>
                <p style={{ fontSize: "1.25rem", margin: 0, color: "#1f2937", lineHeight: 1.6 }}>
                  {activeMemoryCard.meaning}
                </p>
                {activeMemoryCard.example && (
                  <p style={{ marginTop: "0.75rem", fontStyle: "italic", color: "#475569" }}>
                    “{activeMemoryCard.example}”
                  </p>
                )}
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  minHeight: "160px",
                  textAlign: "center",
                }}
              >
                <h2 style={{ margin: 0, fontSize: "2.25rem" }}>{activeMemoryCard.word}</h2>
                {activeMemoryCard.phonetic && (
                  <div style={{ color: "#1d4ed8", fontSize: "1rem" }}>{activeMemoryCard.phonetic}</div>
                )}
                <button
                  className="btn ghost"
                  style={{
                    padding: "0.4rem 0.9rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                  }}
                  onClick={(e) => handleMemoryPronounce(activeMemoryCard, e)}
                  disabled={audioLoadingId === activeMemoryCard.id}
                >
                  {audioLoadingId === activeMemoryCard.id ? (
                    <>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        className="vocab-spinner-icon"
                      >
                        <circle
                          cx="8"
                          cy="8"
                          r="6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeDasharray="24"
                          strokeDashoffset="12"
                          strokeLinecap="round"
                        />
                      </svg>
                      Loading
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M6 5L9 8L6 11V5Z" fill="currentColor" />
                        <path
                          d="M9 4.5C10.5 5.5 11.5 6.5 11.5 8C11.5 9.5 10.5 10.5 9 11.5"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinecap="round"
                        />
                      </svg>
                      Play audio
                    </>
                  )}
                </button>
              </div>
            )}
            <small style={{ display: "block", textAlign: "center", marginTop: "1.5rem", color: "#475569" }}>
              Tap card to {showMemoryMeaning ? "see the word" : "reveal the meaning"}
            </small>
          </div>
        ) : (
          <div className="empty-state" style={{ margin: 0 }}>
            <p>Save at least one word to start memory review.</p>
          </div>
        )}
      </section>
    </div>
  );
}


"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";

type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
type VocabCategory = "general" | "business" | "academic" | "travel" | "technology" | "idioms";

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

interface VocabTopic {
  id: string;
  title: string;
  category: VocabCategory;
  level: CEFRLevel;
  description: string;
  words: number;
  exercises: number;
  completed: boolean;
}

const VOCAB_TOPICS: VocabTopic[] = [
  {
    id: "1",
    title: "Daily Routines & Activities",
    category: "general",
    level: "A1",
    description: "Common verbs and expressions for everyday activities",
    words: 45,
    exercises: 8,
    completed: true,
  },
  {
    id: "2",
    title: "Food & Cooking",
    category: "general",
    level: "A2",
    description: "Vocabulary for ingredients, dishes, and cooking methods",
    words: 60,
    exercises: 10,
    completed: false,
  },
  {
    id: "3",
    title: "Travel & Tourism",
    category: "travel",
    level: "B1",
    description: "Essential vocabulary for traveling abroad",
    words: 80,
    exercises: 12,
    completed: false,
  },
  {
    id: "4",
    title: "Business Communication",
    category: "business",
    level: "B2",
    description: "Professional vocabulary for workplace situations",
    words: 100,
    exercises: 15,
    completed: false,
  },
  {
    id: "5",
    title: "Academic Writing",
    category: "academic",
    level: "C1",
    description: "Advanced vocabulary for essays and research",
    words: 120,
    exercises: 18,
    completed: false,
  },
  {
    id: "6",
    title: "Technology & Innovation",
    category: "technology",
    level: "B2",
    description: "Modern tech-related vocabulary",
    words: 90,
    exercises: 14,
    completed: false,
  },
  {
    id: "7",
    title: "Common Idioms & Expressions",
    category: "idioms",
    level: "B1",
    description: "Frequently used idiomatic expressions",
    words: 50,
    exercises: 10,
    completed: false,
  },
  {
    id: "8",
    title: "Phrasal Verbs - Part 1",
    category: "general",
    level: "B1",
    description: "Essential phrasal verbs for everyday use",
    words: 40,
    exercises: 12,
    completed: false,
  },
  {
    id: "9",
    title: "Collocations - Verbs",
    category: "academic",
    level: "B2",
    description: "Common verb collocations for fluent speech",
    words: 70,
    exercises: 15,
    completed: false,
  },
  {
    id: "10",
    title: "Word Families & Derivations",
    category: "academic",
    level: "C1",
    description: "Understanding word formation and relationships",
    words: 85,
    exercises: 16,
    completed: false,
  },
];

export default function VocabularyPage() {
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel | "all">("all");
  const [selectedCategory, setSelectedCategory] = useState<VocabCategory | "all">("all");
  
  // Dictionary search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [dictionaryResult, setDictionaryResult] = useState<DictionaryResult | null>(null);
  const [searchError, setSearchError] = useState<string>("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const filteredTopics = VOCAB_TOPICS.filter((topic) => {
    if (selectedLevel !== "all" && topic.level !== selectedLevel) return false;
    if (selectedCategory !== "all" && topic.category !== selectedCategory) return false;
    return true;
  });

  const stats = {
    total: VOCAB_TOPICS.length,
    completed: VOCAB_TOPICS.filter((t) => t.completed).length,
    totalWords: VOCAB_TOPICS.reduce((sum, t) => sum + t.words, 0),
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
              <span className="stat-val">{stats.completed}</span>
              <span className="stat-lbl">Completed</span>
            </div>
            <div className="stat">
              <span className="stat-val">{stats.totalWords}</span>
              <span className="stat-lbl">Total Words</span>
            </div>
            <div className="stat">
              <span className="stat-val">{stats.total}</span>
              <span className="stat-lbl">Topics</span>
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
                          "{def.example}"
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

            <button
              className="vocab-dictionary-add-btn"
              onClick={() => toast.success("Word saved to your vocabulary list!")}
            >
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

      {/* Filters */}
      <section className="card">
        <h3 className="section-title" style={{ marginBottom: "16px" }}>
          🎯 Filter Topics
        </h3>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: "1", minWidth: "200px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
              Level
            </label>
            <select
              className="select"
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value as CEFRLevel | "all")}
              style={{ width: "100%" }}
            >
              <option value="all">All Levels</option>
              <option value="A1">A1 - Beginner</option>
              <option value="A2">A2 - Elementary</option>
              <option value="B1">B1 - Intermediate</option>
              <option value="B2">B2 - Upper Intermediate</option>
              <option value="C1">C1 - Advanced</option>
              <option value="C2">C2 - Proficient</option>
            </select>
          </div>

          <div style={{ flex: "1", minWidth: "200px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
              Category
            </label>
            <select
              className="select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as VocabCategory | "all")}
              style={{ width: "100%" }}
            >
              <option value="all">All Categories</option>
              <option value="general">General</option>
              <option value="business">Business</option>
              <option value="academic">Academic</option>
              <option value="travel">Travel</option>
              <option value="technology">Technology</option>
              <option value="idioms">Idioms & Phrases</option>
            </select>
          </div>
        </div>
      </section>

      {/* Vocabulary Topics Grid */}
      <div className="module-grid">
        {filteredTopics.map((topic) => (
          <Link
            href={`/english/vocabulary/${topic.id}`}
            key={topic.id}
            className="module-card"
            style={{ textDecoration: "none" }}
          >
            <div className="module-card-header">
              <div className="module-meta">
                <span className={`level-badge level-${topic.level.toLowerCase()}`}>
                  {topic.level}
                </span>
                <span className="category-badge">{topic.category}</span>
              </div>
              {topic.completed && (
                <span className="completion-badge">✓ Completed</span>
              )}
            </div>

            <h3 className="module-title">{topic.title}</h3>
            <p className="module-description">{topic.description}</p>

            <div className="module-stats">
              <div className="module-stat">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4H14V12H2V4Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  <path d="M5 7H11M5 9H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span>{topic.words} words</span>
              </div>
              <div className="module-stat">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  <path d="M6 8L7.5 9.5L10 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>{topic.exercises} exercises</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filteredTopics.length === 0 && (
        <div className="empty-state">
          <p>No vocabulary topics found for the selected filters.</p>
          <button
            className="btn primary"
            onClick={() => {
              setSelectedLevel("all");
              setSelectedCategory("all");
            }}
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}


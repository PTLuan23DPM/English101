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
      <section className="card">
        <h3 className="section-title" style={{ marginBottom: "16px" }}>
          📖 Dictionary Search
        </h3>
        <p className="muted" style={{ marginBottom: "16px", fontSize: "14px" }}>
          Look up any English word to see its definition, pronunciation, and examples
        </p>
        
        <form onSubmit={handleSearch} style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", gap: "12px" }}>
            <input
              type="text"
              className="input"
              placeholder="Enter a word to search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1 }}
              disabled={searching}
            />
            <button
              type="submit"
              className="btn primary"
              disabled={searching}
            >
              {searching ? "Searching..." : "🔍 Search"}
            </button>
          </div>
        </form>

        {/* Search Error */}
        {searchError && (
          <div style={{ padding: "16px", background: "#fee2e2", borderRadius: "8px", color: "#991b1b", marginBottom: "20px" }}>
            {searchError}
          </div>
        )}

        {/* Dictionary Results */}
        {dictionaryResult && (
          <div className="dictionary-result">
            <div className="dictionary-header">
              <div>
                <h2 style={{ fontSize: "32px", fontWeight: "700", marginBottom: "8px", textTransform: "capitalize" }}>
                  {dictionaryResult.word}
                </h2>
                {dictionaryResult.phonetic && (
                  <div style={{ fontSize: "18px", color: "#6b7280", marginBottom: "12px" }}>
                    {dictionaryResult.phonetic}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {dictionaryResult.phonetics
                  .filter((p) => p.audio)
                  .map((phonetic, idx) => (
                    <button
                      key={idx}
                      className="btn outline"
                      onClick={() => playPronunciation(phonetic.audio!)}
                    >
                      🔊 {phonetic.text || "Play"}
                    </button>
                  ))}
              </div>
            </div>

            {dictionaryResult.origin && (
              <div style={{ padding: "12px", background: "#f9fafb", borderRadius: "8px", marginBottom: "20px" }}>
                <strong>Origin:</strong> {dictionaryResult.origin}
              </div>
            )}

            {/* Meanings */}
            {dictionaryResult.meanings.map((meaning, idx) => (
              <div key={idx} className="meaning-section">
                <h4 style={{ fontSize: "18px", fontWeight: "600", color: "#6366f1", marginBottom: "12px" }}>
                  {meaning.partOfSpeech}
                </h4>
                
                {meaning.definitions.slice(0, 3).map((def, defIdx) => (
                  <div key={defIdx} style={{ marginBottom: "16px", paddingLeft: "16px", borderLeft: "3px solid #e5e7eb" }}>
                    <p style={{ fontSize: "15px", marginBottom: "8px" }}>
                      <strong>{defIdx + 1}.</strong> {def.definition}
                    </p>
                    {def.example && (
                      <p style={{ fontSize: "14px", fontStyle: "italic", color: "#6b7280", marginBottom: "8px" }}>
                        Example: "{def.example}"
                      </p>
                    )}
                    {def.synonyms && def.synonyms.length > 0 && (
                      <div style={{ fontSize: "13px", marginTop: "8px" }}>
                        <strong>Synonyms:</strong> {def.synonyms.slice(0, 5).join(", ")}
                      </div>
                    )}
                    {def.antonyms && def.antonyms.length > 0 && (
                      <div style={{ fontSize: "13px", marginTop: "4px" }}>
                        <strong>Antonyms:</strong> {def.antonyms.slice(0, 5).join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}

            <button
              className="btn outline w-full"
              style={{ marginTop: "16px" }}
              onClick={() => toast.success("Word saved to your vocabulary list!")}
            >
              + Add to My Vocabulary
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


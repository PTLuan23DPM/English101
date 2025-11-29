"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  addVocabularyEntry,
} from "@/lib/vocabularyStorage";

interface LookupDefinition {
  word: string;
  phonetic?: string;
  partOfSpeech?: string;
  meaning?: string;
  example?: string;
  audioUrl?: string;
}

interface DictionaryEntry {
  word: string;
  phonetic?: string;
  phonetics?: { text?: string; audio?: string }[];
  meanings?: {
    partOfSpeech?: string;
    definitions?: { definition: string; example?: string }[];
  }[];
}

const isEditableElement = (target: EventTarget | null) => {
  if (!(target instanceof Node)) return false;
  const element = target instanceof Element ? target : target.parentElement;
  if (!element) return false;
  if (element.closest("input, textarea")) return true;
  const contentEditableAncestor = element.closest("[contenteditable='true']");
  return Boolean(contentEditableAncestor);
};

const normalizeWord = (text: string) => text.replace(/[^a-zA-Z'-]/g, "");

export default function InstantLookup() {
  const [lookup, setLookup] = useState<LookupDefinition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [placement, setPlacement] = useState<"above" | "below">("above");
  const lastWordRef = useRef<string>("");

  const fetchDefinition = useCallback(async (word: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`);
      if (!res.ok) {
        setLookup({ word });
        setError("Word not found.");
        return;
      }
      const data: DictionaryEntry[] = await res.json();
      const entry = data?.[0];
      if (!entry) throw new Error("No data returned");

      const meaningBlock = entry.meanings?.[0];
      const definition = meaningBlock?.definitions?.[0];
      const audio = entry.phonetics?.find((p) => p.audio)?.audio;

      setLookup({
        word: entry.word || word,
        phonetic: entry.phonetic || entry.phonetics?.[0]?.text,
        partOfSpeech: meaningBlock?.partOfSpeech,
        meaning: definition?.definition,
        example: definition?.example,
        audioUrl: audio,
      });
      setError(null);
    } catch (err) {
      console.error("Instant lookup error:", err);
      setLookup({
        word,
      });
      setError("Word not found.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setVisible(false);
      return;
    }

    const text = selection.toString();
    const trimmed = text.trim();

    if (!trimmed || trimmed.length > 40 || /\s/.test(trimmed)) {
      setVisible(false);
      return;
    }

    const normalized = normalizeWord(trimmed);
    if (!normalized) {
      setVisible(false);
      return;
    }

    const anchorNode = selection.anchorNode;
    if (isEditableElement(anchorNode)) {
      setVisible(false);
      return;
    }

    const range = selection.rangeCount ? selection.getRangeAt(0) : null;
    if (!range) {
      setVisible(false);
      return;
    }

    const rect = range.getBoundingClientRect();
    if (!rect || (rect.top === 0 && rect.bottom === 0)) {
      setVisible(false);
      return;
    }

    const viewportHeight = window.innerHeight;
    const preferAbove = rect.top > viewportHeight / 2 && viewportHeight - rect.bottom < 200;

    setPosition({
      top: preferAbove
        ? Math.max(rect.top + window.scrollY - 12, 16)
        : rect.bottom + window.scrollY + 12,
      left: rect.left + window.scrollX + rect.width / 2,
    });
    setPlacement(preferAbove ? "above" : "below");

    if (lastWordRef.current === normalized && lookup) {
      setVisible(true);
      return;
    }

    lastWordRef.current = normalized;
    setLookup(null);
    setVisible(true);
    fetchDefinition(normalized);
  }, [fetchDefinition, lookup]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const triggerSelection = (event: MouseEvent) => {
      if (isEditableElement(event.target)) return;
      window.requestAnimationFrame(() => handleSelection());
    };

    const selectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setVisible(false);
      }
    };

    document.addEventListener("dblclick", triggerSelection);
    document.addEventListener("mouseup", triggerSelection);
    document.addEventListener("selectionchange", selectionChange);

    return () => {
      document.removeEventListener("dblclick", triggerSelection);
      document.removeEventListener("mouseup", triggerSelection);
      document.removeEventListener("selectionchange", selectionChange);
    };
  }, [handleSelection]);

  const handleAddToVocab = useCallback(() => {
    if (!lookup?.word || !lookup.meaning) {
      toast.error("Insufficient information to save.");
      return;
    }

    const result = addVocabularyEntry({
      word: lookup.word,
      meaning: lookup.meaning,
      partOfSpeech: lookup.partOfSpeech,
      phonetic: lookup.phonetic,
      audioUrl: lookup.audioUrl,
      example: lookup.example,
    });

    if (!result.added) {
      if (result.reason === "duplicate") {
        toast.info("This word is already in your vocabulary list.");
      } else {
        toast.error("Unable to save vocabulary.");
      }
      return;
    }

    toast.success(`Saved "${lookup.word}" to Vocabulary.`);
  }, [lookup]);

  const handlePlayAudio = useCallback(() => {
    if (!lookup?.audioUrl) return;
    const audio = new Audio(lookup.audioUrl);
    audio.play().catch((err) => console.error("Audio play error:", err));
  }, [lookup]);

  const popupStyle = useMemo(() => {
    if (!position) return {};
    return {
      top: position.top,
      left: position.left,
      transform: placement === "above" ? "translate(-50%, -100%)" : "translate(-50%, 0)",
    };
  }, [placement, position]);

  if (typeof document === "undefined" || !visible) return null;

  return createPortal(
    <div
      className="instant-lookup-popup"
      style={{
        position: "absolute",
        zIndex: 9999,
        minWidth: "240px",
        maxWidth: "320px",
        background: "#0f172a",
        color: "#f8fafc",
        borderRadius: "12px",
        padding: "14px 16px",
        boxShadow: "0 12px 30px rgba(15,23,42,0.35)",
        border: "1px solid rgba(255,255,255,0.08)",
        pointerEvents: "auto",
        ...popupStyle,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <strong style={{ fontSize: "1rem", textTransform: "capitalize" }}>
              {lookup?.word || lastWordRef.current}
            </strong>
            {lookup?.phonetic && (
              <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>{lookup.phonetic}</span>
            )}
          </div>
          {lookup?.partOfSpeech && (
            <span style={{ fontSize: "0.75rem", color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {lookup.partOfSpeech}
            </span>
          )}
        </div>
        <button
          onClick={() => setVisible(false)}
          style={{
            background: "transparent",
            border: "none",
            color: "#94a3b8",
            cursor: "pointer",
            fontSize: "0.85rem",
          }}
        >
          ×
        </button>
      </div>

      <div style={{ marginTop: "0.75rem" }}>
        {loading && <p style={{ margin: 0, fontSize: "0.9rem" }}>Looking up...</p>}
        {!loading && error && (
          <p style={{ margin: 0, fontSize: "0.9rem", color: "#fca5a5" }}>{error}</p>
        )}
        {!loading && lookup?.meaning && (
          <p style={{ margin: 0, fontSize: "0.95rem", lineHeight: 1.4 }}>{lookup.meaning}</p>
        )}
        {!loading && lookup?.example && (
          <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", fontStyle: "italic", color: "#cbd5f5" }}>
            “{lookup.example}”
          </p>
        )}
      </div>

      <div style={{ marginTop: "0.9rem", display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
        <button
          onClick={handleAddToVocab}
          disabled={!lookup?.meaning || loading}
          className="btn primary"
          style={{
            padding: "0.35rem 0.9rem",
            borderRadius: "999px",
            border: "none",
            background: "linear-gradient(135deg,#2563eb,#7c3aed)",
            color: "#fff",
            cursor: "pointer",
            fontSize: "0.85rem",
          }}
        >
          Save to Vocab
        </button>
        <button
          onClick={handlePlayAudio}
          disabled={!lookup?.audioUrl}
          className="btn ghost"
          style={{
            padding: "0.35rem 0.9rem",
            borderRadius: "999px",
            border: "1px solid rgba(148,163,184,0.4)",
            background: "transparent",
            color: "#e2e8f0",
            cursor: lookup?.audioUrl ? "pointer" : "not-allowed",
            fontSize: "0.85rem",
          }}
        >
          Play
        </button>
      </div>
    </div>,
    document.body
  );
}



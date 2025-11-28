"use client";

import { forwardRef, useEffect, useMemo, useRef, useState } from "react";

import {
  READING_LESSONS,
  type ReadingExercise,
  type ReadingLesson,
  type ReadingLessonSection,
} from "@/data/readingLessons";

type HighlightColor = "yellow" | "blue";

interface HighlightRecord {
  id: string;
  paragraphId: string;
  start: number;
  end: number;
  color: HighlightColor;
    text: string;
  note?: string;
  createdAt: number;
}

interface SelectionContext {
  paragraphId: string;
  text: string;
  start: number;
  end: number;
  range: Range;
}

interface FloatingMenuState {
  visible: boolean;
  x: number;
  y: number;
}

interface LookupCardState extends FloatingMenuState {
  word: string;
  phonetic?: string;
  definitions: string[];
  audio?: string;
  loading?: boolean;
  error?: string;
  placement: "above" | "below";
}

const levelOptions = [
  "All levels",
  ...Array.from(new Set(READING_LESSONS.map((lesson) => lesson.cefr))),
];
const topicOptions = [
  "All topics",
  ...Array.from(new Set(READING_LESSONS.flatMap((lesson) => lesson.tags))),
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const paragraphKey = (sectionIdx: number, paragraphIdx: number) =>
  `${sectionIdx}-${paragraphIdx}`;

export default function ReadingPage() {
  const [selectedLesson, setSelectedLesson] = useState<ReadingLesson | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState(levelOptions[0]);
  const [topicFilter, setTopicFilter] = useState(topicOptions[0]);
  const [fontScale, setFontScale] = useState(1);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [graded, setGraded] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [highlights, setHighlights] = useState<HighlightRecord[]>([]);
  const [selectionContext, setSelectionContext] = useState<SelectionContext | null>(null);
  const [menuState, setMenuState] = useState<FloatingMenuState>({
    visible: false,
    x: 0,
    y: 0,
  });
  const [lookupCard, setLookupCard] = useState<LookupCardState | null>(null);
  const [noteModal, setNoteModal] = useState<{
    visible: boolean;
    initialText: string;
    onConfirm: (text: string | null) => void;
  }>({
    visible: false,
    initialText: "",
    onConfirm: () => {},
  });
  const readingBodyRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const filteredLessons = useMemo(() => {
    return READING_LESSONS.filter((lesson) => {
      const matchesLevel =
        levelFilter === "All levels" ? true : lesson.cefr === levelFilter;
      const matchesTag =
        topicFilter === "All topics" ? true : lesson.tags.includes(topicFilter);
      const matchesSearch = `${lesson.title} ${lesson.subtitle} ${lesson.tags.join(" ")}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      return matchesLevel && matchesTag && matchesSearch;
    });
  }, [levelFilter, topicFilter, searchTerm]);

  const baseParagraphs = useMemo(() => {
    if (!selectedLesson) return {};
    const map: Record<string, string> = {};
    selectedLesson.contentSections.forEach((section, sectionIdx) => {
      section.paragraphs.forEach((text, paragraphIdx) => {
        map[paragraphKey(sectionIdx, paragraphIdx)] = text;
      });
    });
    return map;
  }, [selectedLesson]);

  const highlightsForLesson = useMemo(
    () =>
      highlights.filter((h) => (baseParagraphs as Record<string, string>)[h.paragraphId]),
    [highlights, baseParagraphs]
  );

  const answeredCount = selectedLesson
    ? selectedLesson.exercises.filter((exercise) => {
        const response = responses[exercise.id];
        return typeof response === "string" && response.trim().length > 0;
      }).length
    : 0;
  const totalQuestions = selectedLesson?.exercises.length ?? 0;
  const progressPercent =
    totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  const totalCorrect = Object.values(graded).filter(Boolean).length;

  const handleSelectLesson = (lesson: ReadingLesson) => {
    setSelectedLesson(lesson);
    setResponses({});
    setGraded({});
    setSubmitted(false);
    setHighlights([]);
    setFontScale(1);
    requestAnimationFrame(() => {
      readingBodyRef.current?.scrollTo({ top: 0 });
    });
  };

  const handleBackToCatalog = () => {
    setSelectedLesson(null);
    setResponses({});
    setGraded({});
    setSubmitted(false);
    setHighlights([]);
    setSelectionContext(null);
    setMenuState((prev) => ({ ...prev, visible: false }));
  };

  const handleResponseChange = (questionId: string, value: string) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmitExercises = async () => {
    if (!selectedLesson) return;

    const evaluation: Record<string, boolean> = {};
    selectedLesson.exercises.forEach((exercise) => {
      evaluation[exercise.id] = gradeExercise(exercise, responses[exercise.id]);
    });
    setGraded(evaluation);
    setSubmitted(true);

    // Calculate score and save to database
    const correctCount = Object.values(evaluation).filter(Boolean).length;
    const totalCount = selectedLesson.exercises.length;
    const score = totalCount > 0 ? correctCount / totalCount : 0;

    try {
      await fetch("/api/user/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skill: "reading",
          activityType: "exercise",
          score: score,
          lessonId: selectedLesson.id,
          exerciseCount: totalCount,
          metadata: {
            lessonTitle: selectedLesson.title,
            lessonSubtitle: selectedLesson.subtitle,
            cefr: selectedLesson.cefr,
            correctCount,
            totalCount,
          },
        }),
      });
    } catch (error) {
      console.error("Failed to save reading activity:", error);
      // Continue silently - don't block UI
    }
  };

  const resetExercises = () => {
    setResponses({});
    setGraded({});
    setSubmitted(false);
  };

  const adjustFont = (direction: "inc" | "dec") => {
    setFontScale((prev) =>
      clamp(
        direction === "inc" ? prev + 0.1 : prev - 0.1,
        0.85,
        1.4,
      ),
    );
  };

  useEffect(() => {
    const target = readingBodyRef.current;
    if (!target) return;

    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setSelectionContext(null);
        setMenuState((prev) => ({ ...prev, visible: false }));
        return;
      }
      
      try {
        const range = selection.getRangeAt(0).cloneRange();
        
        // Check if selection intersects with target (more robust than contains)
        const startContainer = range.startContainer;
        const endContainer = range.endContainer;
        const startInTarget = target.contains(startContainer.nodeType === Node.TEXT_NODE 
          ? startContainer.parentElement 
          : startContainer);
        const endInTarget = target.contains(endContainer.nodeType === Node.TEXT_NODE 
          ? endContainer.parentElement 
          : endContainer);
        
        if (!startInTarget && !endInTarget) {
          setSelectionContext(null);
          setMenuState((prev) => ({ ...prev, visible: false }));
          return;
        }
        
        const context = buildSelectionContext(range);
        if (!context) {
          setSelectionContext(null);
          setMenuState((prev) => ({ ...prev, visible: false }));
          return;
        }
        
        // Use the context's range for positioning (may be limited if selection was too long)
        const displayRange = context.range || range;
        const rect = displayRange.getBoundingClientRect();
        const containerRect = target.getBoundingClientRect();
        
        setSelectionContext(context);
        setMenuState({
          visible: true,
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top - 8,
        });
      } catch (error) {
        // Handle any errors gracefully
        console.warn("Error processing selection:", error);
        setSelectionContext(null);
        setMenuState((prev) => ({ ...prev, visible: false }));
      }
    };

    const handleScroll = () => {
      setMenuState((prev) => ({ ...prev, visible: false }));
      setLookupCard((prev) => (prev ? { ...prev, visible: false } : null));
    };

    const handleDocumentMouseDown = (event: MouseEvent) => {
      if (menuRef.current && menuRef.current.contains(event.target as Node)) {
        return;
      }
      setMenuState((prev) => ({ ...prev, visible: false }));
      setLookupCard((prev) => (prev ? { ...prev, visible: false } : null));
    };

    target.addEventListener("mouseup", handleMouseUp);
    target.addEventListener("scroll", handleScroll);
    document.addEventListener("mousedown", handleDocumentMouseDown);

    return () => {
      target.removeEventListener("mouseup", handleMouseUp);
      target.removeEventListener("scroll", handleScroll);
      document.removeEventListener("mousedown", handleDocumentMouseDown);
    };
  }, [selectedLesson]);

  const applyHighlightFromSelection = (color: HighlightColor, withNote = false) => {
    if (!selectionContext) return;
    
    if (withNote) {
      setNoteModal({
        visible: true,
        initialText: "",
        onConfirm: (noteText) => {
          setHighlights((prev) => [
            ...prev,
            {
              id: `hl-${Date.now()}`,
              paragraphId: selectionContext.paragraphId,
              start: selectionContext.start,
              end: selectionContext.end,
              color,
              text: selectionContext.text,
              note: noteText?.trim() || undefined,
              createdAt: Date.now(),
            },
          ]);
          clearSelectionStates();
        },
      });
    } else {
      setHighlights((prev) => [
        ...prev,
        {
          id: `hl-${Date.now()}`,
          paragraphId: selectionContext.paragraphId,
          start: selectionContext.start,
          end: selectionContext.end,
          color,
          text: selectionContext.text,
          createdAt: Date.now(),
        },
      ]);
      clearSelectionStates();
    }
  };

  const removeHighlight = (id: string) => {
    setHighlights((prev) => prev.filter((hl) => hl.id !== id));
  };

  const editHighlightNote = (id: string) => {
    const target = highlights.find((hl) => hl.id === id);
    if (!target) return;
    setNoteModal({
      visible: true,
      initialText: target.note ?? "",
      onConfirm: (next) => {
        if (next === null) return;
        setHighlights((prev) =>
          prev.map((hl) =>
            hl.id === id
              ? {
                  ...hl,
                  note: next.trim() ? next : undefined,
                }
              : hl,
          ),
        );
      },
    });
  };

  const clearSelectionStates = () => {
    window.getSelection()?.removeAllRanges();
    setSelectionContext(null);
    setMenuState((prev) => ({ ...prev, visible: false }));
    setLookupCard((prev) => (prev ? { ...prev, visible: false } : null));
  };

  const renderParagraphContent = (paraId: string, text: string) => {
    const paraHighlights = highlightsForLesson
      .filter((hl) => hl.paragraphId === paraId)
      .sort((a, b) => a.start - b.start);

    if (!paraHighlights.length) return text;

    const chunks: Array<{ text: string; highlight?: HighlightRecord }> = [];
    let cursor = 0;

    paraHighlights.forEach((hl) => {
      if (hl.start > cursor) {
        chunks.push({ text: text.slice(cursor, hl.start) });
      }
      chunks.push({
        text: text.slice(hl.start, hl.end),
        highlight: hl,
      });
      cursor = hl.end;
    });

    if (cursor < text.length) {
      chunks.push({ text: text.slice(cursor) });
                              }

    return chunks.map((chunk, idx) =>
      chunk.highlight ? (
        <mark
          key={`${paraId}-mark-${idx}`}
          style={{
            backgroundColor:
              chunk.highlight.color === "yellow" ? "#fef08a" : "#bfdbfe",
            padding: "0 2px",
          }}
        >
          {chunk.text}
        </mark>
      ) : (
        <span key={`${paraId}-span-${idx}`}>{chunk.text}</span>
      ),
    );
  };

  if (selectedLesson) {
    return (
      <div className="dashboard-content reading-dashboard">
        <section
          className="card"
          style={{
            background: selectedLesson.gradient,
            color: "#0f172a",
            border: "none",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "24px",
              alignItems: "center",
            }}
          >
            <div style={{ flex: 1, minWidth: "260px" }}>
              <button className="btn sm" onClick={handleBackToCatalog}>
                Quay lại danh sách
                      </button>
              <h1 style={{ fontSize: "2rem", marginTop: "12px" }}>
                {selectedLesson.title}
              </h1>
              <p style={{ fontSize: "1rem", marginBottom: "12px" }}>
                {selectedLesson.subtitle}
              </p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <span className="chip">{selectedLesson.cefr}</span>
                <span className="chip">{selectedLesson.genre}</span>
                <span className="chip">{selectedLesson.estimatedTime}’</span>
                <span className="chip">~{selectedLesson.wordCount} words</span>
                    </div>
                  </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
                gap: "12px",
                minWidth: "260px",
              }}
            >
              <StatsCard label="Câu hỏi đã trả lời" value={`${answeredCount}/${totalQuestions}`} />
              <StatsCard
                label="Điểm số hiện tại"
                value={
                  submitted && totalQuestions > 0
                    ? `${Math.round((totalCorrect / totalQuestions) * 100)}%`
                    : "—"
                }
              />
              <StatsCard label="Kỹ năng chính" value={selectedLesson.readingSkills[0]} />
              </div>
            </div>
        </section>

        <div
          className="reading-shell"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "32px",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "24px",
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <section
              className="card"
              style={{
                flex: 1,
                minWidth: "min(640px, 100%)",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              <ReadingToolbar
                fontScale={fontScale}
                onFontDec={() => adjustFont("dec")}
                onFontInc={() => adjustFont("inc")}
                highlightCount={highlightsForLesson.length}
              />

              <div
                ref={readingBodyRef}
                style={{
                  maxHeight: "70vh",
                  overflowY: "auto",
                  paddingRight: "8px",
                  fontSize: `${fontScale}rem`,
                  position: "relative",
                }}
              >
                {selectedLesson.contentSections.map(
                  (section: ReadingLessonSection, sectionIdx) => (
                    <article
                      key={section.heading}
                      style={{ marginBottom: "24px" }}
                    >
                      <h3 style={{ fontSize: "1.25rem", marginBottom: "4px" }}>
                        {section.heading}
                      </h3>
                      {section.summary && (
                        <p
                          className="muted"
                          style={{ marginBottom: "12px", fontStyle: "italic" }}
                        >
                          {section.summary}
                        </p>
                      )}
                      {section.paragraphs.map((paragraph, paragraphIdx) => {
                        const id = paragraphKey(sectionIdx, paragraphIdx);
                        return (
                          <p
                            key={id}
                            data-para-id={id}
                            style={{ lineHeight: 1.6, marginBottom: "12px" }}
                          >
                            {renderParagraphContent(id, paragraph)}
                          </p>
                        );
                      })}
                    </article>
                  ),
                )}

                <VocabularyPanel
                  vocabulary={selectedLesson.vocabulary}
                  source={selectedLesson.source}
                />

                <div className="card soft" style={{ marginTop: "16px" }}>
                  <h4>Key ideas</h4>
                  <ul style={{ marginTop: "8px", paddingLeft: "18px" }}>
                    {selectedLesson.keyIdeas.map((idea) => (
                      <li key={idea} style={{ marginBottom: "6px" }}>
                        {idea}
                      </li>
                    ))}
                  </ul>
                  </div>

                  {menuState.visible && selectionContext && (
                    <SelectionMenu
                      ref={menuRef}
                      x={menuState.x}
                      y={Math.max(menuState.y, 16)}
                      onHighlightYellow={() => applyHighlightFromSelection("yellow")}
                      onHighlightBlue={() => applyHighlightFromSelection("blue")}
                      onNote={() => applyHighlightFromSelection("yellow", true)}
                    />
                  )}

                  {lookupCard?.visible && (
                    <LookupPopover
                      card={lookupCard}
                      onClose={() =>
                        setLookupCard((prev) => (prev ? { ...prev, visible: false } : null))
                      }
                    />
                    )}
                  </div>

              <NoteModal
                visible={noteModal.visible}
                initialText={noteModal.initialText}
                onConfirm={(text) => {
                  noteModal.onConfirm(text);
                  setNoteModal({ visible: false, initialText: "", onConfirm: () => {} });
                }}
                onCancel={() => {
                  setNoteModal({ visible: false, initialText: "", onConfirm: () => {} });
                }}
              />

              <AnnotationPanel
                highlights={highlightsForLesson}
                onRemove={removeHighlight}
                onEdit={editHighlightNote}
              />
            </section>

            <aside
              className="card"
              style={{
                width: "520px",
                maxWidth: "min(520px, 100%)",
                flex: "0 0 520px",
                position: "sticky",
                top: "96px",
                alignSelf: "flex-start",
                marginLeft: "-120px",
                transform: "translateX(-10px)",
              }}
            >
              <QuestionPanel
                lesson={selectedLesson}
                responses={responses}
                graded={graded}
                submitted={submitted}
                progressPercent={progressPercent}
                onResponseChange={handleResponseChange}
                onSubmit={handleSubmitExercises}
                onReset={resetExercises}
              />
            </aside>
                </div>
                </div>
                </div>
    );
  }

  return (
    <div className="dashboard-content reading-dashboard">
      <section className="card">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
            alignItems: "center",
          }}
        >
          <div style={{ flex: 1, minWidth: "240px" }}>
            <h1 style={{ marginBottom: "4px" }}>Reading Studio</h1>
                <p className="muted">
              Luyện đọc theo phong cách IELTS: split view, ghi chú, và bài tập đa dạng.
            </p>
          </div>
          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              minWidth: "260px",
            }}
          >
            <StatsCard label="Lessons" value={READING_LESSONS.length.toString()} />
            <StatsCard label="Avg. length" value="~11 phút" />
            <StatsCard label="Skill focus" value="Ideas • Evidence • Grammar" />
          </div>
        </div>
      </section>

      <section
        className="card"
        style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}
      >
        <input
          type="text"
          placeholder="Tìm theo tiêu đề hoặc chủ đề…"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="input"
          style={{ flex: 1, minWidth: "220px" }}
        />
        <select
          className="select"
          value={levelFilter}
          onChange={(event) => setLevelFilter(event.target.value)}
          style={{ minWidth: "160px" }}
        >
          {levelOptions.map((option) => (
            <option value={option} key={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={topicFilter}
          onChange={(event) => setTopicFilter(event.target.value)}
          style={{ minWidth: "200px" }}
        >
          {topicOptions.map((option) => (
            <option value={option} key={option}>
              {option}
            </option>
          ))}
        </select>
      </section>

      <section
        className="card"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
          gap: "16px",
        }}
      >
        {filteredLessons.map((lesson) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            onSelect={() => handleSelectLesson(lesson)}
          />
        ))}
        {!filteredLessons.length && (
          <div className="card soft" style={{ gridColumn: "1/-1" }}>
            Không tìm thấy bài đọc nào phù hợp với bộ lọc hiện tại.
              </div>
            )}
        </section>
      </div>
    );
  }

function LessonCard({
  lesson,
  onSelect,
}: {
  lesson: ReadingLesson;
  onSelect: () => void;
}) {
  return (
    <div className="card soft" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="chip">{lesson.cefr}</span>
        </div>
      <div>
        <h3 style={{ marginBottom: "4px" }}>{lesson.title}</h3>
        <p className="muted" style={{ marginBottom: "8px" }}>
          {lesson.subtitle}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {lesson.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: "8px", fontSize: "0.9rem" }}>
        <span>{lesson.estimatedTime} phút</span>
        <span>{lesson.readingSkills.length} skills</span>
      </div>
      <button className="btn primary" onClick={onSelect}>
        Bắt đầu luyện đọc
      </button>
    </div>
  );
}

function StatsCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        borderRadius: "12px",
        padding: "12px 16px",
        background: "rgba(255,255,255,0.4)",
        minWidth: "140px",
      }}
    >
      <div style={{ fontSize: "0.8rem", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>{value}</div>
          </div>
  );
}

function ReadingToolbar({
  fontScale,
  onFontDec,
  onFontInc,
  highlightCount,
}: {
  fontScale: number;
  onFontDec: () => void;
  onFontInc: () => void;
  highlightCount: number;
}) {
  return (
    <div
      className="card soft"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "12px",
        alignItems: "center",
      }}
    >
      <strong>Reading tools</strong>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span>Font</span>
        <button className="btn xs" onClick={onFontDec}>
          A-
        </button>
        <button className="btn xs" onClick={onFontInc}>
          A+
        </button>
        <span className="muted" style={{ fontSize: "0.85rem" }}>
          {Math.round(fontScale * 100)}%
        </span>
          </div>
      <div className="muted" style={{ fontSize: "0.85rem" }}>
        Bôi đen đoạn văn để hiện menu hành động (Tô màu • Ghi chú). Tổng highlight:{" "}
        {highlightCount}
          </div>
        </div>
  );
}

function VocabularyPanel({
  vocabulary,
  source,
}: {
  vocabulary: ReadingLesson["vocabulary"];
  source: string;
}) {
  return (
    <div className="card soft">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
          >
        <h4>Vocabulary focus</h4>
        <span className="muted" style={{ fontSize: "0.85rem" }}>
          Source: {source}
          </span>
        </div>
      <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {vocabulary.map((entry) => (
          <div key={entry.word} style={{ display: "flex", flexDirection: "column" }}>
            <strong>{entry.word}</strong>
            <span>{entry.meaning}</span>
            <span className="muted" style={{ fontStyle: "italic" }}>
              Example: {entry.example}
            </span>
      </div>
        ))}
      </div>
    </div>
  );
}

function AnnotationPanel({
  highlights,
  onRemove,
  onEdit,
}: {
  highlights: HighlightRecord[];
  onRemove: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  return (
    <div className="card soft">
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h4>Ghi chú & Highlight</h4>
        <span className="muted">{highlights.length} mục</span>
                </div>
      {highlights.length === 0 && (
        <p className="muted" style={{ marginTop: "8px" }}>
          Chưa có highlight nào. Chọn đoạn văn trong bài đọc để bắt đầu ghi chú.
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
        {highlights
          .slice()
          .sort((a, b) => b.createdAt - a.createdAt)
          .map((hl) => (
            <div
              key={hl.id}
              style={{
                padding: "12px",
                borderRadius: "12px",
                border: "1px solid var(--border-soft)",
                backgroundColor: hl.color === "yellow" ? "#fffbeb" : "#eff6ff",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontWeight: 600 }}>{hl.text}</span>
                </div>
              {hl.note ? (
                <p style={{ marginBottom: "8px" }}>{hl.note}</p>
              ) : (
                <p className="muted" style={{ marginBottom: "8px" }}>
                  (Chưa có ghi chú)
                </p>
              )}
              <div style={{ display: "flex", gap: "8px" }}>
                <button className="btn xs" onClick={() => onEdit(hl.id)}>
                  Sửa ghi chú
                </button>
                <button className="btn xs btn--outline" onClick={() => onRemove(hl.id)}>
                  Xóa
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function QuestionPanel({
  lesson,
  responses,
  graded,
  submitted,
  progressPercent,
  onResponseChange,
  onSubmit,
  onReset,
}: {
  lesson: ReadingLesson;
  responses: Record<string, string>;
  graded: Record<string, boolean>;
  submitted: boolean;
  progressPercent: number;
  onResponseChange: (questionId: string, value: string) => void;
  onSubmit: () => void;
  onReset: () => void;
}) {
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "20px", fontSize: "1rem" }}
    >
      <div>
        <h3 style={{ fontSize: "1.65rem", marginBottom: "8px" }}>Comprehension Lab</h3>
        <p className="muted" style={{ marginBottom: "10px", fontSize: "1rem", lineHeight: 1.4 }}>
          Câu hỏi đa dạng: MCQ, True/False, Short Answer & Evidence.
        </p>
        <div className="progress" style={{ marginBottom: "12px", height: "10px" }}>
          <div className="fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <div style={{ fontSize: "1rem", fontWeight: 500 }}>{progressPercent}% bài tập đã được điền</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        {lesson.exercises.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            value={responses[exercise.id] ?? ""}
            isCorrect={graded[exercise.id]}
            submitted={submitted}
            onChange={(value) => onResponseChange(exercise.id, value)}
          />
        ))}
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <button
          className="btn primary w-full"
          onClick={onSubmit}
          style={{ padding: "12px 20px", fontSize: "1.05rem", fontWeight: 600 }}
        >
          Nộp bài
        </button>
        <button
          className="btn w-full"
          onClick={onReset}
          style={{ padding: "12px 20px", fontSize: "1.05rem", fontWeight: 600 }}
        >
          Làm lại
        </button>
      </div>
    </div>
  );
}

function ExerciseCard({
  exercise,
  value,
  isCorrect,
  submitted,
  onChange,
}: {
  exercise: ReadingExercise;
  value: string;
  isCorrect?: boolean;
  submitted: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="card soft" style={{ padding: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", alignItems: "flex-start" }}>
        <span style={{ fontWeight: 600, fontSize: "1.05rem", lineHeight: 1.5 }}>
          {exercise.prompt}
                  </span>
        <span className="chip" style={{ fontSize: "0.9rem", padding: "4px 10px" }}>{exercise.skill}</span>
      </div>
      {exercise.reference && (
        <p className="muted" style={{ fontSize: "0.95rem", marginBottom: "10px" }}>
          Gợi ý: {exercise.reference}
        </p>
      )}
      {exercise.type === "mcq" && "options" in exercise && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {exercise.options.map((option) => (
            <label key={option} className="opt" style={{ fontSize: "0.95rem" }}>
              <input
                type="radio"
                name={exercise.id}
                checked={value === option}
                onChange={() => onChange(option)}
              />
              <span>{option}</span>
            </label>
                ))}
              </div>
      )}
      {exercise.type === "trueFalse" && (
        <div style={{ display: "flex", gap: "12px" }}>
          {["true", "false"].map((choice) => (
            <label key={choice} className="opt" style={{ fontSize: "0.95rem" }}>
              <input
                type="radio"
                name={exercise.id}
                checked={value === choice}
                onChange={() => onChange(choice)}
              />
              <span>{choice === "true" ? "Đúng" : "Sai"}</span>
            </label>
          ))}
              </div>
      )}
      {exercise.type === "short" && (
        <textarea
          className="input"
          rows={5}
          placeholder="Viết câu trả lời ngắn…"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          style={{
            fontSize: "1rem",
            padding: "16px",
            lineHeight: 1.6,
            minHeight: "160px",
            width: "100%",
          }}
        />
      )}
      {exercise.type === "evidence" && (
        <>
          <textarea
            className="input"
            rows={5}
            placeholder="Trình bày ý + dẫn chứng…"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            style={{
              fontSize: "1rem",
              padding: "16px",
              lineHeight: 1.6,
              minHeight: "200px",
              width: "100%",
            }}
          />
          <small className="muted" style={{ fontSize: "0.9rem" }}>{exercise.guidance}</small>
        </>
      )}
      {submitted && typeof isCorrect === "boolean" && (
        <p
          style={{
            marginTop: "12px",
            fontWeight: 600,
            fontSize: "1rem",
            color: isCorrect ? "#16a34a" : "#dc2626",
          }}
        >
          {isCorrect ? "Great job!" : "Hãy xem lại bằng chứng trong bài."}
        </p>
      )}
    </div>
  );
}

function gradeExercise(exercise: ReadingExercise, response?: string) {
  if (!response || !response.trim()) return false;

  switch (exercise.type) {
    case "mcq":
      return response === exercise.answer;
    case "trueFalse":
      return String(exercise.answer) === response;
    case "short": {
      const normalized = response.toLowerCase();
      return exercise.expected.every((keyword) =>
        normalized.includes(keyword.toLowerCase()),
      );
    }
    case "evidence": {
      const normalized = response.toLowerCase();
      const hits = exercise.expectedKeywords.filter((keyword) =>
        normalized.includes(keyword.toLowerCase()),
      ).length;
      return hits >= Math.ceil(exercise.expectedKeywords.length * 0.6);
    }
    default:
      return false;
  }
}

function buildSelectionContext(range: Range): SelectionContext | null {
  // Get the start and end containers
  const startContainer = range.startContainer;
  const endContainer = range.endContainer;
  
  // Find paragraph elements for both start and end
  const startPara = startContainer.nodeType === Node.TEXT_NODE
    ? startContainer.parentElement?.closest("[data-para-id]") as HTMLElement | null
    : (startContainer as Element).closest("[data-para-id]") as HTMLElement | null;
    
  const endPara = endContainer.nodeType === Node.TEXT_NODE
    ? endContainer.parentElement?.closest("[data-para-id]") as HTMLElement | null
    : (endContainer as Element).closest("[data-para-id]") as HTMLElement | null;
  
  // If selection spans multiple paragraphs, use the first paragraph
  const paragraphElement = startPara || endPara;
  if (!paragraphElement) return null;
  
  const paraId = paragraphElement.dataset.paraId;
  if (!paraId) return null;
  
  // If selection spans multiple paragraphs, limit to the first paragraph
  if (startPara && endPara && startPara !== endPara) {
    // Create a new range limited to the first paragraph
    const limitedRange = range.cloneRange();
    const paraRange = document.createRange();
    paraRange.selectNodeContents(paragraphElement);
    
    // If start is before paragraph, start from paragraph beginning
    if (range.compareBoundaryPoints(Range.START_TO_START, paraRange) < 0) {
      limitedRange.setStart(paraRange.startContainer, paraRange.startOffset);
    }
    
    // If end is after paragraph, end at paragraph end
    if (range.compareBoundaryPoints(Range.END_TO_END, paraRange) > 0) {
      limitedRange.setEnd(paraRange.endContainer, paraRange.endOffset);
    }
    
    // Recalculate with limited range
    const relativeRange = document.createRange();
    relativeRange.selectNodeContents(paragraphElement);
    relativeRange.setEnd(limitedRange.startContainer, limitedRange.startOffset);
    const start = relativeRange.toString().length;
    const text = limitedRange.toString();
    const end = start + text.length;
    
    if (!text.trim()) return null;
    
    return {
      paragraphId: paraId,
      text,
      start,
      end,
      range: limitedRange,
    };
  }
  
  // Normal case: selection within single paragraph
  const relativeRange = range.cloneRange();
  relativeRange.selectNodeContents(paragraphElement);
  relativeRange.setEnd(range.startContainer, range.startOffset);
  const start = relativeRange.toString().length;
  const text = range.toString();
  const end = start + text.length;
  
  if (!text.trim()) return null;
  
  // Limit selection length to prevent issues (max 5000 characters)
  if (text.length > 5000) {
    const limitedText = text.substring(0, 5000);
    const limitedEnd = start + limitedText.length;
    return {
      paragraphId: paraId,
      text: limitedText,
      start,
      end: limitedEnd,
      range,
    };
  }

  return {
    paragraphId: paraId,
    text,
    start,
    end,
    range,
  };
}

const SelectionMenu = forwardRef<HTMLDivElement, {
  x: number;
  y: number;
  onHighlightYellow: () => void;
  onHighlightBlue: () => void;
  onNote: () => void;
}>(({ x, y, onHighlightYellow, onHighlightBlue, onNote }, ref) => {
  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: "translate(-50%, -100%)",
        background: "#0f172a",
        color: "white",
        borderRadius: "999px",
        padding: "4px 8px",
        display: "flex",
        gap: "4px",
        boxShadow: "0 10px 25px rgba(15,23,42,0.3)",
        zIndex: 5,
      }}
      >
      <MenuButton label="Tô vàng" onClick={onHighlightYellow} tone="yellow" />
      <MenuButton label="Tô xanh" onClick={onHighlightBlue} tone="blue" />
      <MenuButton label="Ghi chú" onClick={onNote} />
    </div>
  );
});
SelectionMenu.displayName = "SelectionMenu";

function MenuButton({
  label,
  onClick,
  tone,
}: {
  label: string;
  onClick: () => void;
  tone?: "yellow" | "blue";
}) {
  const background =
    tone === "yellow" ? "#fef08a" : tone === "blue" ? "#bfdbfe" : "rgba(255,255,255,0.1)";
  const color = tone ? "#0f172a" : "white";
  return (
              <button
      onClick={onClick}
      style={{
        border: "none",
        background,
        color,
        borderRadius: "999px",
        padding: "6px 12px",
        fontSize: "0.85rem",
        cursor: "pointer",
      }}
              >
      {label}
              </button>
  );
}

function LookupPopover({
  card,
  onClose,
}: {
  card: LookupCardState;
  onClose: () => void;
}) {
  const transformStyle =
    card.placement === "above" ? "translate(-50%, -100%)" : "translateX(-50%)";
  return (
    <div
      style={{
        position: "absolute",
        left: card.x,
        top: card.y,
        transform: transformStyle,
        background: "#0f172a",
        color: "white",
        padding: "16px",
        borderRadius: "16px",
        width: "280px",
        boxShadow: "0 15px 40px rgba(15,23,42,0.4)",
        zIndex: 6,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
        <div>
          <strong style={{ fontSize: "1.1rem" }}>{card.word}</strong>
          {card.phonetic && (
            <div style={{ fontSize: "0.85rem", color: "#cbd5f5" }}>{card.phonetic}</div>
          )}
            </div>
        <button
          onClick={onClose}
          style={{
          border: "none",
          background: "transparent",
          color: "#cbd5f5",
          cursor: "pointer",
        }}
        >
          ✕
        </button>
      </div>
      {card.loading && <p>Đang tra cứu…</p>}
      {card.error && <p>{card.error}</p>}
      {!card.loading && !card.error && card.definitions?.length && (
        <ul style={{ marginLeft: "18px", marginBottom: "8px" }}>
          {card.definitions.slice(0, 2).map((definition) => (
            <li key={definition} style={{ marginBottom: "4px" }}>
              {definition}
            </li>
          ))}
        </ul>
      )}
      {card.audio && (
        <button
          className="btn xs"
          onClick={() => {
            const audio = new Audio(card.audio);
            audio.play();
          }}
        >
          Nghe phát âm
        </button>
      )}
    </div>
  );
}

function NoteModal({
  visible,
  initialText,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  initialText: string;
  onConfirm: (text: string | null) => void;
  onCancel: () => void;
}) {
  const [noteText, setNoteText] = useState(initialText);

  useEffect(() => {
    if (visible) {
      setNoteText(initialText);
    }
  }, [visible, initialText]);

  if (!visible) return null;

  const handleSubmit = () => {
    onConfirm(noteText);
    setNoteText("");
  };

  const handleCancel = () => {
    onCancel();
    setNoteText("");
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        backdropFilter: "blur(4px)",
      }}
      onClick={handleCancel}
    >
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          padding: "24px",
          width: "90%",
          maxWidth: "480px",
          boxShadow: "0 20px 60px rgba(15, 23, 42, 0.3)",
          transition: "all 0.2s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600, color: "#0f172a" }}>
            Ghi chú
          </h3>
          <button
            onClick={handleCancel}
            style={{
              border: "none",
              background: "transparent",
              color: "#64748b",
              cursor: "pointer",
              fontSize: "1.25rem",
              padding: "4px",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        <p className="muted" style={{ marginBottom: "12px", fontSize: "0.9rem" }}>
          Nhập ghi chú cho đoạn đã bôi (tuỳ chọn):
        </p>
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Viết ghi chú của bạn ở đây..."
          style={{
            width: "100%",
            minHeight: "120px",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            fontSize: "0.95rem",
            lineHeight: 1.5,
            fontFamily: "inherit",
            resize: "vertical",
            outline: "none",
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "#2563eb";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#e2e8f0";
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              handleSubmit();
            }
            if (e.key === "Escape") {
              handleCancel();
            }
          }}
          autoFocus
        />
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "16px" }}>
          <button
            onClick={handleCancel}
            className="btn"
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              background: "white",
              color: "#64748b",
              cursor: "pointer",
            }}
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            className="btn primary"
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              background: "linear-gradient(135deg, #2563eb, #7c3aed)",
              color: "white",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Lưu
          </button>
        </div>
        <p className="muted" style={{ marginTop: "8px", fontSize: "0.75rem", textAlign: "right" }}>
          Nhấn Ctrl+Enter để lưu, Esc để hủy
        </p>
      </div>
    </div>
  );
}

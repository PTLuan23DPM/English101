"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Exercise {
  type: string;
  question: string;
  [key: string]: any;
}

interface GrammarLesson {
  id: string;
  title: string;
  level: string;
  introduction: string;
  explanation: string;
  rules: string[];
  keyPoints: string[];
  examples: string[];
  exercises: Exercise[];
}

const autoGradedTypes = new Set(["multiple_choice", "fill_blank", "true_false", "matching"]);
type ExampleTone = "positive" | "negative" | "question";

const shuffleArray = (input: string[]) => {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export default function GrammarLessonPage() {
  const params = useParams();
  const [lesson, setLesson] = useState<GrammarLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [showResults, setShowResults] = useState(false);
  const [matchingOptions, setMatchingOptions] = useState<Record<number, string[]>>({});
  const [exampleFilter, setExampleFilter] = useState<"all" | ExampleTone>("all");
  const introRef = useRef<HTMLDivElement | null>(null);
  const explanationRef = useRef<HTMLDivElement | null>(null);
  const rulesRef = useRef<HTMLDivElement | null>(null);
  const examplesRef = useRef<HTMLDivElement | null>(null);
  const exercisesRef = useRef<HTMLDivElement | null>(null);
  const sections = [
    { label: "Intro", ref: introRef },
    { label: "Explanation", ref: explanationRef },
    { label: "Rules", ref: rulesRef },
    { label: "Examples", ref: examplesRef },
    { label: "Exercises", ref: exercisesRef },
  ];

  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };


  useEffect(() => {
    async function loadLesson() {
      try {
        const response = await fetch(`/api/grammar/lessons/${params.lessonId}`);
        if (response.ok) {
          const data = await response.json();
          setLesson(data);
        }
      } catch (error) {
        console.error("Error loading lesson:", error);
      } finally {
        setLoading(false);
      }
    }

    if (params.lessonId) {
      loadLesson();
    }
  }, [params.lessonId]);

  useEffect(() => {
    if (!lesson) {
      setMatchingOptions({});
      return;
    }
    const optionsMap: Record<number, string[]> = {};
    lesson.exercises.forEach((exercise, index) => {
      if (exercise.type === "matching" && exercise.pairs?.length) {
        const values = exercise.pairs.map((pair: { value: string }) => pair.value);
        optionsMap[index] = shuffleArray(values);
      }
    });
    setMatchingOptions(optionsMap);
  }, [lesson]);

  const handleAnswer = (exerciseIndex: number, answer: any) => {
    setAnswers((prev) => ({ ...prev, [exerciseIndex]: answer }));
  };

  const handleMatchingSelection = (exerciseIndex: number, key: string, value: string) => {
    setAnswers((prev) => {
      const previous = (prev[exerciseIndex] as Record<string, string>) || {};
      const nextSelection = value
        ? { ...previous, [key]: value }
        : Object.fromEntries(Object.entries(previous).filter(([entryKey]) => entryKey !== key));
      return { ...prev, [exerciseIndex]: nextSelection };
    });
  };

  const handleSubmit = async () => {
    setShowResults(true);

    // Calculate score and save to database
    if (lesson) {
      const score = calculateScore();
      const correctCount = lesson.exercises.reduce((count, exercise, index) => {
        if (!autoGradedTypes.has(exercise.type)) return count;
        if (checkAnswer(exercise, answers[index])) {
          return count + 1;
        }
        return count;
      }, 0);

      try {
        await fetch("/api/user/activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            skill: "grammar",
            activityType: "exercise",
            score: score / 100, // Convert to 0-1 range
            lessonId: lesson.id,
            exerciseCount: totalAutoExercises || lesson.exercises.length,
            metadata: {
              lessonTitle: lesson.title,
              lessonTopic: lesson.topic,
              correctCount,
              totalCount: totalAutoExercises || lesson.exercises.length,
            },
          }),
        });
      } catch (error) {
        console.error("Failed to save grammar activity:", error);
        // Continue silently - don't block UI
      }
    }
  };

  const isExerciseAnswered = (exercise: Exercise, index: number) => {
    const answer = answers[index];
    switch (exercise.type) {
      case "multiple_choice":
        return typeof answer === "number";
      case "fill_blank":
      case "transformation":
        return typeof answer === "string" && answer.trim().length > 0;
      case "true_false":
        return answer === "True" || answer === "False";
      case "matching":
        if (!exercise.pairs?.length) return true;
        if (!answer) return false;
        return exercise.pairs.every((pair: { key: string }) => answer[pair.key]);
      default:
        return true;
    }
  };

  const totalAutoExercises = useMemo(() => {
    if (!lesson) return 0;
    return lesson.exercises.filter((exercise) => autoGradedTypes.has(exercise.type)).length;
  }, [lesson]);

  const answeredAutoExercises = useMemo(() => {
    if (!lesson) return 0;
    return lesson.exercises.reduce((count, exercise, index) => {
      if (!autoGradedTypes.has(exercise.type)) return count;
      if (isExerciseAnswered(exercise, index)) {
        return count + 1;
      }
      return count;
    }, 0);
  }, [lesson, answers]);

  const canSubmit =
    totalAutoExercises === 0
      ? true
      : answeredAutoExercises === totalAutoExercises;

  const progressPercent =
    totalAutoExercises === 0
      ? 100
      : Math.round((answeredAutoExercises / totalAutoExercises) * 100);

  const infoPills = [
    { label: "Level", value: lesson?.level ?? "-", accent: "#1e3a8a" },
    { label: "Exercises", value: lesson?.exercises.length ?? 0, accent: "#0369a1" },
    { label: "Auto-Graded", value: totalAutoExercises, accent: "#0f766e" },
  ];

  const classifyExample = (sentence: string): ExampleTone => {
    const trimmed = sentence.trim();
    if (trimmed.endsWith("?")) return "question";
    const lower = trimmed.toLowerCase();
    const negativeSignals = ["not", "don't", "doesn't", "didn't", "never", "no ", "n't"];
    if (negativeSignals.some((signal) => lower.includes(signal))) {
      return "negative";
    }
    return "positive";
  };

  const exampleEntries = useMemo(() => {
    if (!lesson?.examples) return [];
    return lesson.examples.map((example) => ({
      text: example,
      tone: classifyExample(example),
    }));
  }, [lesson]);

  const filteredExamples =
    exampleFilter === "all"
      ? exampleEntries
      : exampleEntries.filter((entry) => entry.tone === exampleFilter);

  const renderExercise = (exercise: Exercise, index: number) => {
    const userAnswer = answers[index];
    const isCorrect = checkAnswer(exercise, userAnswer);

    if (showResults) {
      return (
        <div
          key={index}
          style={{
            padding: "1.5rem",
            border: `2px solid ${isCorrect ? "#10b981" : "#ef4444"}`,
            borderRadius: "8px",
            marginBottom: "1rem",
            backgroundColor: isCorrect ? "#f0fdf4" : "#fef2f2",
          }}
        >
          <div style={{ marginBottom: "0.5rem", fontWeight: "600" }}>
            Exercise {index + 1}: {exercise.question}
          </div>
          {renderExerciseContent(exercise, index, true)}
          {exercise.explanation && (
            <div
              style={{
                marginTop: "1rem",
                padding: "0.75rem",
                backgroundColor: "#fff",
                borderRadius: "4px",
                fontSize: "0.875rem",
              }}
            >
              <strong>Explanation:</strong> {exercise.explanation}
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        key={index}
        style={{
          padding: "1.5rem",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          marginBottom: "1rem",
          backgroundColor: "#fff",
        }}
      >
        <div style={{ marginBottom: "1rem", fontWeight: "600" }}>
          Exercise {index + 1}: {exercise.question}
        </div>
        {renderExerciseContent(exercise, index, false)}
      </div>
    );
  };

  const renderExerciseContent = (
    exercise: Exercise,
    index: number,
    showResult: boolean
  ) => {
    switch (exercise.type) {
      case "multiple_choice":
        return (
          <div>
            <div style={{ marginBottom: "1rem", fontStyle: "italic" }}>
              {exercise.sentence}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {exercise.options?.map((option: string, optIndex: number) => {
                const isSelected = answers[index] === optIndex;
                const isCorrectOption = optIndex === exercise.correct;
                return (
                  <label
                    key={optIndex}
                    style={{
                      padding: "0.75rem",
                      border: `2px solid ${
                        showResult
                          ? isCorrectOption
                            ? "#10b981"
                            : isSelected && !isCorrectOption
                            ? "#ef4444"
                            : "#e5e7eb"
                          : isSelected
                          ? "#3b82f6"
                          : "#e5e7eb"
                      }`,
                      borderRadius: "6px",
                      cursor: "pointer",
                      backgroundColor:
                        showResult && isCorrectOption
                          ? "#f0fdf4"
                          : showResult && isSelected && !isCorrectOption
                          ? "#fef2f2"
                          : isSelected
                          ? "#eff6ff"
                          : "#fff",
                    }}
                  >
                    <input
                      type="radio"
                      name={`exercise-${index}`}
                      checked={isSelected}
                      onChange={() => handleAnswer(index, optIndex)}
                      disabled={showResult}
                      style={{ marginRight: "0.5rem" }}
                    />
                    {option}
                    {showResult && isCorrectOption && (
                      <span style={{ marginLeft: "0.5rem", color: "#10b981" }}>
                        ✓ Correct
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        );

      case "fill_blank":
        const isCorrectAnswer = checkAnswer(exercise, answers[index]);
        return (
          <div>
            <div style={{ marginBottom: "1rem", fontStyle: "italic" }}>
              {exercise.sentence}
            </div>
            <input
              type="text"
              value={answers[index] || ""}
              onChange={(e) => handleAnswer(index, e.target.value)}
              disabled={showResult}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: `2px solid ${
                  showResult
                    ? isCorrectAnswer
                      ? "#10b981"
                      : "#ef4444"
                    : "#e5e7eb"
                }`,
                borderRadius: "6px",
                fontSize: "1rem",
              }}
              placeholder="Type your answer here"
            />
            {exercise.hint && !showResult && (
              <div
                style={{
                  marginTop: "0.5rem",
                  fontSize: "0.875rem",
                  color: "#6b7280",
                }}
              >
                Hint: {exercise.hint}
              </div>
            )}
            {showResult && (
              <div
                style={{
                  marginTop: "0.5rem",
                  padding: "0.5rem",
                  backgroundColor: isCorrectAnswer ? "#f0fdf4" : "#fef2f2",
                  borderRadius: "4px",
                }}
              >
                {isCorrectAnswer ? (
                  <span style={{ color: "#10b981" }}>✓ Correct!</span>
                ) : (
                  <span style={{ color: "#ef4444" }}>
                    ✗ Incorrect. The correct answer is: {exercise.correct}
                  </span>
                )}
              </div>
            )}
          </div>
        );

      case "true_false":
        return (
          <div>
            <div style={{ marginBottom: "1rem", fontStyle: "italic" }}>
              {exercise.statement}
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              {["True", "False"].map((option) => {
                const isSelected = answers[index] === option;
                const isCorrectOption = option === (exercise.correct ? "True" : "False");
                return (
                  <button
                    key={option}
                    onClick={() => handleAnswer(index, option)}
                    disabled={showResult}
                    style={{
                      padding: "0.75rem 1.5rem",
                      border: `2px solid ${
                        showResult
                          ? isCorrectOption
                            ? "#10b981"
                            : isSelected && !isCorrectOption
                            ? "#ef4444"
                            : "#e5e7eb"
                          : isSelected
                          ? "#3b82f6"
                          : "#e5e7eb"
                      }`,
                      borderRadius: "6px",
                      backgroundColor:
                        showResult && isCorrectOption
                          ? "#f0fdf4"
                          : showResult && isSelected && !isCorrectOption
                          ? "#fef2f2"
                          : isSelected
                          ? "#eff6ff"
                          : "#fff",
                      cursor: showResult ? "default" : "pointer",
                      fontWeight: "500",
                    }}
                  >
                    {option}
                    {showResult && isCorrectOption && (
                      <span style={{ marginLeft: "0.5rem", color: "#10b981" }}>
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case "matching": {
        const pairs = exercise.pairs || [];
        const selection = answers[index] || {};
        const options = matchingOptions[index] || pairs.map((pair: { value: string }) => pair.value);
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {pairs.map((pair: { key: string; value: string }, pairIndex: number) => {
              const chosen = selection[pair.key] || "";
              const isPairCorrect = showResult && chosen === pair.value;
              const isPairWrong = showResult && chosen && chosen !== pair.value;
              return (
                <div
                  key={`${index}-${pairIndex}-${pair.key}`}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.35rem",
                    padding: "0.75rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    backgroundColor: isPairCorrect ? "#f0fdf4" : isPairWrong ? "#fef2f2" : "#f9fafb",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{pair.key}</span>
                  <select
                    value={chosen}
                    disabled={showResult}
                    onChange={(e) => handleMatchingSelection(index, pair.key, e.target.value)}
                    style={{
                      padding: "0.5rem 0.75rem",
                      borderRadius: "6px",
                      border: "1px solid #cbd5f5",
                    }}
                  >
                    <option value="">Select the matching ending</option>
                    {options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {showResult && (
                    <small style={{ color: isPairCorrect ? "#0f766e" : "#b91c1c" }}>
                      {isPairCorrect ? "✓ Correct" : `✗ Correct answer: ${pair.value}`}
                    </small>
                  )}
                </div>
              );
            })}
          </div>
        );
      }

      case "transformation":
        return (
          <div>
            {exercise.original && (
              <div
                style={{
                  padding: "0.75rem",
                  backgroundColor: "#f9fafb",
                  borderLeft: "3px solid #3b82f6",
                  borderRadius: "4px",
                  marginBottom: "1rem",
                }}
              >
                <strong>Original:</strong>{" "}
                <span style={{ fontStyle: "italic" }}>{exercise.original}</span>
              </div>
            )}
            <textarea
              value={answers[index] || ""}
              onChange={(e) => handleAnswer(index, e.target.value)}
              disabled={showResult}
              placeholder="Rewrite the sentence here..."
              style={{
                width: "100%",
                minHeight: "120px",
                padding: "0.75rem",
                borderRadius: "8px",
                border: "1px solid #cbd5f5",
                resize: "vertical",
              }}
            />
            {exercise.hint && !showResult && (
              <small style={{ display: "block", marginTop: "0.5rem", color: "#64748b" }}>
                Hint: {exercise.hint}
              </small>
            )}
            {showResult && exercise.explanation && (
              <div
                style={{
                  marginTop: "0.75rem",
                  padding: "0.75rem",
                  backgroundColor: "#eff6ff",
                  borderRadius: "6px",
                }}
              >
                <strong>Sample rewrite:</strong> {exercise.explanation}
              </div>
            )}
          </div>
        );

      default:
        return (
          <div style={{ color: "#b91c1c", fontStyle: "italic" }}>
            Exercise type not supported
          </div>
        );
    }
  };

  const checkAnswer = (exercise: Exercise, userAnswer: any): boolean => {
    if (exercise.type === "multiple_choice") {
      return userAnswer === exercise.correct;
    } else if (exercise.type === "fill_blank") {
      return (
        userAnswer?.toLowerCase().trim() ===
        exercise.correct?.toLowerCase().trim()
      );
    } else if (exercise.type === "true_false") {
      return (
        userAnswer === (exercise.correct ? "True" : "False")
      );
    } else if (exercise.type === "matching") {
      if (!exercise.pairs?.length) return true;
      if (!userAnswer) return false;
      return exercise.pairs.every(
        (pair: { key: string; value: string }) => userAnswer[pair.key] === pair.value
      );
    } else if (exercise.type === "transformation") {
      return typeof userAnswer === "string" && userAnswer.trim().length > 0;
    }
    return false;
  };

  const calculateScore = () => {
    if (!lesson) return 0;
    let correct = 0;
    let gradable = 0;
    lesson.exercises.forEach((exercise, index) => {
      if (!autoGradedTypes.has(exercise.type)) return;
      gradable += 1;
      if (checkAnswer(exercise, answers[index])) {
        correct += 1;
      }
    });
    if (gradable === 0) return 100;
    return Math.round((correct / gradable) * 100);
  };

  if (loading) {
    return (
      <div className="dashboard-content">
        <div style={{ textAlign: "center", padding: "3rem" }}>
          <div>Loading lesson...</div>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="dashboard-content">
        <div style={{ textAlign: "center", padding: "3rem" }}>
          <div>Lesson not found</div>
          <Link href="/english/grammar" className="btn primary" style={{ marginTop: "1rem" }}>
            Back to Grammar
          </Link>
        </div>
      </div>
    );
  }


  return (
    <div className="dashboard-content" style={{ position: "relative", paddingBottom: "3rem" }}>
      <div
        style={{
          position: "sticky",
          top: "1rem",
          zIndex: 5,
          marginBottom: "1.25rem",
          display: "flex",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
          background: "#0f172a",
          color: "#e2e8f0",
          padding: "1rem 1.5rem",
          borderRadius: "1.25rem",
          boxShadow: "0 20px 40px rgba(15, 23, 42, 0.35)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <Link
            href="/english/grammar"
            style={{ color: "rgba(255,255,255,0.65)", textDecoration: "none", fontSize: "0.875rem" }}
          >
            ← Back to Grammar
          </Link>
          <strong style={{ fontSize: "1.5rem" }}>{lesson.title}</strong>
          <span style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.78)" }}>
            Structured explanations + focused drills for better mastery.
          </span>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          {infoPills.map((pill) => (
            <div
              key={pill.label}
              style={{
                minWidth: "110px",
                padding: "0.6rem 0.95rem",
                borderRadius: "999px",
                backgroundColor: "rgba(15, 23, 42, 0.6)",
                border: `1px solid ${pill.accent}`,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {pill.label}
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>{pill.value}</div>
            </div>
          ))}
          <div
            style={{
              minWidth: "150px",
              padding: "0.6rem 0.95rem",
              borderRadius: "1rem",
              backgroundColor: "rgba(8, 145, 178, 0.2)",
              border: "1px solid rgba(8, 145, 178, 0.45)",
            }}
          >
            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Progress</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 600 }}>{progressPercent}%</div>
            <div
              style={{
                marginTop: "0.25rem",
                height: "6px",
                backgroundColor: "rgba(255,255,255,0.2)",
                borderRadius: "999px",
              }}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: "100%",
                  borderRadius: "999px",
                  background: "linear-gradient(90deg,#34d399,#10b981)",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            <small style={{ display: "block", marginTop: "0.35rem", color: "rgba(255,255,255,0.7)" }}>
              {answeredAutoExercises}/{totalAutoExercises || lesson.exercises.length} answered
            </small>
          </div>
        </div>
      </div>

      <div
        style={{
          position: "sticky",
          top: "6.5rem",
          zIndex: 4,
          marginBottom: "1.5rem",
          background: "#fff",
          borderRadius: "999px",
          padding: "0.4rem",
          boxShadow: "0 10px 25px rgba(15, 23, 42, 0.12)",
          display: "flex",
          gap: "0.3rem",
          overflowX: "auto",
          scrollbarWidth: "none",
        }}
      >
        {sections.map((section) => (
          <button
            key={section.label}
            onClick={() => scrollToSection(section.ref)}
            style={{
              border: "none",
              background: "#f1f5f9",
              borderRadius: "999px",
              padding: "0.45rem 1.2rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {section.label}
          </button>
        ))}
      </div>

      <section
        className="card"
        ref={introRef}
        style={{
          marginBottom: "2rem",
          background: "linear-gradient(135deg,#e0f2fe,#f8fafc)",
          border: "none",
          boxShadow: "0 20px 35px rgba(14, 165, 233,0.25)",
        }}
      >
        <h2>Lesson Overview</h2>
        <p style={{ lineHeight: "1.8", color: "#0f172a", fontSize: "1rem" }}>{lesson.introduction}</p>
        <div
          style={{
            marginTop: "1rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
            gap: "0.75rem",
          }}
        >
          <div
            style={{
              padding: "0.9rem",
              backgroundColor: "#fff",
              borderRadius: "1rem",
              border: "1px solid #bae6fd",
            }}
          >
            <strong>What you'll do</strong>
            <p style={{ margin: "0.3rem 0 0", color: "#475569" }}>
              Read the rules, study highlighted examples, then solidify with guided practice.
            </p>
          </div>
          <div
            style={{
              padding: "0.9rem",
              backgroundColor: "#fff",
              borderRadius: "1rem",
              border: "1px solid #bae6fd",
            }}
          >
            <strong>Time needed</strong>
            <p style={{ margin: "0.3rem 0 0", color: "#475569" }}>≈ 10 minutes to complete all sections.</p>
          </div>
          <div
            style={{
              padding: "0.9rem",
              backgroundColor: "#fff",
              borderRadius: "1rem",
              border: "1px solid #bae6fd",
            }}
          >
            <strong>Recommended focus</strong>
            <p style={{ margin: "0.3rem 0 0", color: "#475569" }}>
              Pay special attention to the highlighted errors in the exercises.
            </p>
          </div>
        </div>
      </section>

      {lesson.explanation && (
        <section className="card" ref={explanationRef} style={{ marginBottom: "2rem", position: "relative" }}>
          <span
            style={{
              position: "absolute",
              top: "-12px",
              right: "20px",
              background: "#e0e7ff",
              color: "#312e81",
              padding: "0.2rem 0.75rem",
              borderRadius: "999px",
              fontSize: "0.8rem",
            }}
          >
            Concept guide
          </span>
          <h2>Grammar Explanation</h2>
          <div style={{ lineHeight: "1.75", color: "#1f2937", whiteSpace: "pre-wrap" }}>{lesson.explanation}</div>
        </section>
      )}

      {lesson.rules && lesson.rules.length > 0 && (
        <section className="card" ref={rulesRef} style={{ marginBottom: "2rem" }}>
          <h2>Formulas & Rules</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
              gap: "0.75rem",
            }}
          >
            {lesson.rules.map((rule, index) => (
              <div
                key={index}
                style={{
                  borderRadius: "0.85rem",
                  border: "1px dashed #cbd5f5",
                  padding: "0.85rem",
                  backgroundColor: "#f8fafc",
                }}
              >
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Rule #{index + 1}</span>
                <p style={{ margin: "0.35rem 0 0", color: "#0f172a", fontWeight: 500 }}>{rule}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {lesson.keyPoints && lesson.keyPoints.length > 0 && (
        <section className="card" style={{ marginBottom: "2rem" }}>
          <h2 style={{ marginBottom: "1rem" }}>Key takeaways</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
            {lesson.keyPoints.map((point, index) => (
              <span
                key={index}
                style={{
                  backgroundColor: "#e2e8f0",
                  color: "#0f172a",
                  padding: "0.4rem 0.9rem",
                  borderRadius: "999px",
                  fontSize: "0.9rem",
                }}
              >
                {point}
              </span>
            ))}
          </div>
        </section>
      )}

      {lesson.examples && lesson.examples.length > 0 && (
        <section className="card" ref={examplesRef} style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", alignItems: "center", gap: "0.75rem" }}>
            <h2 style={{ margin: 0 }}>Highlighted Examples</h2>
            <span style={{ fontSize: "0.9rem", color: "#64748b" }}>
              {filteredExamples.length} / {lesson.examples.length} sentences
            </span>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            {[
              { key: "all", label: "All", color: "#94a3b8" },
              { key: "positive", label: "Positive", color: "#0ea5e9" },
              { key: "negative", label: "Negative", color: "#f97316" },
              { key: "question", label: "Questions", color: "#22c55e" },
            ].map((filter) => {
              const isActive = exampleFilter === filter.key;
              return (
                <button
                  key={filter.key}
                  onClick={() => setExampleFilter(filter.key as typeof exampleFilter)}
                  style={{
                    border: "none",
                    borderRadius: "999px",
                    padding: "0.4rem 1rem",
                    backgroundColor: isActive ? filter.color : "#e2e8f0",
                    color: isActive ? "#fff" : "#0f172a",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
              gap: "1rem",
            }}
          >
            {filteredExamples.length > 0 ? (
              filteredExamples.map((entry, index) => (
                <div
                  key={`${entry.text}-${index}`}
                  style={{
                    position: "relative",
                    padding: "1.25rem",
                    backgroundColor: "#ffffff",
                    borderRadius: "1rem",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 10px 25px rgba(15, 23, 42, 0.08)",
                  }}
                >
                
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: "#64748b",
                      marginBottom: "0.4rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>Example {index + 1}</span>
                    <span
                      style={{
                        borderRadius: "999px",
                        padding: "0.15rem 0.6rem",
                        fontSize: "0.75rem",
                        textTransform: "capitalize",
                        backgroundColor:
                          entry.tone === "positive"
                            ? "rgba(14, 165, 233, 0.15)"
                            : entry.tone === "negative"
                            ? "rgba(249, 115, 22, 0.15)"
                            : "rgba(34, 197, 94, 0.15)",
                        color:
                          entry.tone === "positive"
                            ? "#0284c7"
                            : entry.tone === "negative"
                            ? "#c2410c"
                            : "#15803d",
                      }}
                    >
                      {entry.tone}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontStyle: "italic", color: "#0f172a", lineHeight: 1.6 }}>
                    “{entry.text}”
                  </p>
                </div>
              ))
            ) : (
              <div
                style={{
                  gridColumn: "1 / -1",
                  padding: "1.5rem",
                  backgroundColor: "#f8fafc",
                  borderRadius: "1rem",
                  border: "1px dashed #cbd5f5",
                  textAlign: "center",
                  color: "#475569",
                }}
              >
                No examples found for this filter.
              </div>
            )}
          </div>
        </section>
      )}

      <section className="card" ref={exercisesRef}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div>
            <h2 style={{ marginBottom: "0.25rem" }}>Exercises</h2>
            <p style={{ margin: 0, color: "#475569" }}>Only auto-graded items affect your score.</p>
          </div>
          {showResults && (
            <div
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#eff6ff",
                borderRadius: "6px",
                fontWeight: "600",
                color: "#1e40af",
              }}
            >
              Score: {calculateScore()}%
            </div>
          )}
        </div>

        {lesson.exercises.map((exercise, index) => renderExercise(exercise, index))}

        {!showResults && (
          <button
            className="btn primary"
            onClick={handleSubmit}
            style={{ width: "100%", marginTop: "1rem" }}
            disabled={!canSubmit}
          >
            Submit Answers
          </button>
        )}

        {showResults && (
          <button
            className="btn secondary"
            onClick={() => {
              setShowResults(false);
              setAnswers({});
            }}
            style={{ width: "100%", marginTop: "1rem" }}
          >
            Try Again
          </button>
        )}
        {!showResults && !canSubmit && (
          <p style={{ marginTop: "0.75rem", color: "#b45309" }}>
            Answer all auto-graded questions to unlock the submission.
          </p>
        )}
        {totalAutoExercises !== lesson.exercises.length && (
          <p style={{ marginTop: "0.75rem", color: "#475569", fontSize: "0.9rem" }}>
            Open-ended tasks (like rewriting) are for practice only and won't affect your score.
          </p>
        )}
      </section>
    </div>
  );
}


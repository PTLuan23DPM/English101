"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Question {
  id: number;
  text: string;
  options: { id: string; text: string }[];
  correctAnswer: string;
  level: string;
}

const PLACEMENT_QUESTIONS: Question[] = [
  // A1 Questions
  { id: 1, text: "What ___ your name?", options: [{ id: "A", text: "is" }, { id: "B", text: "are" }, { id: "C", text: "am" }, { id: "D", text: "be" }], correctAnswer: "A", level: "A1" },
  { id: 2, text: "I ___ from Vietnam.", options: [{ id: "A", text: "is" }, { id: "B", text: "am" }, { id: "C", text: "are" }, { id: "D", text: "be" }], correctAnswer: "B", level: "A1" },
  
  // A2 Questions
  { id: 3, text: "Yesterday, I ___ to the cinema.", options: [{ id: "A", text: "go" }, { id: "B", text: "goes" }, { id: "C", text: "went" }, { id: "D", text: "going" }], correctAnswer: "C", level: "A2" },
  { id: 4, text: "She ___ English for 2 years.", options: [{ id: "A", text: "study" }, { id: "B", text: "studies" }, { id: "C", text: "has studied" }, { id: "D", text: "had studied" }], correctAnswer: "C", level: "A2" },
  
  // B1 Questions
  { id: 5, text: "If I ___ rich, I would travel the world.", options: [{ id: "A", text: "am" }, { id: "B", text: "was" }, { id: "C", text: "were" }, { id: "D", text: "will be" }], correctAnswer: "C", level: "B1" },
  { id: 6, text: "The report ___ by tomorrow.", options: [{ id: "A", text: "must finish" }, { id: "B", text: "must be finished" }, { id: "C", text: "must finishing" }, { id: "D", text: "must to finish" }], correctAnswer: "B", level: "B1" },
  
  // B2 Questions
  { id: 7, text: "By next year, I ___ here for 10 years.", options: [{ id: "A", text: "will work" }, { id: "B", text: "will be working" }, { id: "C", text: "will have worked" }, { id: "D", text: "work" }], correctAnswer: "C", level: "B2" },
  { id: 8, text: "Had I known about the meeting, I ___ attended.", options: [{ id: "A", text: "would" }, { id: "B", text: "would have" }, { id: "C", text: "will" }, { id: "D", text: "will have" }], correctAnswer: "B", level: "B2" },
  
  // C1 Questions
  { id: 9, text: "The proposal, ___ by experts, was rejected.", options: [{ id: "A", text: "having reviewed" }, { id: "B", text: "having been reviewed" }, { id: "C", text: "reviewed" }, { id: "D", text: "reviewing" }], correctAnswer: "B", level: "C1" },
  { id: 10, text: "Scarcely ___ the door when the phone rang.", options: [{ id: "A", text: "I had opened" }, { id: "B", text: "had I opened" }, { id: "C", text: "I opened" }, { id: "D", text: "did I open" }], correctAnswer: "B", level: "C1" },
];

export default function PlacementTestPage() {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAnswer = (questionId: number, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    // Calculate score and level
    let score = 0;
    const levelScores: Record<string, { correct: number; total: number }> = {
      A1: { correct: 0, total: 0 },
      A2: { correct: 0, total: 0 },
      B1: { correct: 0, total: 0 },
      B2: { correct: 0, total: 0 },
      C1: { correct: 0, total: 0 },
    };

    PLACEMENT_QUESTIONS.forEach((q) => {
      const userAnswer = answers[q.id];
      const isCorrect = userAnswer === q.correctAnswer;
      
      if (isCorrect) {
        score++;
        levelScores[q.level].correct++;
      }
      levelScores[q.level].total++;
    });

    // Determine CEFR level
    let detectedLevel = "A1";
    for (const [level, scores] of Object.entries(levelScores)) {
      const accuracy = scores.total > 0 ? scores.correct / scores.total : 0;
      if (accuracy >= 0.6) {
        detectedLevel = level;
      } else {
        break;
      }
    }

    // Save to backend
    try {
      const response = await fetch("/api/placement-test/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers,
          score,
          totalQuestions: PLACEMENT_QUESTIONS.length,
          detectedLevel,
          levelScores,
        }),
      });

      if (response.ok) {
        router.push(`/english/placement-test/result?level=${detectedLevel}&score=${score}`);
      } else {
        alert("Failed to submit test. Please try again.");
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Submit error:", error);
      alert("An error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  const progress = ((currentQuestion + 1) / PLACEMENT_QUESTIONS.length) * 100;
  const currentQ = PLACEMENT_QUESTIONS[currentQuestion];

  return (
    <div className="dashboard-content">
      {/* Header */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h1 style={{ margin: 0, marginBottom: "8px" }}>CEFR Placement Test</h1>
            <p className="muted" style={{ margin: 0 }}>
              Determine your English proficiency level
            </p>
          </div>
          <div
            style={{
              padding: "12px 20px",
              background: timeLeft < 120 ? "#fef2f2" : "#eef2ff",
              color: timeLeft < 120 ? "#dc2626" : "#6366f1",
              borderRadius: "12px",
              fontSize: "24px",
              fontWeight: "700",
              fontFamily: "monospace",
            }}
          >
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* Progress */}
        <div style={{ marginBottom: "8px", display: "flex", justifyContent: "space-between", fontSize: "14px", color: "#64748b" }}>
          <span>Question {currentQuestion + 1} of {PLACEMENT_QUESTIONS.length}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <div className="progress-bar" style={{ height: "12px" }}>
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Question */}
      <div className="card" style={{ marginBottom: "24px", minHeight: "400px" }}>
        <div style={{ marginBottom: "24px" }}>
          <span className="level-badge level-{currentQ.level.toLowerCase()}" style={{ marginBottom: "12px", display: "inline-block" }}>
            {currentQ.level}
          </span>
          <h2 style={{ fontSize: "24px", marginBottom: "32px" }}>
            {currentQ.text}
          </h2>
        </div>

        <div style={{ display: "grid", gap: "12px" }}>
          {currentQ.options.map((option) => (
            <button
              key={option.id}
              onClick={() => handleAnswer(currentQ.id, option.id)}
              className={`option-button ${answers[currentQ.id] === option.id ? "selected" : ""}`}
              style={{
                padding: "16px 20px",
                border: answers[currentQ.id] === option.id ? "2px solid #6366f1" : "2px solid #e5e7eb",
                borderRadius: "12px",
                background: answers[currentQ.id] === option.id ? "#eef2ff" : "white",
                textAlign: "left",
                fontSize: "16px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  border: "2px solid " + (answers[currentQ.id] === option.id ? "#6366f1" : "#cbd5e1"),
                  background: answers[currentQ.id] === option.id ? "#6366f1" : "white",
                  color: answers[currentQ.id] === option.id ? "white" : "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "700",
                  flexShrink: 0,
                }}
              >
                {option.id}
              </div>
              <span>{option.text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
        <button
          className="btn outline"
          onClick={() => setCurrentQuestion((prev) => Math.max(0, prev - 1))}
          disabled={currentQuestion === 0}
          style={{ minWidth: "120px" }}
        >
          ← Previous
        </button>

        {currentQuestion < PLACEMENT_QUESTIONS.length - 1 ? (
          <button
            className="btn primary"
            onClick={() => setCurrentQuestion((prev) => prev + 1)}
            style={{ minWidth: "120px" }}
          >
            Next →
          </button>
        ) : (
          <button
            className="btn primary"
            onClick={handleSubmit}
            disabled={isSubmitting || Object.keys(answers).length < PLACEMENT_QUESTIONS.length}
            style={{ minWidth: "120px" }}
          >
            {isSubmitting ? "Submitting..." : "Submit Test"}
          </button>
        )}
      </div>

      {Object.keys(answers).length < PLACEMENT_QUESTIONS.length && currentQuestion === PLACEMENT_QUESTIONS.length - 1 && (
        <div style={{ marginTop: "16px", padding: "12px", background: "#fef3c7", borderRadius: "8px", color: "#92400e", textAlign: "center" }}>
          Please answer all questions before submitting
        </div>
      )}
    </div>
  );
}


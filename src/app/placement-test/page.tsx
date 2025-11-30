"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface Question {
  id: string;
  type: string;
  difficulty: string;
  question: string;
  context?: string;
  audio_text?: string;
  options: string[];
  correct: number;
  explanation: string;
}

interface TestResult {
  cefrLevel: string;
  description: string;
  score: number;
  totalQuestions: number;
}

export default function PlacementTestPage() {
  const { data: session, update } = useSession(); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [started, setStarted] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState(6);

  useEffect(() => {
    loadQuestions();
  }, []);

  const handleRedirect = useCallback(async () => {
    setShowResultModal(false);
    
    // Update session to refresh JWT token with placementTestCompleted = true
    try {
      await update();
      // Wait for session to update before redirecting
      await new Promise(resolve => setTimeout(resolve, 800));
    } catch (error) {
      console.error("Failed to update session:", error);
    }
    
    // Use window.location for hard redirect to ensure middleware sees updated token
    window.location.href = "/english/dashboard";
  }, [update]);

  // Handle countdown timer and auto-redirect
  useEffect(() => {
    if (!showResultModal) return;

    if (redirectCountdown > 0) {
      const timer = setTimeout(() => {
        setRedirectCountdown((prev) => prev - 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (redirectCountdown === 0) {
      // Auto redirect when countdown reaches 0
      const redirectTimer = setTimeout(() => {
        handleRedirect();
      }, 300);

      return () => clearTimeout(redirectTimer);
    }
  }, [showResultModal, redirectCountdown, handleRedirect]);

  const loadQuestions = async () => {
    try {
      const response = await fetch("/api/placement-test/questions");
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Response error:", errorText);
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Randomly select 20 questions
      const allQuestions = data.questions;
      const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, 20);
      
      setQuestions(selected);
      setAnswers(new Array(20).fill(-1));
      setLoading(false);
    } catch (error) {
      console.error("Failed to load questions:", error);
      toast.error("Failed to load test", {
        description: "Please refresh the page to try again.",
      });
      setLoading(false);
    }
  };

  const handleAnswer = (optionIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentIndex] = optionIndex;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmit = async () => {
    // Check if all questions are answered
    const unanswered = answers.filter(a => a === -1).length;
    if (unanswered > 0) {
      toast.warning(`You have ${unanswered} unanswered questions`, {
        description: "Please answer all questions before submitting.",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Calculate score
      let score = 0;
      questions.forEach((q, i) => {
        if (answers[i] === q.correct) {
          score++;
        }
      });

      // Submit to backend
      const response = await fetch("/api/placement-test/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score,
          totalQuestions: questions.length,
          answers: questions.map((q, i) => ({
            questionId: q.id,
            userAnswer: answers[i],
            correct: q.correct,
            isCorrect: answers[i] === q.correct,
          })),
        }),
      });

      // Parse response (only once)
      let result: any = {};
      const contentType = response.headers.get("content-type");
      
      if (contentType && contentType.includes("application/json")) {
        try {
          const text = await response.text();
          if (text) {
            result = JSON.parse(text);
          }
        } catch (parseError) {
          console.error("Failed to parse response:", parseError);
          throw new Error("Invalid response from server");
        }
      }

      if (!response.ok) {
        // Response was parsed successfully, but contains error
        const errorMessage = result?.error || result?.message || result?.details || response.statusText || `Failed to submit test (${response.status})`;
        console.error("Submit failed:", {
          status: response.status,
          statusText: response.statusText,
          contentType,
          error: result?.error,
          message: result?.message,
          details: result?.details,
          fullResult: result,
          resultKeys: result ? Object.keys(result) : []
        });
        throw new Error(errorMessage);
      }

      // Show result modal instead of toast
      setTestResult({
        cefrLevel: result.cefrLevel,
        description: result.description,
        score: result.score,
        totalQuestions: result.totalQuestions,
      });
      setRedirectCountdown(6);
      setShowResultModal(true);
      setSubmitting(false);
    } catch (error) {
      console.error("Submit error:", error);
      let errorMessage = "Failed to submit test. Please try again.";
      
      if (error instanceof Error) {
        errorMessage = error.message;
        // If it's a database connection error, show more helpful message
        if (error.message.includes("Database connection failed") || error.message.includes("DATABASE_URL")) {
          errorMessage = "Database connection failed. Please contact support or try again later.";
        }
      }
      
      toast.error("Failed to submit test", {
        description: errorMessage,
        duration: 5000,
      });
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="placement-test-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading test questions...</p>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="placement-test-container">
        <div className="test-intro">
          <div className="test-intro__icon">📝</div>
          <h1>English Placement Test</h1>
          <p className="test-intro__description">
            This test will help us determine your current English level (CEFR A1-C2).
          </p>
          
          <div className="test-info">
            <div className="test-info__item">
              <span className="test-info__label">Questions:</span>
              <span className="test-info__value">20</span>
            </div>
            <div className="test-info__item">
              <span className="test-info__label">Time:</span>
              <span className="test-info__value">~15 minutes</span>
            </div>
            <div className="test-info__item">
              <span className="test-info__label">Types:</span>
              <span className="test-info__value">Grammar, Vocabulary, Reading</span>
            </div>
          </div>

          <div className="test-instructions">
            <h3>Instructions:</h3>
            <ul className="instructions-list">
              <li>
                <span className="instruction-check">✓</span>
                <span>Read each question carefully</span>
              </li>
              <li>
                <span className="instruction-check">✓</span>
                <span>Select the best answer for each question</span>
              </li>
              <li>
                <span className="instruction-check">✓</span>
                <span>You can navigate back and forth between questions</span>
              </li>
              <li>
                <span className="instruction-check">✓</span>
                <span>Make sure to answer all questions before submitting</span>
              </li>
            </ul>
          </div>

          <button className="btn primary large" onClick={() => setStarted(true)}>
            Start Test
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const answeredCount = answers.filter(a => a !== -1).length;

  return (
    <div className="placement-test-container">
      <div className="test-header">
        <div className="test-progress">
          <div className="test-progress__bar">
            <div className="test-progress__fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="test-progress__text">
            Question {currentIndex + 1} of {questions.length}
          </div>
        </div>
        <div className="test-answered">
          Answered: {answeredCount}/{questions.length}
        </div>
      </div>

      <div className="test-content">
        <div className="question-card">
          <div className="question-header">
            <span className="question-type">{currentQuestion.type}</span>
            <span className="question-difficulty">{currentQuestion.difficulty}</span>
          </div>

          {currentQuestion.context && (
            <div className="question-context">
              <p>{currentQuestion.context}</p>
            </div>
          )}

          <div className="question-text">
            <h3>{currentQuestion.question}</h3>
          </div>

          <div className="question-options">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                className={`option-button ${answers[currentIndex] === index ? "selected" : ""}`}
                onClick={() => handleAnswer(index)}
              >
                <span className="option-letter">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="option-text">{option}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="test-navigation">
        <button
          className="btn secondary"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
        >
          ← Previous
        </button>

        <div className="question-dots">
          {questions.map((_, index) => (
            <button
              key={index}
              className={`question-dot ${index === currentIndex ? "active" : ""} ${
                answers[index] !== -1 ? "answered" : ""
              }`}
              onClick={() => setCurrentIndex(index)}
              aria-label={`Go to question ${index + 1}`}
            />
          ))}
        </div>

        {currentIndex === questions.length - 1 ? (
          <button
            className="btn primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit Test"}
          </button>
        ) : (
          <button className="btn primary" onClick={handleNext}>
            Next →
          </button>
        )}
      </div>

      {/* Result Modal */}
      {showResultModal && testResult && (
        <div className="result-modal-overlay" onClick={() => setShowResultModal(false)}>
          <div className="result-modal" onClick={(e) => e.stopPropagation()}>
            <div className="result-modal-header">
              <div className="result-modal-icon">🎉</div>
              <h2>Test Completed!</h2>
              <p className="result-modal-subtitle">Your English level has been assessed</p>
            </div>

            <div className="result-modal-content">
              <div className="result-level-card">
                <div className="result-level-badge">{testResult.cefrLevel}</div>
                <div className="result-level-description">{testResult.description}</div>
              </div>

              <div className="result-stats">
                <div className="result-stat-item">
                  <div className="result-stat-label">Your Score</div>
                  <div className="result-stat-value">
                    {testResult.score} / {testResult.totalQuestions}
                  </div>
                </div>
                <div className="result-stat-item">
                  <div className="result-stat-label">Accuracy</div>
                  <div className="result-stat-value">
                    {Math.round((testResult.score / testResult.totalQuestions) * 100)}%
                  </div>
                </div>
              </div>

              <div className="result-message">
                <p>Your learning path has been customized based on your level.</p>
                <p>Start practicing to improve your English skills!</p>
              </div>
            </div>

            <div className="result-modal-footer">
              <div className="result-modal-countdown">
                Redirecting to dashboard in {redirectCountdown} second{redirectCountdown !== 1 ? 's' : ''}...
              </div>
              <button
                className="btn primary large"
                onClick={handleRedirect}
              >
                Go to Dashboard Now →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


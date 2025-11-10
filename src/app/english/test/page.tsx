"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import "./test.css";

export default function TestPage() {
  const router = useRouter();
  const [selectedTest, setSelectedTest] = useState<string | null>(null);

  const tests = [
    {
      id: "placement",
      title: "Placement Test",
      description: "Find your current CEFR level",
      duration: "30 minutes",
      questions: 40,
      icon: "📋",
      color: "blue",
      available: true,
    },
    {
      id: "listening-practice",
      title: "Listening Test",
      description: "Practice your listening comprehension",
      duration: "25 minutes",
      questions: 30,
      icon: "🎧",
      color: "purple",
      available: true,
    },
    {
      id: "reading-practice",
      title: "Reading Test",
      description: "Test your reading comprehension",
      duration: "40 minutes",
      questions: 35,
      icon: "📚",
      color: "green",
      available: true,
    },
    {
      id: "writing-practice",
      title: "Writing Test",
      description: "Evaluate your writing skills",
      duration: "45 minutes",
      questions: 2,
      icon: "✍️",
      color: "orange",
      available: true,
    },
    {
      id: "speaking-practice",
      title: "Speaking Test",
      description: "Assess your speaking ability",
      duration: "15 minutes",
      questions: 3,
      icon: "🎤",
      color: "red",
      available: true,
    },
    {
      id: "full-mock",
      title: "Full Mock Exam",
      description: "Complete practice exam (all skills)",
      duration: "2 hours",
      questions: 100,
      icon: "📝",
      color: "indigo",
      available: false, // Coming soon
    },
  ];

  const handleStartTest = (testId: string) => {
    const test = tests.find((t) => t.id === testId);
    if (!test) return;

    if (!test.available) {
      toast.info("Coming soon", {
        description: "This test will be available soon!",
      });
      return;
    }

    // Route to appropriate test
    switch (testId) {
      case "placement":
        router.push("/placement-test");
        break;
      case "listening-practice":
        router.push("/english/listening");
        break;
      case "reading-practice":
        router.push("/english/reading");
        break;
      case "writing-practice":
        router.push("/english/writing");
        break;
      case "speaking-practice":
        router.push("/english/speaking");
        break;
      default:
        toast.info("Test not available yet");
    }
  };

  return (
    <div className="test-page">
      <div className="test-header">
        <div>
          <h1>Tests & Assessments</h1>
          <p>Take tests to evaluate your English proficiency level</p>
        </div>
        <Link href="/english/dashboard" className="btn outline">
          Back to Dashboard
        </Link>
      </div>

      <div className="test-grid">
        {tests.map((test) => (
          <div
            key={test.id}
            className={`test-card ${test.color} ${!test.available ? "disabled" : ""}`}
            onClick={() => test.available && setSelectedTest(test.id)}
          >
            <div className="test-icon">{test.icon}</div>
            <div className="test-content">
              <h3>{test.title}</h3>
              <p>{test.description}</p>
              <div className="test-meta">
                <span className="test-duration">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M8 4V8L10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  {test.duration}
                </span>
                <span className="test-questions">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M5 7H11M5 10H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  {test.questions} questions
                </span>
              </div>
            </div>
            {test.available ? (
              <button
                className="test-start-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartTest(test.id);
                }}
              >
                Start Test
              </button>
            ) : (
              <div className="test-coming-soon">Coming Soon</div>
            )}
          </div>
        ))}
      </div>

      <div className="test-tips-section">
        <h2>Test Tips</h2>
        <div className="tips-grid">
          <div className="tip-card">
            <div className="tip-icon">💡</div>
            <h4>Take the Placement Test First</h4>
            <p>Find your current level to get personalized learning recommendations</p>
          </div>
          <div className="tip-card">
            <div className="tip-icon">⏱️</div>
            <h4>Manage Your Time</h4>
            <p>Each test has a time limit. Practice time management for better results</p>
          </div>
          <div className="tip-card">
            <div className="tip-icon">📚</div>
            <h4>Review Your Results</h4>
            <p>After each test, review your answers to learn from mistakes</p>
          </div>
          <div className="tip-card">
            <div className="tip-icon">🎯</div>
            <h4>Regular Practice</h4>
            <p>Take tests regularly to track your progress and improvement</p>
          </div>
        </div>
      </div>
    </div>
  );
}


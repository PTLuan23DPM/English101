"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface CultureActivity {
  id: string;
  title: string;
  instruction: string | null;
  level: string;
  type: string;
  maxScore: number | null;
  timeLimitSec: number | null;
  unitTitle: string;
  moduleTitle: string;
}

interface Article {
  id: string;
  title: string;
  html: string | null;
  plainText: string | null;
  summary: string | null;
  topics: Array<{
    id: string;
    slug: string;
    title: string;
  }>;
}

interface Question {
  id: string;
  order: number;
  type: string;
  prompt: string;
  score: number;
  content: Record<string, unknown>;
  choices: Array<{
    id: string;
    order: number;
    text: string;
    value: string;
  }>;
}

export default function CultureActivityPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const activityId = params?.activityId as string;

  const [activity, setActivity] = useState<CultureActivity | null>(null);
  const [article, setArticle] = useState<Article | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [result, setResult] = useState<{
    totalScore?: number;
    maxScore?: number;
    percentage?: number;
    answers?: Array<{
      isCorrect?: boolean;
      explanation?: string;
    }>;
  } | null>(null);
  const [fontScale, setFontScale] = useState(1);

  useEffect(() => {
    if (session?.user && activityId) {
      fetchActivity();
    }
  }, [session, activityId]);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/culture/${activityId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch activity");
      }
      const data = await response.json();
      setActivity(data.activity);
      setArticle(data.article);
      setQuestions(data.questions || []);
    } catch (error) {
      console.error("Error fetching activity:", error);
      toast.error("Failed to load activity");
      router.push("/english/culture");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!session?.user || !activityId) {
      toast.error("Please sign in to submit");
      return;
    }

    try {
      const response = await fetch(`/api/culture/${activityId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: questions.map((q) => ({
            questionId: q.id,
            chosenIds: answers[q.id] ? [answers[q.id]] : [],
            answerText: answers[q.id] || "",
          })),
          startTime: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit");
      }

      const data = await response.json();
      setResult(data);
      setShowResults(true);
      toast.success("Submitted successfully!");
    } catch (error) {
      console.error("Error submitting:", error);
      toast.error("Failed to submit");
    }
  };

  const decFont = () => setFontScale((n) => Math.max(0.8, +(n - 0.1).toFixed(2)));
  const incFont = () => setFontScale((n) => Math.min(1.5, +(n + 0.1).toFixed(2)));

  if (loading) {
    return (
      <div className="dashboard-content">
        <section className="card">
          <p>Loading activity...</p>
        </section>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="dashboard-content">
        <section className="card">
          <p>Activity not found</p>
        </section>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const totalQuestions = questions.length;
  const progress = totalQuestions > 0 ? ((currentQuestion + 1) / totalQuestions) * 100 : 0;
  const allAnswered = questions.every((q) => answers[q.id]);

  return (
    <div className="dashboard-content">
      <section className="reader">
        {/* Left: Article Content */}
        <div className="reader-main card">
          <div className="toolbar">
            <button
              className="btn sm"
              onClick={() => router.push("/english/culture")}
            >
              ← Back to Culture
            </button>
            <div className="spacer" />
            <div className="font-controls">
              <button className="btn sm" onClick={decFont}>A-</button>
              <button className="btn sm" onClick={incFont}>A+</button>
            </div>
          </div>

          <div className="progress">
            <div className="fill" style={{ width: "100%" }} />
          </div>

          <div className="reading" style={{ fontSize: `${fontScale}rem` }}>
            {article && (
              <>
                <h2>{article.title}</h2>
                {article.html ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: article.html }}
                    style={{ lineHeight: "1.6" }}
                  />
                ) : (
                  <p style={{ whiteSpace: "pre-wrap", lineHeight: "1.6" }}>
                    {article.plainText}
                  </p>
                )}
                {article.topics && article.topics.length > 0 && (
                  <div style={{ marginTop: "16px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {article.topics.map((topic) => (
                      <span key={topic.id} className="category-badge">
                        {topic.title}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right: Questions */}
        <aside className="reader-side card">
          <h3>Comprehension Questions</h3>

          {!showResults ? (
            <>
              <div className="progress" style={{ marginBottom: "16px" }}>
                <div className="fill" style={{ width: `${progress}%` }} />
              </div>

              {currentQ && (
                <div className="qcard">
                  <div className="qhead">
                    <span>Question {currentQuestion + 1} of {totalQuestions}</span>
                    <span className="muted">{currentQ.type.replace("_", " ")}</span>
                  </div>
                  <div className="qtext">{currentQ.prompt}</div>
                  <div className="opts">
                    {currentQ.choices.map((choice, i) => (
                      <label key={choice.id} className="opt">
                        <input
                          type="radio"
                          name={`q${currentQuestion}`}
                          checked={answers[currentQ.id] === choice.id}
                          onChange={() => handleAnswerSelect(currentQ.id, choice.id)}
                        />
                        <span>{choice.text}</span>
                      </label>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                    <button
                      className="btn sm"
                      onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                      disabled={currentQuestion === 0}
                    >
                      Previous
                    </button>
                    <button
                      className="btn sm"
                      onClick={() => setCurrentQuestion(Math.min(totalQuestions - 1, currentQuestion + 1))}
                      disabled={currentQuestion === totalQuestions - 1}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {currentQuestion === totalQuestions - 1 && allAnswered && (
                <button
                  className="btn primary"
                  onClick={handleSubmit}
                  style={{ width: "100%", marginTop: "16px" }}
                >
                  Submit Answers
                </button>
              )}
            </>
          ) : (
            <div>
              <h3>Results</h3>
              {result && (
                <div>
                  <p><strong>Score:</strong> {result.totalScore} / {result.maxScore}</p>
                  <p><strong>Percentage:</strong> {result.percentage}%</p>
                  <div style={{ marginTop: "16px" }}>
                    <h4>Answers:</h4>
                    {result.answers?.map((ans: { isCorrect?: boolean; explanation?: string }, idx: number) => (
                      <div key={idx} style={{ marginBottom: "12px", padding: "12px", background: ans.isCorrect ? "#d1fae5" : "#fee2e2", borderRadius: "8px" }}>
                        <p><strong>Question {idx + 1}:</strong> {ans.isCorrect ? "✓ Correct" : "✗ Incorrect"}</p>
                        {ans.explanation && <p className="muted">{ans.explanation}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button
                className="btn primary"
                onClick={() => router.push("/english/culture")}
                style={{ width: "100%", marginTop: "16px" }}
              >
                Back to Culture
              </button>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}


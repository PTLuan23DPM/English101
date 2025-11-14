"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface MediationActivity {
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

interface SourceContent {
  id: string;
  title: string;
  html: string | null;
  plainText: string | null;
  summary: string | null;
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

export default function MediationActivityPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const activityId = params?.activityId as string;

  const [activity, setActivity] = useState<MediationActivity | null>(null);
  const [sourceContent, setSourceContent] = useState<SourceContent | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{
    totalScore?: number;
    maxScore?: number;
    percentage?: number;
    feedback?: string | { overall?: string; suggestions?: string[] };
  } | null>(null);

  useEffect(() => {
    if (session?.user && activityId) {
      fetchActivity();
    }
  }, [session, activityId]);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/mediation/${activityId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch activity");
      }
      const data = await response.json();
      setActivity(data.activity);
      setSourceContent(data.sourceContent);
      setQuestions(data.questions || []);
      
      // If there's a text question, initialize text area
      if (data.questions?.some((q: Question) => q.type === "LONG_TEXT" || q.type === "SHORT_TEXT")) {
        setText("");
      }
    } catch (error) {
      console.error("Error fetching activity:", error);
      toast.error("Failed to load activity");
      router.push("/english/mediation");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!session?.user || !activityId) {
      toast.error("Please sign in to submit");
      return;
    }

    if (!text.trim()) {
      toast.error("Please write your response");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/mediation/${activityId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: questions.map((q) => ({
            questionId: q.id,
            answerText: text,
            chosenIds: [],
          })),
          startTime: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit");
      }

      const data = await response.json();
      setResult(data);
      setSubmitted(true);
      toast.success("Submitted successfully!");
    } catch (error) {
      console.error("Error submitting:", error);
      toast.error("Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

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

  return (
    <div className="dashboard-content">
      <section className="card">
        <div style={{ marginBottom: "16px" }}>
          <button
            className="btn sm"
            onClick={() => router.push("/english/mediation")}
          >
            ← Back to Mediation
          </button>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <h1>{activity.title}</h1>
          <p className="muted">{activity.instruction || "Complete the mediation task"}</p>
          <div style={{ display: "flex", gap: "16px", marginTop: "12px" }}>
            <span className={`level-badge level-${activity.level.toLowerCase()}`}>
              {activity.level}
            </span>
            <span className="muted">{activity.type}</span>
          </div>
        </div>

        {/* Source Content */}
        {sourceContent && (
          <div className="card soft" style={{ marginBottom: "24px", padding: "20px" }}>
            <h3 style={{ marginBottom: "16px" }}>Source Text</h3>
            {sourceContent.html ? (
              <div
                dangerouslySetInnerHTML={{ __html: sourceContent.html }}
                style={{ lineHeight: "1.6" }}
              />
            ) : (
              <p style={{ whiteSpace: "pre-wrap", lineHeight: "1.6" }}>
                {sourceContent.plainText}
              </p>
            )}
          </div>
        )}

        {/* Response Area */}
        {!submitted ? (
          <div className="card" style={{ marginBottom: "24px" }}>
            <h3 style={{ marginBottom: "16px" }}>Your Response</h3>
            <p className="muted" style={{ marginBottom: "12px" }}>
              {activity.type === "MEDIATION_SUMMARIZE" && "Write a summary of the text above (50-80 words). Focus on the main points and key information."}
              {activity.type === "MEDIATION_REPHRASE" && "Rewrite the text in your own words. Maintain the essential information but use different phrasing."}
              {activity.type === "MEDIATION_TRANSLATE" && "Explain the main concepts in simpler English, as if explaining to someone learning the language."}
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write your response here..."
              style={{
                width: "100%",
                minHeight: "200px",
                padding: "12px",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                fontSize: "14px",
                fontFamily: "inherit",
                lineHeight: "1.6",
              }}
            />
            <div style={{ marginTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="muted">Words: {text.trim().split(/\s+/).filter(Boolean).length}</span>
              <button
                className="btn primary"
                onClick={handleSubmit}
                disabled={submitting || !text.trim()}
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        ) : (
          <div className="card" style={{ marginBottom: "24px" }}>
            <h3 style={{ marginBottom: "16px" }}>Results</h3>
            {result && (
              <div>
                <p><strong>Score:</strong> {result.totalScore} / {result.maxScore}</p>
                <p><strong>Percentage:</strong> {result.percentage}%</p>
                {result.feedback && (
                  <div style={{ marginTop: "16px" }}>
                    <h4>Feedback:</h4>
                    <p>{typeof result.feedback === 'string' ? result.feedback : result.feedback.overall || ""}</p>
                  </div>
                )}
              </div>
            )}
            <button
              className="btn primary"
              onClick={() => router.push("/english/mediation")}
              style={{ marginTop: "16px" }}
            >
              Back to Mediation
            </button>
          </div>
        )}
      </section>
    </div>
  );
}


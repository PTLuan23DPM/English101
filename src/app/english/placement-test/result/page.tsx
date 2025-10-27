"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

const LEVEL_INFO: Record<string, {
  title: string;
  description: string;
  color: string;
  gradient: string;
  recommendations: string[];
}> = {
  A1: {
    title: "Beginner",
    description: "You can understand and use familiar everyday expressions and very basic phrases.",
    color: "#3b82f6",
    gradient: "linear-gradient(135deg, #3b82f6, #60a5fa)",
    recommendations: [
      "Start with basic grammar and vocabulary",
      "Focus on simple conversations",
      "Practice listening to slow, clear speech",
    ],
  },
  A2: {
    title: "Elementary",
    description: "You can communicate in simple routine tasks requiring direct exchange of information.",
    color: "#10b981",
    gradient: "linear-gradient(135deg, #10b981, #34d399)",
    recommendations: [
      "Expand your vocabulary",
      "Practice past and future tenses",
      "Read simple texts and stories",
    ],
  },
  B1: {
    title: "Intermediate",
    description: "You can understand main points of clear standard input on familiar matters.",
    color: "#f59e0b",
    gradient: "linear-gradient(135deg, #f59e0b, #fbbf24)",
    recommendations: [
      "Practice more complex conversations",
      "Read longer texts and articles",
      "Focus on fluency and natural expression",
    ],
  },
  B2: {
    title: "Upper Intermediate",
    description: "You can interact with a degree of fluency and spontaneity with native speakers.",
    color: "#f97316",
    gradient: "linear-gradient(135deg, #f97316, #fb923c)",
    recommendations: [
      "Engage in detailed discussions",
      "Read academic and professional texts",
      "Write structured essays",
    ],
  },
  C1: {
    title: "Advanced",
    description: "You can express yourself fluently and spontaneously without obvious searching.",
    color: "#8b5cf6",
    gradient: "linear-gradient(135deg, #8b5cf6, #a78bfa)",
    recommendations: [
      "Perfect your fluency and accuracy",
      "Study idiomatic expressions",
      "Engage in academic discussions",
    ],
  },
  C2: {
    title: "Proficient",
    description: "You can understand virtually everything heard or read with ease.",
    color: "#ec4899",
    gradient: "linear-gradient(135deg, #ec4899, #f472b6)",
    recommendations: [
      "Maintain your level through practice",
      "Explore literature and complex texts",
      "Teach or help others learn English",
    ],
  },
};

function ResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const level = searchParams.get("level") || "A1";
  const score = parseInt(searchParams.get("score") || "0");
  const total = 10;
  const percentage = Math.round((score / total) * 100);

  const levelInfo = LEVEL_INFO[level] || LEVEL_INFO["A1"];

  return (
    <div className="dashboard-content">
      {/* Result Hero */}
      <div className="card" style={{ background: levelInfo.gradient, color: "white", padding: "48px", textAlign: "center" }}>
        <div style={{ fontSize: "72px", marginBottom: "16px" }}>🎉</div>
        <h1 style={{ fontSize: "42px", marginBottom: "12px", color: "white" }}>
          Congratulations!
        </h1>
        <p style={{ fontSize: "20px", opacity: 0.95, marginBottom: "32px" }}>
          You've completed the CEFR Placement Test
        </p>
        
        <div style={{ display: "inline-block", padding: "20px 40px", background: "rgba(255,255,255,0.2)", borderRadius: "16px", backdropFilter: "blur(10px)" }}>
          <div style={{ fontSize: "18px", opacity: 0.95, marginBottom: "8px" }}>Your Level</div>
          <div style={{ fontSize: "56px", fontWeight: "800", letterSpacing: "-0.02em" }}>
            {level}
          </div>
          <div style={{ fontSize: "24px", fontWeight: "600", marginTop: "4px" }}>
            {levelInfo.title}
          </div>
        </div>

        <div style={{ marginTop: "32px", display: "flex", gap: "40px", justifyContent: "center" }}>
          <div>
            <div style={{ fontSize: "36px", fontWeight: "700" }}>{score}/{total}</div>
            <div style={{ fontSize: "14px", opacity: 0.9 }}>Correct Answers</div>
          </div>
          <div>
            <div style={{ fontSize: "36px", fontWeight: "700" }}>{percentage}%</div>
            <div style={{ fontSize: "14px", opacity: 0.9 }}>Score</div>
          </div>
        </div>
      </div>

      {/* Level Description */}
      <div className="card">
        <h2 style={{ marginBottom: "16px" }}>What This Level Means</h2>
        <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#64748b" }}>
          {levelInfo.description}
        </p>
      </div>

      {/* Recommendations */}
      <div className="card">
        <h2 style={{ marginBottom: "24px" }}>Recommended Next Steps</h2>
        <div style={{ display: "grid", gap: "16px" }}>
          {levelInfo.recommendations.map((rec, idx) => (
            <div
              key={idx}
              style={{
                padding: "16px 20px",
                background: "#f8fafc",
                borderRadius: "12px",
                borderLeft: `4px solid ${levelInfo.color}`,
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: levelInfo.color,
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "700",
                  flexShrink: 0,
                }}
              >
                {idx + 1}
              </div>
              <p style={{ margin: 0, fontSize: "15px", lineHeight: "1.6" }}>{rec}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Skills to Focus On */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🎧</div>
          <h3 style={{ marginBottom: "8px" }}>Listening</h3>
          <p className="muted" style={{ fontSize: "14px", marginBottom: "16px" }}>
            Improve your listening comprehension
          </p>
          <button className="btn primary w-full" onClick={() => router.push("/english/listening")}>
            Start Listening
          </button>
        </div>

        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>📖</div>
          <h3 style={{ marginBottom: "8px" }}>Reading</h3>
          <p className="muted" style={{ fontSize: "14px", marginBottom: "16px" }}>
            Enhance reading skills
          </p>
          <button className="btn primary w-full" onClick={() => router.push("/english/reading")}>
            Start Reading
          </button>
        </div>

        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>✍️</div>
          <h3 style={{ marginBottom: "8px" }}>Writing</h3>
          <p className="muted" style={{ fontSize: "14px", marginBottom: "16px" }}>
            Practice writing skills
          </p>
          <button className="btn primary w-full" onClick={() => router.push("/english/writing")}>
            Start Writing
          </button>
        </div>

        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🗣️</div>
          <h3 style={{ marginBottom: "8px" }}>Speaking</h3>
          <p className="muted" style={{ fontSize: "14px", marginBottom: "16px" }}>
            Develop speaking confidence
          </p>
          <button className="btn primary w-full" onClick={() => router.push("/english/speaking")}>
            Start Speaking
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "16px", justifyContent: "center", marginTop: "32px" }}>
        <button className="btn outline" onClick={() => router.push("/english/placement-test")}>
          Retake Test
        </button>
        <button className="btn primary" onClick={() => router.push("/english/dashboard")}>
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}

export default function PlacementTestResultPage() {
  return (
    <Suspense fallback={<div className="dashboard-content">Loading results...</div>}>
      <ResultContent />
    </Suspense>
  );
}


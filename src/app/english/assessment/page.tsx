"use client";

import { useState } from "react";
import Link from "next/link";

type AssessmentType = "placement" | "mock_test" | "skill_test" | "progress_check";

interface Assessment {
  id: string;
  title: string;
  type: AssessmentType;
  description: string;
  duration: string;
  questions: number;
  taken: boolean;
  lastScore?: number;
}

const ASSESSMENTS: Assessment[] = [
  { id: "1", title: "CEFR Level Placement Test", type: "placement", description: "Determine your current English level (A1-C2)", duration: "45 min", questions: 60, taken: true, lastScore: 75 },
  { id: "2", title: "Listening Skills Assessment", type: "skill_test", description: "Evaluate your listening comprehension", duration: "30 min", questions: 25, taken: false },
  { id: "3", title: "Reading Comprehension Test", type: "skill_test", description: "Assess reading skills across different text types", duration: "40 min", questions: 30, taken: true, lastScore: 82 },
  { id: "4", title: "Writing Proficiency Exam", type: "skill_test", description: "Test your writing ability at your level", duration: "60 min", questions: 4, taken: false },
  { id: "5", title: "Speaking Evaluation", type: "skill_test", description: "Record responses to speaking prompts", duration: "20 min", questions: 8, taken: false },
  { id: "6", title: "Grammar & Vocabulary Test", type: "skill_test", description: "Comprehensive language knowledge test", duration: "35 min", questions: 50, taken: false },
  { id: "7", title: "IELTS Practice Test (Academic)", type: "mock_test", description: "Full IELTS simulation", duration: "165 min", questions: 160, taken: false },
  { id: "8", title: "TOEFL iBT Practice", type: "mock_test", description: "Complete TOEFL simulation", duration: "180 min", questions: 140, taken: false },
  { id: "9", title: "Monthly Progress Check", type: "progress_check", description: "Track your monthly improvement", duration: "30 min", questions: 40, taken: true, lastScore: 78 },
];

export default function AssessmentPage() {
  const [selectedType, setSelectedType] = useState<AssessmentType | "all">("all");
  const filteredAssessments = ASSESSMENTS.filter(a => selectedType === "all" || a.type === selectedType);
  const stats = {
    total: ASSESSMENTS.length,
    taken: ASSESSMENTS.filter(a => a.taken).length,
    avgScore: ASSESSMENTS.filter(a => a.lastScore).reduce((sum, a) => sum + (a.lastScore || 0), 0) / ASSESSMENTS.filter(a => a.lastScore).length || 0,
  };

  return (
    <div className="dashboard-content">
      <section className="card page-head">
        <div>
          <h1>Assessment & Testing</h1>
          <p className="muted">Evaluate your English proficiency with comprehensive tests</p>
        </div>
        <div className="head-actions">
          <div className="stats" style={{ gap: "16px" }}>
            <div className="stat"><span className="stat-val">{stats.taken}</span><span className="stat-lbl">Completed</span></div>
            <div className="stat"><span className="stat-val">{Math.round(stats.avgScore)}%</span><span className="stat-lbl">Avg Score</span></div>
            <div className="stat"><span className="stat-val">{stats.total}</span><span className="stat-lbl">Total Tests</span></div>
          </div>
        </div>
      </section>

      <section className="card">
        <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>Test Type</label>
        <select className="select" value={selectedType} onChange={(e) => setSelectedType(e.target.value as AssessmentType | "all")} style={{ width: "100%", maxWidth: "300px" }}>
          <option value="all">All Types</option>
          <option value="placement">Placement Tests</option>
          <option value="skill_test">Skill Tests</option>
          <option value="mock_test">Mock Exams</option>
          <option value="progress_check">Progress Checks</option>
        </select>
      </section>

      <div className="module-grid">
        {filteredAssessments.map(assessment => (
          <Link href={`/english/assessment/${assessment.id}`} key={assessment.id} className="module-card" style={{ textDecoration: "none" }}>
            <div className="module-card-header">
              <div className="module-meta">
                <span className="category-badge">{assessment.type.replace('_', ' ')}</span>
              </div>
              {assessment.taken && assessment.lastScore && (
                <span className="completion-badge">Score: {assessment.lastScore}%</span>
              )}
            </div>
            <h3 className="module-title">{assessment.title}</h3>
            <p className="module-description">{assessment.description}</p>
            <div className="module-stats">
              <div className="module-stat"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M8 4V8L11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg><span>{assessment.duration}</span></div>
              <div className="module-stat"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4H14V12H2V4Z" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg><span>{assessment.questions} questions</span></div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}


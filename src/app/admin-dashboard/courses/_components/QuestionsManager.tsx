"use client";

import { useState, useEffect } from "react";

interface Question {
  id: string;
  activityId: string;
  order: number;
  type: string;
  prompt: string;
  explanation: string | null;
  score: number;
  activity: {
    id: string;
    title: string;
  };
  choices: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
  }>;
  answers: Array<{
    id: string;
    key: string;
  }>;
}

interface Activity {
  id: string;
  title: string;
  unit: {
    module: {
      code: string;
    };
  };
}

export default function QuestionsManager() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<string>("");

  useEffect(() => {
    fetchActivities();
    fetchQuestions();
  }, []);

  useEffect(() => {
    if (selectedActivity) {
      fetchQuestions();
    }
  }, [selectedActivity]);

  const fetchActivities = async () => {
    try {
      const response = await fetch("/api/admin-dashboard/courses/activities");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setActivities(data.activities);
        }
      }
    } catch (err) {
      console.error("Error fetching activities:", err);
    }
  };

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = selectedActivity ? `?activityId=${selectedActivity}` : "";
      const response = await fetch(`/api/admin-dashboard/courses/questions${params}`);
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          const text = await response.text().catch(() => "");
          if (text) errorMessage = text;
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      if (data.success) {
        setQuestions(data.questions);
      } else {
        throw new Error(data.error || "Invalid response format");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      console.error("Error fetching questions:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredQuestions = selectedActivity
    ? questions.filter((q) => q.activityId === selectedActivity)
    : questions;

  if (loading) {
    return <div className="manager-loading">Đang tải dữ liệu...</div>;
  }

  if (error) {
    return (
      <div className="manager-error">
        <p><strong>Lỗi:</strong> {error}</p>
        <button onClick={fetchQuestions} className="retry-button">Thử lại</button>
      </div>
    );
  }

  return (
    <div className="questions-manager">
      <div className="manager-header">
        <h2>Quản Lý Questions (Câu Hỏi)</h2>
      </div>

      <div className="manager-filters">
        <select
          value={selectedActivity}
          onChange={(e) => setSelectedActivity(e.target.value)}
          className="filter-select"
        >
          <option value="">Tất cả activities</option>
          {activities.map((activity) => (
            <option key={activity.id} value={activity.id}>
              {activity.title}
            </option>
          ))}
        </select>
      </div>

      <div className="questions-list">
        {filteredQuestions.length === 0 ? (
          <div className="empty-state">Chưa có question nào</div>
        ) : (
          filteredQuestions.map((question) => (
            <div key={question.id} className="question-card">
              <div className="question-header">
                <h3>Question #{question.order}</h3>
                <div className="question-badges">
                  <span className="type-badge">{question.type}</span>
                  <span className="score-badge">Score: {question.score}</span>
                </div>
              </div>
              <div className="question-meta">
                <span>Activity: {question.activity.title}</span>
              </div>
              <div className="question-prompt" dangerouslySetInnerHTML={{ __html: question.prompt }} />
              {question.choices.length > 0 && (
                <div className="question-choices">
                  <strong>Choices:</strong>
                  <ul>
                    {question.choices.map((choice) => (
                      <li key={choice.id} className={choice.isCorrect ? "correct-choice" : ""}>
                        {choice.text} {choice.isCorrect && "✓"}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {question.answers.length > 0 && (
                <div className="question-answers">
                  <strong>Answers:</strong>
                  <ul>
                    {question.answers.map((answer) => (
                      <li key={answer.id}>{answer.key}</li>
                    ))}
                  </ul>
                </div>
              )}
              {question.explanation && (
                <div className="question-explanation">
                  <strong>Explanation:</strong>
                  <p>{question.explanation}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}


"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

interface ReviewData {
  summary: string;
  mainPoints: string[];
  onTopicScore: number;
  onTopicExplanation: string;
  feedback: string;
}

interface Props {
  text: string;
  topic: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function SelfReviewModal({ text, topic, isOpen, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState<ReviewData | null>(null);

  useEffect(() => {
    if (isOpen && text && !review) {
      generateReview();
    }
  }, [isOpen]);

  const generateReview = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/writing/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, topic }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate review");
      }

      const data: ReviewData = await response.json();
      
      // Validate response data
      if (!data) {
        throw new Error("Invalid response: empty data");
      }
      
      // Ensure all required fields exist with defaults
      const validatedData: ReviewData = {
        summary: data.summary || "Unable to generate summary.",
        mainPoints: Array.isArray(data.mainPoints) ? data.mainPoints : [],
        onTopicScore: typeof data.onTopicScore === "number" ? data.onTopicScore : 5,
        onTopicExplanation: data.onTopicExplanation || "Unable to assess on-topic score.",
        feedback: data.feedback || "Unable to generate feedback.",
      };
      
      setReview(validatedData);
    } catch (error) {
      console.error("Review error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate review");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="ai-modal-overlay" onClick={onClose}>
      <div className="ai-modal review-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ai-modal-header">
          <h3>📋 Self-Review</h3>
          <button onClick={onClose} className="close-btn">
            ×
          </button>
        </div>

        <div className="ai-modal-content">
          {loading ? (
            <div className="loading-state">
              <svg className="spinner" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
              </svg>
              <p>Analyzing your writing...</p>
            </div>
          ) : review ? (
            <>
              {/* On-Topic Score */}
              <div className="review-score">
                <div className="score-circle">
                  <svg viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="8"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke={review.onTopicScore >= 7 ? "#22c55e" : review.onTopicScore >= 5 ? "#f59e0b" : "#ef4444"}
                      strokeWidth="8"
                      strokeDasharray={`${(review.onTopicScore / 10) * 283} 283`}
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                  <div className="score-text">
                    <strong>{review.onTopicScore}</strong>
                    <small>/10</small>
                  </div>
                </div>
                <div className="score-info">
                  <h4>On-Topic Score</h4>
                  <p>{review.onTopicExplanation}</p>
                </div>
              </div>

              {/* Summary */}
              <div className="review-section">
                <h4>Summary</h4>
                <p>{review.summary}</p>
              </div>

              {/* Main Points */}
              <div className="review-section">
                <h4>Main Points Covered</h4>
                <ul>
                  {review.mainPoints.map((point, idx) => (
                    <li key={idx}>{point}</li>
                  ))}
                </ul>
              </div>

              {/* Feedback */}
              <div className="review-section">
                <h4>Feedback</h4>
                <p>{review.feedback}</p>
              </div>
            </>
          ) : null}
        </div>

        <div className="ai-modal-footer">
          <button onClick={onClose} className="primary-btn">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


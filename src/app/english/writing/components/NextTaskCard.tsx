"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

interface RecommendedTask {
  type: string;
  level: string;
  focusAreas: string[];
  reasoning: string;
}

interface Feedback {
  strengths: string[];
  weaknesses: string[];
  overallComment: string;
}

interface NextTaskData {
  recommendedTask: RecommendedTask;
  specificSuggestions: string[];
  feedback?: Feedback;
}

interface Props {
  userId: string;
  level: string;
  lastScore: number;
  errorProfile: {
    taskResponse?: number;
    coherence?: number;
    lexical?: number;
    grammar?: number;
  };
  scoringFeedback?: {
    taskResponse?: string[];
    coherence?: string[];
    lexical?: string[];
    grammar?: string[];
  };
}

export default function NextTaskCard({ userId, level, lastScore, errorProfile, scoringFeedback }: Props) {
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<NextTaskData | null>(null);

  useEffect(() => {
    if (userId && lastScore) {
      getRecommendation();
    }
  }, [userId, lastScore]);

  const getRecommendation = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/writing/next-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          level,
          lastScore,
          errorProfile,
          scoringFeedback,
        }),
      });

      if (!response.ok) {
        let errorMessage = "Failed to get recommendation";
        const statusCode = response.status;
        
        try {
          const error = await response.json();
          errorMessage = error.error?.message || error.error || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        
        // Handle specific error cases - don't throw, just set recommendation to null
        if (statusCode === 503 || 
            statusCode === 502 || 
            statusCode === 504 ||
            errorMessage.toLowerCase().includes("unavailable") || 
            errorMessage.toLowerCase().includes("overloaded") ||
            errorMessage.toLowerCase().includes("service unavailable") ||
            errorMessage.toLowerCase().includes("bad gateway") ||
            errorMessage.toLowerCase().includes("gateway timeout")) {
          // Don't throw - just set recommendation to null and show toast
          setRecommendation(null);
          toast.error("AI service is temporarily unavailable. Please try again in a moment.", {
            duration: 5000,
            description: "The recommendation feature will be available shortly.",
          });
          return;
        }
        
        if (statusCode === 429 || 
            errorMessage.toLowerCase().includes("quota") || 
            errorMessage.toLowerCase().includes("rate limit") ||
            errorMessage.toLowerCase().includes("too many requests")) {
          // Don't throw - just set recommendation to null and show toast
          setRecommendation(null);
          toast.error("Too many requests. Please wait a moment and try again.", {
            duration: 5000,
          });
          return;
        }
        
        // For other errors, also don't throw - just set to null
        setRecommendation(null);
        toast.error("Unable to get recommendation at this time. Please try again later.", {
          duration: 4000,
        });
        return;
      }

      const data: NextTaskData = await response.json();
      
      console.log("[NextTaskCard] Received data:", data);
      
      // Validate response data - be more lenient with missing fields
      if (!data) {
        console.error("[NextTaskCard] Empty response data");
        throw new Error("Invalid response: empty data");
      }
      
      // If recommendedTask is missing, use defaults
      if (!data.recommendedTask) {
        console.warn("[NextTaskCard] Missing recommendedTask, using defaults");
        const defaultData: NextTaskData = {
          recommendedTask: {
            type: "Writing Task",
            level: level,
            focusAreas: ["General improvement"],
            reasoning: "This task will help you improve your writing skills based on your performance.",
          },
          specificSuggestions: data.specificSuggestions || [],
          feedback: data.feedback ? {
            strengths: Array.isArray(data.feedback.strengths) ? data.feedback.strengths : [],
            weaknesses: Array.isArray(data.feedback.weaknesses) ? data.feedback.weaknesses : [],
            overallComment: data.feedback.overallComment || "",
          } : undefined,
        };
        setRecommendation(defaultData);
        return;
      }
      
      // Ensure all required fields exist with defaults
      const validatedData: NextTaskData = {
        recommendedTask: {
          type: data.recommendedTask.type || "Writing Task",
          level: data.recommendedTask.level || level,
          focusAreas: Array.isArray(data.recommendedTask.focusAreas) 
            ? data.recommendedTask.focusAreas 
            : [],
          reasoning: data.recommendedTask.reasoning || "This task will help you improve your writing skills.",
        },
        specificSuggestions: Array.isArray(data.specificSuggestions) 
          ? data.specificSuggestions 
          : [],
        feedback: data.feedback ? {
          strengths: Array.isArray(data.feedback.strengths) ? data.feedback.strengths : [],
          weaknesses: Array.isArray(data.feedback.weaknesses) ? data.feedback.weaknesses : [],
          overallComment: data.feedback.overallComment || "",
        } : undefined,
      };
      
      setRecommendation(validatedData);
    } catch (error) {
      console.error("Next task error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to get recommendation";
      const errorMessageLower = errorMessage.toLowerCase();
      
      // Handle specific error cases with user-friendly messages
      if (errorMessageLower.includes("temporarily unavailable") || 
          errorMessageLower.includes("unavailable") ||
          errorMessageLower.includes("overloaded") || 
          errorMessageLower.includes("service unavailable") ||
          errorMessageLower.includes("bad gateway") ||
          errorMessageLower.includes("gateway timeout")) {
        toast.error("AI service is temporarily unavailable. Please try again in a moment.", {
          duration: 5000,
          description: "The recommendation feature will be available shortly.",
        });
      } else if (errorMessageLower.includes("too many requests") || 
                 errorMessageLower.includes("quota") || 
                 errorMessageLower.includes("rate limit")) {
        toast.error("Too many requests. Please wait a moment and try again.", {
          duration: 5000,
        });
      } else if (errorMessageLower.includes("max_tokens") || 
                 errorMessageLower.includes("token limit") ||
                 errorMessageLower.includes("truncated")) {
        toast.error("Response too long. Please try again with a shorter writing sample.", {
          duration: 5000,
        });
      } else if (errorMessageLower.includes("not configured") ||
                 errorMessageLower.includes("api key")) {
        toast.error("AI service is not configured. Please contact support.", {
          duration: 5000,
        });
      } else {
        // Generic error - show user-friendly message
        toast.error("Unable to get recommendation at this time. Please try again later.", {
          duration: 4000,
          description: errorMessage.length > 100 ? errorMessage.substring(0, 100) + "..." : errorMessage,
        });
      }
      
      // Don't show the card if there's an error
      setRecommendation(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="next-task-card loading">
        <svg className="spinner" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
        </svg>
        <p>Finding best task for you...</p>
      </div>
    );
  }

  if (!recommendation || !recommendation.recommendedTask) return null;

  const { recommendedTask, specificSuggestions, feedback } = recommendation;

  if (!recommendedTask.type || !recommendedTask.level) {
    console.error("Invalid recommendation data:", recommendation);
    return null;
  }

  return (
    <div className="next-task-card">
      <div className="next-task-header">
        <h3>🎯 Recommended Next Task</h3>
      </div>

      <div className="next-task-content">
        <div className="task-overview">
          <div className="task-badge">
            <span className="task-type">{recommendedTask.type || "Writing Task"}</span>
            <span className="task-level">{recommendedTask.level || level}</span>
          </div>
          <p className="task-reasoning">{recommendedTask.reasoning || "Based on your performance, this task will help you improve."}</p>
        </div>

        {recommendedTask.focusAreas && recommendedTask.focusAreas.length > 0 && (
          <div className="focus-areas">
            <h4>Focus on:</h4>
            <div className="focus-tags">
              {recommendedTask.focusAreas.map((area, idx) => (
                <span key={idx} className="focus-tag">
                  {area}
                </span>
              ))}
            </div>
          </div>
        )}

        {specificSuggestions.length > 0 && (
          <div className="suggestions">
            <h4>Tips:</h4>
            <ul>
              {specificSuggestions.map((suggestion, idx) => (
                <li key={idx}>{suggestion}</li>
              ))}
            </ul>
          </div>
        )}

        {feedback && (
          <div className="feedback-section">
            <h4>📝 Performance Feedback</h4>
            
            {feedback.overallComment && (
              <div className="feedback-overall">
                <p>{feedback.overallComment}</p>
              </div>
            )}

            {feedback.strengths && feedback.strengths.length > 0 && (
              <div className="feedback-strengths">
                <h5>✅ Strengths:</h5>
                <ul>
                  {feedback.strengths.map((strength, idx) => (
                    <li key={idx}>{strength}</li>
                  ))}
                </ul>
              </div>
            )}

            {feedback.weaknesses && feedback.weaknesses.length > 0 && (
              <div className="feedback-weaknesses">
                <h5>💪 Areas to Improve:</h5>
                <ul>
                  {feedback.weaknesses.map((weakness, idx) => (
                    <li key={idx}>{weakness}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="next-task-footer">
        <button className="primary-btn" onClick={() => window.location.reload()}>
          Start This Task
        </button>
      </div>
    </div>
  );
}


"use client";

import { useState } from "react";
import { toast } from "sonner";

interface AIAssistantProps {
  text: string;
  onSuggestionAccept?: (suggestion: string) => void;
}

interface GrammarIssue {
  type: string;
  message: string;
  sentence_index: number;
  severity: "error" | "warning" | "info";
}

interface Suggestion {
  type: "grammar" | "vocabulary" | "structure" | "coherence";
  message: string;
  example?: string;
}

export default function AIAssistant({ text, onSuggestionAccept }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [grammarIssues, setGrammarIssues] = useState<GrammarIssue[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeTab, setActiveTab] = useState<"grammar" | "suggestions">("grammar");

  const checkGrammar = async () => {
    if (!text || text.trim().length < 10) {
      toast.error("Not enough text", {
        description: "Write at least a few sentences to check grammar",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:5001/grammar-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error("Grammar check failed");
      }

      const data = await response.json();
      setGrammarIssues(data.issues || []);
      setActiveTab("grammar");

      if (data.issues.length === 0) {
        toast.success("Great work!", {
          description: "No grammar issues found!",
        });
      } else {
        toast.info(`Found ${data.issues.length} issue(s)`, {
          description: "Check the AI Assistant panel for details",
        });
      }
    } catch (error) {
      console.error("Grammar check error:", error);
      toast.error("Grammar check failed", {
        description: "Make sure the Python service is running",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSuggestions = async () => {
    if (!text || text.trim().length < 50) {
      toast.error("Not enough text", {
        description: "Write at least a paragraph to get suggestions",
      });
      return;
    }

    setLoading(true);
    try {
      // Generate suggestions based on analysis
      const wordCount = text.split(" ").length;
      const sentenceCount = text.split(/[.!?]+/).length;
      const avgSentenceLength = wordCount / sentenceCount;

      const newSuggestions: Suggestion[] = [];

      // Word count suggestion
      if (wordCount < 250) {
        newSuggestions.push({
          type: "structure",
          message: `Your essay is ${wordCount} words. Aim for at least 250 words for IELTS Task 2.`,
          example: "Add more supporting details and examples to your arguments.",
        });
      }

      // Sentence length suggestion
      if (avgSentenceLength < 10) {
        newSuggestions.push({
          type: "grammar",
          message: "Your sentences are quite short. Try combining some with conjunctions.",
          example: "Instead of: 'I like reading. It is fun.' Try: 'I like reading because it is fun.'",
        });
      } else if (avgSentenceLength > 25) {
        newSuggestions.push({
          type: "grammar",
          message: "Some sentences are very long. Consider breaking them into shorter ones for clarity.",
        });
      }

      // Vocabulary suggestion
      const commonWords = ["very", "good", "bad", "nice", "thing"];
      const hasCommonWords = commonWords.some((word) =>
        text.toLowerCase().includes(word)
      );
      if (hasCommonWords) {
        newSuggestions.push({
          type: "vocabulary",
          message: "Consider using more academic or varied vocabulary.",
          example: "Instead of 'very good', try 'excellent', 'outstanding', or 'remarkable'.",
        });
      }

      // Paragraph suggestion
      const paragraphs = text.split("\n\n").filter((p) => p.trim());
      if (paragraphs.length < 3) {
        newSuggestions.push({
          type: "structure",
          message: "Essays typically have 4-5 paragraphs: Introduction, 2-3 body paragraphs, and a conclusion.",
          example: "Organize your ideas into clear paragraphs with one main idea each.",
        });
      }

      // Coherence suggestion
      const hasTransitions = /\b(however|moreover|therefore|furthermore|in addition|consequently)\b/i.test(
        text
      );
      if (!hasTransitions) {
        newSuggestions.push({
          type: "coherence",
          message: "Use linking words to connect your ideas.",
          example: "Examples: However, Moreover, Therefore, Furthermore, In addition, Consequently",
        });
      }

      setSuggestions(newSuggestions);
      setActiveTab("suggestions");

      toast.success("Suggestions generated!", {
        description: `Found ${newSuggestions.length} ways to improve your writing`,
      });
    } catch (error) {
      console.error("Suggestions error:", error);
      toast.error("Failed to generate suggestions");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`ai-assistant ${isOpen ? "open" : ""}`}>
      {/* Toggle Button */}
      <button
        className="ai-assistant__toggle"
        onClick={() => setIsOpen(!isOpen)}
        title="AI Assistant"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2L2 7L12 12L22 7L12 2Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M2 17L12 22L22 17"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M2 12L12 17L22 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>AI Assistant</span>
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="ai-assistant__panel">
          <div className="ai-assistant__header">
            <h3>✨ AI Assistant</h3>
            <button className="ai-assistant__close" onClick={() => setIsOpen(false)}>
              ×
            </button>
          </div>

          <div className="ai-assistant__actions">
            <button
              className="ai-action-btn"
              onClick={checkGrammar}
              disabled={loading || !text}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 11L12 14L22 4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M21 12V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3H16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Check Grammar
            </button>

            <button
              className="ai-action-btn"
              onClick={getSuggestions}
              disabled={loading || !text}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M21 15C21 15.5 20.8 16 20.4 16.4C20 16.8 19.5 17 19 17H7L3 21V5C3 4.5 3.2 4 3.6 3.6C4 3.2 4.5 3 5 3H19C19.5 3 20 3.2 20.4 3.6C20.8 4 21 4.5 21 5V15Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Get Suggestions
            </button>
          </div>

          {/* Tabs */}
          <div className="ai-assistant__tabs">
            <button
              className={`ai-tab ${activeTab === "grammar" ? "active" : ""}`}
              onClick={() => setActiveTab("grammar")}
            >
              Grammar ({grammarIssues.length})
            </button>
            <button
              className={`ai-tab ${activeTab === "suggestions" ? "active" : ""}`}
              onClick={() => setActiveTab("suggestions")}
            >
              Suggestions ({suggestions.length})
            </button>
          </div>

          {/* Content */}
          <div className="ai-assistant__content">
            {loading ? (
              <div className="ai-loading">
                <div className="spinner"></div>
                <p>Analyzing your writing...</p>
              </div>
            ) : activeTab === "grammar" ? (
              <div className="ai-grammar">
                {grammarIssues.length === 0 ? (
                  <div className="ai-empty">
                    <p>✅ No grammar issues found</p>
                    <span>Click "Check Grammar" to analyze your text</span>
                  </div>
                ) : (
                  grammarIssues.map((issue, index) => (
                    <div key={index} className={`ai-issue ai-issue--${issue.severity}`}>
                      <div className="ai-issue__type">{issue.type}</div>
                      <div className="ai-issue__message">{issue.message}</div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="ai-suggestions">
                {suggestions.length === 0 ? (
                  <div className="ai-empty">
                    <p>💡 No suggestions yet</p>
                    <span>Click "Get Suggestions" to improve your writing</span>
                  </div>
                ) : (
                  suggestions.map((suggestion, index) => (
                    <div key={index} className={`ai-suggestion ai-suggestion--${suggestion.type}`}>
                      <div className="ai-suggestion__header">
                        <span className="ai-suggestion__type">{suggestion.type}</span>
                      </div>
                      <div className="ai-suggestion__message">{suggestion.message}</div>
                      {suggestion.example && (
                        <div className="ai-suggestion__example">
                          <strong>Example:</strong> {suggestion.example}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


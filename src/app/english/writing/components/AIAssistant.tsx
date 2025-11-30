"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

interface AIAssistantProps {
  text: string;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  onSuggestionAccept?: (replacement: string, offset: number, length: number) => void;
}

interface GrammarIssue {
  type: string;
  message: string;
  short_message?: string;
  sentence_index: number;
  severity: "error" | "warning" | "info";
  offset?: number;
  length?: number;
  context?: string | { text?: string };
  replacements?: Array<{ value: string }>;
  textSnapshot?: string; // Store text snapshot for offset validation
}

interface Suggestion {
  type: "grammar" | "vocabulary" | "structure" | "coherence";
  message: string;
  example?: string;
}

export default function AIAssistant({ text, textareaRef, onSuggestionAccept }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [grammarIssues, setGrammarIssues] = useState<GrammarIssue[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeTab, setActiveTab] = useState<"grammar" | "suggestions">("grammar");
  const [selectedIssue, setSelectedIssue] = useState<number | null>(null);

  // Reset state when panel is closed and reopened
  useEffect(() => {
    if (!isOpen) {
      // Don't clear issues when closing, just reset selection
      setSelectedIssue(null);
    }
  }, [isOpen]);

  const checkGrammar = async () => {
    // Prevent multiple simultaneous checks
    if (loading) {
      toast.info("Grammar check in progress", {
        description: "Please wait for the current check to complete",
      });
      return;
    }

    // Get text directly from textarea to ensure we have the latest content
    let currentText = text;
    if (textareaRef?.current) {
      currentText = textareaRef.current.value;
    }

    if (!currentText || currentText.trim().length < 10) {
      toast.error("Not enough text", {
        description: "Write at least a few sentences to check grammar",
      });
      return;
    }

    // Reset state before new check - clear previous results if any
    setLoading(true);
    setSelectedIssue(null);
    // Don't clear issues yet - let user see previous results while new check loads
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      // Use PYTHON_SERVICE_URL from env or default to localhost:8080
      const pythonServiceUrl = process.env.NEXT_PUBLIC_PYTHON_SERVICE_URL || "http://localhost:8080";
      const response = await fetch(`${pythonServiceUrl}/grammar-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: currentText }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Grammar check failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const issues = data.issues || [];
      
      console.log('Grammar check response:', {
        issue_count: data.issue_count,
        issues_length: issues.length,
        issues: issues
      });
      
      // Update issues with current text snapshot for offset validation
      const issuesWithTextSnapshot = issues.map((issue: GrammarIssue) => ({
        ...issue,
        textSnapshot: currentText, // Store text snapshot for later validation
        // Ensure context is properly formatted
        context: issue.context 
          ? (typeof issue.context === 'string' 
              ? issue.context 
              : (issue.context as { text?: string })?.text || JSON.stringify(issue.context))
          : undefined,
      }));
      
      // Clear old issues and set new ones
      setGrammarIssues(issuesWithTextSnapshot);
      setActiveTab("grammar");
      setSelectedIssue(null);

      if (issues.length === 0) {
        toast.success("Great work! 🎉", {
          description: "No grammar issues found!",
        });
      } else {
        toast.success(`Found ${issues.length} issue(s)`, {
          description: `Click on any issue below to highlight it in your text.`,
          duration: 5000,
        });
      }
    } catch (error: unknown) {
      console.error("Grammar check error:", error);
      
      // Reset loading state on error
      setLoading(false);
      
      if (error instanceof Error && error.name === 'AbortError') {
        toast.error("Request timeout", {
          description: "Grammar check took too long. Please try again.",
        });
      } else {
        const pythonServiceUrl = process.env.NEXT_PUBLIC_PYTHON_SERVICE_URL || "http://localhost:8080";
        const errorMessage = error instanceof Error ? error.message : `Make sure the Python service is running on ${pythonServiceUrl}`;
        toast.error("Grammar check failed", {
          description: errorMessage,
        });
      }
      
      // Clear issues on error
      setGrammarIssues([]);
    } finally {
      // Ensure loading is always reset
      setLoading(false);
    }
  };

  const getSuggestions = async () => {
    // Prevent multiple simultaneous requests
    if (loading) {
      return;
    }

    // Get current text from textarea
    let currentText = text;
    if (textareaRef?.current) {
      currentText = textareaRef.current.value;
    }

    if (!currentText || currentText.trim().length < 50) {
      toast.error("Not enough text", {
        description: "Write at least a paragraph to get suggestions",
      });
      return;
    }

    setLoading(true);
    setSelectedIssue(null);
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
    } catch (error: unknown) {
      console.error("Suggestions error:", error);
      const errorMessage = error instanceof Error ? error.message : "An error occurred while generating suggestions";
      toast.error("Failed to generate suggestions", {
        description: errorMessage,
      });
    } finally {
      // Ensure loading is always reset
      setLoading(false);
    }
  };

  const highlightIssue = (offset: number, length: number) => {
    if (!textareaRef?.current) return;
    
    const textarea = textareaRef.current;
    const currentText = textarea.value;
    
    // Validate offset is within text bounds
    if (offset < 0 || offset >= currentText.length) {
      console.warn(`Invalid offset: ${offset} for text length: ${currentText.length}`);
      return;
    }
    
    // Ensure length doesn't exceed text bounds
    const validLength = Math.min(length, currentText.length - offset);
    
    // Add error-highlight class for visual feedback
    textarea.classList.add('error-highlight');
    
    textarea.focus();
    textarea.setSelectionRange(offset, offset + validLength);
    
    // Scroll into view - better calculation
    const textBefore = currentText.substring(0, offset);
    const linesBefore = textBefore.split('\n').length - 1;
    
    // Calculate scroll position more accurately
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 24;
    const paddingTop = parseInt(getComputedStyle(textarea).paddingTop) || 16;
    const targetScrollTop = linesBefore * lineHeight - paddingTop - 100;
    
    textarea.scrollTop = Math.max(0, targetScrollTop);
    
    // Remove highlight class after a delay to allow user to see it
    setTimeout(() => {
      textarea.classList.remove('error-highlight');
    }, 2000);
  };

  const handleIssueClick = (issue: GrammarIssue, index: number) => {
    setSelectedIssue(index);
    if (issue.offset !== undefined && issue.length !== undefined) {
      highlightIssue(issue.offset, issue.length);
    }
  };

  const handleSuggestionClick = async (issue: GrammarIssue, replacement: string) => {
    if (!onSuggestionAccept || !textareaRef?.current) {
      toast.error("Cannot replace text", {
        description: "Textarea reference is not available",
      });
      return;
    }

    // Get current text from textarea to ensure we have latest content
    const currentText = textareaRef.current.value;
    
    // If we have offset and length, find the correct position
    if (issue.offset === undefined || issue.length === undefined) {
      toast.error("Invalid issue data", {
        description: "Cannot determine text position to replace",
      });
      return;
    }

    // Get the original text that should be replaced (from issue context or textSnapshot)
    const originalTextSnapshot = issue.textSnapshot || currentText;
    const originalTextToReplace = originalTextSnapshot.substring(issue.offset, issue.offset + issue.length);
    
    // Extract context information for better matching
    const contextInfo = issue.context 
      ? (typeof issue.context === 'string' 
          ? { text: issue.context }
          : issue.context as { text?: string })
      : { text: '' };
    const contextText = contextInfo.text || '';
    
    // If text has changed, try to find the correct position using context
    let actualOffset = issue.offset;
    let actualLength = issue.length;
    
    // Strategy: Use context to find the correct position if available
    if (contextText && contextText.length > originalTextToReplace.length + 10) {
      // Context is available and meaningful, use it to locate the issue
      // Find context in current text
      const contextMatches: number[] = [];
      let searchStart = 0;
      while (true) {
        const found = currentText.indexOf(contextText, searchStart);
        if (found === -1) break;
        contextMatches.push(found);
        searchStart = found + 1;
      }
      
      if (contextMatches.length > 0) {
        // If multiple context matches, find the one closest to original offset
        const issueOffset = issue.offset ?? 0;
        const bestMatch = contextMatches.reduce((prev, curr) => 
          Math.abs(curr - issueOffset) < Math.abs(prev - issueOffset) ? curr : prev
        );
        
        // Find the issue text within the context
        // Calculate relative position of issue text within context in original text
        const originalContextStart = originalTextSnapshot.indexOf(contextText);
        if (originalContextStart !== -1) {
          const relativeOffsetInContext = issue.offset - originalContextStart;
          const candidateOffset = bestMatch + relativeOffsetInContext;
          
          // Verify the text at candidate position matches
          if (candidateOffset >= 0 && candidateOffset + issue.length <= currentText.length) {
            const candidateText = currentText.substring(candidateOffset, candidateOffset + issue.length);
            
            // Check word boundaries
            const charBefore = candidateOffset > 0 ? currentText[candidateOffset - 1] : ' ';
            const charAfter = candidateOffset + issue.length < currentText.length 
              ? currentText[candidateOffset + issue.length] 
              : ' ';
            const isWordBoundary = !/\w/.test(charBefore) && !/\w/.test(charAfter);
            
            // Accept if text matches and it's at word boundary (or long enough)
            if ((candidateText === originalTextToReplace || candidateText.toLowerCase() === originalTextToReplace.toLowerCase()) 
                && (isWordBoundary || originalTextToReplace.length > 4)) {
              actualOffset = candidateOffset;
              actualLength = issue.length;
            }
          }
        }
      }
    }
    
    // If context method didn't work or context not available, use direct search
    if (actualOffset === issue.offset && currentText !== originalTextSnapshot) {
      // Method 1: Try exact offset first (if text hasn't shifted much)
      const textAtOffset = currentText.substring(issue.offset, issue.offset + issue.length);
      if (textAtOffset === originalTextToReplace) {
        // Verify it's a word boundary match (not part of another word)
        const charBefore = issue.offset > 0 ? currentText[issue.offset - 1] : ' ';
        const charAfter = issue.offset + issue.length < currentText.length 
          ? currentText[issue.offset + issue.length] 
          : ' ';
        const isWordBoundary = !/\w/.test(charBefore) && !/\w/.test(charAfter);
        
        if (isWordBoundary || originalTextToReplace.length > 3) {
          // Offset is still valid and it's a proper word boundary
          actualOffset = issue.offset;
          actualLength = issue.length;
        } else {
          // Not a word boundary - this might be replacing part of a word
          // Search more carefully in a small window
          actualOffset = issue.offset;
          actualLength = issue.length;
        }
      } else {
        // Method 2: Search in a window around original offset, prioritizing word boundaries
        const searchRadius = 150;
        const searchStart = Math.max(0, issue.offset - searchRadius);
        const searchEnd = Math.min(currentText.length, issue.offset + issue.length + searchRadius);
        
        // Find all occurrences of the text in search window
        const allMatches: Array<{ offset: number; isWordBoundary: boolean }> = [];
        let searchPos = searchStart;
        
        while (searchPos < searchEnd) {
          const foundIndex = currentText.indexOf(originalTextToReplace, searchPos);
          if (foundIndex === -1 || foundIndex >= searchEnd) break;
          
          // Check word boundaries
          const charBefore = foundIndex > 0 ? currentText[foundIndex - 1] : ' ';
          const charAfter = foundIndex + issue.length < currentText.length 
            ? currentText[foundIndex + issue.length] 
            : ' ';
          const isWordBoundary = !/\w/.test(charBefore) && !/\w/.test(charAfter);
          
          allMatches.push({
            offset: foundIndex,
            isWordBoundary
          });
          
          searchPos = foundIndex + 1;
        }
        
        if (allMatches.length > 0) {
          // Prefer word boundary matches
          const wordBoundaryMatches = allMatches.filter(m => m.isWordBoundary);
          const candidates = wordBoundaryMatches.length > 0 ? wordBoundaryMatches : allMatches;
          
          // Among candidates, pick the one closest to original offset
          const issueOffset = issue.offset ?? 0;
          const bestMatch = candidates.reduce((prev, curr) => 
            Math.abs(curr.offset - issueOffset) < Math.abs(prev.offset - issueOffset) ? curr : prev
          );
          
          actualOffset = bestMatch.offset;
          actualLength = issue.length;
        } else {
          // Try case-insensitive search
          const lowerText = currentText.toLowerCase();
          const lowerSearch = originalTextToReplace.toLowerCase();
          let foundIndex = -1;
          let searchPos = searchStart;
          
          while (searchPos < searchEnd) {
            const found = lowerText.indexOf(lowerSearch, searchPos);
            if (found === -1 || found >= searchEnd) break;
            
            // Check word boundaries for case-insensitive match
            const charBefore = found > 0 ? currentText[found - 1] : ' ';
            const charAfter = found + issue.length < currentText.length 
              ? currentText[found + issue.length] 
              : ' ';
            const isWordBoundary = !/\w/.test(charBefore) && !/\w/.test(charAfter);
            
            if (isWordBoundary) {
              foundIndex = found;
              break;
            }
            
            searchPos = found + 1;
          }
          
          if (foundIndex !== -1) {
            actualOffset = foundIndex;
            actualLength = issue.length;
          } else {
            // Cannot find the text, show error
            toast.error("Cannot find text to replace", {
              description: `The text "${originalTextToReplace}" could not be found at the expected position. The text may have been modified. Please check grammar again.`,
            });
            // Remove this issue since we can't replace it
            setGrammarIssues((prev) => prev.filter((item) => 
              !(item.offset === issue.offset && 
                item.length === issue.length && 
                item.message === issue.message)
            ));
            return;
          }
        }
      }
    } else if (currentText === originalTextSnapshot) {
      // Text hasn't changed, but verify word boundaries
      const charBefore = issue.offset > 0 ? currentText[issue.offset - 1] : ' ';
      const charAfter = issue.offset + issue.length < currentText.length 
        ? currentText[issue.offset + issue.length] 
        : ' ';
      const isWordBoundary = !/\w/.test(charBefore) && !/\w/.test(charAfter);
      
      // For short words, ensure it's at word boundary
      if (!isWordBoundary && originalTextToReplace.length <= 3) {
        // This might be replacing part of a word, warn user
        console.warn(`Warning: Replacing "${originalTextToReplace}" that may be part of another word`);
      }
    }
    
    // Final verification: ensure we're replacing the right text
    const finalTextToReplace = currentText.substring(actualOffset, actualOffset + actualLength);
    
    // Perform the replacement
    onSuggestionAccept(replacement, actualOffset, actualLength);
    
    toast.success("Text replaced", {
      description: `Replaced "${finalTextToReplace}" with "${replacement}"`,
    });
    
    // Remove this issue from list after replacement
    setGrammarIssues((prev) => prev.filter((item) => {
      // Remove by comparing issue properties, not reference
      return !(item.offset === issue.offset && 
               item.length === issue.length && 
               item.message === issue.message);
    }));
    setSelectedIssue(null);
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
              disabled={loading}
              title={loading ? "Checking grammar..." : "Check grammar and spelling"}
            >
              {loading ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="spinner-mini">
                    <path
                      d="M21 12a9 9 0 1 1-6.219-8.56"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Checking...
                </>
              ) : (
                <>
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
                </>
              )}
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
              <div className="ai-loading-state">
                <div className="ai-loading-state__spinner">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                </div>
                <h3 className="ai-loading-state__title">Analyzing your writing...</h3>
                <p className="ai-loading-state__description">Checking grammar, spelling, and style</p>
              </div>
            ) : activeTab === "grammar" ? (
              <div className="ai-grammar">
                {grammarIssues.length === 0 ? (
                  <div className="ai-empty-state">
                    <div className="ai-empty-state__icon">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                    </div>
                    <h3 className="ai-empty-state__title">Great work! 🎉</h3>
                    <p className="ai-empty-state__description">No grammar issues found in your text.</p>
                    <p className="ai-empty-state__hint">Click &quot;Check Grammar&quot; to analyze your writing</p>
                  </div>
                ) : (
                  <div>
                    <div className="ai-grammar-summary">
                      <div className="ai-grammar-summary__badge">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="16" x2="12" y2="12"></line>
                          <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                        Found {grammarIssues.length} {grammarIssues.length === 1 ? 'issue' : 'issues'}
                      </div>
                    </div>
                    {grammarIssues.map((issue, index) => {
                      // Create unique key based on offset and index
                      const uniqueKey = `issue-${issue.offset || 0}-${issue.length || 0}-${index}`;
                      const getIssueIcon = () => {
                        switch (issue.severity) {
                          case 'error':
                            return (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                              </svg>
                            );
                          case 'warning':
                            return (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                <line x1="12" y1="9" x2="12" y2="13"></line>
                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                              </svg>
                            );
                          default:
                            return (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="16" x2="12" y2="12"></line>
                                <line x1="12" y1="8" x2="12.01" y2="8"></line>
                              </svg>
                            );
                        }
                      };

                      const getIssueTypeLabel = () => {
                        const typeMap: Record<string, string> = {
                          'Spelling': 'Spelling Error',
                          'Grammar': 'Grammar Error',
                          'Punctuation': 'Punctuation',
                          'Style': 'Style Issue',
                          'Typographical': 'Typo',
                          'Typography': 'Typography',
                        };
                        return typeMap[issue.type] || issue.type || 'Issue';
                      };

                      return (
                        <div 
                          key={uniqueKey}
                          className={`ai-issue-card ai-issue-card--${issue.severity} ${selectedIssue === index ? 'ai-issue-card--selected' : ''}`}
                          onClick={() => handleIssueClick(issue, index)}
                        >
                          <div className="ai-issue-card__header">
                            <div className="ai-issue-card__icon">
                              {getIssueIcon()}
                            </div>
                            <div className="ai-issue-card__info">
                              <div className="ai-issue-card__type">{getIssueTypeLabel()}</div>
                              {issue.short_message && (
                                <div className="ai-issue-card__short">{issue.short_message}</div>
                              )}
                            </div>
                            <div className="ai-issue-card__number">#{index + 1}</div>
                          </div>
                          
                          <div className="ai-issue-card__message">
                            {issue.message}
                          </div>

                          {issue.context && (
                            <div className="ai-issue-card__context">
                              <div className="ai-issue-card__context-label">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                  <polyline points="14 2 14 8 20 8"></polyline>
                                  <line x1="16" y1="13" x2="8" y2="13"></line>
                                  <line x1="16" y1="17" x2="8" y2="17"></line>
                                  <polyline points="10 9 9 9 8 9"></polyline>
                                </svg>
                                Context
                              </div>
                              <div className="ai-issue-card__context-text">
                                {typeof issue.context === 'string' 
                                  ? issue.context 
                                  : (issue.context as { text?: string })?.text || JSON.stringify(issue.context)}
                              </div>
                            </div>
                          )}

                          {issue.replacements && issue.replacements.length > 0 && (
                            <div className="ai-issue-card__replacements">
                              <div className="ai-issue-card__replacements-label">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                                Suggestions
                              </div>
                              <div className="ai-issue-card__replacements-list">
                                {issue.replacements.map((rep, idx) => (
                                  <button
                                    key={idx}
                                    className="ai-issue-card__replacement-btn"
                                    onClick={(e) => {
                                      e.stopPropagation(); // Prevent issue click
                                      handleSuggestionClick(issue, rep.value);
                                    }}
                                    title={`Click to replace with: ${rep.value}`}
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                      <polyline points="17 8 12 3 7 8"></polyline>
                                      <line x1="12" y1="3" x2="12" y2="15"></line>
                                    </svg>
                                    {rep.value}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="ai-issue-card__action-hint">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10"></circle>
                              <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            Click to highlight in text
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="ai-suggestions">
                {suggestions.length === 0 ? (
                  <div className="ai-empty">
                    <p>💡 No suggestions yet</p>
                    <span>Click &quot;Get Suggestions&quot; to improve your writing</span>
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


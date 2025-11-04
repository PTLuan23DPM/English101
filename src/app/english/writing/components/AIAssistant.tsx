"use client";

import { useState, useCallback, useMemo } from "react";
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
  context?: string;
  replacements?: Array<{ value: string }>;
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
  const [highlightedIssue, setHighlightedIssue] = useState<{ offset: number; length: number; severity: string } | null>(null);
  const [processingReplacement, setProcessingReplacement] = useState<string | null>(null);

  // Memoize sorted issues for better performance
  const sortedIssues = useMemo(() => {
    return [...grammarIssues].sort((a, b) => {
      // Sort by severity first (error > warning > info)
      const severityOrder = { error: 0, warning: 1, info: 2 };
      const severityDiff = (severityOrder[a.severity] ?? 1) - (severityOrder[b.severity] ?? 1);
      if (severityDiff !== 0) return severityDiff;
      
      // Then sort by offset
      return (a.offset ?? 0) - (b.offset ?? 0);
    });
  }, [grammarIssues]);

  const checkGrammar = async () => {
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

    setLoading(true);
    try {
      const response = await fetch("/api/writing/grammar-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: currentText }),
      });

      if (!response.ok) {
        throw new Error("Grammar check failed");
      }

      const data = await response.json();
      const issues = data.issues || [];
      
      console.log('Grammar check response:', {
        issue_count: data.issue_count,
        issues_length: issues.length,
        issues: issues
      });
      
      setGrammarIssues(issues);
      setActiveTab("grammar");
      setSelectedIssue(null); // Reset selection

      if (issues.length === 0) {
        toast.success("Great work! ✨", {
          description: "No grammar issues found in your text!",
        });
      } else {
        toast.success(`Found ${issues.length} issue(s)`, {
          description: `Click on any issue below to highlight it in your text.`,
          duration: 5000,
        });
        // Don't auto-highlight first issue - let user choose
        setSelectedIssue(null);
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

  const highlightIssue = (offset: number, length: number, severity: string = "error") => {
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
    
    // Set highlighted issue for overlay
    setHighlightedIssue({ offset, length: validLength, severity });
    
    // Add error-highlight class for visual feedback
    textarea.classList.add('error-highlight-active');
    
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
    
    // Remove highlight after a longer delay to allow user to see it
    setTimeout(() => {
      textarea.classList.remove('error-highlight-active');
      setHighlightedIssue(null);
    }, 3000);
  };

  const handleIssueClick = useCallback((issue: GrammarIssue, index: number) => {
    setSelectedIssue(index);
    if (issue.offset !== undefined && issue.length !== undefined) {
      highlightIssue(issue.offset, issue.length, issue.severity);
    }
  }, []);

  /**
   * Normalize replacement text to ensure proper spacing
   * Handles cases where words are stuck together without spaces
   */
  const normalizeReplacement = useCallback((
    replacement: string,
    originalText: string,
    offset: number,
    length: number
  ): string => {
    // Get context around the replacement
    const textBefore = originalText.substring(Math.max(0, offset - 1), offset);
    const textAfter = originalText.substring(offset + length, Math.min(originalText.length, offset + length + 1));
    
    let normalized = replacement.trim();
    
    // IMPORTANT: Check if it's a simple single word - don't format it
    const isSimpleWord = (
      (/^[a-z]+$/i.test(normalized) || /^[A-Z]+$/.test(normalized)) && 
      normalized.length <= 25 && 
      !normalized.includes(' ') &&
      !normalized.includes('-')
    );
    
    // If it's a simple word, only handle spacing around it, don't format the word itself
    if (isSimpleWord) {
      // Just ensure proper spacing around the word
      if (textBefore && !textBefore.match(/\s$/) && !textBefore.match(/[.,!?;:(]$/)) {
        if (!normalized.match(/^[.,!?;:)]/)) {
          normalized = ' ' + normalized;
        }
      }
      if (textAfter && !textAfter.match(/^\s/) && !textAfter.match(/^[.,!?;:)]/)) {
        if (!normalized.match(/[.,!?;:(]$/)) {
          normalized = normalized + ' ';
        }
      }
      return normalized.trim();
    }
    
    // For non-simple words, apply formatting
    // Ensure spacing before replacement if needed
    if (textBefore && !textBefore.match(/\s$/)) {
      if (!normalized.startsWith(' ')) {
        if (!normalized.match(/^[.,!?;:)]/)) {
          normalized = ' ' + normalized;
        }
      }
    }
    
    // Ensure spacing after replacement if needed
    if (textAfter && !textAfter.match(/^\s/)) {
      if (!normalized.endsWith(' ')) {
        if (!normalized.match(/[.,!?;:(]$/)) {
          normalized = normalized + ' ';
        }
      }
    }
    
    // Fix common spacing issues in replacement text itself
    // Only format if it looks like words are stuck together
    
    // Check if it has indicators of stuck words
    const hasMixedCase = /[a-z].*[A-Z]|[A-Z].*[a-z]/.test(normalized);
    const isLongWord = normalized.length > 15 && !normalized.includes(' ');
    const hasNumbers = /\d/.test(normalized);
    
    // Only format if there are clear indicators
    if ((hasMixedCase || isLongWord || hasNumbers) && !normalized.includes(' ')) {
      // Pattern 1: lowercaseLetterUppercaseLetter -> lowercaseLetter UppercaseLetter
      // Only if followed by at least 2 lowercase letters (to avoid splitting single letters)
      normalized = normalized.replace(/([a-z])([A-Z][a-z]{2,})/g, '$1 $2');
      
      // Pattern 2: WordNumber -> Word Number (require at least 2 letters)
      normalized = normalized.replace(/([a-zA-Z]{2,})(\d)/g, '$1 $2');
      normalized = normalized.replace(/(\d)([a-zA-Z]{2,})/g, '$1 $2');
      
      // Pattern 3: Split common patterns like "wordandWord" -> "word and Word"
      // Only if word is followed by uppercase with at least 2 letters
      const commonWords = ['and', 'or', 'but', 'the', 'a', 'an', 'is', 'are', 'was', 'were', 'has', 'have', 'had', 
                           'this', 'that', 'these', 'those', 'for', 'from', 'with', 'about', 'into', 'onto', 'in', 
                           'on', 'at', 'to', 'of', 'by', 'as', 'if', 'it', 'we', 'they', 'you', 'he', 'she'];
      commonWords.forEach(word => {
        // Only split if word is followed by uppercase with at least 2 letters
        const regex = new RegExp(`([a-z])(\\b${word}\\b)([A-Z][a-z]{2,})`, 'gi');
        normalized = normalized.replace(regex, '$1 $2 $3');
      });
      
      // Pattern 4: Handle cases like "iphoneorder" -> "iPhone order"
      normalized = normalized.replace(/([a-z]{2,})([A-Z][a-z]{2,})/g, (match, p1, p2) => {
        if (p2.match(/^[A-Z][a-z]{2,}$/)) {
          const commonEndings = ['ing', 'ed', 'er', 'ly', 'tion', 'sion'];
          const shouldSplit = !commonEndings.some(ending => p1.endsWith(ending));
          if (shouldSplit) {
            return p1 + ' ' + p2;
          }
        }
        return match;
      });
    }
    
    // Normalize multiple spaces to single space
    normalized = normalized.replace(/\s+/g, ' ');
    
    // Remove spaces before punctuation
    normalized = normalized.replace(/\s+([.,!?;:)])/g, '$1');
    
    // Ensure space after punctuation (except at end)
    normalized = normalized.replace(/([.,!?;:])([A-Za-z])/g, '$1 $2');
    
    // Final safety check: If result looks like it has spaces between single letters,
    // it's likely a formatting error - use original value
    const words = normalized.split(/\s+/);
    const hasSingleLetterWords = words.some(word => word.length === 1 && /[a-zA-Z]/.test(word));
    if (hasSingleLetterWords && words.length > 2) {
      // Likely formatting error, use original
      normalized = replacement.trim();
      // Re-add spacing if needed
      if (textBefore && !textBefore.match(/\s$/) && !textBefore.match(/[.,!?;:(]$/)) {
        if (!normalized.match(/^[.,!?;:)]/)) {
          normalized = ' ' + normalized;
        }
      }
      if (textAfter && !textAfter.match(/^\s/) && !textAfter.match(/^[.,!?;:)]/)) {
        if (!normalized.match(/[.,!?;:(]$/)) {
          normalized = normalized + ' ';
        }
      }
    }
    
    return normalized.trim();
  }, []);

  const handleSuggestionClick = useCallback((issue: GrammarIssue, replacement: string, event?: React.MouseEvent) => {
    // Prevent default and stop propagation immediately
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Prevent duplicate clicks
    const replacementKey = `${issue.offset}-${issue.length}-${replacement}`;
    if (processingReplacement === replacementKey) {
      return; // Already processing this replacement
    }

    if (issue.offset === undefined || issue.length === undefined || !onSuggestionAccept) {
      return;
    }

    // Set processing state immediately
    setProcessingReplacement(replacementKey);

    try {
      // Get current text to normalize replacement properly
      let currentText = text;
      if (textareaRef?.current) {
        currentText = textareaRef.current.value;
      }

      // Validate offset is still valid (text might have changed)
      if (issue.offset < 0 || issue.offset >= currentText.length) {
        toast.error("Error location changed", {
          description: "The text has changed. Please check grammar again.",
        });
        // Remove invalid issue
        setGrammarIssues((prev) => prev.filter((item) => item !== issue));
        setProcessingReplacement(null);
        return;
      }

      // Normalize the replacement to fix spacing issues
      const normalizedReplacement = normalizeReplacement(
        replacement,
        currentText,
        issue.offset,
        issue.length
      );

      // Apply replacement immediately
      onSuggestionAccept(normalizedReplacement, issue.offset, issue.length);

      // Update remaining issues: adjust their offsets if they come after the replaced text
      const replacementLength = normalizedReplacement.length;
      const offsetChange = replacementLength - issue.length;
      
      setGrammarIssues((prev) => {
        return prev
          .filter((item) => item !== issue) // Remove fixed issue
          .map((item) => {
            // Adjust offsets for issues after the replaced text
            if (
              item.offset !== undefined &&
              item.offset > issue.offset
            ) {
              return {
                ...item,
                offset: item.offset + offsetChange,
              };
            }
            return item;
          });
      });

      setSelectedIssue(null);
      setHighlightedIssue(null);

      toast.success("Text replaced ✓", {
        description: `"${normalizedReplacement}"`,
        duration: 2000,
      });
    } finally {
      // Clear processing state after a short delay
      setTimeout(() => {
        setProcessingReplacement(null);
      }, 100);
    }
  }, [text, textareaRef, onSuggestionAccept, normalizeReplacement]);

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
                {sortedIssues.length === 0 ? (
                  <div className="ai-empty">
                    <p>✅ No grammar issues found</p>
                    <span>Click "Check Grammar" to analyze your text</span>
                  </div>
                ) : (
                  sortedIssues.map((issue, index) => {
                    // Find original index in grammarIssues for selection tracking
                    const originalIndex = grammarIssues.findIndex(
                      item => item.offset === issue.offset && item.length === issue.length
                    );
                    const displayIndex = originalIndex >= 0 ? originalIndex : index;
                    
                    // Create unique key based on offset and index
                    const uniqueKey = `issue-${issue.offset || 0}-${issue.length || 0}-${displayIndex}`;
                    return (
                    <div 
                      key={uniqueKey}
                      className={`ai-issue ai-issue--${issue.severity} ${selectedIssue === displayIndex ? 'ai-issue--selected' : ''}`}
                      onClick={() => handleIssueClick(issue, displayIndex)}
                    >
                      <div className="ai-issue__header">
                        <div className="ai-issue__index">#{displayIndex + 1}</div>
                        <div className={`ai-issue__type ai-issue__type--${issue.severity}`}>{issue.type}</div>
                        {issue.short_message && (
                          <div className="ai-issue__short">{issue.short_message}</div>
                        )}
                      </div>
                      <div className="ai-issue__message">{issue.message}</div>
                      {issue.offset !== undefined && (
                        <div className="ai-issue__location">
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ marginRight: "4px", display: "inline-block", verticalAlign: "middle" }}>
                            <path d="M8 1L2 4V7C2 10.5 4.5 13.5 8 15C11.5 13.5 14 10.5 14 7V4L8 1Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                          </svg>
                          Position: {issue.offset} • Length: {issue.length || 1} chars
                        </div>
                      )}
                      {issue.context && (
                        <div className="ai-issue__context">
                          <span className="ai-issue__context-label">Context:</span>
                          <code>
                            {typeof issue.context === 'string' 
                              ? issue.context 
                              : (issue.context as any)?.text || JSON.stringify(issue.context)}
                          </code>
                        </div>
                      )}
                      {issue.replacements && issue.replacements.length > 0 && (
                        <div className="ai-issue__replacements">
                          <span className="ai-issue__replacements-label">Suggestions:</span>
                          <div className="ai-issue__replacements-list">
                            {issue.replacements.map((rep, idx) => {
                              // Format replacement for better display (preview only)
                              // IMPORTANT: Don't format simple single words - show them as-is
                              let displayValue = (rep.value || '').trim();
                              
                              // Check if it's a simple single word (all lowercase or all uppercase, no spaces, reasonable length)
                              // These should NEVER be formatted
                              const isSimpleWord = (
                                (/^[a-z]+$/i.test(displayValue) || /^[A-Z]+$/.test(displayValue)) && 
                                displayValue.length <= 25 && 
                                !displayValue.includes(' ') &&
                                !displayValue.includes('-')
                              );
                              
                              // If it's a simple word, use it as-is without any formatting
                              if (isSimpleWord) {
                                displayValue = displayValue;
                              } else {
                              // Only format if NOT a simple word and has indicators of stuck words
                                const hasMixedCase = /[a-z].*[A-Z]|[A-Z].*[a-z]/.test(displayValue);
                                const isLongWord = displayValue.length > 15 && !displayValue.includes(' ');
                                const hasNumbers = /\d/.test(displayValue);
                                
                                // Only format if there are clear indicators of stuck words
                                if ((hasMixedCase || isLongWord || hasNumbers) && !displayValue.includes(' ')) {
                                  // Add spaces between lowercase-uppercase transitions (e.g., "iPhoneorder" -> "iPhone order")
                                  // Only if followed by at least 2 lowercase letters (to avoid splitting single letters)
                                  displayValue = displayValue.replace(/([a-z])([A-Z][a-z]{2,})/g, '$1 $2');
                                  
                                  // Add spaces between word and number
                                  displayValue = displayValue.replace(/([a-zA-Z]{2,})(\d)/g, '$1 $2');
                                  displayValue = displayValue.replace(/(\d)([a-zA-Z]{2,})/g, '$1 $2');
                                  
                                  // Split common words stuck together (only if followed by uppercase)
                                  const commonWords = ['and', 'or', 'but', 'the', 'a', 'an', 'is', 'are', 'was', 'were', 
                                                       'has', 'have', 'had', 'this', 'that', 'for', 'from', 'with', 'about'];
                                  commonWords.forEach(word => {
                                    // Only split if word is followed by uppercase with at least 2 letters
                                    const regex = new RegExp(`([a-z])(\\b${word}\\b)([A-Z][a-z]{2,})`, 'gi');
                                    displayValue = displayValue.replace(regex, '$1 $2 $3');
                                  });
                                  
                                  // Normalize spacing
                                  displayValue = displayValue.replace(/\s+/g, ' ').trim();
                                }
                              }
                              
                              // Final cleanup: Remove any extra spaces that might have been accidentally added
                              // This prevents "h a ve" type issues
                              displayValue = displayValue.replace(/\s+/g, ' ').trim();
                              
                              // Final safety check: If result looks like it has spaces between single letters,
                              // it's likely a formatting error - use original value
                              const words = displayValue.split(/\s+/);
                              const hasSingleLetterWords = words.some(word => word.length === 1 && /[a-zA-Z]/.test(word));
                              if (hasSingleLetterWords && words.length > 2) {
                                // Likely formatting error, use original
                                displayValue = (rep.value || '').trim();
                              }
                              
                              // Clean up the display value (only if it has spaces)
                              if (displayValue.includes(' ')) {
                                displayValue = displayValue
                                  .replace(/\s+([.,!?;:)])/g, '$1') // Remove space before punctuation
                                  .replace(/([.,!?;:])([A-Za-z])/g, '$1 $2'); // Add space after punctuation
                              }
                              
                              // Use original value if display formatting didn't change anything meaningful
                              const finalDisplay = displayValue || rep.value;
                              
                              const replacementKey = `${issue.offset}-${issue.length}-${rep.value}`;
                              const isProcessing = processingReplacement === replacementKey;

                              return (
                                <button
                                  key={idx}
                                  className={`ai-issue__replacement ${isProcessing ? 'processing' : ''}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleSuggestionClick(issue, rep.value, e);
                                  }}
                                  disabled={isProcessing}
                                  title={`Click to replace with: "${finalDisplay}"`}
                                  type="button"
                                >
                                  <span className="replacement-text">{finalDisplay}</span>
                                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="replacement-icon">
                                    <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    );
                  })
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


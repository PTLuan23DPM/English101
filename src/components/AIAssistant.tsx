"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your AI English assistant. I can help you with grammar, vocabulary, writing, and pronunciation. What would you like help with today?",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (message?: string) => {
    const userMessage = message || input.trim();
    if (!userMessage) return;

    setInput("");
    setLoading(true);

    const newUserMessage: Message = {
      role: "user",
      content: userMessage,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newUserMessage]);

    try {
      const response = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await response.json();

      if (response.ok) {
        const assistantMessage: Message = {
          role: "assistant",
          content: data.response,
          timestamp: data.timestamp,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        toast.error("Failed to get response", {
          description: data.error || "Please try again.",
        });
      }
    } catch (error) {
      console.error("AI Assistant error:", error);
      toast.error("Something went wrong", {
        description: "Please check your connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    const quickMessages: Record<string, string> = {
      "Grammar Check": "Help me with grammar",
      "Vocabulary Help": "Help me with vocabulary",
      "Writing Tips": "Help me with writing",
    };
    sendMessage(quickMessages[action] || action);
  };

  return (
    <div className="chatbot-section">
      <div className="chatbot-card">
        <div className="chatbot-header">
          <div className="chatbot-avatar">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L2 7L12 12L22 7L12 2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="currentColor"
                opacity="0.1"
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
          </div>
          <div className="chatbot-greeting">
            <h3 className="chatbot-title">AI Assistant</h3>
            <p className="chatbot-subtitle">
              Get instant help with grammar, vocabulary, and writing
            </p>
          </div>
        </div>

        <div className="chatbot-messages" style={{ maxHeight: "400px", overflowY: "auto", marginBottom: "16px", padding: "16px", background: "#f9f9f9", borderRadius: "8px" }}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                marginBottom: "16px",
                display: "flex",
                flexDirection: msg.role === "user" ? "row-reverse" : "row",
                gap: "8px",
              }}
            >
              <div
                style={{
                  maxWidth: "75%",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  background: msg.role === "user" ? "#667eea" : "white",
                  color: msg.role === "user" ? "white" : "#333",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                }}
              >
                <div style={{ whiteSpace: "pre-wrap", fontSize: "14px", lineHeight: "1.5" }}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", gap: "8px", padding: "12px 16px" }}>
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#667eea",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#667eea",
                  animation: "pulse 1.5s ease-in-out infinite 0.2s",
                }}
              />
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#667eea",
                  animation: "pulse 1.5s ease-in-out infinite 0.4s",
                }}
              />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chatbot-input-wrapper">
          <div className="chatbot-search-box">
            <svg
              className="chatbot-search-icon"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
            >
              <circle
                cx="9"
                cy="9"
                r="6"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M13 13L17 17"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="text"
              placeholder="Ask anything about English..."
              className="chatbot-input-field"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              disabled={loading}
            />
            <button
              className="chatbot-send-btn"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M18 2L9 11M18 2L12 18L9 11M18 2L2 8L9 11"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
          <div className="chatbot-quick-actions">
            <button
              className="chatbot-quick-btn"
              onClick={() => handleQuickAction("Grammar Check")}
              disabled={loading}
            >
              Grammar Check
            </button>
            <button
              className="chatbot-quick-btn"
              onClick={() => handleQuickAction("Vocabulary Help")}
              disabled={loading}
            >
              Vocabulary Help
            </button>
            <button
              className="chatbot-quick-btn"
              onClick={() => handleQuickAction("Writing Tips")}
              disabled={loading}
            >
              Writing Tips
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        toast.success("Reset code sent!", {
          description: "Check your email for the password reset code.",
        });
      } else {
        toast.error("Error", {
          description: data.error || "Failed to send reset code. Please try again.",
        });
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      toast.error("Something went wrong", {
        description: "Please check your internet connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <Link href="/" className="auth-back-btn">← Back to Home</Link>
          </div>

          <div className="auth-card">
            <div className="auth-logo">
              <span className="auth-logo-icon">🎓</span>
              <h1>EnglishMaster</h1>
            </div>

            <div className="auth-form active">
              <div style={{ textAlign: "center", marginBottom: "24px" }}>
                <div style={{ 
                  width: "64px", 
                  height: "64px", 
                  margin: "0 auto 16px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <path 
                      d="M8 12l2 2 4-4" 
                      stroke="white" 
                      strokeWidth="3" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                    />
                    <circle 
                      cx="12" 
                      cy="12" 
                      r="10" 
                      stroke="white" 
                      strokeWidth="2" 
                    />
                  </svg>
                </div>
                <h2>Check Your Email</h2>
                <p className="auth-subtitle">
                  We&apos;ve sent a 6-digit reset code to <strong>{email}</strong>
                </p>
              </div>

              <div style={{ 
                background: "#f9fafb", 
                padding: "16px", 
                borderRadius: "8px", 
                marginBottom: "24px",
                fontSize: "14px",
                color: "#6b7280"
              }}>
                <p style={{ margin: "0 0 8px 0" }}>
                  Please check your email and use the code to reset your password.
                </p>
                <p style={{ margin: 0 }}>
                  The code will expire in <strong>15 minutes</strong>.
                </p>
              </div>

              <Link 
                href="/authentication/reset-password" 
                className="auth-submit-btn"
                style={{ textDecoration: "none", display: "block", textAlign: "center" }}
              >
                <span className="btn-text">Enter Reset Code →</span>
              </Link>

              <div className="auth-footer" style={{ marginTop: "24px" }}>
                <p className="muted" style={{ textAlign: "center", marginBottom: "12px" }}>
                    Didn&apos;t receive the email?{" "}
                  <button
                    onClick={() => {
                      handleSubmit();
                    }}
                    className="link"
                    disabled={loading}
                    style={{ 
                      background: "none", 
                      border: "none", 
                      color: "inherit",
                      cursor: loading ? "not-allowed" : "pointer",
                      textDecoration: "underline"
                    }}
                  >
                    {loading ? "Sending..." : "Resend code"}
                  </button>
                </p>
                <Link href="/authentication/login" className="link" style={{ display: "block", textAlign: "center" }}>
                  ← Back to login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <Link href="/" className="auth-back-btn">← Back to Home</Link>
        </div>

        <div className="auth-card">
          <div className="auth-logo">
            <span className="auth-logo-icon">🎓</span>
            <h1>EnglishMaster</h1>
          </div>

          <div className="auth-form active">
            <h2>Forgot Password?</h2>
            <p className="auth-subtitle">
              No worries! Enter your email address and we&apos;ll send you a code to reset your password.
            </p>

            <form className="auth-fields" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  name="email"
                  type="email"
                  className="form-control"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoFocus
                  required
                />
              </div>

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={loading || !email.trim()}
              >
                <span className="btn-text">
                  {loading ? "Sending..." : "Send Reset Code"}
                </span>
              </button>
            </form>

            <div className="auth-footer">
              <Link href="/authentication/login" className="link">
                ← Back to login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

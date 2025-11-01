"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-icon success">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path d="M8 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1>Check Your Email</h1>
            <p className="muted">
              We've sent a 6-digit reset code to <strong>{email}</strong>
            </p>
          </div>

          <div className="auth-info">
            <p>Please check your email and use the code to reset your password.</p>
            <p className="muted" style={{ marginTop: "8px", fontSize: "14px" }}>
              The code will expire in 15 minutes.
            </p>
          </div>

          <Link href="/authentication/reset-password" className="btn primary w-full">
            Enter Reset Code →
          </Link>

          <div className="auth-footer">
            <p className="muted">
              Didn't receive the email?{" "}
              <button
                onClick={() => {
                  setSuccess(false);
                  handleSubmit(new Event("submit") as any);
                }}
                className="link"
                disabled={loading}
              >
                Resend code
              </button>
            </p>
            <Link href="/authentication/login" className="link">
              ← Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="currentColor" />
            </svg>
          </div>
          <h1>Forgot Password?</h1>
          <p className="muted">
            No worries! Enter your email address and we'll send you a code to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="btn primary w-full"
            disabled={loading}
          >
            {loading ? "Sending..." : "Send Reset Code"}
          </button>
        </form>

        <div className="auth-footer">
          <Link href="/authentication/login" className="link">
            ← Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email) {
      setError("Please enter your email");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to send OTP");
      } else {
        setSuccess(true);
        // Redirect to verify OTP page after 2 seconds
        setTimeout(() => {
          router.push(`/authentication/verify-otp?email=${encodeURIComponent(email)}`);
        }, 2000);
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <Link href="/authentication/login" className="auth-back-btn">
            ← Back to Login
          </Link>
        </div>

        <div className="auth-card">
          <div className="auth-logo">
            <span className="auth-logo-icon">🔒</span>
            <h1>EnglishMaster</h1>
          </div>

          <div className="auth-form active">
            <h2>Forgot Password?</h2>
            <p className="auth-subtitle">
              Enter your email and we'll send you a code to reset your password
            </p>

            {success ? (
              <div className="auth-success-content">
                <div className="success-icon">✅</div>
                <h3>Check your email!</h3>
                <p>We've sent a 6-digit code to {email}</p>
                <p className="small muted">Redirecting to verification page...</p>
              </div>
            ) : (
              <form className="auth-fields" onSubmit={onSubmit}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    name="email"
                    type="email"
                    className={`form-control ${error ? "error" : ""}`}
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  {error && <div className="error-message show">{error}</div>}
                </div>

                <button className="auth-submit-btn" disabled={loading}>
                  <span className="btn-text">
                    {loading ? "Sending code..." : "Send Reset Code"}
                  </span>
                </button>

                <div className="auth-switch">
                  <span>Remember your password?</span>
                  <Link href="/authentication/login" className="switch-btn">
                    Sign in
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}


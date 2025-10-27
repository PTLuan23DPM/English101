"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const otp = searchParams.get("otp") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const req = useMemo(
    () => ({
      length: password.length >= 8,
      letter: /[A-Za-z]/.test(password),
      number: /\d/.test(password),
      match: password === confirmPassword && password.length > 0,
    }),
    [password, confirmPassword]
  );

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!(req.length && req.letter && req.number)) {
      setError("Password doesn't meet requirements");
      setLoading(false);
      return;
    }

    if (!req.match) {
      setError("Passwords don't match");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to reset password");
      } else {
        setSuccess(true);
        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push("/authentication/login");
        }, 2000);
      }
    } catch (error) {
      console.error("Reset password error:", error);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <Link href="/authentication/verify-otp" className="auth-back-btn">
            ← Back
          </Link>
        </div>

        <div className="auth-card">
          <div className="auth-logo">
            <span className="auth-logo-icon">🔑</span>
            <h1>EnglishMaster</h1>
          </div>

          <div className="auth-form active">
            <h2>Set New Password</h2>
            <p className="auth-subtitle">
              Create a new password for your account
            </p>

            {success ? (
              <div className="auth-success-content">
                <div className="success-icon">✅</div>
                <h3>Password Reset Successful!</h3>
                <p>Your password has been successfully reset.</p>
                <p className="small muted">Redirecting to login page...</p>
              </div>
            ) : (
              <form className="auth-fields" onSubmit={onSubmit}>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <div className="password-input-group">
                    <input
                      type={showPw ? "text" : "password"}
                      className={`form-control ${error ? "error" : ""}`}
                      placeholder="Create a secure password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPw((v) => !v)}
                      aria-label="Toggle password visibility"
                    >
                      <span className="password-eye">{showPw ? "🙈" : "👁️"}</span>
                    </button>
                  </div>

                  <div className="password-requirements">
                    <div className={`requirement ${req.length ? "valid" : ""}`}>
                      <span className="req-icon">✓</span> 8 characters minimum
                    </div>
                    <div className={`requirement ${req.letter ? "valid" : ""}`}>
                      <span className="req-icon">✓</span> 1 letter
                    </div>
                    <div className={`requirement ${req.number ? "valid" : ""}`}>
                      <span className="req-icon">✓</span> 1 number
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <div className="password-input-group">
                    <input
                      type={showConfirmPw ? "text" : "password"}
                      className={`form-control ${error ? "error" : ""}`}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowConfirmPw((v) => !v)}
                      aria-label="Toggle password visibility"
                    >
                      <span className="password-eye">
                        {showConfirmPw ? "🙈" : "👁️"}
                      </span>
                    </button>
                  </div>
                  <div className="password-requirements">
                    <div className={`requirement ${req.match ? "valid" : ""}`}>
                      <span className="req-icon">✓</span> Passwords match
                    </div>
                  </div>
                  {error && <div className="error-message show">{error}</div>}
                </div>

                <button className="auth-submit-btn" disabled={loading}>
                  <span className="btn-text">
                    {loading ? "Resetting..." : "Reset Password"}
                  </span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}


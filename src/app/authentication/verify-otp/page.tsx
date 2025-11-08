"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function VerifyOTPContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit code");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Invalid or expired code");
      } else {
        // Redirect to reset password page
        router.push(`/authentication/reset-password?email=${encodeURIComponent(email)}&otp=${otp}`);
      }
    } catch (error) {
      console.error("Verify OTP error:", error);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        alert("New code sent to your email!");
      } else {
        setError("Failed to resend code");
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <Link href="/authentication/forgot-password" className="auth-back-btn">
            ← Back
          </Link>
        </div>

        <div className="auth-card">
          <div className="auth-logo">
            <span className="auth-logo-icon">🔐</span>
            <h1>EnglishMaster</h1>
          </div>

          <div className="auth-form active">
            <h2>Verify Code</h2>
            <p className="auth-subtitle">
              Enter the 6-digit code we sent to<br />
              <strong>{email}</strong>
            </p>

            <form className="auth-fields" onSubmit={onSubmit}>
              <div className="form-group">
                <label className="form-label">Verification Code</label>
                <input
                  name="otp"
                  type="text"
                  maxLength={6}
                  className={`form-control ${error ? "error" : ""}`}
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  style={{
                    fontSize: "24px",
                    textAlign: "center",
                    letterSpacing: "8px",
                    fontWeight: "bold",
                  }}
                />
                {error && <div className="error-message show">{error}</div>}
              </div>

              <button className="auth-submit-btn" disabled={loading}>
                <span className="btn-text">
                  {loading ? "Verifying..." : "Verify Code"}
                </span>
              </button>

              <div className="auth-switch">
                <span>Didn&apos;t receive the code?</span>
                <button
                  type="button"
                  className="switch-btn"
                  onClick={resendOTP}
                  disabled={loading}
                >
                  Resend
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyOTPContent />
    </Suspense>
  );
}


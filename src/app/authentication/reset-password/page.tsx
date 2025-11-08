"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"verify" | "reset">("verify");

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !otp) {
      toast.error("Please enter your email and reset code");
      return;
    }

    if (otp.length !== 6) {
      toast.error("Reset code must be 6 digits");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Code verified!", {
          description: "Now you can set your new password.",
        });
        setStep("reset");
      } else {
        toast.error("Verification failed", {
          description: data.error || "Invalid or expired code.",
        });
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      toast.error("Something went wrong", {
        description: "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Password reset successfully!", {
          description: "You can now login with your new password.",
        });
        setTimeout(() => {
          router.push("/authentication/login");
        }, 2000);
      } else {
        toast.error("Reset failed", {
          description: data.error || "Failed to reset password.",
        });
      }
    } catch (error) {
      console.error("Password reset error:", error);
      toast.error("Something went wrong", {
        description: "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (step === "reset") {
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
              <h2>Set New Password</h2>
              <p className="auth-subtitle">
                Enter your new password below
              </p>

              <form className="auth-fields" onSubmit={handleResetPassword}>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input
                    name="newPassword"
                    type="password"
                    className="form-control"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={loading}
                    autoFocus
                    minLength={8}
                    required
                  />
                  <small className="muted" style={{ fontSize: "12px", marginTop: "4px", display: "block" }}>
                    At least 8 characters
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <input
                    name="confirmPassword"
                    type="password"
                    className="form-control"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={loading || !newPassword || !confirmPassword}
                >
                  <span className="btn-text">
                    {loading ? "Resetting..." : "Reset Password"}
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
            <h2>Verify Reset Code</h2>
            <p className="auth-subtitle">
              Enter the 6-digit code sent to your email
            </p>

            <form className="auth-fields" onSubmit={handleVerifyOtp}>
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
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Reset Code</label>
                <input
                  name="otp"
                  type="text"
                  className="form-control"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => {
                    // Only allow numbers and max 6 digits
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setOtp(value);
                  }}
                  disabled={loading}
                  maxLength={6}
                  style={{ 
                    fontSize: "24px", 
                    letterSpacing: "8px", 
                    textAlign: "center", 
                    fontWeight: "600",
                    fontFamily: "monospace"
                  }}
                  autoFocus
                  required
                />
                <small className="muted" style={{ fontSize: "12px", marginTop: "4px", display: "block" }}>
                  6-digit code from your email
                </small>
              </div>

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={loading || !email || otp.length !== 6}
              >
                <span className="btn-text">
                  {loading ? "Verifying..." : "Verify Code"}
                </span>
              </button>
            </form>

            <div className="auth-footer">
              <p className="muted" style={{ textAlign: "center", marginBottom: "12px" }}>
                Didn&apos;t receive the email?{" "}
                <Link href="/authentication/forgot-password" className="link">
                  Resend code
                </Link>
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

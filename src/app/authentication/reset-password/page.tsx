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
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-icon success">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" fill="currentColor" />
              </svg>
            </div>
            <h1>Set New Password</h1>
            <p className="muted">
              Enter your new password below
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="auth-form">
            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                id="newPassword"
                type="password"
                className="input"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                autoFocus
                minLength={8}
              />
              <small className="muted">At least 8 characters</small>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                className="input"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="btn primary w-full"
              disabled={loading}
            >
              {loading ? "Resetting..." : "Reset Password"}
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

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="currentColor" />
            </svg>
          </div>
          <h1>Verify Reset Code</h1>
          <p className="muted">
            Enter the 6-digit code sent to your email
          </p>
        </div>

        <form onSubmit={handleVerifyOtp} className="auth-form">
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
            />
          </div>

          <div className="form-group">
            <label htmlFor="otp">Reset Code</label>
            <input
              id="otp"
              type="text"
              className="input"
              placeholder="000000"
              value={otp}
              onChange={(e) => {
                // Only allow numbers and max 6 digits
                const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                setOtp(value);
              }}
              disabled={loading}
              maxLength={6}
              style={{ fontSize: "24px", letterSpacing: "8px", textAlign: "center", fontWeight: "600" }}
              autoFocus
            />
            <small className="muted">6-digit code from your email</small>
          </div>

          <button
            type="submit"
            className="btn primary w-full"
            disabled={loading}
          >
            {loading ? "Verifying..." : "Verify Code"}
          </button>
        </form>

        <div className="auth-footer">
          <p className="muted">
            Didn't receive the email?{" "}
            <Link href="/authentication/forgot-password" className="link">
              Resend code
            </Link>
          </p>
          <Link href="/authentication/login" className="link">
            ← Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

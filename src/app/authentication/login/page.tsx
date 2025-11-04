"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/english/dashboard";
  
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailErr, setEmailErr] = useState("");
  const [pwErr, setPwErr] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setEmailErr("");
    setPwErr("");
    setLoading(true);

    const form = e.target as HTMLFormElement;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    if (!email) {
      setEmailErr("Please enter your email");
      setLoading(false);
      return;
    }
    if (!password) {
      setPwErr("Please enter your password");
      setLoading(false);
      return;
    }

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setPwErr("Invalid email or password");
        toast.error("Login failed", {
          description: "Invalid email or password. Please try again.",
        });
      } else if (result?.ok) {
        toast.success("Login successful!", {
          description: "Redirecting...",
        });
        // Wait a bit for session to be fully established, then redirect
        // Middleware will handle placement test redirect if needed
        setTimeout(() => {
          // Force a hard redirect to ensure middleware sees the new session
          // Use callbackUrl if provided, otherwise go to dashboard
          window.location.href = callbackUrl;
        }, 800);
      }
    } catch (error) {
      console.error("Login error:", error);
      setPwErr("An error occurred. Please try again.");
      toast.error("Something went wrong", {
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

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
            <h2>Welcome back!</h2>
            <p className="auth-subtitle">Sign in to continue your learning journey</p>

            <button
              className="google-auth-btn"
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/english/dashboard" })}
            >
              <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" className="google-icon" />
              Continue with Google
            </button>
            <div className="auth-divider"><span>or</span></div>

            <form className="auth-fields" onSubmit={onSubmit}>
              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input name="email" type="email" className="form-control" placeholder="Enter your email address" />
                {emailErr && <div className="error-message">{emailErr}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="password-input-group">
                  <input
                    name="password"
                    type={showPw ? "text" : "password"}
                    className="form-control"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPw(v => !v)}
                    aria-label="Toggle password visibility"
                  >
                    <span className="password-eye">{showPw ? "🙈" : "👁️"}</span>
                  </button>
                </div>
                {pwErr && <div className="error-message">{pwErr}</div>}
              </div>

              <div className="form-options">
                <label className="checkbox-label">
                  <input type="checkbox" />
                  <span className="checkmark"></span>
                  Remember me
                </label>
                <Link href="/authentication/forgot-password" className="forgot-link">
                  Forgot your password?
                </Link>
              </div>

              <button className="auth-submit-btn" disabled={loading}>
                <span className="btn-text">{loading ? "Signing in..." : "Sign in"}</span>
              </button>

              <div className="auth-switch">
                <span>Don&apos;t have an account?</span>
                <Link href="/authentication/register" className="switch-btn">Sign up</Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
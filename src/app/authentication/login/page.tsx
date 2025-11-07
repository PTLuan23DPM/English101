"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

export default function LoginPage() {
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
          description: "Redirecting to your dashboard...",
        });
        // Redirect to dashboard
        setTimeout(() => {
          window.location.href = "/english/dashboard";
        }, 1000);
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
              <svg className="google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
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
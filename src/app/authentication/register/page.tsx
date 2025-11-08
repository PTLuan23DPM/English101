"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

export default function RegisterPage() {
  const [expandEmail, setExpandEmail] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailErr, setEmailErr] = useState("");
  const [pwErr, setPwErr] = useState("");
  const [pw, setPw] = useState("");
  const req = useMemo(() => ({
    length: pw.length >= 8,
    letter: /[A-Za-z]/.test(pw),
    number: /\d/.test(pw),
  }), [pw]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setEmailErr("");
    setPwErr("");
    setLoading(true);
    
    const form = e.target as HTMLFormElement;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();

    if (!email) {
      setEmailErr("Please enter your email");
      setLoading(false);
      return;
    }
    if (!(req.length && req.letter && req.number)) {
      setPwErr("Password doesn't meet requirements");
      setLoading(false);
      return;
    }

    try {
      // Call register API
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password: pw,
          name: email.split("@")[0],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setEmailErr(data.error || "Registration failed");
        toast.error("Registration failed", {
          description: data.error || "Unable to create account. Please try again.",
        });
        setLoading(false);
        return;
      }

      toast.success("Account created!", {
        description: "Signing you in...",
      });

      // Auto login after successful registration
      const result = await signIn("credentials", {
        email,
        password: pw,
        redirect: false,
      });

      if (result?.ok) {
        toast.success("Welcome to English101!", {
          description: "Redirecting to your dashboard...",
        });
        setTimeout(() => {
          window.location.href = "/english/dashboard";
        }, 1000);
      } else {
        // Registration successful but login failed, redirect to login
        toast.info("Please sign in", {
          description: "Account created successfully. Please sign in.",
        });
        setTimeout(() => {
          window.location.href = "/authentication/login";
        }, 1500);
      }
    } catch (error) {
      console.error("Registration error:", error);
      setEmailErr("An error occurred. Please try again.");
      toast.error("Something went wrong", {
        description: "An unexpected error occurred. Please try again.",
      });
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
            <h2>Join EnglishMaster</h2>
            <p className="auth-subtitle">Start your English learning journey today</p>

            
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

            <div className="email-signup-section">
              <button
                className="email-signup-toggle"
                type="button"
                aria-expanded={expandEmail}
                aria-controls="email-signup-content"
                onClick={() => setExpandEmail(v => !v)}
              >
                <span>{expandEmail ? "Hide email sign up" : "Sign up with email"}</span>
                <span className="toggle-arrow">{expandEmail ? "▲" : "▼"}</span>
              </button>

              {expandEmail && (
                <div
                  id="email-signup-content"
                  className={`email-signup-anim ${expandEmail ? "is-open" : ""}`}
                >
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
                          type={showPw ? "text" : "password"}
                          className="form-control"
                          placeholder="Create a secure password"
                          value={pw}
                          onChange={(e) => setPw(e.target.value)}
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

                      <div className="password-requirements">
                        <div className={`requirement ${req.length ? "ok" : ""}`}>
                          <span className="req-icon"></span>
                          <span>8 characters minimum</span>
                        </div>
                        <div className={`requirement ${req.letter ? "ok" : ""}`}>
                          <span className="req-icon"></span>
                          <span>1 letter</span>
                        </div>
                        <div className={`requirement ${req.number ? "ok" : ""}`}>
                          <span className="req-icon"></span>
                          <span>1 number</span>
                        </div>
                      </div>

                      {pwErr && <div className="error-message">{pwErr}</div>}
                    </div>

                    <label className="checkbox-label marketing-consent">
                      <input type="checkbox" defaultChecked />
                      <span className="checkmark"></span>
                      Yes, I want to receive product tips & updates from EnglishMaster
                    </label>

                    <button className="auth-submit-btn" disabled={loading}>
                      <span className="btn-text">{loading ? "Creating..." : "Sign Up"}</span>
                    </button>
                  </form>
                </div>
              )}
            </div>

            <div className="auth-switch">
              <span>Already have an account?</span>
              <Link href="/authentication/login" className="switch-btn">Sign in</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
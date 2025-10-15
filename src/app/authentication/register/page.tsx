"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

export default function RegisterPage() {
  const [expandEmail, setExpandEmail] = useState(true);
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
    setEmailErr(""); setPwErr(""); setLoading(true);
    const form = e.target as HTMLFormElement;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();

    if (!email) setEmailErr("Please enter your email");
    if (!(req.length && req.letter && req.number)) setPwErr("Password doesn’t meet requirements");
    if (!email || !(req.length && req.letter && req.number)) {
      setLoading(false);
      return;
    }
    // TODO: call your API / NextAuth signUp...
    setTimeout(() => setLoading(false), 900);
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

            <button className="google-auth-btn" type="button">
              <img
                src="https://developers.google.com/identity/images/g-logo.png"
                alt="Google"
                className="google-icon"
              />
              Continue with Google
            </button>

            <div className="email-signup-section">
              <button
                className="email-signup-toggle"
                type="button"
                onClick={() => setExpandEmail(v => !v)}
              >
                <span id="email-toggle-text">{expandEmail ? "Hide email sign up" : "Sign up with email"}</span>
                <span className="toggle-arrow">{expandEmail ? "▲" : "▼"}</span>
              </button>

              {expandEmail && (
                <div className="email-signup-content">
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
                          <span className="req-icon">✓</span> 8 characters minimum
                        </div>
                        <div className={`requirement ${req.letter ? "ok" : ""}`}>
                          <span className="req-icon">✓</span> 1 letter
                        </div>
                        <div className={`requirement ${req.number ? "ok" : ""}`}>
                          <span className="req-icon">✓</span> 1 number
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
                      <span className="btn-text">{loading ? "Creating..." : "Sign up for free"}</span>
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
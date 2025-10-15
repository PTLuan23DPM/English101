"use client";
import Link from "next/link";

export default function HeaderMinimal() {
  return (
    <header className="em-header">
      <div className="em-header__inner">
        {/* Logo (left) */}
        <Link href="/" className="em-logo" aria-label="English101">
          <span className="em-logo__icon">📚</span>
          <span className="em-logo__text">English101</span>
        </Link>

        {/* Buttons (right) */}
        <div className="em-actions">
          <Link href="/authentication/login" className="em-btn em-btn--ghost">Log in</Link>
          <Link href="/authentication/register" className="em-btn em-btn--primary">Register</Link>
        </div>
      </div>
    </header>
  );
}
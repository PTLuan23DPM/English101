"use client";
import Link from "next/link";
import HeaderMinimal from "./components/navigation/navbar";

export default function HomePage() {
  return (
    <main>
      <HeaderMinimal />


      {/* HERO (copy cấu trúc & text từ file gốc) */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Master English with <span className="highlight">CEFR Levels</span>
          </h1>
          <p className="hero-subtitle">
            Learn English from beginner to advanced with our structured
            approach. Build your streak and track your progress!
          </p>

          <div className="hero-features">
            <div className="feature">
              <div className="feature-icon">🎯</div>
              <span>CEFR-based curriculum</span>
            </div>
            <div className="feature">
              <div className="feature-icon">🔥</div>
              <span>Daily streak system</span>
            </div>
            <div className="feature">
              <div className="feature-icon">📈</div>
              <span>Progress tracking</span>
            </div>
          </div>

          <Link href="/authentication/login" className="cta-button">
            Start Learning English <span className="button-arrow">→</span>
          </Link>
        </div>

        {/* các thẻ nổi A1–C2 ở bên phải */}
        <div className="hero-image">
          <div className="hero-graphic">
            <div className="floating-card card-1">
              <div className="card-icon">🟢</div>
              <div className="card-text">A1-A2<br /><small>Beginner</small></div>
            </div>
            <div className="floating-card card-2">
              <div className="card-icon">🔵</div>
              <div className="card-text">B1-B2<br /><small>Intermediate</small></div>
            </div>
            <div className="floating-card card-3">
              <div className="card-icon">🟡</div>
              <div className="card-text">C1-C2<br /><small>Advanced</small></div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
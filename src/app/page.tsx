"use client";
import Link from "next/link";
import HeaderMinimal from "./components/navigation/navbar";

export default function HomePage() {
  return (
    <main className="landing-page">
      <HeaderMinimal />

      {/* HERO SECTION */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-badge">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1L10.163 5.38L15 6.125L11.5 9.545L12.326 14.375L8 12.113L3.674 14.375L4.5 9.545L1 6.125L5.837 5.38L8 1Z" 
                  fill="currentColor" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              <span>CEFR-Aligned English Learning Platform</span>
            </div>

            <h1 className="hero-title">
              Master English from
              <br />
              <span className="highlight">A1 to C2</span> Level
            </h1>
            
            <p className="hero-subtitle">
              Comprehensive English learning platform with structured curriculum,
              AI-powered feedback, and progress tracking. Learn at your own pace
              with our scientifically-designed courses.
            </p>

            <div className="hero-cta">
              <Link href="/authentication/register" className="btn btn--hero">
                Sign Up
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
              <Link href="/authentication/login" className="btn btn--hero-secondary">
                Sign In
              </Link>
            </div>

            <div className="hero-stats">
              <div className="stat-item">
                <span className="stat-number">10,000+</span>
                <span className="stat-label">Active Learners</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">500+</span>
                <span className="stat-label">Exercises</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">98%</span>
                <span className="stat-label">Success Rate</span>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="floating-cards">
              <div className="level-card level-a">
                <div className="level-badge">A1-A2</div>
                <div className="level-title">Beginner</div>
                <div className="level-desc">Foundation & Basic Skills</div>
              </div>
              <div className="level-card level-b">
                <div className="level-badge">B1-B2</div>
                <div className="level-title">Intermediate</div>
                <div className="level-desc">Independent User</div>
              </div>
              <div className="level-card level-c">
                <div className="level-badge">C1-C2</div>
                <div className="level-title">Advanced</div>
                <div className="level-desc">Proficient User</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="features-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Everything You Need to Succeed</h2>
            <p className="section-subtitle">
              Complete learning ecosystem designed for effective language acquisition
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon blue">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" 
                    stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <h3>4 Core Skills</h3>
              <p>Practice Reading, Writing, Listening, and Speaking with interactive exercises</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon green">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" 
                    stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>AI-Powered Feedback</h3>
              <p>Get instant, detailed feedback on your writing and speaking with AI analysis</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon purple">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M3 3H21V21H3V3Z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M9 9H15M9 15H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <h3>Structured Curriculum</h3>
              <p>Follow CEFR-aligned courses from A1 to C2 with clear progression paths</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon orange">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M22 12H18L15 21L9 3L6 12H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>Progress Tracking</h3>
              <p>Visualize your improvement with detailed analytics and performance charts</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon pink">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>Grammar & Vocabulary</h3>
              <p>Master essential grammar rules and expand your vocabulary with targeted exercises</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon amber">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <h3>Placement Test</h3>
              <p>Start at the right level with our comprehensive CEFR placement assessment</p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how-it-works">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle">
              Simple, effective, and proven approach to language learning
            </p>
          </div>

          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Take Placement Test</h3>
              <p>Assess your current level with our comprehensive test covering all skills</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>Follow Your Path</h3>
              <p>Get personalized learning plan based on your level and goals</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Practice & Improve</h3>
              <p>Complete exercises, get AI feedback, and track your progress</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step">
              <div className="step-number">4</div>
              <h3>Master English</h3>
              <p>Achieve fluency and certification with consistent practice</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-card">
            <h2>Ready to Start Your English Journey?</h2>
            <p>
              Join thousands of learners improving their English every day.
              Start for free today, no credit card required.
            </p>
            <div className="cta-buttons">
              <Link href="/authentication/register" className="btn btn--large btn--white">
                Sign Up
              </Link>
              <Link href="/authentication/login" className="btn btn--large btn--outline-white">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="brand-logo">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <rect width="32" height="32" rx="8" fill="currentColor" opacity="0.1"/>
                  <path d="M16 8L20 16L16 24L12 16L16 8Z" fill="currentColor"/>
                </svg>
                <span>English101</span>
              </div>
              <p className="footer-tagline">
                Master English with confidence through structured learning and AI-powered feedback.
              </p>
            </div>

            <div className="footer-links">
              <div className="footer-column">
                <h4>Product</h4>
                <Link href="/authentication/register">Get Started</Link>
                <Link href="/authentication/login">Sign In</Link>
              </div>

              <div className="footer-column">
                <h4>Resources</h4>
                <a href="#">Documentation</a>
                <a href="#">API Reference</a>
                <a href="#">Support</a>
              </div>

              <div className="footer-column">
                <h4>Company</h4>
                <a href="#">About Us</a>
                <a href="#">Privacy Policy</a>
                <a href="#">Terms of Service</a>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; 2025 English101. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
"use client";
import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Link href="/" className="sidebar-logo" aria-label="Go to home">
          <span className="logo-icon">🎓</span>
          <span className="logo-text">English101</span>
        </Link>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          <div className="nav-item">
            <span className="nav-label">Dashboard<small>Tổng quan</small></span>
          </div>
        </div>

        <div className="nav-section">
          <div className="section-title">Core Skills</div>
          <div className="nav-item"><span className="nav-label">Listening<small>Nghe</small></span></div>
          <div className="nav-item"><span className="nav-label">Reading<small>Đọc</small></span></div>
          <div className="nav-item"><span className="nav-label">Writing<small>Viết</small></span></div>
          <div className="nav-item"><span className="nav-label">Speaking<small>Nói</small></span></div>
        </div>

        <div className="nav-section">
          <div className="section-title">Evaluation</div>
          <div className="nav-item"><span className="nav-label">Support<small>Hỗ trợ</small></span></div>
        </div>
      </nav>

      <div className="sidebar-footer">
        {/* anything else */}
      </div>
    </aside>
  );
}

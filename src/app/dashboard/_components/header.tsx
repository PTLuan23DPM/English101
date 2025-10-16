// app/dashboard/_components/header.tsx
export default function DashboardHeader() {
  return (
    <header className="dashboard-header">
      <div className="header-left">
        <button className="mobile-sidebar-toggle" aria-label="Toggle sidebar" />
        <h1>Dashboard</h1>
      </div>
      <div className="header-right">
        <div className="streak-display"><span>🔥</span><span className="streak-count">7</span><span className="streak-label">days streak!</span></div>
        <button className="notification-btn"><span className="bell-icon">🔔</span></button>
        <div className="user-avatar"><span className="avatar-icon">👤</span></div>
      </div>
    </header>
  );
}

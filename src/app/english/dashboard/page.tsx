"use client";

export default function DashboardPage() {
  return (
      <div className="dashboard-content">
        {/* Welcome & Usage Stats */}
        <div className="welcome-section">
          <div className="welcome-card">
            <div className="welcome-text">
              <h2>🔥 <span id="current-streak">7</span> days streak!</h2>
              <button className="upgrade-btn">Keep up your streak</button>
            </div>
          </div>
        </div>

        {/* AI Chatbot Section */}
        <div className="chatbot-section">
          <div className="chatbot-card">
            <div className="chatbot-header">
              <div className="bot-avatar">🤖</div>
              <div className="bot-greeting">
                <h3>Hey, I&apos;m LearnBot!</h3>
                <p>I&apos;m here to make English learning fun and effective for you ✨</p>
              </div>
            </div>
            <div className="chatbot-input">
              <input type="text" placeholder="Ask anything in your language" className="chat-input" />
              <div className="chat-actions">
                <button className="chat-btn">Ask</button>
                <button className="chat-btn">Learn</button>
                <button className="chat-btn">Support</button>
              </div>
            </div>
          </div>
        </div>

        {/* Getting Started */}
        <div className="getting-started-section">
          <div className="progress-card">
            <h3>Getting Started <span className="progress-percent">50%</span></h3>
            <div className="progress-bar"><div className="progress-fill" style={{ width: "50%" }} /></div>
            <div className="checklist">
              <div className="checklist-item completed"><span className="check-icon">✅</span><span className="check-text">Add your target level</span></div>
              <div className="checklist-item current"><span className="check-icon">➡️</span><span className="check-text">Learn your current level</span></div>
              <div className="checklist-item locked"><span className="check-icon">🔒</span><span className="check-text">Choose your learning path</span></div>
              <div className="checklist-item completed"><span className="check-icon">✅</span><span className="check-text">View sample reports</span></div>
            </div>
          </div>
        </div>

        {/* Start Practice */}
        <div className="practice-section">
          <h3>Start Practice</h3>
          <div className="practice-cards">
            <div className="practice-card listening-card">
              <div className="practice-icon">🎧</div>
              <div className="practice-content">
                <h4>Listening Practice</h4>
                <p>Practice exercises from basic to advanced levels</p>
                <small>Practice A1, A2, B1, B2, C1, C2</small>
              </div>
              <button className="practice-btn">Start Listening</button>
            </div>
            <div className="practice-card reading-card">
              <div className="practice-icon">📚</div>
              <div className="practice-content">
                <h4>Reading Practice</h4>
                <p>Reading comprehension and vocabulary building</p>
                <small>Practice A1, A2, B1, B2, C1, C2</small>
              </div>
              <button className="practice-btn">Start Reading</button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="activity-section">
          <div className="activity-header">
            <h3>Recent Activity</h3>
            <p>Your latest learning progress and completed exercises</p>
          </div>
          <div className="activity-table-header">
            <span>Time</span><span>Task</span><span>Task Description</span><span>Status</span><span>Progress</span>
          </div>
          <div className="activity-empty">
            <div className="empty-illustration">🌱🦕</div>
            <h4>You don&apos;t have any completed activities yet</h4>
            <p>Check out sample reports to see feedback examples for premium users</p>
            <button className="sample-reports-btn">View Premium Sample Reports</button>
            <p className="activity-footer">Free users can see up to 5 completed records. Upgrade to see more results</p>
            <a href="#" className="view-all-link">View all in My Reports →</a>
          </div>
        </div>

        {/* Analytics */}
        <div className="analytics-section">
          <div className="analytics-header">
            <h3>Your Strengths and Weaknesses</h3>
            <p>Identify your strengths and weaknesses for each criterion, with detailed insights</p>
            <select className="time-filter">
              <option>All Time</option>
              <option>Last Month</option>
              <option>Last Week</option>
            </select>
          </div>
          <div className="analytics-charts">
            <div className="chart-container"><canvas id="skills-radar-chart" width={300} height={300} /></div>
            <div className="chart-container"><canvas id="performance-radar-chart" width={300} height={300} /></div>
          </div>
        </div>
      </div>
  );
}

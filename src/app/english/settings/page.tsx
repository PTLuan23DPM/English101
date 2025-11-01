"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [language, setLanguage] = useState<"en" | "vi">("en");
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    dailyReminder: true,
    weeklyReport: true,
  });

  useEffect(() => {
    // Load saved settings
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" || "light";
    const savedLanguage = localStorage.getItem("language") as "en" | "vi" || "en";
    
    setTheme(savedTheme);
    setLanguage(savedLanguage);
    
    // Apply theme
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  const handleThemeChange = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    toast.success(`Theme changed to ${newTheme} mode`);
  };

  const handleLanguageChange = (newLanguage: "en" | "vi") => {
    setLanguage(newLanguage);
    localStorage.setItem("language", newLanguage);
    toast.success(`Language changed to ${newLanguage === "en" ? "English" : "Vietnamese"}`);
    // Trigger language context update here
  };

  const handleNotificationToggle = (key: keyof typeof notifications) => {
    setNotifications((prev) => {
      const newSettings = { ...prev, [key]: !prev[key] };
      localStorage.setItem("notifications", JSON.stringify(newSettings));
      return newSettings;
    });
    toast.success("Notification settings updated");
  };

  return (
    <div className="settings-page">
      <div className="settings-container">
        <h1>Settings</h1>
        <p className="subtitle">Customize your learning experience</p>

        {/* Appearance */}
        <section className="card">
          <h2>🎨 Appearance</h2>
          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-title">Theme</div>
              <div className="setting-desc">Choose your preferred theme</div>
            </div>
            <div className="theme-selector">
              <button
                className={`theme-option ${theme === "light" ? "active" : ""}`}
                onClick={() => handleThemeChange("light")}
              >
                ☀️ Light
              </button>
              <button
                className={`theme-option ${theme === "dark" ? "active" : ""}`}
                onClick={() => handleThemeChange("dark")}
              >
                🌙 Dark
              </button>
            </div>
          </div>
        </section>

        {/* Language */}
        <section className="card">
          <h2>🌍 Language</h2>
          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-title">Interface Language</div>
              <div className="setting-desc">Choose your interface language</div>
            </div>
            <div className="language-selector">
              <button
                className={`lang-option ${language === "en" ? "active" : ""}`}
                onClick={() => handleLanguageChange("en")}
              >
                🇬🇧 English
              </button>
              <button
                className={`lang-option ${language === "vi" ? "active" : ""}`}
                onClick={() => handleLanguageChange("vi")}
              >
                🇻🇳 Tiếng Việt
              </button>
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section className="card">
          <h2>🔔 Notifications</h2>
          <div className="setting-list">
            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-title">Email Notifications</div>
                <div className="setting-desc">Receive updates via email</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notifications.email}
                  onChange={() => handleNotificationToggle("email")}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-title">Daily Reminder</div>
                <div className="setting-desc">Get reminded to practice daily</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notifications.dailyReminder}
                  onChange={() => handleNotificationToggle("dailyReminder")}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-title">Weekly Report</div>
                <div className="setting-desc">Receive weekly progress reports</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notifications.weeklyReport}
                  onChange={() => handleNotificationToggle("weeklyReport")}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="card danger-zone">
          <h2>⚠️ Danger Zone</h2>
          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-title">Delete Account</div>
              <div className="setting-desc">
                Permanently delete your account and all data
              </div>
            </div>
            <button className="btn danger" disabled>
              Delete Account
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}


"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [language, setLanguage] = useState<"en" | "vi">("en");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    dailyReminder: true,
    weeklyReport: true,
  });

  useEffect(() => {
    // Load settings from server
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/settings/update");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.settings) {
          const { theme: serverTheme, language: serverLanguage, notifications: serverNotifications } = data.settings;
          
          setTheme(serverTheme || "light");
          setLanguage(serverLanguage || "en");
          setNotifications(serverNotifications || notifications);
          
          // Apply theme
          document.documentElement.setAttribute("data-theme", serverTheme || "light");
          
          // Sync with localStorage for backward compatibility
          localStorage.setItem("theme", serverTheme || "light");
          localStorage.setItem("language", serverLanguage || "en");
        }
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
      // Fallback to localStorage
      const savedTheme = localStorage.getItem("theme") as "light" | "dark" || "light";
      const savedLanguage = localStorage.getItem("language") as "en" | "vi" || "en";
      
      setTheme(savedTheme);
      setLanguage(savedLanguage);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: { theme?: string; language?: string; notifications?: typeof notifications }) => {
    try {
      setSaving(true);
      const response = await fetch("/api/settings/update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        let errorMessage = "Failed to update settings";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch (parseError) {
          // If response is not JSON, use status text
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (data.success) {
        // Sync with localStorage for backward compatibility
        if (updates.theme) {
          localStorage.setItem("theme", updates.theme);
        }
        if (updates.language) {
          localStorage.setItem("language", updates.language);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to update settings:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update settings. Please try again.";
      toast.error(errorMessage);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = async (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    
    const success = await updateSettings({ theme: newTheme });
    if (success) {
      // Update session to refresh JWT token
      await update();
      toast.success(`Theme changed to ${newTheme} mode`);
    } else {
      // Revert on failure
      const savedTheme = localStorage.getItem("theme") as "light" | "dark" || "light";
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    }
  };

  const handleLanguageChange = async (newLanguage: "en" | "vi") => {
    setLanguage(newLanguage);
    
    const success = await updateSettings({ language: newLanguage });
    if (success) {
      // Update session to refresh JWT token with new language
      await update();
      toast.success(`Language changed to ${newLanguage === "en" ? "English" : "Vietnamese"}`);
      // Trigger language context update here
      // You might want to reload the page or update a language context
    } else {
      // Revert on failure
      const savedLanguage = localStorage.getItem("language") as "en" | "vi" || "en";
      setLanguage(savedLanguage);
    }
  };

  const handleNotificationToggle = async (key: keyof typeof notifications) => {
    const newSettings = { ...notifications, [key]: !notifications[key] };
    setNotifications(newSettings);
    
    const success = await updateSettings({ notifications: newSettings });
    if (success) {
      toast.success("Notification settings updated");
    } else {
      // Revert on failure
      setNotifications(notifications);
    }
  };

  if (loading) {
    return (
      <div className="settings-page">
        <div className="settings-container">
          <h1>Settings</h1>
          <p className="subtitle">Loading settings...</p>
        </div>
      </div>
    );
  }

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
                disabled={saving}
              >
                ☀️ Light
              </button>
              <button
                className={`theme-option ${theme === "dark" ? "active" : ""}`}
                onClick={() => handleThemeChange("dark")}
                disabled={saving}
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
                disabled={saving}
              >
                🇬🇧 English
              </button>
              <button
                className={`lang-option ${language === "vi" ? "active" : ""}`}
                onClick={() => handleLanguageChange("vi")}
                disabled={saving}
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


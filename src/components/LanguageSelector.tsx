"use client";

import { useState, useEffect } from "react";

export default function LanguageSelector() {
  const [language, setLanguage] = useState<"en" | "vi">("en");

  useEffect(() => {
    const saved = localStorage.getItem("language") as "en" | "vi" || "en";
    setLanguage(saved);
  }, []);

  const toggleLanguage = () => {
    const newLang = language === "en" ? "vi" : "en";
    setLanguage(newLang);
    localStorage.setItem("language", newLang);
    // Trigger context update or page reload if needed
  };

  return (
    <button 
      className="language-selector"
      onClick={toggleLanguage}
      aria-label="Toggle language"
    >
      {language === "en" ? "🇬🇧 EN" : "🇻🇳 VI"}
    </button>
  );
}


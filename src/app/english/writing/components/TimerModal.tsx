"use client";

import { useState } from "react";
import { toast } from "sonner";

interface TimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (minutes: number) => void;
}

const PRESET_TIMES = [
  { label: "15 minutes", value: 15, description: "Quick practice" },
  { label: "20 minutes", value: 20, description: "IELTS Task 1" },
  { label: "40 minutes", value: 40, description: "IELTS Task 2" },
  { label: "60 minutes", value: 60, description: "Extended practice" },
];

export default function TimerModal({ isOpen, onClose, onStart }: TimerModalProps) {
  const [customMinutes, setCustomMinutes] = useState("");

  if (!isOpen) return null;

  const handleStartTimer = (minutes: number) => {
    if (minutes < 1 || minutes > 120) {
      toast.error("Invalid time", {
        description: "Please select a time between 1-120 minutes",
      });
      return;
    }
    
    onStart(minutes);
    toast.success("Timer started!", {
      description: `You have ${minutes} minutes to complete your writing`,
    });
    onClose();
  };

  const handleCustomStart = () => {
    const minutes = parseInt(customMinutes);
    if (isNaN(minutes)) {
      toast.error("Invalid input", {
        description: "Please enter a valid number",
      });
      return;
    }
    handleStartTimer(minutes);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content timer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⏱️ Set Timer</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <p className="timer-modal__description">
            Set a timer to simulate exam conditions. When time runs out, you won't be able to edit your text.
          </p>

          {/* Preset Times */}
          <div className="timer-presets">
            {PRESET_TIMES.map((preset) => (
              <button
                key={preset.value}
                className="timer-preset-btn"
                onClick={() => handleStartTimer(preset.value)}
              >
                <span className="timer-preset-label">{preset.label}</span>
                <span className="timer-preset-desc">{preset.description}</span>
              </button>
            ))}
          </div>

          {/* Custom Time */}
          <div className="timer-custom">
            <label htmlFor="custom-time">Or set custom time (minutes)</label>
            <div className="timer-custom-input">
              <input
                id="custom-time"
                type="number"
                min="1"
                max="120"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                placeholder="Enter minutes"
              />
              <button
                className="btn btn--primary"
                onClick={handleCustomStart}
                disabled={!customMinutes}
              >
                Start
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


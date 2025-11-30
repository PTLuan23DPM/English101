"use client";

import { useState, useEffect } from "react";

interface Activity {
  id: string;
  unitId: string;
  type: string;
  title: string;
  instruction: string | null;
  maxScore: number | null;
  timeLimitSec: number | null;
  level: string;
  skill: string;
  media: Array<{
    id: string;
    url: string;
    type: string;
    durationS: number | null;
  }>;
}

interface Unit {
  id: string;
  title: string;
  module: {
    id: string;
    code: string;
    title: string;
  };
}

interface ActivityFormProps {
  activity: Activity | null;
  units: Unit[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function ActivityForm({ activity, units, onClose, onSuccess }: ActivityFormProps) {
  const [formData, setFormData] = useState({
    unitId: activity?.unitId || "",
    type: activity?.type || "LECTURE",
    title: activity?.title || "",
    instruction: activity?.instruction || "",
    maxScore: activity?.maxScore || "",
    timeLimitSec: activity?.timeLimitSec || "",
    level: activity?.level || "A1",
    skill: activity?.skill || "LISTENING",
  });
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [uploadedMedia, setUploadedMedia] = useState<Array<{ url: string; type: string; durationS?: number }>>(
    activity?.media.map(m => ({ url: m.url, type: m.type, durationS: m.durationS || undefined })) || []
  );
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setMediaFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (mediaFiles.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      const uploadPromises = mediaFiles.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/admin-dashboard/courses/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Upload failed");
        }

        const data = await response.json();
        return {
          url: data.url,
          type: data.type,
          durationS: undefined, // TODO: Extract duration from file if possible
        };
      });

      const results = await Promise.all(uploadPromises);
      setUploadedMedia([...uploadedMedia, ...results]);
      setMediaFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveMedia = (index: number) => {
    setUploadedMedia(uploadedMedia.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        maxScore: formData.maxScore ? parseInt(formData.maxScore.toString()) : null,
        timeLimitSec: formData.timeLimitSec ? parseInt(formData.timeLimitSec.toString()) : null,
        mediaUrls: uploadedMedia,
      };

      const url = activity
        ? `/api/admin-dashboard/courses/activities/${activity.id}`
        : "/api/admin-dashboard/courses/activities";
      const method = activity ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save activity");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{activity ? "Sửa Activity" : "Tạo Activity Mới"}</h2>
          <button onClick={onClose} className="modal-close-btn">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="activity-form">
          <div className="form-group">
            <label>Unit *</label>
            <select
              value={formData.unitId}
              onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
              required
            >
              <option value="">Chọn unit</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.module.code} - {unit.title}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Type *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                required
              >
                <option value="LECTURE">Lecture</option>
                <option value="LISTEN_FIND_ERROR">Listen Find Error</option>
                <option value="LISTEN_DETAIL">Listen Detail</option>
                <option value="LISTEN_GIST">Listen Gist</option>
                <option value="READ_MAIN_IDEA">Read Main Idea</option>
                <option value="READ_INFER">Read Infer</option>
                <option value="READ_SKIMMING">Read Skimming</option>
                <option value="WRITE_SENTENCE">Write Sentence</option>
                <option value="WRITE_PARAGRAPH">Write Paragraph</option>
                <option value="WRITE_EMAIL">Write Email</option>
                <option value="WRITE_SHORT_ESSAY">Write Short Essay</option>
                <option value="SPEAK_TOPIC">Speak Topic</option>
                <option value="SPEAK_ROLE_PLAY">Speak Role Play</option>
                <option value="SPEAK_DESCRIPTION">Speak Description</option>
                <option value="GRAMMAR_FILL_BLANK">Grammar Fill Blank</option>
                <option value="GRAMMAR_TRANSFORMATION">Grammar Transformation</option>
                <option value="VOCAB_MATCHING">Vocab Matching</option>
                <option value="VOCAB_CLZE">Vocab Cloze</option>
                <option value="PRONUN_MINIMAL_PAIR">Pronun Minimal Pair</option>
                <option value="PRONUN_STRESS">Pronun Stress</option>
                <option value="PRONUN_INTONATION">Pronun Intonation</option>
                <option value="FUNCTIONAL_DIALOG">Functional Dialog</option>
                <option value="MEDIATION_SUMMARIZE">Mediation Summarize</option>
                <option value="MEDIATION_REPHRASE">Mediation Rephrase</option>
                <option value="ASSESS_SECTION">Assess Section</option>
              </select>
            </div>
            <div className="form-group">
              <label>Level *</label>
              <select
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                required
              >
                <option value="A1">A1</option>
                <option value="A2">A2</option>
                <option value="B1">B1</option>
                <option value="B2">B2</option>
                <option value="C1">C1</option>
                <option value="C2">C2</option>
              </select>
            </div>
            <div className="form-group">
              <label>Skill *</label>
              <select
                value={formData.skill}
                onChange={(e) => setFormData({ ...formData, skill: e.target.value })}
                required
              >
                <option value="LISTENING">Listening</option>
                <option value="READING">Reading</option>
                <option value="WRITING">Writing</option>
                <option value="SPEAKING">Speaking</option>
                <option value="GRAMMAR">Grammar</option>
                <option value="VOCABULARY">Vocabulary</option>
                <option value="PRONUNCIATION">Pronunciation</option>
                <option value="FUNCTIONAL_LANGUAGE">Functional Language</option>
                <option value="MEDIATION">Mediation</option>
                <option value="ASSESSMENT">Assessment</option>
                <option value="CULTURE">Culture</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Instruction</label>
            <textarea
              value={formData.instruction}
              onChange={(e) => setFormData({ ...formData, instruction: e.target.value })}
              rows={4}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Max Score</label>
              <input
                type="number"
                value={formData.maxScore}
                onChange={(e) => setFormData({ ...formData, maxScore: e.target.value ? parseInt(e.target.value) : "" })}
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Time Limit (seconds)</label>
              <input
                type="number"
                value={formData.timeLimitSec}
                onChange={(e) => setFormData({ ...formData, timeLimitSec: e.target.value ? parseInt(e.target.value) : "" })}
                min="0"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Upload Audio/Video</label>
            <div className="file-upload-section">
              <input
                type="file"
                accept="audio/*,video/*"
                multiple
                onChange={handleFileChange}
                className="file-input"
              />
              {mediaFiles.length > 0 && (
                <div className="file-list">
                  {mediaFiles.map((file, index) => (
                    <div key={index} className="file-item">
                      {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={handleUpload}
                disabled={mediaFiles.length === 0 || uploading}
                className="btn btn-secondary"
              >
                {uploading ? "Đang upload..." : "Upload Files"}
              </button>
            </div>
            {uploadedMedia.length > 0 && (
              <div className="uploaded-media">
                <strong>Uploaded Media:</strong>
                {uploadedMedia.map((media, index) => (
                  <div key={index} className="media-item">
                    <span>{media.type}: {media.url}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(index)}
                      className="btn btn-sm btn-danger"
                    >
                      Xóa
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="form-hint">
              NOTE: File upload is currently a placeholder. You need to implement actual file storage integration.
            </p>
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Đang lưu..." : activity ? "Cập nhật" : "Tạo Activity"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


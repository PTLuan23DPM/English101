"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import type {
  ReadingVocabulary,
  ReadingLessonSection,
  ReadingExercise,
} from "@/data/readingLessons";

interface ReadingTask {
  id: string;
  title: string;
  subtitle: string | null;
  cefr: string;
  genre: string;
  source: string | null;
  tags: string[];
  estimatedTime: number | null;
  wordCount: number | null;
  coverEmoji: string | null;
  gradient: string | null;
  readingSkills: string[];
  keyIdeas: string[];
  vocabulary: ReadingVocabulary[] | null;
  contentSections: ReadingLessonSection[] | null;
  exercises: ReadingExercise[] | null;
  recommended: boolean;
  order: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function ReadingTaskManager() {
  const [tasks, setTasks] = useState<ReadingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<ReadingTask | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    cefr: "A2",
    genre: "",
    source: "",
    tags: [] as string[],
    estimatedTime: 10,
    wordCount: 0,
    coverEmoji: "📖",
    gradient: "",
    readingSkills: [] as string[],
    keyIdeas: [] as string[],
    recommended: false,
    order: 0,
    active: true,
  });
  const [tagInput, setTagInput] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [ideaInput, setIdeaInput] = useState("");

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin-dashboard/courses/reading-tasks");
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks || []);
      } else {
        throw new Error(data.error || "Failed to fetch tasks");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      console.error("[ReadingTaskManager] Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim()) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput("");
    }
  };

  const handleRemoveTag = (index: number) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((_, i) => i !== index),
    });
  };

  const handleAddSkill = () => {
    if (skillInput.trim()) {
      setFormData({
        ...formData,
        readingSkills: [...formData.readingSkills, skillInput.trim()],
      });
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (index: number) => {
    setFormData({
      ...formData,
      readingSkills: formData.readingSkills.filter((_, i) => i !== index),
    });
  };

  const handleAddIdea = () => {
    if (ideaInput.trim()) {
      setFormData({
        ...formData,
        keyIdeas: [...formData.keyIdeas, ideaInput.trim()],
      });
      setIdeaInput("");
    }
  };

  const handleRemoveIdea = (index: number) => {
    setFormData({
      ...formData,
      keyIdeas: formData.keyIdeas.filter((_, i) => i !== index),
    });
  };

  const handleOpenForm = (task?: ReadingTask) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        title: task.title,
        subtitle: task.subtitle || "",
        cefr: task.cefr,
        genre: task.genre,
        source: task.source || "",
        tags: task.tags || [],
        estimatedTime: task.estimatedTime || 10,
        wordCount: task.wordCount || 0,
        coverEmoji: task.coverEmoji || "📖",
        gradient: task.gradient || "",
        readingSkills: task.readingSkills || [],
        keyIdeas: task.keyIdeas || [],
        recommended: task.recommended,
        order: task.order,
        active: task.active,
      });
    } else {
      setEditingTask(null);
      setFormData({
        title: "",
        subtitle: "",
        cefr: "A2",
        genre: "",
        source: "",
        tags: [],
        estimatedTime: 10,
        wordCount: 0,
        coverEmoji: "📖",
        gradient: "",
        readingSkills: [],
        keyIdeas: [],
        recommended: false,
        order: 0,
        active: true,
      });
    }
    setShowForm(true);
    setTagInput("");
    setSkillInput("");
    setIdeaInput("");
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingTask(null);
    setTagInput("");
    setSkillInput("");
    setIdeaInput("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingTask
        ? `/api/admin-dashboard/courses/reading-tasks/${editingTask.id}`
        : "/api/admin-dashboard/courses/reading-tasks";
      const method = editingTask ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to ${editingTask ? "update" : "create"} task`);
      }

      const data = await res.json();
      if (data.success) {
        toast.success(editingTask ? "Task updated successfully" : "Task created successfully");
        handleCloseForm();
        fetchTasks();
      } else {
        throw new Error(data.error || "Operation failed");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(msg);
      console.error("[ReadingTaskManager] Submit error:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      const res = await fetch(`/api/admin-dashboard/courses/reading-tasks/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete task");
      }

      const data = await res.json();
      if (data.success) {
        toast.success("Task deleted successfully");
        fetchTasks();
      } else {
        throw new Error(data.error || "Delete failed");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(msg);
      console.error("[ReadingTaskManager] Delete error:", err);
    }
  };

  if (loading) {
    return <div className="manager-loading">Đang tải dữ liệu...</div>;
  }

  if (error) {
    return (
      <div className="manager-error">
        <p><strong>Lỗi:</strong> {error}</p>
        <button onClick={fetchTasks} className="retry-button">Thử lại</button>
      </div>
    );
  }

  return (
    <div className="skill-content-manager">
      <div
        className="manager-header"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
      >
        <h2>Quản Lý Reading Tasks</h2>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div className="only-activities-count">
            <button className="view-toggle-btn active" disabled>
              Bài Tập ({tasks.length})
            </button>
          </div>
          <button className="btn primary" onClick={() => handleOpenForm()}>
            + Thêm Bài Tập
          </button>
        </div>
      </div>

      <div className="activities-list">
        {tasks.length === 0 ? (
          <div className="empty-state">Chưa có bài tập nào. Hãy thêm bài tập mới.</div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="activity-card">
              <div className="activity-header">
                <h3>{task.coverEmoji || "📖"} {task.title}</h3>
                <div className="activity-badges">
                  <span className="level-badge">{task.cefr}</span>
                  <span className="skill-badge">READING</span>
                  <span className="type-badge">{task.genre}</span>
                  {task.recommended && <span className="recommended-badge">⭐ Recommended</span>}
                  {!task.active && <span className="tag" style={{ background: "#ef4444", color: "white" }}>Inactive</span>}
                </div>
              </div>
              <div className="activity-meta">
                <span>Subtitle: {task.subtitle || "N/A"}</span>
                <span>Time: {task.estimatedTime || 0} phút</span>
                <span>Words: ~{task.wordCount || 0}</span>
                <span>Tags: {task.tags?.length || 0}</span>
                <span>Skills: {task.readingSkills?.length || 0}</span>
                <span>Exercises: {Array.isArray(task.exercises) ? task.exercises.length : 0}</span>
              </div>
              {task.subtitle && (
                <div className="activity-prompt">
                  <strong>Subtitle:</strong>
                  <p>{task.subtitle}</p>
                </div>
              )}
              {task.readingSkills && task.readingSkills.length > 0 && (
                <div className="activity-tips">
                  <strong>Reading Skills:</strong>
                  <ul>
                    {task.readingSkills.map((skill, idx) => (
                      <li key={idx}>{skill}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                <button
                  className="btn outline"
                  onClick={() => handleOpenForm(task)}
                >
                  Sửa
                </button>
                <button
                  className="btn warn"
                  onClick={() => handleDelete(task.id)}
                >
                  Xóa
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={handleCloseForm}
        >
          <div
            className="card"
            style={{
              maxWidth: "600px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: "20px" }}>
              {editingTask ? "Sửa Bài Tập" : "Thêm Bài Tập Mới"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>
                    Title *
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>
                    Subtitle
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={formData.subtitle}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>
                      CEFR Level *
                    </label>
                    <select
                      className="select"
                      value={formData.cefr}
                      onChange={(e) => setFormData({ ...formData, cefr: e.target.value })}
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
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>
                      Genre *
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={formData.genre}
                      onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                      placeholder="e.g., Workplace Drama"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>
                      Estimated Time (minutes)
                    </label>
                    <input
                      type="number"
                      className="input"
                      value={formData.estimatedTime}
                      onChange={(e) => setFormData({ ...formData, estimatedTime: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>
                      Word Count
                    </label>
                    <input
                      type="number"
                      className="input"
                      value={formData.wordCount}
                      onChange={(e) => setFormData({ ...formData, wordCount: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>
                    Source
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    placeholder="e.g., Voice of America"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>
                      Cover Emoji
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={formData.coverEmoji}
                      onChange={(e) => setFormData({ ...formData, coverEmoji: e.target.value })}
                      placeholder="📖"
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>
                      Gradient
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={formData.gradient}
                      onChange={(e) => setFormData({ ...formData, gradient: e.target.value })}
                      placeholder="linear-gradient(135deg,#d8b4fe,#818cf8)"
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>
                    Tags
                  </label>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                    <input
                      type="text"
                      className="input"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="Enter a tag and press Enter"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn outline"
                      onClick={handleAddTag}
                    >
                      Add
                    </button>
                  </div>
                  {formData.tags.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {formData.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="tag"
                          style={{ display: "flex", alignItems: "center", gap: "4px" }}
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(idx)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: "0 4px",
                              color: "inherit",
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>
                    Reading Skills
                  </label>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                    <input
                      type="text"
                      className="input"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddSkill();
                        }
                      }}
                      placeholder="Enter a skill and press Enter"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn outline"
                      onClick={handleAddSkill}
                    >
                      Add
                    </button>
                  </div>
                  {formData.readingSkills.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {formData.readingSkills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="tag"
                          style={{ display: "flex", alignItems: "center", gap: "4px" }}
                        >
                          {skill}
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(idx)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: "0 4px",
                              color: "inherit",
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>
                    Key Ideas
                  </label>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                    <input
                      type="text"
                      className="input"
                      value={ideaInput}
                      onChange={(e) => setIdeaInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddIdea();
                        }
                      }}
                      placeholder="Enter a key idea and press Enter"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn outline"
                      onClick={handleAddIdea}
                    >
                      Add
                    </button>
                  </div>
                  {formData.keyIdeas.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {formData.keyIdeas.map((idea, idx) => (
                        <span
                          key={idx}
                          className="tag"
                          style={{ display: "flex", alignItems: "center", gap: "4px" }}
                        >
                          {idea}
                          <button
                            type="button"
                            onClick={() => handleRemoveIdea(idx)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: "0 4px",
                              color: "inherit",
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>
                      Order
                    </label>
                    <input
                      type="number"
                      className="input"
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={formData.recommended}
                      onChange={(e) => setFormData({ ...formData, recommended: e.target.checked })}
                    />
                    Recommended
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    />
                    Active
                  </label>
                </div>

                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className="btn outline"
                    onClick={handleCloseForm}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn primary">
                    {editingTask ? "Update" : "Create"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


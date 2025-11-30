"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

interface ListeningTask {
  id: string;
  title: string;
  type: string;
  level: string;
  description: string;
  duration: string;
  speakers: string;
  accent: string;
  questions: number;
  tags: string[];
  recommended: boolean;
  icon: string | null;
  color: string | null;
  order: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function ListeningTaskManager() {
  const [tasks, setTasks] = useState<ListeningTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<ListeningTask | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    type: "",
    level: "A2",
    description: "",
    duration: "",
    speakers: "",
    accent: "",
    questions: 0,
    tags: [] as string[],
    recommended: false,
    icon: "🎧",
    color: "blue",
    order: 0,
    active: true,
  });
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin-dashboard/courses/listening-tasks");
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
      console.error("[ListeningTaskManager] Error:", err);
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

  const handleOpenForm = (task?: ListeningTask) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        title: task.title,
        type: task.type,
        level: task.level,
        description: task.description,
        duration: task.duration,
        speakers: task.speakers,
        accent: task.accent,
        questions: task.questions,
        tags: task.tags || [],
        recommended: task.recommended,
        icon: task.icon || "🎧",
        color: task.color || "blue",
        order: task.order,
        active: task.active,
      });
    } else {
      setEditingTask(null);
      setFormData({
        title: "",
        type: "",
        level: "A2",
        description: "",
        duration: "",
        speakers: "",
        accent: "",
        questions: 0,
        tags: [],
        recommended: false,
        icon: "🎧",
        color: "blue",
        order: 0,
        active: true,
      });
    }
    setShowForm(true);
    setTagInput("");
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingTask(null);
    setTagInput("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingTask
        ? `/api/admin-dashboard/courses/listening-tasks/${editingTask.id}`
        : "/api/admin-dashboard/courses/listening-tasks";
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
      console.error("[ListeningTaskManager] Submit error:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      const res = await fetch(`/api/admin-dashboard/courses/listening-tasks/${id}`, {
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
      console.error("[ListeningTaskManager] Delete error:", err);
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
        <h2>Quản Lý Listening Tasks</h2>
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
                <h3>{task.icon || "🎧"} {task.title}</h3>
                <div className="activity-badges">
                  <span className="level-badge">{task.level}</span>
                  <span className="skill-badge">LISTENING</span>
                  <span className="type-badge">{task.type}</span>
                  {task.recommended && <span className="recommended-badge">⭐ Recommended</span>}
                  {!task.active && <span className="tag" style={{ background: "#ef4444", color: "white" }}>Inactive</span>}
                </div>
              </div>
              <div className="activity-meta">
                <span>Duration: {task.duration}</span>
                <span>Speakers: {task.speakers}</span>
                <span>Accent: {task.accent}</span>
                <span>Questions: {task.questions}</span>
                <span>Tags: {task.tags?.length || 0}</span>
              </div>
              <div className="activity-prompt">
                <strong>Description:</strong>
                <p>{task.description}</p>
              </div>
              {task.tags && task.tags.length > 0 && (
                <div className="activity-tags">
                  <strong>Tags:</strong>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                    {task.tags.map((tag) => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
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

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>
                      Type *
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      placeholder="e.g., Conversation, Podcast"
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>
                      Level *
                    </label>
                    <select
                      className="select"
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
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>
                    Description *
                  </label>
                  <textarea
                    className="input"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    style={{ width: "100%", minWidth: "100%" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>
                      Duration
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      placeholder="e.g., 4:10"
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>
                      Speakers
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={formData.speakers}
                      onChange={(e) => setFormData({ ...formData, speakers: e.target.value })}
                      placeholder="e.g., 2 speakers"
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>
                      Accent
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={formData.accent}
                      onChange={(e) => setFormData({ ...formData, accent: e.target.value })}
                      placeholder="e.g., American"
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>
                      Questions
                    </label>
                    <input
                      type="number"
                      className="input"
                      value={formData.questions}
                      onChange={(e) => setFormData({ ...formData, questions: parseInt(e.target.value) || 0 })}
                      min="0"
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>
                      Icon
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      placeholder="🎧"
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>
                      Color
                    </label>
                    <select
                      className="select"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    >
                      <option value="blue">Blue</option>
                      <option value="green">Green</option>
                      <option value="purple">Purple</option>
                      <option value="orange">Orange</option>
                      <option value="red">Red</option>
                    </select>
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


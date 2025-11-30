"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

interface GrammarExample {
  sentence?: string;
  explanation?: string;
  [key: string]: unknown; // Allow additional fields
}

interface GrammarExerciseMultipleChoice {
  type: "multiple_choice";
  question: string;
  sentence?: string;
  options: string[];
  correct: number;
  explanation?: string;
}

interface GrammarExerciseTrueFalse {
  type: "true_false";
  question: string;
  statement: string;
  correct: boolean;
  explanation?: string;
}

interface GrammarExerciseFillBlank {
  type: "fill_blank" | "fill_in_blank";
  question: string;
  sentence: string;
  answer: string;
  explanation?: string;
}

type GrammarExercise =
  | GrammarExerciseMultipleChoice
  | GrammarExerciseTrueFalse
  | GrammarExerciseFillBlank
  | { type: string; [key: string]: unknown }; // Fallback for other types

interface GrammarTask {
  id: string;
  title: string;
  level: string;
  introduction: string;
  examples: GrammarExample[] | string[] | null;
  exercises: GrammarExercise[] | null;
  exampleCount: number;
  exerciseCount: number;
  category: string | null;
  recommended: boolean;
  order: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function GrammarTaskManager() {
  const [tasks, setTasks] = useState<GrammarTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<GrammarTask | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    level: string;
    introduction: string;
    examples: GrammarExample[] | string[] | null;
    exercises: GrammarExercise[] | null;
    exampleCount: number;
    exerciseCount: number;
    category: string;
    recommended: boolean;
    order: number;
    active: boolean;
  }>({
    title: "",
    level: "A1-A2",
    introduction: "",
    examples: null,
    exercises: null,
    exampleCount: 0,
    exerciseCount: 0,
    category: "",
    recommended: false,
    order: 0,
    active: true,
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin-dashboard/courses/grammar-tasks");
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
      console.error("[GrammarTaskManager] Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (task?: GrammarTask) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        title: task.title,
        level: task.level,
        introduction: task.introduction,
        examples: task.examples,
        exercises: task.exercises,
        exampleCount: task.exampleCount,
        exerciseCount: task.exerciseCount,
        category: task.category || "",
        recommended: task.recommended,
        order: task.order,
        active: task.active,
      });
    } else {
      setEditingTask(null);
      setFormData({
        title: "",
        level: "A1-A2",
        introduction: "",
        examples: null,
        exercises: null,
        exampleCount: 0,
        exerciseCount: 0,
        category: "",
        recommended: false,
        order: 0,
        active: true,
      });
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingTask(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingTask
        ? `/api/admin-dashboard/courses/grammar-tasks/${editingTask.id}`
        : "/api/admin-dashboard/courses/grammar-tasks";
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
      console.error("[GrammarTaskManager] Submit error:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      const res = await fetch(`/api/admin-dashboard/courses/grammar-tasks/${id}`, {
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
      console.error("[GrammarTaskManager] Delete error:", err);
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
        <h2>Quản Lý Grammar Tasks</h2>
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
                <h3>📚 {task.title}</h3>
                <div className="activity-badges">
                  <span className="level-badge">{task.level}</span>
                  <span className="skill-badge">GRAMMAR</span>
                  {task.category && <span className="type-badge">{task.category}</span>}
                  {task.recommended && <span className="recommended-badge">⭐ Recommended</span>}
                  {!task.active && <span className="tag" style={{ background: "#ef4444", color: "white" }}>Inactive</span>}
                </div>
              </div>
              <div className="activity-meta">
                <span>Examples: {task.exampleCount}</span>
                <span>Exercises: {task.exerciseCount}</span>
                <span>Category: {task.category || "N/A"}</span>
              </div>
              <div className="activity-prompt">
                <strong>Introduction:</strong>
                <p>{task.introduction}</p>
              </div>
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
                      Level *
                    </label>
                    <select
                      className="select"
                      value={formData.level}
                      onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                      required
                    >
                      <option value="A1-A2">A1-A2</option>
                      <option value="B1-B2">B1-B2</option>
                      <option value="C1">C1</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>
                      Category
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="e.g., Tenses, Conditionals"
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>
                    Introduction *
                  </label>
                  <textarea
                    className="input"
                    rows={4}
                    value={formData.introduction}
                    onChange={(e) => setFormData({ ...formData, introduction: e.target.value })}
                    required
                    style={{ width: "100%", minWidth: "100%" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>
                      Example Count
                    </label>
                    <input
                      type="number"
                      className="input"
                      value={formData.exampleCount}
                      onChange={(e) => setFormData({ ...formData, exampleCount: parseInt(e.target.value) || 0 })}
                      min="0"
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>
                      Exercise Count
                    </label>
                    <input
                      type="number"
                      className="input"
                      value={formData.exerciseCount}
                      onChange={(e) => setFormData({ ...formData, exerciseCount: parseInt(e.target.value) || 0 })}
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>
                    Examples (JSON)
                  </label>
                  <textarea
                    className="input"
                    rows={6}
                    value={formData.examples ? JSON.stringify(formData.examples, null, 2) : ""}
                    onChange={(e) => {
                      try {
                        const parsed = e.target.value ? JSON.parse(e.target.value) : null;
                        setFormData({ ...formData, examples: parsed });
                      } catch {
                        // Invalid JSON, keep as is
                      }
                    }}
                    placeholder='[{"sentence": "...", "explanation": "..."}]'
                    style={{ width: "100%", minWidth: "100%", fontFamily: "monospace" }}
                  />
                  <small style={{ color: "#6b7280", fontSize: "12px" }}>
                    Enter valid JSON array. Examples will be parsed automatically.
                  </small>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>
                    Exercises (JSON)
                  </label>
                  <textarea
                    className="input"
                    rows={6}
                    value={formData.exercises ? JSON.stringify(formData.exercises, null, 2) : ""}
                    onChange={(e) => {
                      try {
                        const parsed = e.target.value ? JSON.parse(e.target.value) : null;
                        setFormData({ ...formData, exercises: parsed });
                      } catch {
                        // Invalid JSON, keep as is
                      }
                    }}
                    placeholder='[{"question": "...", "options": [...], "answer": "..."}]'
                    style={{ width: "100%", minWidth: "100%", fontFamily: "monospace" }}
                  />
                  <small style={{ color: "#6b7280", fontSize: "12px" }}>
                    Enter valid JSON array. Exercises will be parsed automatically.
                  </small>
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


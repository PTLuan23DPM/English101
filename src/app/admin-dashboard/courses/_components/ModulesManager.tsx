"use client";

import { useState, useEffect } from "react";

interface Module {
  id: string;
  code: string;
  type: string;
  title: string;
  description: string | null;
  levelMin: string;
  levelMax: string;
  createdAt: Date;
  _count: {
    units: number;
  };
  units: Array<{
    id: string;
    title: string;
    order: number;
  }>;
}

export default function ModulesManager() {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    type: "LISTENING",
    title: "",
    description: "",
    levelMin: "A1",
    levelMax: "C2",
  });

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/admin-dashboard/courses/modules");
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          const text = await response.text().catch(() => "");
          if (text) errorMessage = text;
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      if (data.success) {
        setModules(data.modules);
      } else {
        throw new Error(data.error || "Invalid response format");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      console.error("Error fetching modules:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/admin-dashboard/courses/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create module");
      }

      const data = await response.json();
      if (data.success) {
        setShowForm(false);
        setFormData({
          code: "",
          type: "LISTENING",
          title: "",
          description: "",
          levelMin: "A1",
          levelMax: "C2",
        });
        fetchModules();
      }
    } catch (err) {
      alert("Lỗi: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  if (loading) {
    return <div className="manager-loading">Đang tải dữ liệu...</div>;
  }

  if (error) {
    return (
      <div className="manager-error">
        <p><strong>Lỗi:</strong> {error}</p>
        <button onClick={fetchModules} className="retry-button">Thử lại</button>
      </div>
    );
  }

  return (
    <div className="modules-manager">
      <div className="manager-header">
        <h2>Quản Lý Modules</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          + Tạo Module Mới
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="module-form">
          <div className="form-group">
            <label>Code *</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
              placeholder="VD: MOD001"
            />
          </div>
          <div className="form-group">
            <label>Type *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              required
            >
              <option value="LISTENING">Listening</option>
              <option value="READING">Reading</option>
              <option value="WRITING">Writing</option>
              <option value="SPEAKING">Speaking</option>
              <option value="GRAMMAR_STRUCTURE">Grammar Structure</option>
              <option value="VOCAB_LEXICAL">Vocab Lexical</option>
              <option value="PRONUNCIATION_PHONETICS">Pronunciation Phonetics</option>
              <option value="FUNCTIONAL_COMMUNICATION">Functional Communication</option>
              <option value="MEDIATION_TRANSLATION">Mediation Translation</option>
              <option value="TEST_REVIEW">Test Review</option>
              <option value="CULTURE_TOPICS_CONTENT">Culture Topics Content</option>
            </select>
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
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Level Min</label>
              <select
                value={formData.levelMin}
                onChange={(e) => setFormData({ ...formData, levelMin: e.target.value })}
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
              <label>Level Max</label>
              <select
                value={formData.levelMax}
                onChange={(e) => setFormData({ ...formData, levelMax: e.target.value })}
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
          <div className="form-actions">
            <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">Tạo Module</button>
          </div>
        </form>
      )}

      <div className="modules-list">
        {modules.length === 0 ? (
          <div className="empty-state">Chưa có module nào</div>
        ) : (
          modules.map((module) => (
            <div key={module.id} className="module-card">
              <div className="module-header">
                <h3>{module.code} - {module.title}</h3>
                <span className="module-type">{module.type}</span>
              </div>
              {module.description && (
                <p className="module-description">{module.description}</p>
              )}
              <div className="module-meta">
                <span>Level: {module.levelMin} - {module.levelMax}</span>
                <span>Units: {module._count.units}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


"use client";

import { useState, useEffect } from "react";

interface Unit {
  id: string;
  moduleId: string;
  order: number;
  title: string;
  overview: string | null;
  level: string;
  skill: string;
  module: {
    id: string;
    code: string;
    title: string;
  };
  _count: {
    activities: number;
    contents: number;
  };
}

interface Module {
  id: string;
  code: string;
  title: string;
}

export default function UnitsManager() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string>("");
  const [formData, setFormData] = useState({
    moduleId: "",
    order: 1,
    title: "",
    overview: "",
    level: "A1",
    skill: "LISTENING",
  });

  useEffect(() => {
    fetchModules();
    fetchUnits();
  }, []);

  const fetchModules = async () => {
    try {
      const response = await fetch("/api/admin-dashboard/courses/modules");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setModules(data.modules);
        }
      }
    } catch (err) {
      console.error("Error fetching modules:", err);
    }
  };

  const fetchUnits = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/admin-dashboard/courses/units");
      
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
        setUnits(data.units);
      } else {
        throw new Error(data.error || "Invalid response format");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      console.error("Error fetching units:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/admin-dashboard/courses/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create unit");
      }

      const data = await response.json();
      if (data.success) {
        setShowForm(false);
        setFormData({
          moduleId: "",
          order: 1,
          title: "",
          overview: "",
          level: "A1",
          skill: "LISTENING",
        });
        fetchUnits();
      }
    } catch (err) {
      alert("Lỗi: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  const filteredUnits = selectedModule
    ? units.filter((u) => u.moduleId === selectedModule)
    : units;

  if (loading) {
    return <div className="manager-loading">Đang tải dữ liệu...</div>;
  }

  if (error) {
    return (
      <div className="manager-error">
        <p><strong>Lỗi:</strong> {error}</p>
        <button onClick={fetchUnits} className="retry-button">Thử lại</button>
      </div>
    );
  }

  return (
    <div className="units-manager">
      <div className="manager-header">
        <h2>Quản Lý Units (Bài Học)</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          + Tạo Unit Mới
        </button>
      </div>

      <div className="manager-filters">
        <select
          value={selectedModule}
          onChange={(e) => setSelectedModule(e.target.value)}
          className="filter-select"
        >
          <option value="">Tất cả modules</option>
          {modules.map((module) => (
            <option key={module.id} value={module.id}>
              {module.code} - {module.title}
            </option>
          ))}
        </select>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="unit-form">
          <div className="form-group">
            <label>Module *</label>
            <select
              value={formData.moduleId}
              onChange={(e) => setFormData({ ...formData, moduleId: e.target.value })}
              required
            >
              <option value="">Chọn module</option>
              {modules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.code} - {module.title}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Order</label>
              <input
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 1 })}
                min="1"
              />
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
            <label>Overview</label>
            <textarea
              value={formData.overview}
              onChange={(e) => setFormData({ ...formData, overview: e.target.value })}
              rows={4}
            />
          </div>
          <div className="form-actions">
            <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">Tạo Unit</button>
          </div>
        </form>
      )}

      <div className="units-list">
        {filteredUnits.length === 0 ? (
          <div className="empty-state">Chưa có unit nào</div>
        ) : (
          filteredUnits.map((unit) => (
            <div key={unit.id} className="unit-card">
              <div className="unit-header">
                <h3>{unit.title}</h3>
                <div className="unit-badges">
                  <span className="level-badge">{unit.level}</span>
                  <span className="skill-badge">{unit.skill}</span>
                </div>
              </div>
              <div className="unit-meta">
                <span>Module: {unit.module.code} - {unit.module.title}</span>
                <span>Order: {unit.order}</span>
                <span>Activities: {unit._count.activities}</span>
                <span>Contents: {unit._count.contents}</span>
              </div>
              {unit.overview && (
                <p className="unit-overview">{unit.overview}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}


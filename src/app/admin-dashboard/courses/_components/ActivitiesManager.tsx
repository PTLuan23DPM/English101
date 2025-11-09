"use client";

import { useState, useEffect } from "react";
import ActivityForm from "./ActivityForm";

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
  unit: {
    id: string;
    title: string;
    module: {
      id: string;
      code: string;
      title: string;
    };
  };
  media: Array<{
    id: string;
    url: string;
    type: string;
    durationS: number | null;
  }>;
  _count: {
    questions: number;
  };
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

export default function ActivitiesManager() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>("");

  useEffect(() => {
    fetchUnits();
    fetchActivities();
  }, []);

  const fetchUnits = async () => {
    try {
      const response = await fetch("/api/admin-dashboard/courses/units");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUnits(data.units);
        }
      }
    } catch (err) {
      console.error("Error fetching units:", err);
    }
  };

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = selectedUnit ? `?unitId=${selectedUnit}` : "";
      const response = await fetch(`/api/admin-dashboard/courses/activities${params}`);
      
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
        setActivities(data.activities);
      } else {
        throw new Error(data.error || "Invalid response format");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      console.error("Error fetching activities:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedUnit !== undefined) {
      fetchActivities();
    }
  }, [selectedUnit]);

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa activity này?")) return;

    try {
      const response = await fetch(`/api/admin-dashboard/courses/activities/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete activity");
      }

      fetchActivities();
    } catch (err) {
      alert("Lỗi: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  const handleEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingActivity(null);
    fetchActivities();
  };

  const filteredActivities = selectedUnit
    ? activities.filter((a) => a.unitId === selectedUnit)
    : activities;

  if (loading) {
    return <div className="manager-loading">Đang tải dữ liệu...</div>;
  }

  if (error) {
    return (
      <div className="manager-error">
        <p><strong>Lỗi:</strong> {error}</p>
        <button onClick={fetchActivities} className="retry-button">Thử lại</button>
      </div>
    );
  }

  return (
    <div className="activities-manager">
      <div className="manager-header">
        <h2>Quản Lý Activities (Bài Tập)</h2>
        <button onClick={() => { setShowForm(true); setEditingActivity(null); }} className="btn btn-primary">
          + Tạo Activity Mới
        </button>
      </div>

      <div className="manager-filters">
        <select
          value={selectedUnit}
          onChange={(e) => setSelectedUnit(e.target.value)}
          className="filter-select"
        >
          <option value="">Tất cả units</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.module.code} - {unit.title}
            </option>
          ))}
        </select>
      </div>

      {showForm && (
        <ActivityForm
          activity={editingActivity}
          units={units}
          onClose={() => { setShowForm(false); setEditingActivity(null); }}
          onSuccess={handleFormSuccess}
        />
      )}

      <div className="activities-list">
        {filteredActivities.length === 0 ? (
          <div className="empty-state">Chưa có activity nào</div>
        ) : (
          filteredActivities.map((activity) => (
            <div key={activity.id} className="activity-card">
              <div className="activity-header">
                <h3>{activity.title}</h3>
                <div className="activity-badges">
                  <span className="type-badge">{activity.type}</span>
                  <span className="level-badge">{activity.level}</span>
                  <span className="skill-badge">{activity.skill}</span>
                </div>
              </div>
              <div className="activity-meta">
                <span>Unit: {activity.unit.module.code} - {activity.unit.title}</span>
                {activity.maxScore && <span>Max Score: {activity.maxScore}</span>}
                {activity.timeLimitSec && <span>Time Limit: {activity.timeLimitSec}s</span>}
                <span>Questions: {activity._count.questions}</span>
              </div>
              {activity.instruction && (
                <p className="activity-instruction">{activity.instruction}</p>
              )}
              {activity.media.length > 0 && (
                <div className="activity-media">
                  <strong>Media:</strong>
                  {activity.media.map((m) => (
                    <span key={m.id} className="media-badge">
                      {m.type} ({m.durationS ? `${m.durationS}s` : "N/A"})
                    </span>
                  ))}
                </div>
              )}
              <div className="activity-actions">
                <button onClick={() => handleEdit(activity)} className="btn btn-sm btn-primary">
                  Sửa
                </button>
                <button onClick={() => handleDelete(activity.id)} className="btn btn-sm btn-danger">
                  Xóa
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


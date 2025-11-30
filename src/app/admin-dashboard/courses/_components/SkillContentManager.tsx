"use client";

import { useState, useEffect } from "react";
import { Skill } from "@prisma/client";
import { READING_LESSONS } from "@/data/readingLessons";
import { LISTENING_TASKS, type ListeningTask } from "@/app/english/listening/data/listeningTasks";
import { SPEAKING_TASKS } from "@/app/english/speaking/data/speakingTasks";
import WritingTaskManager from "./WritingTaskManager";
import ReadingTaskManager from "./ReadingTaskManager";
import ListeningTaskManager from "./ListeningTaskManager";
import SpeakingTaskManager from "./SpeakingTaskManager";
import GrammarTaskManager from "./GrammarTaskManager";

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

interface ListeningLessonFromAPI {
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
  recommended?: boolean;
}

interface GrammarLesson {
  id: string;
  title: string;
  level: string;
  introduction?: string;
  exampleCount?: number;
  exerciseCount?: number;
  category?: string;
  cefr?: string;
}

interface ListeningLessonAPIResponse {
  id: string;
  title: string;
  level: string;
  category?: string;
  hasTranscript?: boolean;
  segmentCount?: number;
  duration?: number;
}

type ListeningCombined = ListeningTask | ListeningLessonFromAPI;

interface SkillContentManagerProps {
  skill: Skill;
}

export default function SkillContentManager({ skill }: SkillContentManagerProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [listeningLessons, setListeningLessons] = useState<ListeningLessonFromAPI[]>([]);
  const [grammarLessons, setGrammarLessons] = useState<GrammarLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skill]);

  const mapListeningLevel = (level: string): string => {
    if (level === "Beginner") return "A1-A2";
    if (level === "Intermediate") return "B1-B2";
    if (level === "Advanced") return "C1-C2";
    return level || "A1-A2";
  };

  const fmtDuration = (seconds?: number) => {
    if (!seconds || Number.isNaN(seconds)) return "";
    const m = Math.floor(seconds / 60);
    const s = String(Math.floor(seconds % 60)).padStart(2, "0");
    return `${m}:${s}`;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Mirror user data for these skills (read-only)
      if (skill === "WRITING" || skill === "READING" || skill === "SPEAKING") {
        setActivities([]);
        setListeningLessons([]);
        setGrammarLessons([]);
        setLoading(false);
        return;
      }

      // Listening: LISTENING_TASKS + lessons API
      if (skill === "LISTENING") {
        try {
          const res = await fetch("/api/listening/lessons");
          if (!res.ok) throw new Error(`Failed to fetch listening lessons: ${res.statusText}`);
          const data = await res.json();
          const mapped = (data.lessons || [] as ListeningLessonAPIResponse[]).map((lesson: ListeningLessonAPIResponse) => ({
            id: lesson.id,
            title: lesson.title,
            type: lesson.category || "General",
            level: mapListeningLevel(lesson.level),
            description: lesson.hasTranscript
              ? `${lesson.segmentCount} segments with full transcript`
              : `${lesson.segmentCount} segments`,
            duration: fmtDuration(lesson.duration),
            speakers: "Multiple",
            accent: "American",
            questions: lesson.segmentCount || 0,
            tags: lesson.category ? [lesson.category] : ["General"],
            recommended: !!lesson.hasTranscript,
          }));
          setListeningLessons(mapped);
        } catch (e) {
          console.error("[SkillContentManager] Listening lessons API error:", e);
          setListeningLessons([]);
        } finally {
          setActivities([]);
          setGrammarLessons([]);
          setLoading(false);
        }
        return;
      }

      // Grammar: use user API /api/grammar/lessons (read-only mirror)
      if (skill === "GRAMMAR") {
        try {
          const res = await fetch("/api/grammar/lessons");
          if (!res.ok) throw new Error(`Failed to fetch grammar lessons: ${res.statusText}`);
          const data = await res.json();
          setGrammarLessons(data.lessons || []);
        } catch (e) {
          console.error("[SkillContentManager] Grammar lessons API error:", e);
          setGrammarLessons([]);
        } finally {
          setActivities([]);
          setListeningLessons([]);
          setLoading(false);
        }
        return;
      }

      // Other skills via DB (read-only list)
      const skillParam = skill.toUpperCase();
      const res = await fetch(`/api/admin-dashboard/courses/activities?skill=${skillParam}`);
      if (!res.ok) throw new Error(`Failed to fetch activities: ${res.statusText}`);
      const db = await res.json();
      if (db.success) setActivities(db.activities || []);
      setListeningLessons([]);
      setGrammarLessons([]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      console.error("[SkillContentManager] Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getSkillLabel = (s: Skill): string => {
    const labels: Record<Skill, string> = {
      WRITING: "Writing",
      READING: "Reading",
      LISTENING: "Listening",
      SPEAKING: "Speaking",
      GRAMMAR: "Grammar",
      VOCABULARY: "Vocabulary",
      PRONUNCIATION: "Pronunciation",
      FUNCTIONAL_LANGUAGE: "Functional Language",
      MEDIATION: "Mediation",
      ASSESSMENT: "Assessment",
      CULTURE: "Culture",
    };
    return labels[s] || s;
  };

  if (loading) return <div className="manager-loading">Đang tải dữ liệu...</div>;
  if (error) {
    return (
      <div className="manager-error">
        <p><strong>Lỗi:</strong> {error}</p>
        <button onClick={fetchData} className="retry-button">Thử lại</button>
      </div>
    );
  }

  // For WRITING, count will be handled by WritingTaskManager
  const activitiesCount =
    skill === "WRITING"
      ? 0 // Will be handled by WritingTaskManager
      : skill === "READING"
      ? READING_LESSONS.length
      : skill === "LISTENING"
      ? LISTENING_TASKS.length + listeningLessons.length
      : skill === "SPEAKING"
      ? SPEAKING_TASKS.length
      : skill === "GRAMMAR"
      ? grammarLessons.length
      : activities.length;

  const listeningCombined: ListeningCombined[] = skill === "LISTENING" ? [...LISTENING_TASKS, ...listeningLessons] : [];

  return (
    <div className="skill-content-manager">
      {skill === "WRITING" ? (
        <WritingTaskManager />
      ) : skill === "READING" ? (
        <ReadingTaskManager />
      ) : skill === "LISTENING" ? (
        <ListeningTaskManager />
      ) : skill === "SPEAKING" ? (
        <SpeakingTaskManager />
      ) : skill === "GRAMMAR" ? (
        <GrammarTaskManager />
      ) : (
        <>
          <div
            className="manager-header"
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
          >
            <h2>Quản Lý {getSkillLabel(skill)}</h2>
            <div className="only-activities-count">
              <button className="view-toggle-btn active" disabled>
                Bài Tập ({activitiesCount})
              </button>
            </div>
          </div>
      <div className="activities-list">
        {activities.length === 0 ? (
          <div className="empty-state">Chưa có bài tập nào cho kỹ năng {getSkillLabel(skill)}</div>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="activity-card">
              <div className="activity-header">
                <h3>{activity.title}</h3>
                <div className="activity-badges">
                  <span className="level-badge">{activity.level}</span>
                  <span className="skill-badge">{activity.skill}</span>
                  <span className="type-badge">{activity.type}</span>
                </div>
              </div>
              <div className="activity-meta">
                <span>Unit: {activity.unit.title}</span>
                <span>Module: {activity.unit.module.code}</span>
                <span>Questions: {activity._count.questions}</span>
                {activity.maxScore && <span>Max Score: {activity.maxScore}</span>}
                {activity.timeLimitSec && <span>Time Limit: {activity.timeLimitSec}s</span>}
              </div>
              {activity.instruction && (
                <p className="activity-instruction">{activity.instruction}</p>
              )}
              {activity.media.length > 0 && (
                <div className="activity-media">
                  <span>Media: {activity.media.length} file(s)</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
        </>
      )}
    </div>
  );
}

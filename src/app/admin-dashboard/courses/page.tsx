"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ModulesManager from "./_components/ModulesManager";
import UnitsManager from "./_components/UnitsManager";
import ActivitiesManager from "./_components/ActivitiesManager";
import QuestionsManager from "./_components/QuestionsManager";

export default function CoursesManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"modules" | "units" | "activities" | "questions">("modules");

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/authentication/login");
      return;
    }
    if (session.user?.role !== "ADMIN") {
      router.push("/english/dashboard");
      return;
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="admin-loading">
        <div>Loading...</div>
      </div>
    );
  }

  if (!session || session.user?.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="courses-management-page">
      <div className="courses-management-header">
        <h1 className="courses-management-title">Quản Lý Khóa Học & Bài Học</h1>
      </div>

      <div className="courses-tabs">
        <button
          className={`courses-tab ${activeTab === "modules" ? "active" : ""}`}
          onClick={() => setActiveTab("modules")}
        >
          Modules
        </button>
        <button
          className={`courses-tab ${activeTab === "units" ? "active" : ""}`}
          onClick={() => setActiveTab("units")}
        >
          Units (Bài Học)
        </button>
        <button
          className={`courses-tab ${activeTab === "activities" ? "active" : ""}`}
          onClick={() => setActiveTab("activities")}
        >
          Activities (Bài Tập)
        </button>
        <button
          className={`courses-tab ${activeTab === "questions" ? "active" : ""}`}
          onClick={() => setActiveTab("questions")}
        >
          Questions (Câu Hỏi)
        </button>
      </div>

      <div className="courses-tab-content">
        {activeTab === "modules" && <ModulesManager />}
        {activeTab === "units" && <UnitsManager />}
        {activeTab === "activities" && <ActivitiesManager />}
        {activeTab === "questions" && <QuestionsManager />}
      </div>
    </div>
  );
}


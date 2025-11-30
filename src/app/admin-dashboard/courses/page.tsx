"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Skill } from "@prisma/client";
import SkillContentManager from "./_components/SkillContentManager";

type SkillTab = "WRITING" | "READING" | "LISTENING" | "SPEAKING" | "GRAMMAR";

export default function CoursesManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SkillTab>("WRITING");

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
        <h1 className="courses-management-title">Quản Lý Bài Tập</h1>
      </div>

      <div className="courses-tabs">
        <button
          className={`courses-tab ${activeTab === "WRITING" ? "active" : ""}`}
          onClick={() => setActiveTab("WRITING")}
        >
          Writing
        </button>
        <button
          className={`courses-tab ${activeTab === "READING" ? "active" : ""}`}
          onClick={() => setActiveTab("READING")}
        >
          Reading
        </button>
        <button
          className={`courses-tab ${activeTab === "LISTENING" ? "active" : ""}`}
          onClick={() => setActiveTab("LISTENING")}
        >
          Listening
        </button>
        <button
          className={`courses-tab ${activeTab === "SPEAKING" ? "active" : ""}`}
          onClick={() => setActiveTab("SPEAKING")}
        >
          Speaking
        </button>
        <button
          className={`courses-tab ${activeTab === "GRAMMAR" ? "active" : ""}`}
          onClick={() => setActiveTab("GRAMMAR")}
        >
          Grammar
        </button>
      </div>

      <div className="courses-tab-content">
        <SkillContentManager skill={activeTab as Skill} />
      </div>
    </div>
  );
}


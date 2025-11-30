"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AnnouncementsManager from "./_components/AnnouncementsManager";
import PageContentManager from "./_components/PageContentManager";

export default function ContentManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"announcements" | "pages">("announcements");

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
    <div className="content-management-page">
      <div className="content-management-header">
        <h1 className="content-management-title">Quản Lý Nội Dung Trang</h1>
      </div>

      <div className="content-tabs">
        <button
          className={`content-tab ${activeTab === "announcements" ? "active" : ""}`}
          onClick={() => setActiveTab("announcements")}
        >
          Thông Báo
        </button>
        <button
          className={`content-tab ${activeTab === "pages" ? "active" : ""}`}
          onClick={() => setActiveTab("pages")}
        >
          Trang Nội Dung
        </button>
      </div>

      <div className="content-tab-content">
        {activeTab === "announcements" && <AnnouncementsManager />}
        {activeTab === "pages" && <PageContentManager />}
      </div>
    </div>
  );
}


// src/app/dashboard/layout.tsx
"use client";
import Sidebar from "../dashboard/_components/sidebar";
import Header from "../dashboard/_components/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <Header />
        {children}
      </main>
    </div>
  );
}

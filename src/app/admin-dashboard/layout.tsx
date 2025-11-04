"use client";

import AdminSidebar from "./_components/sidebar";
import AdminHeader from "./_components/header";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-main-content">
        <AdminHeader />
        <div className="admin-content-wrapper">
          {children}
        </div>
      </main>
    </div>
  );
}


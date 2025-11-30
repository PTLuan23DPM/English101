"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UserManagementTable from "./_components/UserManagementTable";
import EditUserModal from "./_components/EditUserModal";
import UserProgressModal from "./_components/UserProgressModal";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  cefrLevel: string | null;
  placementTestCompleted: boolean;
  streak: number;
  longestStreak: number;
  lastActive: Date | null;
  createdAt: Date;
  _count: {
    progress: number;
    attempts: number;
  };
}

export default function UserManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingProgress, setViewingProgress] = useState<User | null>(null);

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

  useEffect(() => {
    if (session?.user?.role === "ADMIN") {
      fetchUsers();
    }
  }, [session, page, search, roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });
      if (search) params.append("search", search);
      if (roleFilter) params.append("role", roleFilter);

      const response = await fetch(`/api/admin-dashboard/users?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
        setTotalPages(data.pagination.totalPages);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
  };

  const handleViewProgress = (user: User) => {
    setViewingProgress(user);
  };

  const handleUserUpdated = () => {
    setEditingUser(null);
    fetchUsers();
  };

  const handleResetPassword = async (userId: string) => {
    const newPassword = prompt("Nhập mật khẩu mới (tối thiểu 6 ký tự):");
    if (!newPassword || newPassword.length < 6) {
      alert("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    try {
      const response = await fetch(`/api/admin-dashboard/users/${userId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      if (!response.ok) {
        throw new Error("Failed to reset password");
      }

      alert("Đã reset mật khẩu thành công!");
    } catch (err) {
      alert("Lỗi khi reset mật khẩu: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

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
    <div className="user-management-page">
      <div className="user-management-header">
        <h1 className="user-management-title">Quản Lý Người Dùng</h1>
        <div className="user-management-filters">
          <input
            type="text"
            placeholder="Tìm kiếm theo tên hoặc email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="user-search-input"
          />
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="user-role-filter"
          >
            <option value="">Tất cả vai trò</option>
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="user-management-loading">
          <p>Đang tải dữ liệu...</p>
        </div>
      ) : error ? (
        <div className="user-management-error">
          <p>Lỗi: {error}</p>
          <button onClick={fetchUsers} className="retry-button">
            Thử lại
          </button>
        </div>
      ) : (
        <>
          <UserManagementTable
            users={users}
            onEdit={handleEditUser}
            onViewProgress={handleViewProgress}
            onResetPassword={handleResetPassword}
          />

          {totalPages > 1 && (
            <div className="user-management-pagination">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="pagination-btn"
              >
                Trước
              </button>
              <span className="pagination-info">
                Trang {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="pagination-btn"
              >
                Sau
              </button>
            </div>
          )}
        </>
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={handleUserUpdated}
        />
      )}

      {viewingProgress && (
        <UserProgressModal
          user={viewingProgress}
          onClose={() => setViewingProgress(null)}
        />
      )}
    </div>
  );
}


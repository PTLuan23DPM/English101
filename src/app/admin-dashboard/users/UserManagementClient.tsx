"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import UserManagementTable from "./_components/UserManagementTable";
import EditUserModal from "./_components/EditUserModal";
import UserProgressModal from "./_components/UserProgressModal";

export type AdminUserRecord = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  cefrLevel: string | null;
  placementTestCompleted: boolean;
  streak: number;
  longestStreak: number;
  lastActive: string | null;
  createdAt: string;
  _count: {
    progress: number;
    attempts: number;
  };
};

const ITEMS_PER_PAGE = 10;

type Props = {
  initialUsers: AdminUserRecord[];
};

export default function UserManagementClient({ initialUsers }: Props) {
  const [users, setUsers] = useState<AdminUserRecord[]>(initialUsers);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [editingUser, setEditingUser] = useState<AdminUserRecord | null>(null);
  const [viewingProgress, setViewingProgress] = useState<AdminUserRecord | null>(null);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        !query ||
        (user.name || "").toLowerCase().includes(query) ||
        (user.email || "").toLowerCase().includes(query);
      const matchesRole = !roleFilter || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter]);

  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUsers, page]);

  const refreshUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: "1", limit: "100" });
      if (search) params.append("search", search);
      if (roleFilter) params.append("role", roleFilter);

      const response = await fetch(`/api/admin-dashboard/users?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to reload users");
      }
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
        setError(null);
        return;
      }
      throw new Error("Invalid response format");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  const handleEditUser = (user: AdminUserRecord) => {
    setEditingUser(user);
  };

  const handleViewProgress = (user: AdminUserRecord) => {
    setViewingProgress(user);
  };

  const handleUserUpdated = async () => {
    setEditingUser(null);
    await refreshUsers();
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

  return (
    <div className="user-management-page">
      <div className="user-management-header">
        <h1 className="user-management-title">Quản Lý Người Dùng</h1>
        <div className="user-management-filters">
          <input
            type="text"
            placeholder="Tìm kiếm theo tên hoặc email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="user-search-input"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
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
          <button onClick={refreshUsers} className="retry-button">
            Thử lại
          </button>
        </div>
      ) : (
        <>
          <UserManagementTable
            users={paginatedUsers}
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


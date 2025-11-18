"use client";

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
  lastActive: string | null;
  createdAt: string;
  _count: {
    progress: number;
    attempts: number;
  };
}

interface UserManagementTableProps {
  users: User[];
  onEdit: (user: User) => void;
  onViewProgress: (user: User) => void;
  onResetPassword: (userId: string) => void;
}

export default function UserManagementTable({
  users,
  onEdit,
  onViewProgress,
  onResetPassword,
}: UserManagementTableProps) {
  const formatDate = (date: Date | string | null) => {
    if (!date) return "Chưa có";
    return new Date(date).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="user-table-container">
      <table className="user-table">
        <thead>
          <tr>
            <th>Người dùng</th>
            <th>Email</th>
            <th>Vai trò</th>
            <th>Cấp độ</th>
            <th>Tiến trình</th>
            <th>Streak</th>
            <th>Hoạt động cuối</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan={8} className="user-table-empty">
                Không có người dùng nào
              </td>
            </tr>
          ) : (
            users.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className="user-table-user">
                    {user.image ? (
                      <img
                        src={user.image}
                        alt={user.name || "User"}
                        className="user-table-avatar"
                      />
                    ) : (
                      <div className="user-table-avatar-placeholder">
                        {(user.name || user.email || "U")[0].toUpperCase()}
                      </div>
                    )}
                    <span className="user-table-name">
                      {user.name || "Chưa có tên"}
                    </span>
                  </div>
                </td>
                <td>{user.email || "N/A"}</td>
                <td>
                  <span
                    className={`user-role-badge ${
                      user.role === "ADMIN" ? "user-role-badge--admin" : ""
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td>
                  {user.cefrLevel ? (
                    <span className="user-level-badge">{user.cefrLevel}</span>
                  ) : (
                    <span className="user-level-badge user-level-badge--none">
                      Chưa test
                    </span>
                  )}
                </td>
                <td>
                  <div className="user-table-progress">
                    <span>{user._count.progress} bài học</span>
                    <span className="user-table-progress-separator">•</span>
                    <span>{user._count.attempts} bài tập</span>
                  </div>
                </td>
                <td>
                  <div className="user-table-streak">
                    <span className="user-table-streak-current">{user.streak}</span>
                    {user.longestStreak > user.streak && (
                      <span className="user-table-streak-best">
                        (Tốt nhất: {user.longestStreak})
                      </span>
                    )}
                  </div>
                </td>
                <td>{formatDate(user.lastActive)}</td>
                <td>
                  <div className="user-table-actions">
                    <button
                      onClick={() => onViewProgress(user)}
                      className="user-action-btn user-action-btn--view"
                      title="Xem tiến trình"
                    >
                      📊
                    </button>
                    <button
                      onClick={() => onEdit(user)}
                      className="user-action-btn user-action-btn--edit"
                      title="Chỉnh sửa"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => onResetPassword(user.id)}
                      className="user-action-btn user-action-btn--reset"
                      title="Reset mật khẩu"
                    >
                      🔑
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}


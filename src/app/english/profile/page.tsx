"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [name, setName] = useState(session?.user?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/user/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error("Update failed");
      }

      await update({ name });
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Password change failed");
      }

      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to change password";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        <h1>Profile Settings</h1>
        <p className="subtitle">Manage your account information</p>

        {/* Profile Info */}
        <section className="card">
          <h2>Personal Information</h2>
          <form onSubmit={handleUpdateProfile}>
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={session?.user?.email || ""}
                disabled
                className="disabled"
              />
              <small>Email cannot be changed</small>
            </div>

            <div className="form-group">
              <label>CEFR Level</label>
              <input
                type="text"
                value={(session?.user as { cefrLevel?: string })?.cefrLevel || "Not set"}
                disabled
                className="disabled"
              />
              <small>Determined by placement test</small>
            </div>

            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </section>

        {/* Change Password */}
        <section className="card">
          <h2>Change Password</h2>
          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label>Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>

            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>

            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? "Changing..." : "Change Password"}
            </button>
          </form>
        </section>

        {/* Avatar */}
        <section className="card">
          <h2>Profile Picture</h2>
          <div className="avatar-section">
            <div className="avatar-preview">
              {session?.user?.image ? (
                <img src={session.user.image} alt="Profile" />
              ) : (
                <div className="avatar-placeholder">
                  {session?.user?.name?.charAt(0).toUpperCase() || "U"}
                </div>
              )}
            </div>
            <div className="avatar-info">
              <p>Upload a new profile picture</p>
              <small>JPG, PNG or GIF. Max size 2MB</small>
              <button className="btn secondary" disabled>
                Upload Picture
              </button>
              <small className="note">Feature coming soon</small>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}


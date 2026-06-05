"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { UserPlus, Shield, Key, CheckCircle, XCircle, Loader2, Users, Ban, Trash2, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";

import { apiClient } from "../../lib/apiClient";

export default function AdminConsole() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<"create" | "list">("create");
  
  // Create User State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("USER");
  const [loading, setLoading] = useState(false);
  
  // Users List State
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);

  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (activeTab === "list" && isAdmin) {
      fetchUsers(1);
    }
  }, [activeTab, isAdmin]);

  const fetchUsers = async (page = 1) => {
    setUsersLoading(true);
    try {
      const res = await apiClient.request(`/admin/users?page=${page}&limit=20`);
      const data = await res.json();
      if (res.ok) {
        setUsers(data.data);
        setUsersPage(data.page);
        setUsersTotalPages(data.totalPages);
      } else {
        setNotification({ type: "error", message: data.error || "Failed to load users" });
      }
    } catch (err) {
      setNotification({ type: "error", message: "Failed to load users" });
    } finally {
      setUsersLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    if (!username.trim() || !password.trim()) {
      setNotification({
        type: "error",
        message: "Please specify both username and password.",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.request("/admin/create-user", {
        method: "POST",
        body: JSON.stringify({
          username: username.trim(),
          password: password,
          role: role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create user");
      }

      setNotification({
        type: "success",
        message: `User "${data.username}" (${data.role}) created successfully!`,
      });

      setUsername("");
      setPassword("");
      setRole("USER");
    } catch (err: any) {
      console.error("User creation error:", err);
      setNotification({
        type: "error",
        message: err.message || "Failed to create user.",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleBlock = async (id: string, currentStatus: boolean) => {
    try {
      const res = await apiClient.request(`/admin/users/${id}/block`, {
        method: "PATCH",
        body: JSON.stringify({ is_blocked: !currentStatus })
      });
      if (res.ok) {
        fetchUsers(usersPage);
      } else {
        const data = await res.json();
        setNotification({ type: "error", message: data.error });
      }
    } catch (err) {
      setNotification({ type: "error", message: "Failed to block/unblock user" });
    }
  };

  const removeUser = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user and all their playlists?")) return;
    try {
      const res = await apiClient.request(`/admin/users/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchUsers(usersPage);
      } else {
        const data = await res.json();
        setNotification({ type: "error", message: data.error });
      }
    } catch (err) {
      setNotification({ type: "error", message: "Failed to delete user" });
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="w-16 h-16 bg-red-950/40 border border-red-500/30 rounded-2xl flex items-center justify-center mb-4 text-red-500">
          <Shield className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">403 Access Denied</h2>
        <p className="text-brand-text-secondary max-w-sm">
          This panel is strictly restricted.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Admin Management</h2>
            <p className="text-brand-text-secondary text-sm">Manage user accounts and access roles.</p>
          </div>
        </div>
        <div className="flex bg-brand-bg-secondary p-1 rounded-xl border border-brand-border">
          <button
            onClick={() => setActiveTab("create")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === "create" ? "bg-brand-accent text-white shadow-md" : "text-brand-text-secondary hover:text-white"
            }`}
          >
            Create User
          </button>
          <button
            onClick={() => setActiveTab("list")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === "list" ? "bg-brand-accent text-white shadow-md" : "text-brand-text-secondary hover:text-white"
            }`}
          >
            Manage Users
          </button>
        </div>
      </div>

      {notification && (
        <div
          className={`p-4 mb-6 rounded-xl flex items-start gap-3 text-sm animate-fade-in ${
            notification.type === "success"
              ? "bg-emerald-950/40 border border-emerald-500/30 text-emerald-200"
              : "bg-red-950/40 border border-red-500/30 text-red-200"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {activeTab === "create" && (
        <div className="glass-panel rounded-2xl p-6 shadow-xl border border-brand-border max-w-xl mx-auto">
          <h3 className="text-lg font-semibold text-white mb-6">Create New User Account</h3>
          <form onSubmit={handleCreateUser} className="space-y-6">
            <div>
              <label className="block text-brand-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-brand-text-secondary/60">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-8 pr-4 py-3 bg-brand-bg-primary/50 border border-brand-border focus:border-brand-accent focus:outline-none rounded-xl text-white transition-colors"
                  placeholder="new_user"
                  disabled={loading}
                />
              </div>
            </div>
            <div>
              <label className="block text-brand-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center"><Key className="w-4 h-4 text-brand-text-secondary/60" /></span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-4 py-3 bg-brand-bg-primary/50 border border-brand-border focus:border-brand-accent focus:outline-none rounded-xl text-white transition-colors"
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>
            </div>
            <div>
              <label className="block text-brand-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">Role</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center"><Shield className="w-4 h-4 text-brand-text-secondary/60" /></span>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="block w-full pl-9 pr-4 py-3 bg-brand-bg-primary/50 border border-brand-border focus:border-brand-accent focus:outline-none rounded-xl text-white appearance-none"
                  disabled={loading}
                >
                  <option value="USER" className="bg-brand-bg-secondary text-white">Regular User</option>
                  <option value="ADMIN" className="bg-brand-bg-secondary text-white">Administrator</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-3.5 bg-brand-accent hover:bg-brand-accent-hover text-white font-bold rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Registering...</> : "Create User"}
            </button>
          </form>
        </div>
      )}

      {activeTab === "list" && (
        <div className="glass-panel rounded-2xl p-6 shadow-xl border border-brand-border">
          <h3 className="text-lg font-semibold text-white mb-6">Manage Users</h3>
          {usersLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-brand-accent" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-brand-border/80 text-brand-text-secondary text-xs uppercase font-bold tracking-wider">
                    <th className="pb-3 px-2">Username</th>
                    <th className="pb-3 px-2">Role</th>
                    <th className="pb-3 px-2">Status</th>
                    <th className="pb-3 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-brand-border/40 hover:bg-brand-bg-secondary/50 text-sm text-white">
                      <td className="py-4 px-2 font-semibold">@{u.username}</td>
                      <td className="py-4 px-2">
                        <span className={`px-2 py-1 text-xs rounded-md ${u.role === "ADMIN" ? "bg-brand-accent/20 text-brand-accent" : "bg-brand-border text-brand-text-secondary"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-4 px-2">
                        {u.is_blocked ? (
                          <span className="flex items-center gap-1 text-red-400 text-xs font-semibold"><Ban className="w-3 h-3" /> Blocked</span>
                        ) : (
                          <span className="flex items-center gap-1 text-emerald-400 text-xs font-semibold"><CheckCircle2 className="w-3 h-3" /> Active</span>
                        )}
                      </td>
                      <td className="py-4 px-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleBlock(u.id, u.is_blocked)}
                            className="p-1.5 rounded-lg text-brand-text-secondary hover:text-white hover:bg-brand-border transition-colors cursor-pointer"
                            title={u.is_blocked ? "Unblock User" : "Block User"}
                          >
                            <Ban className={`w-4 h-4 ${u.is_blocked ? "text-emerald-400" : "hover:text-red-400"}`} />
                          </button>
                          <button
                            onClick={() => removeUser(u.id)}
                            className="p-1.5 rounded-lg text-brand-text-secondary hover:text-white hover:bg-brand-border transition-colors cursor-pointer"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4 hover:text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {usersTotalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-brand-border">
              <span className="text-xs text-brand-text-secondary">Page {usersPage} of {usersTotalPages}</span>
              <div className="flex gap-2">
                <button
                  disabled={usersPage === 1}
                  onClick={() => fetchUsers(usersPage - 1)}
                  className="p-1.5 rounded-lg bg-brand-bg-secondary border border-brand-border disabled:opacity-50 cursor-pointer text-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={usersPage === usersTotalPages}
                  onClick={() => fetchUsers(usersPage + 1)}
                  className="p-1.5 rounded-lg bg-brand-bg-secondary border border-brand-border disabled:opacity-50 cursor-pointer text-white"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";
import { useState } from "react";
import { Header } from "@/components/Layout/Header";
import { SkeletonTable } from "@/components/Common/Skeleton";
import { UserModal } from "@/components/User/UserModal";
import { useUsers } from "@/hooks/useUsers";
import { useRoles } from "@/hooks/useRoles";
import { userService } from "@/services/user.service";
import { useToast } from "@/hooks/useToast";
import type { User } from "@/lib/types";

export default function UsersPage() {
  const { users, loading, refresh } = useUsers();
  const { roles } = useRoles();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<User | null | undefined>(undefined);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggleActive(user: User) {
    setBusyId(user._id);
    try {
      await userService.update(user._id, { isActive: !user.isActive });
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <Header
        title="Users"
        actions={
          <button className="btn bp sm" disabled={!roles.length} onClick={() => setEditing(null)}>
            + New User
          </button>
        }
      />
      <div id="ct">
        {loading ? (
          <SkeletonTable columns={5} rows={6} />
        ) : (
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length ? (
                  users.map((u) => (
                    <tr key={u._id}>
                      <td>{u.email}</td>
                      <td>{u.phone || <span style={{ color: "#94a3b8" }}>—</span>}</td>
                      <td><span className="bd bpd">{u.roleId?.name || "—"}</span></td>
                      <td><span className={`bd ${u.isActive ? "bok" : "bun"}`}>{u.isActive ? "Active" : "Inactive"}</span></td>
                      <td>
                        <div className="ac">
                          <button className="btn sm bp" onClick={() => setEditing(u)}>Edit</button>
                          <button className="btn sm brd" disabled={busyId === u._id} onClick={() => toggleActive(u)}>
                            {u.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={5} className="em">No users yet. Click &quot;+ New User&quot; to create one.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing !== undefined && (
        <UserModal
          user={editing}
          roles={roles}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            refresh();
          }}
        />
      )}
    </>
  );
}

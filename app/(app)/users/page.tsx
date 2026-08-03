"use client";
import { useState } from "react";
import { Header } from "@/components/Layout/Header";
import { SkeletonTable } from "@/components/Common/Skeleton";
import { UserModal } from "@/components/User/UserModal";
import { Pagination } from "@/components/Common/Pagination";
import { useUsers } from "@/hooks/useUsers";
import { useRoles } from "@/hooks/useRoles";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { userService } from "@/services/user.service";
import { useToast } from "@/hooks/useToast";
import { useListControls } from "@/hooks/useListControls";
import { ROLES } from "@/lib/constants";
import type { User } from "@/lib/types";

export default function UsersPage() {
  const { users, loading, refresh } = useUsers();
  const { roles } = useRoles();
  const { role, can } = useCurrentUser();
  const { showToast } = useToast();
  // Assigning the super_admin role is restricted server-side to an actual super
  // admin (see app/api/users/**) regardless of a delegated users.create/edit
  // permission — hide it from the picker here so that restriction isn't a
  // confusing silent 403 after the fact.
  const assignableRoles = role === ROLES.SUPER_ADMIN ? roles : roles.filter((r) => r.name !== ROLES.SUPER_ADMIN);
  const [editing, setEditing] = useState<User | null | undefined>(undefined);
  // Bg_14: an inactive role shouldn't be assignable to a new/edited user — but if the
  // user being edited already holds one (assigned before it was deactivated), keep it
  // in the list so their current role still displays instead of silently vanishing.
  // Bg_25: a role with no permissions assigned grants access to nothing, so
  // offering it just creates a user who can't do anything. super_admin is
  // exempt — it stores an empty array but implicitly holds every permission
  // (see lib/permissionSeeder.ts). The currently-assigned role always stays
  // listed, same reasoning as the inactive-role case above.
  const pickableRoles = assignableRoles.filter(
    (r) =>
      (r.isActive || r._id === editing?.roleId._id) &&
      (r.name === ROLES.SUPER_ADMIN || r.permissions.length > 0 || r._id === editing?.roleId._id)
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const { search, setSearch, page, setPage, limit, setLimit, paged, total, totalPages } = useListControls(
    users,
    (u: User) => [u.name, u.email, u.phone, u.roleId?.name].filter(Boolean).join(" ")
  );

  async function toggleActive(user: User) {
    setBusyId(user._id);
    try {
      await userService.update(user._id, { isActive: !user.isActive });
      showToast(user.isActive ? "User deactivated." : "User activated.", "ok");
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
          can("users.create") && (
            <button className="btn bp sm" disabled={!pickableRoles.length} onClick={() => setEditing(null)}>
              + New User
            </button>
          )
        }
      />
      <div id="ct">
        {loading ? (
          <SkeletonTable columns={6} rows={6} />
        ) : (
          <>
          <div className="list-toolbar">
            <input
              className="list-search"
              placeholder="Search by name, email, phone, role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.length ? (
                  paged.map((u) => {
                    // Modifying an existing super admin account is restricted server-side
                    // to an actual super admin (see app/api/users/[id]/route.ts) — hide the
                    // controls here rather than let a delegated users.edit holder hit a 403.
                    const canManage = can("users.edit") && (u.roleId?.name !== ROLES.SUPER_ADMIN || role === ROLES.SUPER_ADMIN);
                    return (
                      <tr key={u._id}>
                        <td>{u.name || <span style={{ color: "#94a3b8" }}>—</span>}</td>
                        <td>{u.email}</td>
                        <td>{u.phone || <span style={{ color: "#94a3b8" }}>—</span>}</td>
                        <td><span className="bd bpd">{u.roleId?.name || "—"}</span></td>
                        <td><span className={`bd ${u.isActive ? "bok" : "bun"}`}>{u.isActive ? "Active" : "Inactive"}</span></td>
                        <td>
                          <div className="ac">
                            {canManage && <button className="btn sm bp" onClick={() => setEditing(u)}>Edit</button>}
                            {canManage && (
                              <button className="btn sm brd" disabled={busyId === u._id} onClick={() => toggleActive(u)}>
                                {u.isActive ? "Deactivate" : "Activate"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan={6} className="em">No users yet. Click &quot;+ New User&quot; to create one.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} onLimitChange={setLimit} />
          </>
        )}
      </div>

      {editing !== undefined && (
        <UserModal
          user={editing}
          roles={pickableRoles}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            showToast(editing ? "User updated." : "User created.", "ok");
            setEditing(undefined);
            refresh();
          }}
        />
      )}
    </>
  );
}

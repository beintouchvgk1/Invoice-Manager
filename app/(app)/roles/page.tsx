"use client";
import { useState } from "react";
import { Header } from "@/components/Layout/Header";
import { SkeletonTable } from "@/components/Common/Skeleton";
import { RoleModal } from "@/components/Role/RoleModal";
import { useRoles } from "@/hooks/useRoles";
import { roleService } from "@/services/role.service";
import { useToast } from "@/hooks/useToast";
import { ROLES } from "@/lib/constants";
import type { Role } from "@/lib/types";

export default function RolesPage() {
  const { roles, loading, refresh } = useRoles();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<Role | null | undefined>(undefined);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggleActive(role: Role) {
    setBusyId(role._id);
    try {
      await roleService.update(role._id, { isActive: !role.isActive });
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <Header
        title="Roles"
        actions={<button className="btn bp sm" onClick={() => setEditing(null)}>+ New Role</button>}
      />
      <div id="ct">
        {loading ? (
          <SkeletonTable columns={4} rows={5} />
        ) : (
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Role Name</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {roles.length ? (
                  roles.map((r) => {
                    const isSuperAdmin = r.name === ROLES.SUPER_ADMIN;
                    return (
                      <tr key={r._id}>
                        <td><strong>{r.name}</strong></td>
                        <td>{r.description || <span style={{ color: "#94a3b8" }}>—</span>}</td>
                        <td><span className={`bd ${r.isActive ? "bok" : "bun"}`}>{r.isActive ? "Active" : "Inactive"}</span></td>
                        <td>
                          <div className="ac">
                            <button className="btn sm bp" onClick={() => setEditing(r)}>Edit</button>
                            <button
                              className="btn sm brd"
                              disabled={busyId === r._id || (isSuperAdmin && r.isActive)}
                              title={isSuperAdmin && r.isActive ? "The super admin role cannot be deactivated" : undefined}
                              onClick={() => toggleActive(r)}
                            >
                              {r.isActive ? "Deactivate" : "Activate"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan={4} className="em">No roles yet. Click &quot;+ New Role&quot; to create one.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing !== undefined && (
        <RoleModal
          role={editing}
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

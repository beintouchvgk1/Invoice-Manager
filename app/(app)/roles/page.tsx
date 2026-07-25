"use client";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Layout/Header";
import { SkeletonBlock } from "@/components/Common/Skeleton";
import { RoleModal } from "@/components/Role/RoleModal";
import { useRoles } from "@/hooks/useRoles";
import { roleService } from "@/services/role.service";
import { useToast } from "@/hooks/useToast";
import { ROLES, PERMISSION_MODULES, ALL_PERMISSIONS } from "@/lib/constants";
import type { Role } from "@/lib/types";

function roleInitials(name: string): string {
  const words = name.replace(/[_-]/g, " ").trim().split(/\s+/);
  return ((words[0]?.[0] || "") + (words[1]?.[0] || "")).toUpperCase() || "?";
}

function permissionCount(role: Role): number {
  return role.name === ROLES.SUPER_ADMIN ? ALL_PERMISSIONS.length : role.permissions.length;
}

function permissionTotal(): number {
  return ALL_PERMISSIONS.length;
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((p) => set.has(p));
}

export default function RolesPage() {
  const { roles, loading, refresh } = useRoles();
  const { showToast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Role | null | undefined>(undefined);
  const [busyRoleId, setBusyRoleId] = useState<string | null>(null);
  const [draftPermissions, setDraftPermissions] = useState<string[]>([]);
  const [savingPermissions, setSavingPermissions] = useState(false);

  useEffect(() => {
    if (roles.length && !roles.some((r) => r._id === selectedId)) setSelectedId(roles[0]._id);
  }, [roles, selectedId]);

  const selectedRole = roles.find((r) => r._id === selectedId) || null;
  const isSuperAdminRole = selectedRole?.name === ROLES.SUPER_ADMIN;

  // Permission checkboxes edit a local draft only — saved in one batch via the
  // "Save Permissions" button, not per-click, so rapid clicking never fires a flurry
  // of overlapping PUT requests. The draft resyncs whenever the selected role (or its
  // saved data after a save) changes.
  useEffect(() => {
    const role = roles.find((r) => r._id === selectedId);
    setDraftPermissions(role ? role.permissions : []);
  }, [selectedId, roles]);

  const isDirty = !isSuperAdminRole && !!selectedRole && !sameSet(draftPermissions, selectedRole.permissions);

  const filteredModules = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return PERMISSION_MODULES;
    return PERMISSION_MODULES
      .map((m) => ({
        ...m,
        actions: m.actions.filter((a) => a.label.toLowerCase().includes(q) || m.label.toLowerCase().includes(q)),
      }))
      .filter((m) => m.actions.length);
  }, [search]);

  async function toggleActive(role: Role) {
    setBusyRoleId(role._id);
    try {
      await roleService.update(role._id, { isActive: !role.isActive });
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setBusyRoleId(null);
    }
  }

  function togglePermission(permissionKey: string) {
    setDraftPermissions((prev) =>
      prev.includes(permissionKey) ? prev.filter((p) => p !== permissionKey) : [...prev, permissionKey]
    );
  }

  function resetDraft() {
    if (selectedRole) setDraftPermissions(selectedRole.permissions);
  }

  async function savePermissions() {
    if (!selectedRole) return;
    setSavingPermissions(true);
    try {
      await roleService.update(selectedRole._id, { permissions: draftPermissions });
      await refresh();
      showToast("Permissions saved.", "ok");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save permissions");
    } finally {
      setSavingPermissions(false);
    }
  }

  return (
    <>
      <Header
        title="Roles & Permissions"
        actions={<button className="btn bp sm" onClick={() => setEditing(null)}>+ Add Role</button>}
      />
      <div id="ct">
        <p className="perm-subtitle">Edit which permissions each role grants</p>
        {loading ? (
          <div className="perm-layout">
            <div className="perm-roles-panel">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ padding: "10px 14px" }}>
                  <SkeletonBlock height={14} />
                </div>
              ))}
            </div>
            <div className="perm-panel">
              <SkeletonBlock width={220} height={20} style={{ marginBottom: 20 }} />
              <SkeletonBlock height={38} style={{ marginBottom: 20 }} />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ marginBottom: 18 }}>
                  <SkeletonBlock width={120} height={11} style={{ marginBottom: 10 }} />
                  <div className="perm-module-grid">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <SkeletonBlock key={j} height={40} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="perm-layout">
            <div className="perm-roles-panel">
              <div className="perm-panel-label">Roles</div>
              <div className="perm-role-list">
                {roles.length ? (
                  roles.map((r) => (
                    <button
                      key={r._id}
                      type="button"
                      className={`perm-role-item${r._id === selectedId ? " active" : ""}`}
                      onClick={() => {
                        if (r._id !== selectedId && isDirty && !confirm("Discard unsaved permission changes?")) return;
                        setSelectedId(r._id);
                      }}
                    >
                      <span className={`perm-role-dot${r.isActive ? "" : " off"}`} />
                      <span className="perm-role-name">{r.name}</span>
                      <span className="perm-role-count">{permissionCount(r)}</span>
                    </button>
                  ))
                ) : (
                  <div className="em">No roles yet.</div>
                )}
              </div>
            </div>

            <div className="perm-panel">
              {selectedRole ? (
                <>
                  <div className="perm-header">
                    <div className="perm-header-left">
                      <div className="perm-role-icon">{roleInitials(selectedRole.name)}</div>
                      <div>
                        <div className="perm-role-title">{selectedRole.name}</div>
                        <div className="perm-role-sub">
                          {isSuperAdminRole ? "Global Role — always has every permission" : selectedRole.description || "No description"}
                        </div>
                      </div>
                    </div>
                    <div className="perm-header-right">
                      <span className="perm-count">
                        {isSuperAdminRole ? permissionCount(selectedRole) : draftPermissions.length} / {permissionTotal()} permissions
                      </span>
                      <div className="ac">
                        <button className="btn sm bp" onClick={() => setEditing(selectedRole)}>Edit</button>
                        <button
                          className="btn sm brd"
                          disabled={busyRoleId === selectedRole._id || (isSuperAdminRole && selectedRole.isActive)}
                          title={isSuperAdminRole && selectedRole.isActive ? "The super admin role cannot be deactivated" : undefined}
                          onClick={() => toggleActive(selectedRole)}
                        >
                          {selectedRole.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <input
                    className="perm-search"
                    placeholder="Search permissions..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />

                  {!isSuperAdminRole && isDirty && (
                    <div className="perm-save-bar">
                      <span>You have unsaved permission changes.</span>
                      <div className="ac">
                        <button className="btn sm bs" disabled={savingPermissions} onClick={resetDraft}>Discard</button>
                        <button className="btn sm bp" disabled={savingPermissions} onClick={savePermissions}>
                          {savingPermissions ? "Saving..." : "Save Permissions"}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="perm-modules">
                    {filteredModules.map((m) => (
                      <div className="perm-module" key={m.key}>
                        <div className="perm-module-label">{m.label}</div>
                        <div className="perm-module-grid">
                          {m.actions.map((a) => {
                            const permissionKey = `${m.key}.${a.key}`;
                            const checked = isSuperAdminRole || draftPermissions.includes(permissionKey);
                            return (
                              <label
                                key={permissionKey}
                                className={`perm-item${checked ? " checked" : ""}${isSuperAdminRole ? " locked" : ""}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={isSuperAdminRole || savingPermissions}
                                  onChange={() => togglePermission(permissionKey)}
                                />
                                <span>{a.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {!filteredModules.length && <div className="em">No permissions match your search.</div>}
                  </div>
                </>
              ) : (
                <div className="em">No roles yet. Click &quot;+ Add Role&quot; to create one.</div>
              )}
            </div>
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

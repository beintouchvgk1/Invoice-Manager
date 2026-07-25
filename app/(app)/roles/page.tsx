"use client";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Layout/Header";
import { SkeletonBlock } from "@/components/Common/Skeleton";
import { RoleModal } from "@/components/Role/RoleModal";
import { useRoles } from "@/hooks/useRoles";
import { roleService } from "@/services/role.service";
import { useToast } from "@/hooks/useToast";
import { ROLES, PERMISSION_MODULES, ALL_PERMISSIONS, ASSIGNABLE_PERMISSIONS } from "@/lib/constants";
import type { Role } from "@/lib/types";

const MODULE_ICONS: Record<string, string> = {
  dashboard: "M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z",
  invoices: "M9 12h6M9 16h6M9 8h1M7 21h10a2 2 0 0 0 2-2V6.5L14.5 2H7a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2Z",
  customers: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  groups: "M4 20V8a2 2 0 0 1 2-2h3l2-2h2l2 2h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z",
  payments: "M2 8h20M2 8v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2M6 16h4",
  reports: "M4 19h16M6 19V9m6 10V5m6 14v-7",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-3a8 8 0 0 0-.15-1.55l2-1.55-2-3.46-2.36.95a7.97 7.97 0 0 0-2.68-1.55L16.4 2h-4l-.4 2.84a7.97 7.97 0 0 0-2.69 1.55L6.95 5.44l-2 3.46 2 1.55a8.14 8.14 0 0 0 0 3.1l-2 1.55 2 3.46 2.36-.95c.79.68 1.7 1.2 2.69 1.55L12.4 22h4l.4-2.84c.98-.35 1.9-.87 2.68-1.55l2.36.95 2-3.46-2-1.55c.1-.51.16-1.03.16-1.55Z",
  roles: "M12 2 3 6v6c0 5 3.5 8.5 9 10 5.5-1.5 9-5 9-10V6l-9-4Zm0 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 8c2.2 0 6.5 1.1 6.5 3.3V19H5.5v-1.7C5.5 15.1 9.8 14 12 14Z",
  users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
};

// Purely a visual grouping cue (money-related modules read as "success" green,
// organizational ones as "warning" amber, admin-only ones as "danger" red) — not
// a status indicator, just tokens already in the palette reused for variety.
const MODULE_TONES: Record<string, "primary" | "success" | "warning" | "danger"> = {
  dashboard: "primary",
  invoices: "success",
  customers: "primary",
  groups: "warning",
  payments: "success",
  reports: "primary",
  settings: "warning",
  roles: "danger",
  users: "danger",
};

function ModuleIcon({ module }: { module: string }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={MODULE_ICONS[module]} />
    </svg>
  );
}

function roleInitials(name: string): string {
  const words = name.replace(/[_-]/g, " ").trim().split(/\s+/);
  return ((words[0]?.[0] || "") + (words[1]?.[0] || "")).toUpperCase() || "?";
}

function permissionCount(role: Role): number {
  return role.name === ROLES.SUPER_ADMIN ? ALL_PERMISSIONS.length : role.permissions.length;
}

function permissionTotal(role: Role): number {
  return role.name === ROLES.SUPER_ADMIN ? ALL_PERMISSIONS.length : ASSIGNABLE_PERMISSIONS.length;
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

  // Permission toggles edit a local draft only — saved in one batch via the
  // "Save Permissions" bar, not per-click, so rapid clicking never fires a flurry
  // of overlapping PUT requests. The draft resyncs whenever the selected role (or its
  // saved data after a save) changes.
  useEffect(() => {
    const role = roles.find((r) => r._id === selectedId);
    setDraftPermissions(role ? role.permissions : []);
  }, [selectedId, roles]);

  const isDirty = !isSuperAdminRole && !!selectedRole && !sameSet(draftPermissions, selectedRole.permissions);

  const filteredModules = useMemo(() => {
    // "roles" and "users" stay hard-gated to the super admin (see lib/requireAuth.ts) —
    // showing them as assignable toggles on any other role would be misleading,
    // since the underlying API would still reject that role's requests.
    const modules = isSuperAdminRole ? PERMISSION_MODULES : PERMISSION_MODULES.filter((m) => m.key !== "roles" && m.key !== "users");
    const q = search.trim().toLowerCase();
    if (!q) return modules;
    return modules
      .map((m) => ({
        ...m,
        actions: m.actions.filter((a) => a.label.toLowerCase().includes(q) || m.label.toLowerCase().includes(q)),
      }))
      .filter((m) => m.actions.length);
  }, [search, isSuperAdminRole]);

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

  function toggleModuleAll(moduleKeys: string[], allChecked: boolean) {
    setDraftPermissions((prev) =>
      allChecked ? prev.filter((p) => !moduleKeys.includes(p)) : Array.from(new Set([...prev, ...moduleKeys]))
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

  const grantedCount = selectedRole ? (isSuperAdminRole ? permissionCount(selectedRole) : draftPermissions.length) : 0;
  const grantedTotal = selectedRole ? permissionTotal(selectedRole) : 0;
  const grantedPct = grantedTotal ? Math.round((grantedCount / grantedTotal) * 100) : 0;

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
                  roles.map((r) => {
                    const pct = Math.round((permissionCount(r) / permissionTotal(r)) * 100) || 0;
                    return (
                      <button
                        key={r._id}
                        type="button"
                        className={`perm-role-item${r._id === selectedId ? " active" : ""}`}
                        onClick={() => {
                          if (r._id !== selectedId && isDirty && !confirm("Discard unsaved permission changes?")) return;
                          setSelectedId(r._id);
                        }}
                      >
                        <div className="perm-role-item-top">
                          <span className="perm-role-avatar">{roleInitials(r.name)}</span>
                          <span className="perm-role-name">{r.name}</span>
                          {!r.isActive && <span className="perm-role-off">Inactive</span>}
                          <span className="perm-role-count">{permissionCount(r)}</span>
                        </div>
                        <div className="perm-role-bar">
                          <div className="perm-role-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </button>
                    );
                  })
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
                      <div style={{ minWidth: 0 }}>
                        <div className="perm-role-title">{selectedRole.name}</div>
                        <div className="perm-role-sub">
                          {isSuperAdminRole ? "Global Role — always has every permission" : selectedRole.description || "No description"}
                        </div>
                      </div>
                    </div>
                    <div className="perm-header-right">
                      <span className="perm-count">
                        {grantedCount} / {grantedTotal} permissions
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

                  <div className="perm-progress">
                    <div className="perm-progress-track">
                      <div className="perm-progress-fill" style={{ width: `${grantedPct}%` }} />
                    </div>
                    <span className="perm-progress-pct">{grantedPct}%</span>
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
                    {filteredModules.map((m) => {
                      const moduleKeys = m.actions.map((a) => `${m.key}.${a.key}`);
                      const allChecked = isSuperAdminRole || moduleKeys.every((k) => draftPermissions.includes(k));
                      const someChecked = !allChecked && moduleKeys.some((k) => draftPermissions.includes(k));
                      return (
                        <div className="perm-module-card" key={m.key}>
                          <div className="perm-module-head">
                            <div className="perm-module-head-left">
                              <div className={`perm-module-icon tone-${MODULE_TONES[m.key] || "primary"}`}>
                                <ModuleIcon module={m.key} />
                              </div>
                              <div>
                                <div className="perm-module-title">{m.label}</div>
                                <div className="perm-module-sub">
                                  {moduleKeys.filter((k) => isSuperAdminRole || draftPermissions.includes(k)).length} / {moduleKeys.length} granted
                                </div>
                              </div>
                            </div>
                            {!isSuperAdminRole && (
                              <button
                                type="button"
                                className="perm-module-selectall"
                                disabled={savingPermissions}
                                onClick={() => toggleModuleAll(moduleKeys, allChecked)}
                              >
                                {allChecked ? "Clear all" : someChecked ? "Select rest" : "Select all"}
                              </button>
                            )}
                          </div>
                          <div className="perm-module-grid">
                            {m.actions.map((a) => {
                              const permissionKey = `${m.key}.${a.key}`;
                              const checked = isSuperAdminRole || draftPermissions.includes(permissionKey);
                              return (
                                <div key={permissionKey} className={`perm-toggle-row${checked ? " checked" : ""}`}>
                                  <span className="perm-toggle-label">{a.label}</span>
                                  <label className="perm-switch" title={isSuperAdminRole ? "Always granted to the super admin" : undefined}>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      disabled={isSuperAdminRole || savingPermissions}
                                      onChange={() => togglePermission(permissionKey)}
                                    />
                                    <span className="perm-switch-track" />
                                    <span className="perm-switch-thumb" />
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
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

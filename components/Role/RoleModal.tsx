"use client";
import { useState } from "react";
import { Modal } from "@/components/Common/Modal";
import { Toast } from "@/components/Common/Toast";
import { roleService } from "@/services/role.service";
import { ROLES } from "@/lib/constants";
import type { Role } from "@/lib/types";

export function RoleModal({
  role,
  onClose,
  onSaved,
}: {
  role: Role | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(role?.name || "");
  const [description, setDescription] = useState(role?.description || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isSuperAdminRole = role?.name === ROLES.SUPER_ADMIN;

  async function handleSave() {
    setError("");
    if (!name.trim()) return setError("Role name is required");
    setBusy(true);
    try {
      if (role) await roleService.update(role._id, { name: name.trim(), description: description.trim() });
      else await roleService.create({ name: name.trim(), description: description.trim() });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save role");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose}>
      <h3>{role ? "Edit Role" : "New Role"}</h3>
      {error && <Toast kind="err" message={error} />}
      {isSuperAdminRole && (
        <div style={{ color: "#94a3b8", fontSize: 11.5, marginBottom: 10 }}>
          This is the built-in super admin role — its name cannot be changed.
        </div>
      )}
      <div className="fg" style={{ marginBottom: 12 }}>
        <label>Role Name *</label>
        <input value={name} onChange={(e) => setName(e.target.value)} disabled={isSuperAdminRole} />
      </div>
      <div className="fg fl" style={{ marginBottom: 14 }}>
        <label>Description</label>
        <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button className="btn bs" onClick={onClose}>Cancel</button>
        <button className="btn bp" disabled={busy} onClick={handleSave}>{role ? "Save Changes" : "Create Role"}</button>
      </div>
    </Modal>
  );
}

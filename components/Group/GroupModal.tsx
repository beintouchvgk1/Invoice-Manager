"use client";
import { useState } from "react";
import { Modal } from "@/components/Common/Modal";
import { ConfirmModal } from "@/components/Common/ConfirmModal";
import { Toast } from "@/components/Common/Toast";
import { customerService } from "@/services/customer.service";
import { groupService } from "@/services/group.service";
import { useCustomers } from "@/hooks/useCustomers";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useToast } from "@/hooks/useToast";
import type { Client } from "@/lib/types";

export function GroupModal({
  groupName,
  onClose,
  onSaved,
}: {
  groupName: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(groupName || "");
  // Used to fetch customerService.list() directly, which came up empty
  // offline (same bug as PaymentModal/CustomerModal) — useCustomers() is
  // cache-first. Group membership edits still require being online (Groups
  // have no write queue — see references/offline.md), but at least the
  // modal now shows real members/candidates instead of an empty list.
  const { customers: clients, refresh: refreshClients } = useCustomers();
  const online = useOnlineStatus();
  const { showToast } = useToast();
  const [addSel, setAddSel] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const members = clients.filter((c) => c.groupName === groupName);
  const others = clients.filter((c) => c.groupName !== groupName);

  async function addMember() {
    if (!addSel) return;
    const client = clients.find((c) => c._id === addSel);
    if (!client) return;
    await customerService.update(client._id, { ...client, groupName: groupName || "" });
    setAddSel("");
    refreshClients();
  }

  async function removeMember(client: Client) {
    await customerService.update(client._id, { ...client, groupName: "" });
    refreshClients();
  }

  async function handleSave() {
    setError("");
    if (!name.trim()) return setError("Group name required");
    setBusy(true);
    try {
      if (groupName) await groupService.rename(groupName, name.trim());
      else await groupService.create(name.trim());
      // Bg_24: toasted from inside the modal (not the page's onSaved) because
      // save and delete both call onSaved — only here is it known which ran.
      showToast(groupName ? "Group updated." : "Group created.", "ok");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save group");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!groupName) return;
    setBusy(true);
    try {
      await groupService.remove(groupName);
      showToast(`Group "${groupName}" deleted.`, "ok");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete group");
      setBusy(false);
    } finally {
      setShowDeleteConfirm(false);
    }
  }

  return (
    <Modal open onClose={onClose}>
      <h3>{groupName ? "Edit Group" : "New Group"}</h3>
      {error && <Toast kind="err" message={error} />}
      <div className="fg" style={{ marginBottom: 12 }}>
        <label>Group Name *</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      {groupName && (
        <>
          <div className="fg" style={{ marginBottom: 6 }}>
            <label>Members</label>
            <div>
              {members.length ? (
                members.map((c) => (
                  <div className="cat-item" key={c._id}>
                    {c.name}
                    <button
                      onClick={() => removeMember(c)}
                      disabled={!online}
                      style={{ float: "right", background: "none", border: "none", color: "#dc2626", cursor: online ? "pointer" : "default", fontSize: 14, opacity: online ? 1 : 0.4 }}
                      title={online ? "Remove from group" : "Group membership can only be changed online"}
                    >
                      ×
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ color: "#94a3b8", fontSize: 12, padding: "4px 0" }}>No clients in this group yet.</div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <select
              value={addSel}
              onChange={(e) => setAddSel(e.target.value)}
              style={{ flex: 1, padding: "7px 9px", border: "1px solid #cbd5e1", borderRadius: 4, fontSize: 12, outline: "none" }}
            >
              <option value="">- Select client to add -</option>
              {others.map((c) => (
                <option key={c._id} value={c._id}>{c.name}{c.groupName ? ` (currently: ${c.groupName})` : ""}</option>
              ))}
            </select>
            <button
              className="btn bg sm"
              type="button"
              disabled={!online}
              title={online ? undefined : "Group membership can only be changed online"}
              onClick={addMember}
            >
              Add to Group
            </button>
          </div>
        </>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button className="btn bs" onClick={onClose}>Cancel</button>
        {groupName && <button className="btn brd" disabled={busy} onClick={() => setShowDeleteConfirm(true)}>Delete Group</button>}
        <button className="btn bp" disabled={busy} onClick={handleSave}>{groupName ? "Save Changes" : "Create Group"}</button>
      </div>

      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete Group"
        message={`Are you sure you want to delete "${groupName}"? Clients in it will be ungrouped (clients themselves are not deleted).`}
        confirmLabel="Delete"
        destructive
        busy={busy}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </Modal>
  );
}

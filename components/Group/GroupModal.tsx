"use client";
import { useEffect, useState } from "react";
import { Modal } from "@/components/Common/Modal";
import { Toast } from "@/components/Common/Toast";
import { customerService } from "@/services/customer.service";
import { groupService } from "@/services/group.service";
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
  const [clients, setClients] = useState<Client[]>([]);
  const [addSel, setAddSel] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    customerService.list().then(setClients).catch(() => {});
  }, []);

  const members = clients.filter((c) => c.groupName === groupName);
  const others = clients.filter((c) => c.groupName !== groupName);

  async function refreshClients() {
    setClients(await customerService.list());
  }

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
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save group");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!groupName) return;
    if (!confirm(`Delete group "${groupName}"? Clients in it will be ungrouped (clients are not deleted).`)) return;
    setBusy(true);
    try {
      await groupService.remove(groupName);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete group");
      setBusy(false);
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
                      style={{ float: "right", background: "none", border: "none", color: "#c00", cursor: "pointer", fontSize: 14 }}
                      title="Remove from group"
                    >
                      ×
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ color: "#aaa", fontSize: 12, padding: "4px 0" }}>No clients in this group yet.</div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <select
              value={addSel}
              onChange={(e) => setAddSel(e.target.value)}
              style={{ flex: 1, padding: "7px 9px", border: "1px solid #ccd", borderRadius: 4, fontSize: 12, outline: "none" }}
            >
              <option value="">- Select client to add -</option>
              {others.map((c) => (
                <option key={c._id} value={c._id}>{c.name}{c.groupName ? ` (currently: ${c.groupName})` : ""}</option>
              ))}
            </select>
            <button className="btn bg sm" type="button" onClick={addMember}>Add to Group</button>
          </div>
        </>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button className="btn bs" onClick={onClose}>Cancel</button>
        {groupName && <button className="btn brd" disabled={busy} onClick={handleDelete}>Delete Group</button>}
        <button className="btn bp" disabled={busy} onClick={handleSave}>{groupName ? "Save Changes" : "Create Group"}</button>
      </div>
    </Modal>
  );
}

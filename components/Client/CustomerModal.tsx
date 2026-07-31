"use client";
import { useEffect, useState } from "react";
import { Modal } from "@/components/Common/Modal";
import { Toast } from "@/components/Common/Toast";
import { groupService } from "@/services/group.service";
import { customerService } from "@/services/customer.service";
import { offlineCreate, offlineUpdate } from "@/lib/offline/mutate";
import type { Client } from "@/lib/types";

export function CustomerModal({
  client,
  onClose,
  onSaved,
}: {
  client?: Client | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [groups, setGroups] = useState<string[]>([]);
  const [name, setName] = useState(client?.name || "");
  const [groupName, setGroupName] = useState(client?.groupName || "");
  const [addressLine1, setAddressLine1] = useState(client?.addressLine1 || "");
  const [addressLine2, setAddressLine2] = useState(client?.addressLine2 || "");
  const [addressLine3, setAddressLine3] = useState(client?.addressLine3 || "");
  const [city, setCity] = useState(client?.city || "");
  const [state, setState] = useState(client?.state || "");
  const [pincode, setPincode] = useState(client?.pincode || "");
  const [mobile, setMobile] = useState(client?.mobile || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    groupService.list().then((gs) => setGroups(gs.map((g) => g.name))).catch(() => {});
  }, []);

  async function handleSave() {
    setError("");
    if (!name.trim()) return setError("Name required");
    setBusy(true);
    try {
      const payload = {
        name: name.trim(),
        groupName: groupName.trim(),
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim(),
        addressLine3: addressLine3.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        mobile: mobile.trim(),
      };
      if (client) await offlineUpdate("clients", customerService, client._id, payload);
      else await offlineCreate("clients", customerService, payload);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save client");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose}>
      <h3>{client ? "Edit Client" : "New Client"}</h3>
      {error && <Toast kind="err" message={error} />}
      <div className="g2" style={{ marginBottom: 12 }}>
        <div className="fg fl">
          <label>Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="fg fl">
          <label>Group</label>
          <select value={groupName} onChange={(e) => setGroupName(e.target.value)}>
            <option value="">- No Group -</option>
            {groups.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
        <div className="fg fl">
          <label>House / Flat / Office No.</label>
          <input placeholder="e.g. A-101, 3rd Floor" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
        </div>
        <div className="fg fl">
          <label>Society / Building Name</label>
          <input placeholder="e.g. Shreenath Residency" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />
        </div>
        <div className="fg fl">
          <label>Road / Area</label>
          <input placeholder="e.g. Varachha Main Road" value={addressLine3} onChange={(e) => setAddressLine3(e.target.value)} />
        </div>
        <div className="fg">
          <label>City</label>
          <input value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div className="fg">
          <label>State</label>
          <input value={state} onChange={(e) => setState(e.target.value)} />
        </div>
        <div className="fg">
          <label>Pincode</label>
          <input value={pincode} onChange={(e) => setPincode(e.target.value)} />
        </div>
        <div className="fg">
          <label>Mobile</label>
          <input value={mobile} onChange={(e) => setMobile(e.target.value)} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button className="btn bs" onClick={onClose}>Cancel</button>
        <button className="btn bp" disabled={busy} onClick={handleSave}>Save</button>
      </div>
    </Modal>
  );
}

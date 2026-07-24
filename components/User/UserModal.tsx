"use client";
import { useState } from "react";
import { Modal } from "@/components/Common/Modal";
import { Toast } from "@/components/Common/Toast";
import { userService } from "@/services/user.service";
import type { Role, User } from "@/lib/types";

export function UserModal({
  user,
  roles,
  onClose,
  onSaved,
}: {
  user: User | null;
  roles: Role[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState(user?.roleId._id || roles[0]?._id || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    setError("");
    if (!email.trim()) return setError("Email is required");
    if (!roleId) return setError("Role is required");
    if (!user && !password) return setError("Password is required");
    if (password && password.length < 6) return setError("Password must be at least 6 characters");

    setBusy(true);
    try {
      if (user) {
        await userService.update(user._id, {
          email: email.trim(),
          phone: phone.trim(),
          roleId,
          ...(password ? { password } : {}),
        });
      } else {
        await userService.create({ email: email.trim(), password, phone: phone.trim(), roleId });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save user");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose}>
      <h3>{user ? "Edit User" : "New User"}</h3>
      {error && <Toast kind="err" message={error} />}
      <div className="g2">
        <div className="fg">
          <label>Email *</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="fg">
          <label>Phone Number</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="fg">
          <label>{user ? "New Password (leave blank to keep current)" : "Password *"}</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="fg">
          <label>Role *</label>
          <select value={roleId} onChange={(e) => setRoleId(e.target.value)}>
            {roles.map((r) => (
              <option key={r._id} value={r._id}>{r.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
        <button className="btn bs" onClick={onClose}>Cancel</button>
        <button className="btn bp" disabled={busy} onClick={handleSave}>{user ? "Save Changes" : "Create User"}</button>
      </div>
    </Modal>
  );
}

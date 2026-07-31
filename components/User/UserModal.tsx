"use client";
import { useState } from "react";
import { Modal } from "@/components/Common/Modal";
import { Toast } from "@/components/Common/Toast";
import { userService } from "@/services/user.service";
import { isValidEmail, isValidPhone } from "@/lib/validators";
import type { Role, User } from "@/lib/types";

// Blocks anything but digits and a single leading "+" as the user types/pastes,
// rather than only flagging it after the fact on submit — the field never even
// shows garbage characters to correct.
function sanitizePhoneInput(value: string): string {
  const hasLeadingPlus = value.trim().startsWith("+");
  const digits = value.replace(/\D/g, "");
  return (hasLeadingPlus ? "+" : "") + digits;
}

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
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState(user?.roleId._id || roles[0]?._id || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSave() {
    setError("");
    if (!email.trim()) return setError("Email is required");
    if (!isValidEmail(email)) return setError("Enter a valid email address");
    if (phone.trim() && !isValidPhone(phone)) return setError("Phone number can only contain digits and a leading +");
    if (!roleId) return setError("Role is required");
    if (!user && !password) return setError("Password is required");
    if (password && password.length < 6) return setError("Password must be at least 6 characters");

    setBusy(true);
    try {
      if (user) {
        await userService.update(user._id, {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          roleId,
          ...(password ? { password } : {}),
        });
      } else {
        await userService.create({ name: name.trim(), email: email.trim(), password, phone: phone.trim(), roleId });
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
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="fg">
          <label>Email *</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="fg">
          <label>Phone Number</label>
          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
          />
        </div>
        <div className="fg">
          <label>{user ? "New Password (leave blank to keep current)" : "Password *"}</label>
          <div className="pw-wrap">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="icon-btn"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-10-8-10-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>
        <div className="fg">
          <label>Role *</label>
          <select value={roleId} onChange={(e) => setRoleId(e.target.value)}>
            {roles.map((r) => (
              <option key={r._id} value={r._id}>{r.name}{!r.isActive ? " (Inactive)" : ""}</option>
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

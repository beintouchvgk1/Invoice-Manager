import { ReactNode } from "react";

export function Header({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div id="tb">
      <h2 id="ttl">{title}</h2>
      <div id="ta" style={{ display: "flex", gap: 6 }}>
        {actions}
      </div>
    </div>
  );
}

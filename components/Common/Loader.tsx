export function Loader({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="em" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#1d4ed8"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="spinner"
      >
        <path d="M12 3a9 9 0 1 0 9 9" />
      </svg>
      <span>{label}</span>
    </div>
  );
}

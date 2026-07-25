import { CSSProperties } from "react";

export function SkeletonBlock({ width = "100%", height = 14, style }: { width?: number | string; height?: number | string; style?: CSSProperties }) {
  return <div className="sk" style={{ width, height, ...style }} />;
}

export function SkeletonStatGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="sg">
      {Array.from({ length: count }).map((_, i) => (
        <div className="sc" key={i}>
          <SkeletonBlock width={42} height={42} style={{ borderRadius: "var(--radius-md)" }} />
          <div style={{ flex: 1 }}>
            <SkeletonBlock width={90} height={9} />
            <div style={{ marginTop: 10 }}>
              <SkeletonBlock width={110} height={20} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ columns = 5, rows = 6 }: { columns?: number; rows?: number }) {
  return (
    <div className="tw">
      {Array.from({ length: rows }).map((_, r) => (
        <div className="sk-row" key={r}>
          {Array.from({ length: columns }).map((_, c) => (
            <SkeletonBlock key={c} height={12} width={c === 0 ? "18%" : `${100 / columns - 4}%`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonFormCard({ fields = 4 }: { fields?: number }) {
  return (
    <div className="fc">
      <SkeletonBlock width={140} height={11} style={{ marginBottom: 16 }} />
      <div className="g2">
        {Array.from({ length: fields }).map((_, i) => (
          <div className="fg" key={i}>
            <SkeletonBlock width={70} height={10} />
            <SkeletonBlock height={34} style={{ marginTop: 6 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

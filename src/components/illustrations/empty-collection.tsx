// 空状態のイラスト（docs/ui-mockups/assets/ph-empty.svg から移設）。
// 破線のラベル面は「まだ何も入っていない」を表す。中身のあるボトルは bottle-placeholder.tsx。
export function EmptyCollection({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 612"
      className={className}
      role="presentation"
      aria-hidden
    >
      <defs>
        <linearGradient id="empty-collection" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#4a3b28" />
          <stop offset="1" stopColor="#241a0f" />
        </linearGradient>
      </defs>
      <rect x="97.5" y="0" width="45" height="138" rx="10" fill="#3a2a1c" />
      <rect
        x="0.75"
        y="116.75"
        width="238.5"
        height="494.5"
        rx="22"
        fill="url(#empty-collection)"
        stroke="rgba(239,231,218,0.10)"
        strokeWidth="1.5"
      />
      <rect
        x="54.5"
        y="272"
        width="131"
        height="166"
        rx="13"
        fill="none"
        stroke="#8a7d6d"
        strokeWidth="6"
        strokeDasharray="18 13"
      />
    </svg>
  );
}

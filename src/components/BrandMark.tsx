export default function BrandMark({ className = 'size-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="5" y="5" width="22" height="6" rx="3" fill="currentColor" opacity=".45" />
      <rect x="5" y="13" width="22" height="6" rx="3" fill="currentColor" opacity=".72" />
      <rect x="5" y="21" width="22" height="6" rx="3" fill="currentColor" />
      <path d="M9 8h14M9 16h14M9 24h14" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" opacity=".55" />
    </svg>
  )
}

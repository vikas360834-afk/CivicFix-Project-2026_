/**
 * CivicFix brand mark — gradient shield + city skyline + verified tick.
 * Vector, so it stays sharp at any size (navbar, footer, auth, favicon).
 */
export default function Logo({ className = "h-8 w-8" }) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="CivicFix logo">
      <defs>
        <linearGradient id="cfGrad" x1="6" y1="3" x2="42" y2="45" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3B82F6" />
          <stop offset="0.5" stopColor="#06B6D4" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id="cfShine" x1="12" y1="6" x2="36" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* shield */}
      <path
        d="M24 3 42 10v13.2C42 34.7 34.4 41.9 24 45 13.6 41.9 6 34.7 6 23.2V10L24 3Z"
        fill="url(#cfGrad)"
      />
      <path
        d="M24 3 42 10v13.2C42 34.7 34.4 41.9 24 45 13.6 41.9 6 34.7 6 23.2V10L24 3Z"
        fill="url(#cfShine)"
      />

      {/* city skyline */}
      <g fill="#ffffff" opacity="0.92">
        <rect x="12.5" y="23" width="5" height="12" rx="1.2" />
        <rect x="19.5" y="17" width="6.5" height="18" rx="1.4" />
        <rect x="28" y="25.5" width="5" height="9.5" rx="1.2" />
      </g>
      {/* windows */}
      <g fill="#0f766e" opacity="0.75">
        <rect x="21.2" y="20" width="1.5" height="1.5" />
        <rect x="24.4" y="20" width="1.5" height="1.5" />
        <rect x="21.2" y="23.5" width="1.5" height="1.5" />
        <rect x="24.4" y="23.5" width="1.5" height="1.5" />
        <rect x="13.8" y="26" width="1.4" height="1.4" />
        <rect x="29.3" y="28" width="1.4" height="1.4" />
      </g>

      {/* verified tick */}
      <circle cx="34.5" cy="34" r="8" fill="#ffffff" />
      <path
        d="m30.8 34 2.5 2.6 4.6-5.2"
        fill="none"
        stroke="#2563EB"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

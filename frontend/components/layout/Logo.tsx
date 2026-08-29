export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="logoGradient" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f0cd94" />
          <stop offset="0.5" stopColor="#d7a75f" />
          <stop offset="1" stopColor="#a9702f" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="9" fill="url(#logoGradient)" />
      <circle cx="9" cy="4.5" r="1.15" fill="#1c1408" fillOpacity="0.35" />
      <circle cx="16" cy="4.5" r="1.15" fill="#1c1408" fillOpacity="0.35" />
      <circle cx="23" cy="4.5" r="1.15" fill="#1c1408" fillOpacity="0.35" />
      <circle cx="9" cy="27.5" r="1.15" fill="#1c1408" fillOpacity="0.35" />
      <circle cx="16" cy="27.5" r="1.15" fill="#1c1408" fillOpacity="0.35" />
      <circle cx="23" cy="27.5" r="1.15" fill="#1c1408" fillOpacity="0.35" />
      <path
        d="M9.5 16.8l4.2 4.2L22.5 11.5"
        stroke="#1c1408"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

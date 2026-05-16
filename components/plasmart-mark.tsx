interface Props {
  size?: number;
  className?: string;
}

export function PlasmartMark({ size = 24, className = "" }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="1" y="1" width="22" height="22" rx="2" fill="#0f172a" />
      <path
        d="M7.5 6.5 L7.5 17.5 M7.5 6.5 L13 6.5 Q16.5 6.5 16.5 9.5 Q16.5 12.5 13 12.5 L7.5 12.5"
        stroke="#f8fafc"
        strokeWidth="2"
        strokeLinecap="square"
        fill="none"
      />
      <rect x="17" y="16" width="3" height="3" fill="#2563eb" />
    </svg>
  );
}

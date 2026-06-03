interface Props {
  size?: number;
  className?: string;
}

/**
 * Marca Plasmart — "spark" de plasma: cuadrado con gradiente incandescente
 * y una muesca de corte. Pensada para fondo oscuro (Control Room).
 */
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
      <defs>
        <linearGradient id="plasma" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb068" />
          <stop offset="0.55" stopColor="#ff6a2c" />
          <stop offset="1" stopColor="#e8521a" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="22" height="22" rx="6" fill="url(#plasma)" />
      <path
        d="M8 6.5 L8 17.5 M8 6.5 L13 6.5 Q16.5 6.5 16.5 9.75 Q16.5 13 13 13 L8 13"
        stroke="#0a0e14"
        strokeWidth="2.1"
        strokeLinecap="round"
        fill="none"
      />
      <rect x="16.5" y="16" width="3" height="3" rx="0.5" fill="#0a0e14" opacity="0.85" />
    </svg>
  );
}

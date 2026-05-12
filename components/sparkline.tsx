interface Props {
  /** Serie temporal de valores. Mínimo 2 puntos para que se renderice. */
  values: number[];
  /** Color del trazo. Default: primary. */
  color?: string;
  /** Ancho fijo del sparkline. Default: 80. */
  width?: number;
  /** Alto fijo del sparkline. Default: 24. */
  height?: number;
}

/**
 * Mini-gráfico de línea inline para mostrar tendencia dentro de un
 * KPI card. Sin ejes, sin grilla, sin labels: solo la forma de la
 * tendencia. SVG vanilla, sin dependencias.
 */
export function Sparkline({
  values,
  color = "#0f172a",
  width = 80,
  height = 24,
}: Props) {
  if (values.length < 2) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1; // evitar división por cero si todos son iguales

  // Margen interno chico para que la línea no toque los bordes
  const padY = 2;
  const usableH = height - padY * 2;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = padY + (1 - (v - min) / range) * usableH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const path = "M " + points.join(" L ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="block"
      aria-hidden="true"
    >
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

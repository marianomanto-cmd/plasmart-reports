interface Props {
  /** Serie temporal de valores. Mínimo 2 puntos para que se renderice. */
  values: number[];
  /** Color del trazo. Default: accent (azul). */
  color?: string;
  /** Ancho fijo del sparkline. Default: 96. */
  width?: number;
  /** Alto fijo del sparkline. Default: 28. */
  height?: number;
  /** Si true, dibuja una línea de promedio tenue. Default: false. */
  showBaseline?: boolean;
  /** Si true, destaca el último valor con un punto sólido. Default: false. */
  highlightLast?: boolean;
}

/**
 * Mini-gráfico de línea inline para mostrar tendencia dentro de un
 * KPI card. Sin ejes, sin grilla, sin labels: solo la forma de la
 * tendencia con baseline opcional y punto final destacado.
 */
export function Sparkline({
  values,
  color = "#2563eb",
  width = 96,
  height = 28,
  showBaseline = false,
  highlightLast = false,
}: Props) {
  if (values.length < 2) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const avg = values.reduce((s, v) => s + v, 0) / values.length;

  const padY = 3;
  const usableH = height - padY * 2;

  const toY = (v: number) => padY + (1 - (v - min) / range) * usableH;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    return { x, y: toY(v) };
  });

  const linePath =
    "M " + points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ");

  // Area de fondo muy tenue debajo de la línea
  const areaPath =
    linePath +
    ` L ${width},${height} L 0,${height} Z`;

  const baselineY = toY(avg);
  const last = points[points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="block"
      aria-hidden="true"
    >
      {showBaseline && (
        <line
          x1={0}
          x2={width}
          y1={baselineY}
          y2={baselineY}
          stroke="#cbd5e1"
          strokeWidth="0.75"
          strokeDasharray="2 2"
        />
      )}
      <path d={areaPath} fill={color} fillOpacity="0.08" />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {highlightLast && (
        <circle cx={last.x} cy={last.y} r="2" fill={color} />
      )}
    </svg>
  );
}

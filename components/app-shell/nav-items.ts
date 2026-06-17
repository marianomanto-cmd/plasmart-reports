import {
  RiDashboardLine,
  RiBarChart2Line,
  RiGlobalLine,
  RiSparkling2Line,
  RiSettings3Line,
} from "@remixicon/react";

export interface NavItem {
  href: string;
  label: string;
  icon: typeof RiDashboardLine;
  match: (pathname: string) => boolean;
}

/** Destinos principales del rail (en orden). */
export const NAV_PRIMARY: NavItem[] = [
  {
    href: "/dashboard",
    label: "Resumen",
    icon: RiDashboardLine,
    match: (p) => p === "/dashboard",
  },
  {
    href: "/dashboard/paid",
    label: "Campañas",
    icon: RiBarChart2Line,
    match: (p) => p.startsWith("/dashboard/paid") || p === "/dashboard/comparativa" || p === "/dashboard/detalle",
  },
  {
    href: "/dashboard/traffic",
    label: "Tráfico",
    icon: RiGlobalLine,
    match: (p) => p.startsWith("/dashboard/traffic"),
  },
  {
    href: "/dashboard/analysis",
    label: "Análisis",
    icon: RiSparkling2Line,
    match: (p) => p.startsWith("/dashboard/analysis") || p === "/dashboard/corey-haines",
  },
];

/** Admin va separado abajo del rail. */
export const NAV_ADMIN: NavItem = {
  href: "/admin",
  label: "Admin",
  icon: RiSettings3Line,
  match: (p) => p.startsWith("/admin"),
};

export const ALL_NAV: NavItem[] = [...NAV_PRIMARY, NAV_ADMIN];

export const BRAND_EYEBROW = "PLASMART · TRANSFIL · CÓRDOBA";

export interface SectionMeta {
  title: string;
  subtitle: string;
}

/** Título + subtítulo de la sección, derivados de la ruta (para el topbar). */
export function sectionMeta(pathname: string): SectionMeta {
  if (pathname.startsWith("/admin")) {
    return {
      title: "Operación",
      subtitle: "Estado de las fuentes de datos e ingestas",
    };
  }
  if (pathname.startsWith("/dashboard/traffic")) {
    return {
      title: "Tráfico del sitio",
      subtitle: "Google Analytics 4 · sesiones y canales",
    };
  }
  if (
    pathname.startsWith("/dashboard/analysis") ||
    pathname === "/dashboard/corey-haines"
  ) {
    return {
      title: "Análisis IA",
      subtitle: "Lectura del período generada por Claude",
    };
  }
  if (
    pathname.startsWith("/dashboard/paid") ||
    pathname === "/dashboard/comparativa" ||
    pathname === "/dashboard/detalle"
  ) {
    return {
      title: "Campañas",
      subtitle: "Inversión, clics y consultas por campaña",
    };
  }
  return {
    title: "Resumen del período",
    subtitle: "Cómo vamos y qué mirar",
  };
}

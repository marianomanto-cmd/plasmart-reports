"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutGrid,
  TrendingUp,
  Globe,
  Sparkles,
  Settings,
  ChevronRight,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface NavLink {
  href: string;
  label: string;
  icon: typeof LayoutGrid;
  /** Children que se muestran indentados debajo. Activos cuando el path
   *  matchea exactamente; el padre queda activo si cualquier child lo está. */
  children?: Array<{ href: string; label: string }>;
}

const PRIMARY: NavLink[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid },
  {
    href: "/dashboard/paid",
    label: "Paid",
    icon: TrendingUp,
    children: [
      { href: "/dashboard/paid/gads", label: "Google Ads" },
      { href: "/dashboard/paid/meta", label: "Meta Ads" },
    ],
  },
  { href: "/dashboard/traffic", label: "Tráfico", icon: Globe },
  { href: "/dashboard/analysis", label: "Análisis", icon: Sparkles },
];

const SECONDARY: NavLink[] = [
  { href: "/admin", label: "Admin", icon: Settings },
];

interface Props {
  /** Callback opcional para cerrar el sheet en mobile cuando se navega. */
  onNavigate?: () => void;
}

/**
 * Sidebar nav. Se renderiza en dos contextos:
 *   1. Desktop: como columna fija a la izquierda del AppShell.
 *   2. Mobile: dentro de un Sheet drawer disparado por el hamburger.
 * Preserva los query params de la URL al navegar (importante para no
 * perder filtros activos al cambiar de vista).
 */
export function SidebarNav({ onNavigate }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  const withQs = (href: string) => (qs ? `${href}?${qs}` : href);

  const isActive = (item: NavLink): boolean => {
    if (item.href === "/dashboard") return pathname === "/dashboard";
    if (pathname === item.href) return true;
    if (item.children?.some((c) => pathname.startsWith(c.href))) return true;
    return pathname.startsWith(item.href + "/");
  };

  const isChildActive = (href: string): boolean => pathname === href;

  return (
    <nav className="flex h-full flex-col gap-1" aria-label="Navegación principal">
      <div className="flex-1 space-y-0.5">
        {PRIMARY.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          const showChildren = active && item.children;
          return (
            <div key={item.href}>
              <Link
                href={withQs(item.href)}
                onClick={onNavigate}
                className={cn(
                  "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="flex-1 truncate">{item.label}</span>
                {item.children && (
                  <ChevronRight
                    className={cn(
                      "size-3.5 shrink-0 transition-transform",
                      active && "rotate-90",
                    )}
                    aria-hidden="true"
                  />
                )}
              </Link>
              {showChildren && (
                <div className="ml-7 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-3">
                  {item.children!.map((child) => (
                    <Link
                      key={child.href}
                      href={withQs(child.href)}
                      onClick={onNavigate}
                      className={cn(
                        "block rounded-md px-2 py-1.5 text-sm transition-colors",
                        isChildActive(child.href)
                          ? "font-medium text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      aria-current={isChildActive(child.href) ? "page" : undefined}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-sidebar-border pt-2">
        {SECONDARY.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <span className="flex-1 truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

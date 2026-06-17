"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import { ALL_NAV, type NavItem } from "./nav-items";

/**
 * Barra de navegación inferior vidriada (mobile <md). Reemplaza al
 * drawer hamburguesa: los 5 destinos siempre a un toque. Fija abajo,
 * con safe-area. Hit targets ≥ 44px.
 */
export function BottomNav() {
  const pathname = usePathname();
  const qs = useSearchParams().toString();
  const withQs = (href: string) => (qs ? `${href}?${qs}` : href);

  return (
    <nav
      aria-label="Navegación principal"
      className="glass fixed inset-x-3 bottom-3 z-40 flex items-stretch justify-around gap-1 rounded-[22px] p-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] md:hidden"
    >
      {ALL_NAV.map((item) => (
        <BottomLink
          key={item.href}
          item={item}
          href={withQs(item.href)}
          active={item.match(pathname)}
        />
      ))}
    </nav>
  );
}

function BottomLink({
  item,
  href,
  active,
}: {
  item: NavItem;
  href: string;
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      aria-label={item.label}
      className={cn(
        "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 text-[10px] font-semibold transition-colors",
        active
          ? "bg-[rgba(43,255,174,0.18)] text-foreground ring-1 ring-inset ring-[rgba(43,255,174,0.45)]"
          : "text-steel",
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
      <span className="leading-none">{item.label}</span>
    </Link>
  );
}

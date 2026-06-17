"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import { NAV_PRIMARY, NAV_ADMIN, type NavItem } from "./nav-items";

/**
 * Rail lateral vidriado (desktop ≥md). Logo arriba + 5 destinos con
 * icono y micro-label; el activo se resalta con una pastilla neón.
 * Sticky, preserva los query params al navegar.
 * En mobile se oculta — ahí navega la BottomNav.
 */
export function RailNav() {
  const pathname = usePathname();
  const qs = useSearchParams().toString();
  const withQs = (href: string) => (qs ? `${href}?${qs}` : href);

  return (
    <nav
      aria-label="Navegación principal"
      className="glass sticky top-4 hidden w-[92px] shrink-0 flex-col gap-1.5 self-start rounded-[26px] p-2.5 md:flex"
    >
      <Link
        href={withQs("/dashboard")}
        aria-label="Plasmart — inicio"
        className="neon-gradient mx-auto mb-2 mt-1 flex size-9 items-center justify-center rounded-xl text-base font-extrabold shadow-[0_6px_18px_rgba(43,255,174,0.4)]"
      >
        P
      </Link>

      <div className="flex flex-1 flex-col gap-1">
        {NAV_PRIMARY.map((item) => (
          <RailLink key={item.href} item={item} href={withQs(item.href)} active={item.match(pathname)} />
        ))}
      </div>

      <div className="mx-1.5 my-1 h-px bg-[rgba(43,255,174,0.13)]" />
      <RailLink item={NAV_ADMIN} href={NAV_ADMIN.href} active={NAV_ADMIN.match(pathname)} />
    </nav>
  );
}

function RailLink({
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
      className={cn(
        "relative flex flex-col items-center gap-1.5 rounded-2xl px-1 py-2.5 text-[10px] font-semibold transition-transform hover:-translate-y-px",
        active
          ? "bg-[rgba(43,255,174,0.18)] text-foreground ring-1 ring-inset ring-[rgba(43,255,174,0.45)]"
          : "text-steel hover:text-foreground",
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
      <span className="truncate leading-none">{item.label}</span>
    </Link>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { RiMenuLine, RiLogoutBoxRLine, RiSettings3Line } from "@remixicon/react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlasmartMark } from "@/components/plasmart-mark";
import { SidebarNav } from "./sidebar-nav";
import { TopNav } from "./top-nav";

interface Props {
  userEmail: string | null | undefined;
}

export function Topbar({ userEmail }: Props) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const initials = userEmail
    ? userEmail
        .split("@")[0]
        .split(/[._-]/)
        .map((p) => p[0]?.toUpperCase() ?? "")
        .join("")
        .slice(0, 2) || "U"
    : "U";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/80 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:gap-4 sm:px-6">
      {/* Mobile hamburger */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Abrir navegación"
          >
            <RiMenuLine className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="flex w-[80%] max-w-72 flex-col gap-0 overflow-hidden border-r border-sidebar-border bg-sidebar p-0"
        >
          <SheetHeader className="border-b border-sidebar-border px-4 py-4">
            <SheetTitle className="flex items-center gap-2.5">
              <PlasmartMark size={22} />
              <span className="flex flex-col text-left">
                <span className="text-sm font-bold tracking-[0.12em] text-foreground">
                  PLASMART
                </span>
                <span className="text-[9px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                  Reportería
                </span>
              </span>
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-3 py-3">
            <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Marca */}
      <Link
        href="/dashboard"
        className="flex items-center gap-2.5"
        aria-label="Plasmart Reportería — inicio"
      >
        <PlasmartMark size={24} />
        <span className="flex flex-col leading-none">
          <span className="text-sm font-bold tracking-[0.12em] text-foreground">
            PLASMART
          </span>
          <span className="mt-0.5 hidden text-[9px] font-medium uppercase tracking-[0.22em] text-muted-foreground sm:block">
            Reportería
          </span>
        </span>
      </Link>

      {/* Nav horizontal (desktop) */}
      <div className="ml-3 hidden md:flex lg:ml-6">
        <TopNav />
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full bg-muted text-xs font-semibold text-muted-foreground"
              aria-label="Menú de usuario"
            >
              {initials}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {userEmail && (
              <>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Sesión</span>
                    <span className="truncate text-sm font-medium">
                      {userEmail}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem asChild>
              <Link href="/admin" className="cursor-pointer">
                <RiSettings3Line className="size-4" />
                Admin
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <form action="/auth/logout" method="post">
              <DropdownMenuItem asChild>
                <button type="submit" className="w-full cursor-pointer">
                  <RiLogoutBoxRLine className="size-4" />
                  Cerrar sesión
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

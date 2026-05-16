"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, LogOut } from "lucide-react";

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
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:gap-4 sm:px-6">
      {/* Mobile hamburger */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Abrir navegación"
          >
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="flex w-[80%] max-w-72 flex-col gap-0 overflow-hidden p-0"
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

      {/* Marca (mobile sólo — desktop la marca vive en el sidebar) */}
      <Link
        href="/dashboard"
        className="flex items-center gap-2 md:hidden"
        aria-label="Plasmart Reportería"
      >
        <PlasmartMark size={22} />
        <span className="text-sm font-bold tracking-[0.1em] text-foreground">
          PLASMART
        </span>
      </Link>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
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
                    <span className="text-xs text-muted-foreground">
                      Sesión
                    </span>
                    <span className="truncate text-sm font-medium">
                      {userEmail}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
              </>
            )}
            <form action="/auth/logout" method="post">
              <DropdownMenuItem asChild>
                <button type="submit" className="w-full cursor-pointer">
                  <LogOut className="size-4" />
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

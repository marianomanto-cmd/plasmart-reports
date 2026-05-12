// Tremor cx [v0.0.0]
// Fuente: tremorlabs/tremor — src/utils/cx.ts (copy-paste textual).

import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cx(...args: ClassValue[]) {
  return twMerge(clsx(...args));
}

"use client";

import { usePathname } from "next/navigation";

/** Site header and season bar, hidden inside embeds so a host page only shows the army card. */
export function Chrome({ children }: { children: React.ReactNode }) {
  return usePathname().startsWith("/embed") ? null : <>{children}</>;
}

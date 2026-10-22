import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SeasonBar, SeasonBarStatic } from "@/components/SeasonBar";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<SeasonBarStatic />}>
        <SeasonBar />
      </Suspense>
      {children}
    </>
  );
}

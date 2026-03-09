"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LayoutList, Columns3 } from "lucide-react";

export function ViewToggle() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("tasks");
  const currentView = searchParams.get("view") || "board";

  const setView = (view: string) => {
    if (view === currentView) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", view);
    // Use history.pushState for an instant URL update without triggering a Next.js server roundtrip
    window.history.pushState(null, "", `${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex bg-muted/50 p-1 rounded-lg border border-border/50 items-center">
      <button
        title={t("listView") || "List"}
        className={`inline-flex items-center justify-center gap-2 rounded-md h-8 px-3 text-xs font-medium transition-all ${currentView === "list"
          ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
          }`}
        onClick={() => setView("list")}
      >
        <LayoutList className="h-4 w-4" />
        {t("listView") || "List"}
      </button>
      <button
        title={t("boardView") || "Board"}
        className={`inline-flex items-center justify-center gap-2 rounded-md h-8 px-3 text-xs font-medium transition-all ${currentView === "board"
          ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
          }`}
        onClick={() => setView("board")}
      >
        <Columns3 className="h-4 w-4" />
        {t("boardView") || "Board"}
      </button>
    </div>
  );
}

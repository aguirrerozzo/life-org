"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TASK_PRIORITIES, PRIORITY_COLORS } from "@/types";
import type { StatusData } from "@/types";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { ManageStatusesDialog } from "@/components/tasks/manage-statuses-dialog";

interface TaskFiltersProps {
  statuses: StatusData[];
  tags: { id: string; name: string; color: string | null }[];
  onStatusesUpdated: () => void;
}

export function TaskFilters({ statuses, tags, onStatusesUpdated }: TaskFiltersProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("tasks");
  const tPriority = useTranslations("priority");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [activeStatuses, setActiveStatuses] = useState<string[]>(searchParams.get("status")?.split(",").filter(Boolean) || []);
  const [activePriorities, setActivePriorities] = useState<string[]>(searchParams.get("priority")?.split(",").filter(Boolean) || []);
  const [activeTags, setActiveTags] = useState<string[]>(searchParams.get("tag")?.split(",").filter(Boolean) || []);

  const hasFilters = activeStatuses.length > 0 || activePriorities.length > 0 || activeTags.length > 0 || search;

  // Debounced effect to push state to URL query exactly once per user flurry
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (search) params.set("search", search);
      else params.delete("search");

      if (activeStatuses.length) params.set("status", activeStatuses.join(","));
      else params.delete("status");

      if (activePriorities.length) params.set("priority", activePriorities.join(","));
      else params.delete("priority");

      if (activeTags.length) params.set("tag", activeTags.join(","));
      else params.delete("tag");

      const newQueryString = params.toString();
      const currentQueryString = searchParams.toString();

      if (newQueryString !== currentQueryString) {
        const targetUrl = newQueryString ? `${pathname}?${newQueryString}` : pathname;
        startTransition(() => {
          router.push(targetUrl, { scroll: false });
        });
      }
    }, 400); // 400ms debounce to give them time to click multiple toggles
    return () => clearTimeout(timer);
  }, [search, activeStatuses, activePriorities, activeTags, searchParams, router, pathname]);

  function toggleStatus(status: string) {
    setActiveStatuses((prev) => {
      const current = new Set(prev);
      if (current.has(status)) current.delete(status);
      else current.add(status);
      return Array.from(current);
    });
  }

  function togglePriority(priority: string) {
    setActivePriorities((prev) => {
      const current = new Set(prev);
      if (current.has(priority)) current.delete(priority);
      else current.add(priority);
      return Array.from(current);
    });
  }

  function toggleTag(tagId: string) {
    setActiveTags((prev) => {
      const current = new Set(prev);
      if (current.has(tagId)) current.delete(tagId);
      else current.add(tagId);
      return Array.from(current);
    });
  }

  function clearFilters() {
    setSearch("");
    setActiveStatuses([]);
    setActivePriorities([]);
    setActiveTags([]);
  }

  return (
    <Accordion multiple={true} className="w-full">
      <AccordionItem value="filters-root" className="border-b-0 bg-card rounded-md border border-border/50">
        <AccordionTrigger className="px-3 py-2.5 hover:no-underline flex-row-reverse justify-end gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground w-full">
          <span>{t("filters") || "Filtros"}</span>
          {isPending && <Loader2 className="h-3 w-3 animate-spin text-primary ml-auto" />}
        </AccordionTrigger>
        <AccordionContent className="px-3 pb-3 pt-1">
          <div className="space-y-4">

            {/* Search Bar inside filters */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("search") || "Search..."}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-sm border-border/50"
                />
              </div>
              {hasFilters && (
                <button onClick={clearFilters} className="inline-flex items-center text-muted-foreground hover:text-foreground shrink-0 text-xs gap-1 pr-1">
                  <X className="h-3 w-3" />
                  {t("clearFilters")}
                </button>
              )}
            </div>

            {/* Statuses Column */}
            <div className="pt-2 border-t border-border/40 mt-4">
              <div className="py-2 mb-1 text-[10px] uppercase font-semibold text-muted-foreground/70">
                {t("status")}
              </div>
              <div className="flex flex-col gap-1.5">
                {statuses.map((status) => {
                  const isActive = activeStatuses.includes(status.id);
                  return (
                    <button
                      key={status.id}
                      onClick={() => toggleStatus(status.id)}
                      className="inline-flex items-center justify-start text-left gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all border"
                      style={isActive ? { backgroundColor: `${status.color}15`, color: status.color, borderColor: `${status.color}30` } : { borderColor: "transparent", color: "hsl(var(--muted-foreground))", backgroundColor: "hsl(var(--muted)/0.3)" }}
                    >
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: status.color }} />
                      {locale === "es" ? status.nameEs : status.nameEn}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 pt-3 border-t border-border/40">
                <ManageStatusesDialog statuses={statuses} onUpdated={onStatusesUpdated} />
              </div>
            </div>

            {/* Priorities Column */}
            <div className="pt-2 border-t border-border/40 mt-4">
              <div className="py-2 mb-1 text-[10px] uppercase font-semibold text-muted-foreground/70">
                {t("priority")}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TASK_PRIORITIES.map((priority) => {
                  const isActive = activePriorities.includes(priority);
                  return (
                    <button
                      key={priority}
                      onClick={() => togglePriority(priority)}
                      className={`inline-flex items-center justify-center rounded-md flex-1 min-w-[45%] px-2.5 py-1.5 text-xs font-medium transition-all border ${isActive
                        ? `${PRIORITY_COLORS[priority]} border-transparent shadow-sm ring-1 ring-border/50`
                        : "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted/80"
                        }`}
                    >
                      {tPriority(priority)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tags Column */}
            {tags.length > 0 && (
              <div className="pt-2 border-t border-border/40 mt-4">
                <div className="py-2 mb-1 text-[10px] uppercase font-semibold text-muted-foreground/70">
                  {t("tags")}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => {
                    const isActive = activeTags.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(tag.id)}
                        className={`inline-flex items-center justify-center rounded-md px-2.5 py-1 text-xs font-medium transition-all border ${isActive
                          ? "bg-primary text-primary-foreground border-transparent shadow-sm ring-1 ring-border/50"
                          : "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted/80"
                          }`}
                      >
                        <span className="truncate max-w-[120px]">#{tag.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

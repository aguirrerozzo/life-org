"use client";

import { useState, useEffect, startTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { AppShell } from "@/components/layout/app-shell";
import { TaskBoardView } from "@/components/tasks/task-board-view";
import { TaskListView } from "@/components/tasks/task-list-view";
import { TaskFilters } from "@/components/tasks/task-filters";
import { TaskSummary } from "@/components/tasks/task-summary";
import { ViewToggle } from "@/components/tasks/view-toggle";
import { TaskDialog } from "@/components/tasks/task-dialog";
import type { TaskWithRelations, StatusData } from "@/types";

interface TasksPageClientProps {
  initialTasks: TaskWithRelations[];
  statuses: StatusData[];
  tags: { id: string; name: string; color: string | null }[];
}

export function TasksPageClient({ initialTasks, statuses, tags }: TasksPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const t = useTranslations("tasks");

  const view = searchParams.get("view") || "board";

  const [activeTaskId, setActiveTaskId] = useState<string | null>(searchParams.get("task"));
  const [createOpen, setCreateOpen] = useState(false);

  // Sync if back/forward button pressed
  useEffect(() => {
    setActiveTaskId(searchParams.get("task"));
  }, [searchParams]);

  const selectedTask = activeTaskId
    ? initialTasks.find((t) => t.id === activeTaskId) || null
    : null;

  function openTask(taskId: string) {
    setActiveTaskId(taskId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("task", taskId);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function closeTask() {
    setActiveTaskId(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("task");

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  }

  function refresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <AppShell sidebarSlot={
      <div className="flex flex-col gap-6 w-full">
        <TaskSummary tasks={initialTasks} />
        <TaskFilters statuses={statuses} tags={tags} onStatusesUpdated={refresh} />
      </div>
    }>
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        <div className="border-b border-border/50 px-4 py-3 space-y-3 bg-card/50">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold tracking-tight">{t("title")}</h1>
            <div className="flex items-center gap-2">
              <ViewToggle />
              <button
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center justify-center rounded-md h-8 px-3 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <span className="flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                  {t("newTask")}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 bg-background">
          {initialTasks.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>{t("noTasks")}</p>
            </div>
          ) : view === "board" ? (
            <TaskBoardView
              initialTasks={initialTasks}
              onTaskClick={openTask}
              statuses={statuses}
              onTaskUpdated={refresh}
            />
          ) : (
            <TaskListView tasks={initialTasks} onTaskClick={openTask} statuses={statuses} />
          )}
        </div>
      </div>

      {/* Detail Panel */}
      <TaskDialog
        open={!!selectedTask || createOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeTask();
            setCreateOpen(false);
          }
        }}
        mode={createOpen ? "create" : "view"}
        task={selectedTask}
        statuses={statuses}
        onSaved={refresh}
        onDeleted={refresh}
      />
    </AppShell>
  );
}

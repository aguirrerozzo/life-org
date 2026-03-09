"use client";

import { useTranslations, useLocale } from "next-intl";
import { Calendar, MessageSquare, Repeat, Flag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TagBadge } from "@/components/tags/tag-badge";
import { PRIORITY_COLORS } from "@/types";
import type { TaskWithRelations, StatusData } from "@/types";

interface TaskListViewProps {
  tasks: TaskWithRelations[];
  statuses: StatusData[];
  onTaskClick: (taskId: string) => void;
}

export function TaskListView({ tasks, statuses, onTaskClick }: TaskListViewProps) {
  const tPriority = useTranslations("priority");
  const t = useTranslations("tasks");
  const locale = useLocale();

  const PRIORITY_TEXT_COLORS: Record<string, string> = {
    LOW: "text-muted-foreground",
    MEDIUM: "text-blue-500",
    HIGH: "text-orange-500",
    URGENT: "text-red-500",
  };

  // Create a fast lookup map for statuses
  const statusMap = statuses.reduce((acc, s) => {
    acc[s.id] = s;
    return acc;
  }, {} as Record<string, StatusData>);

  if (tasks.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      {/* Table header */}
      <div className="hidden md:grid md:grid-cols-[1fr_120px_100px_120px_140px] gap-3 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border/50">
        <span>{t("taskTitle")}</span>
        <span>{t("status")}</span>
        <span>{t("priority")}</span>
        <span>{t("dueDate")}</span>
        <span>{t("tags")}</span>
      </div>

      {/* Table rows */}
      <div className="divide-y divide-border/30">
        {tasks.map((task) => {
          const taskStatus = statusMap[task.statusId];
          const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.statusId !== statuses[statuses.length - 1]?.id;

          return (
            <div
              key={task.id}
              onClick={() => onTaskClick(task.id)}
              className="group cursor-pointer hover:bg-accent/50 transition-colors"
            >
              {/* Desktop row */}
              <div className="hidden md:grid md:grid-cols-[1fr_120px_100px_120px_140px] gap-3 px-4 py-3 items-center">
                {/* Title */}
                <div className="flex items-center gap-2 min-w-0">
                  {task.isRecurring && <Repeat className="h-3.5 w-3.5 text-primary/70 flex-shrink-0" />}
                  <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                    {task.title}
                  </span>
                  {task.comments?.length > 0 && (
                    <span className="flex items-center gap-0.5 text-muted-foreground flex-shrink-0">
                      <MessageSquare className="h-3 w-3" />
                      <span className="text-[10px]">{task.comments.length}</span>
                    </span>
                  )}
                </div>

                {/* Status */}
                <div>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-0 font-medium" style={{ backgroundColor: `${taskStatus?.color}20`, color: taskStatus?.color }}>
                    {locale === "es" ? taskStatus?.nameEs : taskStatus?.nameEn}
                  </Badge>
                </div>

                {/* Priority */}
                <div>
                  <div className={`flex items-center gap-1 text-[10px] font-medium ${PRIORITY_TEXT_COLORS[task.priority]}`}>
                    <Flag className="h-3 w-3" />
                    {tPriority(task.priority)}
                  </div>
                </div>

                {/* Due Date */}
                <div>
                  {task.dueDate ? (
                    <span className={`flex items-center gap-1 text-xs ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                      <Calendar className="h-3 w-3" />
                      {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">--</span>
                  )}
                </div>

                {/* Tags */}
                <div className="flex items-center gap-1 flex-wrap overflow-hidden">
                  {task.taskTags?.slice(0, 3).map(({ tag }) => (
                    <TagBadge key={tag.id} name={tag.name} color={tag.color} />
                  ))}
                  {(task.taskTags?.length || 0) > 3 && (
                    <span className="text-[10px] text-muted-foreground">+{task.taskTags.length - 3}</span>
                  )}
                </div>
              </div>

              {/* Mobile row */}
              <div className="md:hidden px-4 py-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  {task.isRecurring && <Repeat className="h-3.5 w-3.5 text-primary/70 flex-shrink-0" />}
                  <span className="text-sm font-medium flex-1 truncate">{task.title}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-0 font-medium flex-shrink-0" style={{ backgroundColor: `${taskStatus?.color}20`, color: taskStatus?.color }}>
                    {locale === "es" ? taskStatus?.nameEs : taskStatus?.nameEn}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className={`flex items-center gap-1 text-[10px] pr-1.5 border-r border-border/50 font-medium ${PRIORITY_TEXT_COLORS[task.priority]}`}>
                    <Flag className="h-3 w-3" />
                  </div>
                  {task.dueDate && (
                    <span className={`flex items-center gap-1 ${isOverdue ? "text-destructive" : ""}`}>
                      <Calendar className="h-3 w-3" />
                      {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  )}
                  {task.taskTags?.slice(0, 2).map(({ tag }) => (
                    <TagBadge key={tag.id} name={tag.name} color={tag.color} />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

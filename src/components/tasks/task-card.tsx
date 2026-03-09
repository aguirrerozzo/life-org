"use client";

import { useTranslations } from "next-intl";
import { Calendar, MessageSquare, Repeat, Flag, Bell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { TagBadge } from "@/components/tags/tag-badge";
import { PRIORITY_COLORS } from "@/types";
import type { TaskWithRelations } from "@/types";

interface TaskCardProps {
  task: TaskWithRelations;
  isDragging?: boolean;
  onClick?: () => void;
}

const PRIORITY_INDICATOR: Record<string, string> = {
  LOW: "bg-gray-500 dark:bg-gray-400",
  MEDIUM: "bg-blue-500 dark:bg-blue-400",
  HIGH: "bg-orange-500 dark:bg-orange-400",
  URGENT: "bg-red-500 dark:bg-red-400",
};

const PRIORITY_TEXT_COLORS: Record<string, string> = {
  LOW: "text-muted-foreground",
  MEDIUM: "text-blue-500",
  HIGH: "text-orange-500",
  URGENT: "text-red-500",
};

export function TaskCard({ task, isDragging, onClick }: TaskCardProps) {
  const t = useTranslations("priority");

  const isOverdue = task.dueDate && new Date(task.dueDate).toISOString().split("T")[0] < new Date().toISOString().split("T")[0] && task.statusRel?.nameEn?.toUpperCase() !== "DONE";

  return (
    <Card
      className={`p-3 cursor-pointer transition-all duration-200 relative overflow-hidden ${isDragging ? "shadow-lg ring-2 ring-primary/30 rotate-1 scale-[1.02]" : "hover:shadow-md"
        } ${isOverdue ? "border-destructive/50 bg-destructive/5" : "border-border/60 hover:border-primary/30"}`}
      onClick={onClick}
    >
      {isOverdue && (
        <span className="absolute top-0 right-0 flex h-5 w-5 -mt-1 -mr-1">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-80"></span>
          <span className="relative inline-flex rounded-full h-5 w-5 bg-destructive"></span>
        </span>
      )}
      <div className="space-y-2.5">
        <div className="flex items-start gap-2">
          <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${PRIORITY_INDICATOR[task.priority]}`} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-1">
              <div className="flex items-start gap-1.5">
                {task.isRecurring && <Repeat className="h-3.5 w-3.5 text-primary/70 mt-0.5 flex-shrink-0" />}
                <p className="font-medium text-sm leading-snug line-clamp-2">{task.title}</p>
              </div>
              {task.isPayment && task.paymentValue !== null && (
                <div className="font-semibold text-primary/90 text-[13px] tracking-tight">
                  ${new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(task.paymentValue)}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap pl-3">
          <div className={`flex items-center gap-1 text-[10px] font-medium pr-1.5 border-r border-border/50 ${PRIORITY_TEXT_COLORS[task.priority]}`}>
            <Flag className="h-3 w-3" />
            {t(task.priority)}
          </div>

          {task.taskTags?.map(({ tag }) => (
            <TagBadge key={tag.id} name={tag.name} color={tag.color} />
          ))}
        </div>

        <div className="flex flex-col items-start gap-1 pl-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground w-full">
            <div className="flex items-center gap-3">
              {task.dueDate && (
                <span className={`flex items-center gap-1 ${isOverdue ? "text-destructive font-bold" : ""}`}>
                  <Calendar className="h-3 w-3" />
                  {new Date(task.dueDate).toLocaleDateString()}
                </span>
              )}
              {task.reminderTimes && task.reminderTimes.length > 0 && (
                <span className="flex items-center gap-1 text-primary/80 font-medium">
                  <Bell className="h-3 w-3" />
                  {task.reminderTimes.join(", ")}
                </span>
              )}
              {task.comments?.length > 0 && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {task.comments.length}
                </span>
              )}
            </div>
          </div>
          {isOverdue && (
            <span className="animate-pulse text-[10px] font-extrabold text-destructive tracking-widest uppercase mt-0.5">
              Vencida
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

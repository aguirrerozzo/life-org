"use client";

import { useState, useCallback, useEffect } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { useTranslations, useLocale } from "next-intl";
import { AlertCircle, Loader2 } from "lucide-react";
import { TaskBoardColumn } from "./task-board-column";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { TaskWithRelations, StatusData } from "@/types";

interface TaskBoardViewProps {
  initialTasks: TaskWithRelations[];
  statuses: StatusData[];
  onTaskClick: (taskId: string) => void;
  onTaskUpdated?: () => void;
}

export function TaskBoardView({ initialTasks, statuses, onTaskClick, onTaskUpdated }: TaskBoardViewProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const locale = useLocale();
  const t = useTranslations("tasks");

  // State for Reason Prompt Dialog
  const [promptData, setPromptData] = useState<{
    taskId: string;
    destStatusId: string;
    sourceStatusId: string;
    sourceIndex: number;
    destIndex: number;
  } | null>(null);
  const [reasonText, setReasonText] = useState("");
  const [isSubmittingReason, setIsSubmittingReason] = useState(false);

  // Sync state if initialTasks prop changes from server (e.g. from Filters changing)
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const columns = statuses.reduce(
    (acc, status) => {
      acc[status.id] = [];
      return acc;
    },
    {} as Record<string, TaskWithRelations[]>
  );

  const doneStatusId = statuses[statuses.length - 1]?.id;

  tasks.forEach((t) => {
    if (columns[t.statusId]) {
      columns[t.statusId].push(t);
    }
  });

  const todayStr = new Date().toISOString().split("T")[0];

  Object.keys(columns).forEach(key => {
    // Top level overdue sorting
    columns[key].sort((a, b) => {
      const aIsOverdue = a.dueDate && a.statusId !== doneStatusId && a.dueDate.split("T")[0] < todayStr;
      const bIsOverdue = b.dueDate && b.statusId !== doneStatusId && b.dueDate.split("T")[0] < todayStr;

      if (aIsOverdue && !bIsOverdue) return -1;
      if (!aIsOverdue && bIsOverdue) return 1;
      return a.order - b.order;
    });
  });

  const onDragEnd = useCallback(
    async (result: DropResult) => {
      const { destination, source, draggableId } = result;

      if (!destination) return;
      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      )
        return;

      const sourceDraggableId = source.droppableId;
      const destStatusId = destination.droppableId;

      const sourceItems = [...columns[sourceDraggableId]];
      const destItems =
        sourceDraggableId === destStatusId ? sourceItems : [...columns[destStatusId]];

      const [movedTask] = sourceItems.splice(source.index, 1);

      // Check if destination requires a reason
      const destStatus = statuses.find(s => s.id === destStatusId);
      if (destStatus?.requiresReason) {
        setPromptData({
          taskId: movedTask.id,
          destStatusId,
          sourceStatusId: sourceDraggableId,
          sourceIndex: source.index,
          destIndex: destination.index
        });
        return; // Pause the drop operation until reason is submitted
      }

      await executeDrop(movedTask, sourceDraggableId, destStatusId, source.index, destination.index);
    },
    [columns, statuses]
  );

  async function executeDrop(movedTask: TaskWithRelations, sourceDraggableId: string, destStatusId: string, sourceIndex: number, destIndex: number, commentText?: string) {
    const sourceItems = [...columns[sourceDraggableId]];
    const destItems =
      sourceDraggableId === destStatusId ? sourceItems : [...columns[destStatusId]];

    // Remove from source arrays just for payload building (optimistic update handles UI separately)
    sourceItems.splice(sourceIndex, 1);

    const realSourceStatusId = movedTask.statusId;
    const updatedTask = { ...movedTask, statusId: destStatusId };

    if (sourceDraggableId === destStatusId) {
      sourceItems.splice(destIndex, 0, updatedTask);
    } else {
      destItems.splice(destIndex, 0, updatedTask);
    }

    // Re-map the tasks based on the new correctly ordered arrays to fix visual bouncing
    const newOrders = new Map<string, number>();
    sourceItems.forEach((t, i) => newOrders.set(t.id, i));
    if (sourceDraggableId !== destStatusId) {
      destItems.forEach((t, i) => newOrders.set(t.id, i));
    }

    // Optimistic update
    const updatedTasks = tasks.map((t) => {
      if (t.id === movedTask.id) {
        return { ...updatedTask, order: newOrders.get(movedTask.id) ?? updatedTask.order };
      }
      if (newOrders.has(t.id)) {
        return { ...t, order: newOrders.get(t.id) as number };
      }
      return t;
    });
    setTasks(updatedTasks);

    // Build reorder payload
    let itemsToUpdate = [];

    itemsToUpdate = [
      ...sourceItems.map((t, i) => ({ id: t.id, statusId: realSourceStatusId, order: i })),
      ...(realSourceStatusId !== destStatusId
        ? destItems.map((t, i) => ({ id: t.id, statusId: destStatusId, order: i }))
        : []),
    ];

    const promises: Promise<Response>[] = [
      fetch("/api/tasks/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsToUpdate }),
      })
    ];

    if (commentText) {
      promises.push(
        fetch(`/api/tasks/${movedTask.id}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: commentText }),
        })
      );
    }

    await Promise.all(promises);
    onTaskUpdated?.();
  }

  async function handleReasonSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!promptData || !reasonText.trim()) return;

    setIsSubmittingReason(true);
    const movedTask = tasks.find(t => t.id === promptData.taskId);

    if (movedTask) {
      await executeDrop(
        movedTask,
        promptData.sourceStatusId,
        promptData.destStatusId,
        promptData.sourceIndex,
        promptData.destIndex,
        reasonText.trim()
      );
    }

    setPromptData(null);
    setReasonText("");
    setIsSubmittingReason(false);
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 h-full">
        {/* Real User Statuses */}
        {statuses.map((status) => (
          <TaskBoardColumn
            key={status.id}
            status={status}
            label={locale === "es" ? status.nameEs : status.nameEn}
            tasks={columns[status.id] || []}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>

      <Dialog open={!!promptData} onOpenChange={(v) => {
        if (!v && !isSubmittingReason) {
          setPromptData(null);
          setReasonText("");
        }
      }}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleReasonSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                {t("requiresReason")}
              </DialogTitle>
              <DialogDescription>
                You are moving this task to a status that requires a written justification. Please provide a reason below.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <Label htmlFor="reason">Reason / Justification</Label>
              <Textarea
                id="reason"
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder="Why is this task being moved here?"
                required
                className="min-h-[100px]"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPromptData(null)} disabled={isSubmittingReason}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={!reasonText.trim() || isSubmittingReason}>
                {isSubmittingReason ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit & Move"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DragDropContext>
  );
}

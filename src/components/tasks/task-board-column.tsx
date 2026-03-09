"use client";

import { Droppable, Draggable } from "@hello-pangea/dnd";
import { TaskCard } from "./task-card";
import type { TaskWithRelations, StatusData } from "@/types";

interface TaskBoardColumnProps {
  status: StatusData;
  label: string;
  tasks: TaskWithRelations[];
  onTaskClick: (taskId: string) => void;
  isOverdueColumn?: boolean;
}

export function TaskBoardColumn({ status, label, tasks, onTaskClick, isOverdueColumn }: TaskBoardColumnProps) {
  return (
    <div className={`flex-shrink-0 w-72 rounded-xl flex flex-col max-h-full border ${isOverdueColumn ? "bg-destructive/5 border-destructive/30" : "bg-muted/30 dark:bg-muted/20 border-border/40"}`}>
      <div className="flex items-center justify-between p-3 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: isOverdueColumn ? "var(--destructive)" : status.color }} />
          <h3 className={`font-semibold text-sm ${isOverdueColumn ? "text-destructive uppercase tracking-wider" : ""}`}>{label}</h3>
        </div>
        <span className={`text-xs px-2 py-0.5 font-mono rounded-full ${isOverdueColumn ? "bg-destructive/20 text-destructive font-bold" : "bg-muted dark:bg-muted/60 text-muted-foreground"}`}>
          {tasks.length}
        </span>
      </div>

      <Droppable droppableId={status.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 overflow-y-auto px-2.5 pb-3 space-y-2 min-h-[100px] transition-colors duration-200 rounded-b-xl ${snapshot.isDraggingOver ? "bg-primary/5" : ""
              }`}
          >
            {tasks.map((task, index) => (
              <Draggable key={task.id} draggableId={task.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    onClick={() => onTaskClick(task.id)}
                  >
                    <TaskCard
                      task={task}
                      isDragging={snapshot.isDragging}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import type { TaskWithRelations } from "@/types";
import { useTranslations } from "next-intl";

interface TaskRemindersWatcherProps {
    tasks: TaskWithRelations[];
}

export function TaskRemindersWatcher({ tasks }: TaskRemindersWatcherProps) {
    const t = useTranslations("tasks");
    const notifiedReminders = useRef<Set<string>>(new Set());

    useEffect(() => {
        // Check every 30 seconds to not miss the minute mark
        const interval = setInterval(() => {
            const now = new Date();
            // Format as HH:mm to match the time picker strings
            const currentHour = now.getHours().toString().padStart(2, "0");
            const currentMinute = now.getMinutes().toString().padStart(2, "0");
            const currentTimeString = `${currentHour}:${currentMinute}`;

            const todayDateString = now.toISOString().split("T")[0]; // YYYY-MM-DD
            const dayOfWeek = now.getDay(); // 0-6
            const dayOfMonth = now.getDate(); // 1-31
            const monthOfYear = now.getMonth() + 1; // 1-12

            tasks.forEach((task) => {
                if (!task.reminderTimes || task.reminderTimes.length === 0) return;

                // Determine if task applies today
                let appliesToday = false;

                if (task.isRecurring) {
                    if (task.recurrenceType === "DAILY") {
                        appliesToday = true;
                    } else if (task.recurrenceType === "WEEKLY" && task.recurrenceDaysOfWeek.includes(dayOfWeek)) {
                        appliesToday = true;
                    } else if (task.recurrenceType === "MONTHLY" && task.recurrenceDay === dayOfMonth) {
                        appliesToday = true;
                    } else if (task.recurrenceType === "YEARLY" && task.recurrenceDay === dayOfMonth && task.recurrenceMonth === monthOfYear) {
                        appliesToday = true;
                    }
                } else {
                    // Non-recurring task - check if due date is today
                    if (task.dueDate && task.dueDate.startsWith(todayDateString)) {
                        appliesToday = true;
                    }
                }

                if (appliesToday && task.reminderTimes.includes(currentTimeString)) {
                    // Generate a unique key so we only fire it once per minute per task
                    const notificationKey = `${task.id}-${currentTimeString}`;
                    if (!notifiedReminders.current.has(notificationKey)) {
                        notifiedReminders.current.add(notificationKey);

                        toast.info(task.title, {
                            description: `Recordatorio a las ${currentTimeString}`,
                            icon: <Bell className="h-4 w-4" />,
                            duration: 8000,
                        });
                    }
                }
            });

            // Clean up old keys if it gets too large (e.g. at midnight or periodcially)
            if (notifiedReminders.current.size > 1000) {
                notifiedReminders.current.clear();
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [tasks, t]);

    return null; // Invisible background watcher
}

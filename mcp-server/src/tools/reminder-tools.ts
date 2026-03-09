import { z } from "zod";
import { prisma, getUserId } from "../db.js";

const MONTH_NAMES_ES: Record<number, string> = {
  1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
  5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
  9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre",
};

const MONTH_NAMES_EN: Record<number, string> = {
  1: "January", 2: "February", 3: "March", 4: "April",
  5: "May", 6: "June", 7: "July", 8: "August",
  9: "September", 10: "October", 11: "November", 12: "December",
};

function expandTemplate(template: string, day: number, month: number, year: number): string {
  return template
    .replace("{day}", String(day))
    .replace("{month}", MONTH_NAMES_ES[month] || MONTH_NAMES_EN[month] || String(month))
    .replace("{month_en}", MONTH_NAMES_EN[month] || String(month))
    .replace("{year}", String(year));
}

export const getRemindersSchema = z.object({
  includeOverdue: z.boolean().optional().default(true),
  daysAhead: z.number().optional().default(7),
});

export async function getReminders(params: z.infer<typeof getRemindersSchema>) {
  const userId = await getUserId();
  const now = new Date();
  const futureDate = new Date(now);
  futureDate.setDate(futureDate.getDate() + params.daysAhead);

  // Get overdue tasks
  const overdue = params.includeOverdue
    ? await prisma.task.findMany({
      where: {
        userId,
        statusRel: { nameEn: { not: "Done" } }, // Fallback to check nameEn instead of enum
        dueDate: { lt: now },
      },
      include: { taskTags: { include: { tag: true } }, statusRel: true },
      orderBy: { dueDate: "asc" },
    })
    : [];

  // Get upcoming tasks (due within daysAhead)
  const upcoming = await prisma.task.findMany({
    where: {
      userId,
      statusRel: { nameEn: { not: "Done" } },
      dueDate: { gte: now, lte: futureDate },
    },
    include: { taskTags: { include: { tag: true } }, statusRel: true },
    orderBy: { dueDate: "asc" },
  });

  // Get all incomplete tasks without due date
  const noDueDate = await prisma.task.findMany({
    where: {
      userId,
      statusRel: { nameEn: { not: "Done" } },
      dueDate: null,
    },
    include: { taskTags: { include: { tag: true } }, statusRel: true },
    orderBy: { priority: "desc" },
  });

  const formatTask = (t: typeof overdue[0]) => ({
    id: t.id,
    title: t.title,
    status: t.statusRel?.nameEn,
    priority: t.priority,
    dueDate: t.dueDate?.toISOString().split("T")[0] ?? null,
    tags: t.taskTags.map((tt) => tt.tag.name),
    isRecurring: t.isRecurring,
  });

  return {
    overdue: overdue.map(formatTask),
    upcoming: upcoming.map(formatTask),
    pendingNoDueDate: noDueDate.map(formatTask),
    summary: {
      overdueCount: overdue.length,
      upcomingCount: upcoming.length,
      pendingCount: noDueDate.length,
    },
  };
}

export const generateRecurringTasksSchema = z.object({
  month: z.number().min(1).max(12).optional(),
  year: z.number().optional(),
});

/**
 * Generate recurring tasks for a given month.
 * - Finds all recurring task templates
 * - For each, checks if a task for that month already exists (based on title pattern)
 * - If not, creates a new task with the expanded title and due date
 * - If previous month's task is not DONE, it remains (duplicates as expected)
 */
export async function generateRecurringTasks(params: z.infer<typeof generateRecurringTasksSchema>) {
  const userId = await getUserId();
  const now = new Date();
  const targetMonth = params.month ?? now.getMonth() + 1;
  const targetYear = params.year ?? now.getFullYear();

  // Find all recurring task templates for this user
  const templates = await prisma.task.findMany({
    where: {
      userId,
      isRecurring: true,
      templateTitle: { not: null },
    },
    include: { taskTags: { include: { tag: true } } },
  });

  const created: { id: string; title: string }[] = [];
  const skipped: string[] = [];

  for (const template of templates) {
    if (!template.templateTitle) continue;

    const occurrences: Date[] = [];
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();

    if (template.recurrenceType === "YEARLY") {
      if (template.recurrenceMonth === targetMonth && template.recurrenceDay) {
        occurrences.push(new Date(targetYear, targetMonth - 1, Math.min(template.recurrenceDay, daysInMonth)));
      }
    } else if (template.recurrenceType === "MONTHLY") {
      const day = template.recurrenceDay || 1;
      occurrences.push(new Date(targetYear, targetMonth - 1, Math.min(day, daysInMonth)));
    } else if (template.recurrenceType === "WEEKLY" || template.recurrenceType === "DAILY") {
      const allowedDays = template.recurrenceDaysOfWeek || [];
      if (allowedDays.length > 0) {
        for (let d = 1; d <= daysInMonth; d++) {
          const date = new Date(targetYear, targetMonth - 1, d);
          if (allowedDays.includes(date.getDay())) {
            occurrences.push(date);
          }
        }
      }
    } else {
      // Fallback for legacy items without a recurrenceType but with a day
      const day = template.recurrenceDay || 1;
      occurrences.push(new Date(targetYear, targetMonth - 1, Math.min(day, daysInMonth)));
    }

    const firstStatus = await prisma.status.findFirst({ where: { userId }, orderBy: { order: "asc" } });

    for (const dueDate of occurrences) {
      const expandedTitle = expandTemplate(template.templateTitle, dueDate.getDate(), targetMonth, targetYear);

      // Check if this task already exists for this date
      const existing = await prisma.task.findFirst({
        where: {
          userId,
          title: expandedTitle,
          dueDate: {
            gte: new Date(dueDate.setHours(0, 0, 0, 0)),
            lt: new Date(dueDate.setHours(23, 59, 59, 999))
          }
        },
      });

      if (existing) {
        skipped.push(expandedTitle);
        continue;
      }

      // Create the new task instance
      const maxOrder = await prisma.task.aggregate({
        where: { userId, statusId: firstStatus?.id ?? "unknown" },
        _max: { order: true },
      });

      const newTask = await prisma.task.create({
        data: {
          title: expandedTitle,
          description: template.description,
          statusId: firstStatus?.id ?? "unknown",
          priority: template.priority,
          dueDate,
          order: (maxOrder._max.order ?? -1) + 1,
          isRecurring: false, // Generated tasks are NOT the template, so they don't recur themselves
          userId,
        },
      });

      // Copy tags from template
      for (const tt of template.taskTags) {
        await prisma.taskTag.create({
          data: { taskId: newTask.id, tagId: tt.tagId },
        });
      }

      created.push({ id: newTask.id, title: expandedTitle });
    }
  }

  return {
    created,
    skipped,
    month: targetMonth,
    year: targetYear,
  };
}

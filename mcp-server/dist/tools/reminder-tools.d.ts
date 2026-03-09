import { z } from "zod";
export declare const getRemindersSchema: z.ZodObject<{
    includeOverdue: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    daysAhead: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    includeOverdue: boolean;
    daysAhead: number;
}, {
    includeOverdue?: boolean | undefined;
    daysAhead?: number | undefined;
}>;
export declare function getReminders(params: z.infer<typeof getRemindersSchema>): Promise<{
    overdue: {
        id: string;
        title: string;
        status: string;
        priority: import("@prisma/client").$Enums.Priority;
        dueDate: string | null;
        tags: string[];
        isRecurring: boolean;
    }[];
    upcoming: {
        id: string;
        title: string;
        status: string;
        priority: import("@prisma/client").$Enums.Priority;
        dueDate: string | null;
        tags: string[];
        isRecurring: boolean;
    }[];
    pendingNoDueDate: {
        id: string;
        title: string;
        status: string;
        priority: import("@prisma/client").$Enums.Priority;
        dueDate: string | null;
        tags: string[];
        isRecurring: boolean;
    }[];
    summary: {
        overdueCount: number;
        upcomingCount: number;
        pendingCount: number;
    };
}>;
export declare const generateRecurringTasksSchema: z.ZodObject<{
    month: z.ZodOptional<z.ZodNumber>;
    year: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    month?: number | undefined;
    year?: number | undefined;
}, {
    month?: number | undefined;
    year?: number | undefined;
}>;
/**
 * Generate recurring tasks for a given month.
 * - Finds all recurring task templates
 * - For each, checks if a task for that month already exists (based on title pattern)
 * - If not, creates a new task with the expanded title and due date
 * - If previous month's task is not DONE, it remains (duplicates as expected)
 */
export declare function generateRecurringTasks(params: z.infer<typeof generateRecurringTasksSchema>): Promise<{
    created: {
        id: string;
        title: string;
    }[];
    skipped: string[];
    month: number;
    year: number;
}>;

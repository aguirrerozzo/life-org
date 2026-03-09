import { z } from "zod";
export declare const listTasksSchema: z.ZodObject<{
    statusName: z.ZodOptional<z.ZodString>;
    priority: z.ZodOptional<z.ZodEnum<["LOW", "MEDIUM", "HIGH", "URGENT"]>>;
    dueDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    statusName?: string | undefined;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | undefined;
    dueDate?: string | undefined;
}, {
    statusName?: string | undefined;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | undefined;
    dueDate?: string | undefined;
}>;
export declare function listTasks(params: z.infer<typeof listTasksSchema>): Promise<{
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: import("@prisma/client").$Enums.Priority;
    dueDate: string | null;
    isRecurring: boolean;
    recurrenceDay: number | null;
    templateTitle: string | null;
    createdAt: string;
    updatedAt: string;
}[]>;
export declare const getTaskSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare function getTask(params: z.infer<typeof getTaskSchema>): Promise<{
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: import("@prisma/client").$Enums.Priority;
    dueDate: string | null;
    isRecurring: boolean;
    recurrenceDay: number | null;
    templateTitle: string | null;
    comments: {
        id: string;
        text: string;
        author: string;
        createdAt: string;
    }[];
    createdAt: string;
    updatedAt: string;
}>;
export declare const createTaskSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    statusName: z.ZodDefault<z.ZodString>;
    priority: z.ZodDefault<z.ZodEnum<["LOW", "MEDIUM", "HIGH", "URGENT"]>>;
    dueDate: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    isRecurring: z.ZodOptional<z.ZodBoolean>;
    recurrenceDay: z.ZodOptional<z.ZodNumber>;
    templateTitle: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    statusName: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    title: string;
    dueDate?: string | undefined;
    description?: string | undefined;
    isRecurring?: boolean | undefined;
    recurrenceDay?: number | undefined;
    templateTitle?: string | undefined;
    tags?: string[] | undefined;
}, {
    title: string;
    statusName?: string | undefined;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | undefined;
    dueDate?: string | undefined;
    description?: string | undefined;
    isRecurring?: boolean | undefined;
    recurrenceDay?: number | undefined;
    templateTitle?: string | undefined;
    tags?: string[] | undefined;
}>;
export declare function createTask(params: z.infer<typeof createTaskSchema>): Promise<{
    id: string;
    title: string;
    statusId: string;
}>;
export declare const updateTaskSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    statusName: z.ZodOptional<z.ZodString>;
    priority: z.ZodOptional<z.ZodEnum<["LOW", "MEDIUM", "HIGH", "URGENT"]>>;
    dueDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    statusName?: string | undefined;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | undefined;
    dueDate?: string | null | undefined;
    title?: string | undefined;
    description?: string | null | undefined;
    tags?: string[] | undefined;
}, {
    id: string;
    statusName?: string | undefined;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | undefined;
    dueDate?: string | null | undefined;
    title?: string | undefined;
    description?: string | null | undefined;
    tags?: string[] | undefined;
}>;
export declare function updateTask(params: z.infer<typeof updateTaskSchema>): Promise<{
    id: string;
    title: string;
    statusId: string;
}>;
export declare const deleteTaskSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare function deleteTask(params: z.infer<typeof deleteTaskSchema>): Promise<{
    deleted: boolean;
    id: string;
}>;

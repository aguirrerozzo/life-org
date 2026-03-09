import { z } from "zod";
import { prisma, getUserId } from "../db.js";
export const listTasksSchema = z.object({
    statusName: z.string().optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    dueDate: z.string().optional(),
});
export async function listTasks(params) {
    const userId = await getUserId();
    const where = { userId };
    if (params.statusName) {
        where.statusRel = { nameEn: { equals: params.statusName, mode: "insensitive" } };
    }
    if (params.priority)
        where.priority = params.priority;
    if (params.dueDate) {
        where.dueDate = { lte: new Date(params.dueDate) };
    }
    const tasks = await prisma.task.findMany({
        where,
        include: {
            statusRel: true,
        },
        orderBy: [{ order: "asc" }],
    });
    return tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.statusRel?.nameEn,
        priority: t.priority,
        dueDate: t.dueDate?.toISOString().split("T")[0] ?? null,
        isRecurring: t.isRecurring,
        recurrenceDay: t.recurrenceDay,
        templateTitle: t.templateTitle,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
    }));
}
export const getTaskSchema = z.object({
    id: z.string(),
});
export async function getTask(params) {
    const userId = await getUserId();
    const task = await prisma.task.findFirst({
        where: { id: params.id, userId },
        include: {
            comments: {
                include: { user: { select: { name: true } } },
                orderBy: { createdAt: "desc" },
            },
            statusRel: true,
        },
    });
    if (!task)
        throw new Error(`Task not found: ${params.id}`);
    return {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.statusRel?.nameEn,
        priority: task.priority,
        dueDate: task.dueDate?.toISOString().split("T")[0] ?? null,
        isRecurring: task.isRecurring,
        recurrenceDay: task.recurrenceDay,
        templateTitle: task.templateTitle,
        comments: task.comments.map((c) => ({
            id: c.id,
            text: c.text,
            author: c.user.name ?? "Unknown",
            createdAt: c.createdAt.toISOString(),
        })),
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
    };
}
export const createTaskSchema = z.object({
    title: z.string(),
    description: z.string().optional(),
    statusName: z.string().default("TODO"),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
    dueDate: z.string().optional(),
    tags: z.array(z.string()).optional(),
    isRecurring: z.boolean().optional(),
    recurrenceDay: z.number().min(1).max(28).optional(),
    templateTitle: z.string().optional(),
});
export async function createTask(params) {
    const userId = await getUserId();
    let statusId = "";
    const statusRecord = await prisma.status.findFirst({
        where: { userId, nameEn: { equals: params.statusName, mode: "insensitive" } }
    });
    if (statusRecord) {
        statusId = statusRecord.id;
    }
    else {
        const firstStatus = await prisma.status.findFirst({ where: { userId }, orderBy: { order: "asc" } });
        if (!firstStatus)
            throw new Error("No statuses found. Please create one first.");
        statusId = firstStatus.id;
    }
    // Get max order for the status
    const maxOrder = await prisma.task.aggregate({
        where: { userId, statusId },
        _max: { order: true },
    });
    const task = await prisma.task.create({
        data: {
            title: params.title,
            description: params.description ?? null,
            statusId,
            priority: params.priority || "MEDIUM",
            dueDate: params.dueDate ? new Date(params.dueDate) : undefined,
            order: (maxOrder._max.order ?? -1) + 1,
            isRecurring: params.isRecurring ?? false,
            recurrenceDay: params.recurrenceDay ?? null,
            templateTitle: params.templateTitle ?? null,
            userId,
        },
    });
    // Handle tags
    if (params.tags?.length) {
        for (const tagName of params.tags) {
            const tag = await prisma.tag.upsert({
                where: { name: tagName },
                update: {},
                create: { name: tagName },
            });
            await prisma.taskTag.create({
                data: { taskId: task.id, tagId: tag.id },
            });
        }
    }
    return { id: task.id, title: task.title, statusId: task.statusId };
}
export const updateTaskSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    description: z.string().nullable().optional(),
    statusName: z.string().optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    dueDate: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
});
export async function updateTask(params) {
    const userId = await getUserId();
    const { id, tags, ...data } = params;
    // Verify ownership
    const existing = await prisma.task.findFirst({ where: { id, userId } });
    if (!existing)
        throw new Error(`Task not found: ${id}`);
    const updateData = {};
    if (data.title !== undefined)
        updateData.title = data.title;
    if (data.description !== undefined)
        updateData.description = data.description;
    if (data.statusName !== undefined) {
        const statusRecord = await prisma.status.findFirst({
            where: { userId, nameEn: { equals: data.statusName, mode: "insensitive" } }
        });
        if (statusRecord) {
            updateData.statusId = statusRecord.id;
        }
    }
    if (data.priority !== undefined)
        updateData.priority = data.priority;
    if (data.dueDate !== undefined) {
        updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }
    const task = await prisma.task.update({
        where: { id },
        data: updateData,
    });
    // Update tags if provided
    if (tags !== undefined) {
        await prisma.taskTag.deleteMany({ where: { taskId: id } });
        for (const tagName of tags) {
            const tag = await prisma.tag.upsert({
                where: { name: tagName },
                update: {},
                create: { name: tagName },
            });
            await prisma.taskTag.create({
                data: { taskId: id, tagId: tag.id },
            });
        }
    }
    return { id: task.id, title: task.title, statusId: task.statusId };
}
export const deleteTaskSchema = z.object({
    id: z.string(),
});
export async function deleteTask(params) {
    const userId = await getUserId();
    const existing = await prisma.task.findFirst({
        where: { id: params.id, userId },
    });
    if (!existing)
        throw new Error(`Task not found: ${params.id}`);
    await prisma.task.delete({ where: { id: params.id } });
    return { deleted: true, id: params.id };
}

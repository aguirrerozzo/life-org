import { z } from "zod";
import { prisma } from "../db.js";
export const listTagsSchema = z.object({});
export async function listTags() {
    const tags = await prisma.tag.findMany({
        include: { _count: { select: { taskTags: true } } },
        orderBy: { name: "asc" },
    });
    return tags.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
        taskCount: t._count.taskTags,
    }));
}
export const createTagSchema = z.object({
    name: z.string(),
    color: z.string().optional(),
});
export async function createTag(params) {
    const tag = await prisma.tag.upsert({
        where: { name: params.name },
        update: {},
        create: { name: params.name, color: params.color ?? null },
    });
    return { id: tag.id, name: tag.name };
}

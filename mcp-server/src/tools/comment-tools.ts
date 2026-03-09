import { z } from "zod";
import { prisma, getUserId } from "../db.js";

export const addCommentSchema = z.object({
  taskId: z.string(),
  text: z.string(),
});

export async function addComment(params: z.infer<typeof addCommentSchema>) {
  const userId = await getUserId();

  // Verify task ownership
  const task = await prisma.task.findFirst({
    where: { id: params.taskId, userId },
  });
  if (!task) throw new Error(`Task not found: ${params.taskId}`);

  const comment = await prisma.comment.create({
    data: {
      text: params.text,
      taskId: params.taskId,
      userId,
    },
  });

  return { id: comment.id, text: comment.text, createdAt: comment.createdAt.toISOString() };
}

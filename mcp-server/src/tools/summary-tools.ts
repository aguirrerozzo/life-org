import { prisma, getUserId } from "../db.js";

export async function getTaskSummary() {
  const userId = await getUserId();

  const tasks = await prisma.task.findMany({
    where: { userId },
    include: { taskTags: { include: { tag: true } }, statusRel: true },
  });

  const byStatus: Record<string, number> = {};
  const byPriority = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
  const byTag: Record<string, number> = {};
  let overdueCount = 0;
  const now = new Date();

  for (const task of tasks) {
    const statusName = task.statusRel?.nameEn || "Unknown";
    byStatus[statusName] = (byStatus[statusName] || 0) + 1;
    byPriority[task.priority]++;

    if (task.dueDate && task.dueDate < now && statusName.toUpperCase() !== "DONE") {
      overdueCount++;
    }

    for (const tt of task.taskTags) {
      byTag[tt.tag.name] = (byTag[tt.tag.name] || 0) + 1;
    }
  }

  return {
    total: tasks.length,
    byStatus,
    byPriority,
    byTag,
    overdueCount,
  };
}

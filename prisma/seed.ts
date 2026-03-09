import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({
});

async function main() {
  // Create demo user
  const password = await bcrypt.hash("demo123", 12);
  const user = await prisma.user.upsert({
    where: { email: "demo@lifeorg.app" },
    update: {},
    create: {
      name: "Demo User",
      email: "demo@lifeorg.app",
      password,
    },
  });

  // Create tags
  const tags = await Promise.all(
    [
      { name: "personal", color: "bg-blue-100 text-blue-700" },
      { name: "work", color: "bg-purple-100 text-purple-700" },
      { name: "health", color: "bg-green-100 text-green-700" },
      { name: "finance", color: "bg-yellow-100 text-yellow-700" },
      { name: "learning", color: "bg-indigo-100 text-indigo-700" },
    ].map((tag) =>
      prisma.tag.upsert({
        where: { name: tag.name },
        update: {},
        create: tag,
      })
    )
  );

  // Create sample tasks
  const tasks = [
    { title: "Review quarterly budget", status: "TODO", priority: "HIGH", order: 0, tagNames: ["work", "finance"] },
    { title: "Schedule dentist appointment", status: "TODO", priority: "MEDIUM", order: 1, tagNames: ["personal", "health"] },
    { title: "Complete TypeScript course", status: "IN_PROGRESS", priority: "MEDIUM", order: 0, tagNames: ["learning"] },
    { title: "Update resume", status: "IN_PROGRESS", priority: "HIGH", order: 1, tagNames: ["work", "personal"] },
    { title: "Fix login bug in production", status: "IN_REVIEW", priority: "URGENT", order: 0, tagNames: ["work"] },
    { title: "Organize photo library", status: "DONE", priority: "LOW", order: 0, tagNames: ["personal"] },
    { title: "Prepare presentation slides", status: "TODO", priority: "HIGH", order: 2, tagNames: ["work"] },
    { title: "Grocery shopping list", status: "DONE", priority: "LOW", order: 1, tagNames: ["personal"] },
  ];

  // Create default statuses
  const defaultStatuses = [
    { nameEn: "To Do", nameEs: "Por Hacer", color: "var(--chart-1)", order: 0, requiresReason: false },
    { nameEn: "In Progress", nameEs: "En Progreso", color: "var(--chart-2)", order: 1, requiresReason: false },
    { nameEn: "Blocked / On Hold", nameEs: "Bloqueado o en Hold", color: "var(--chart-3)", order: 2, requiresReason: true },
    { nameEn: "Done", nameEs: "Hecho", color: "var(--chart-4)", order: 3, requiresReason: false },
  ];

  const createdStatuses = await Promise.all(
    defaultStatuses.map((status) =>
      prisma.status.create({
        data: {
          ...status,
          userId: user.id,
        },
      })
    )
  );

  const getStatusId = (name: string) => {
    return createdStatuses.find((s) => s.nameEn.replace(" ", "").toUpperCase() === name.replace("_", "").toUpperCase())?.id || createdStatuses[0].id;
  };

  for (const taskData of tasks) {
    const { tagNames, ...data } = taskData;
    const task = await prisma.task.create({
      data: {
        ...data,
        statusId: getStatusId(data.status),
        priority: data.priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
        userId: user.id,
      },
    });

    // Attach tags
    for (const tagName of tagNames) {
      const tag = tags.find((t) => t.name === tagName);
      if (tag) {
        await prisma.taskTag.create({
          data: { taskId: task.id, tagId: tag.id },
        });
      }
    }
  }

  // Add some comments
  const allTasks = await prisma.task.findMany({ where: { userId: user.id } });
  if (allTasks.length > 0) {
    await prisma.comment.create({
      data: {
        text: "Need to check with accounting team first",
        taskId: allTasks[0].id,
        userId: user.id,
      },
    });
    await prisma.comment.create({
      data: {
        text: "Blocked by API team - waiting for new endpoints",
        taskId: allTasks[4]?.id || allTasks[0].id,
        userId: user.id,
      },
    });
  }

  console.log("Seed completed: 1 user, 5 tags, 8 tasks, 2 comments");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TasksPageClient } from "./tasks-client";

export default async function TasksPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  const { locale } = await params;

  if (!session?.user?.id) {
    redirect(`/${locale}/login`);
  }

  const sp = await searchParams;
  const statusFilter = sp.status as string | undefined;
  const priorityFilter = sp.priority as string | undefined;
  const tagFilter = sp.tag as string | undefined;
  const search = sp.search as string | undefined;

  const where: Record<string, unknown> = { userId: session.user.id };

  if (statusFilter) {
    where.statusId = { in: statusFilter.split(",") };
  }
  if (priorityFilter) {
    where.priority = { in: priorityFilter.split(",") };
  }
  if (tagFilter) {
    where.taskTags = { some: { tagId: { in: tagFilter.split(",") } } };
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { taskTags: { some: { tag: { name: { contains: search, mode: "insensitive" } } } } },
      { statusRel: { nameEn: { contains: search, mode: "insensitive" } } },
      { statusRel: { nameEs: { contains: search, mode: "insensitive" } } },
    ];
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      comments: {
        include: { user: { select: { name: true, image: true } } },
        orderBy: { createdAt: "desc" },
      },
      taskTags: { include: { tag: true } },
      statusRel: true,
    },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });

  const statuses = await prisma.status.findMany({
    where: { userId: session.user.id },
    orderBy: { order: "asc" },
  });

  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
  });

  // Serialize dates to strings for client components
  const serializedTasks = JSON.parse(JSON.stringify(tasks));

  return <TasksPageClient initialTasks={serializedTasks} statuses={statuses} tags={tags} />;
}

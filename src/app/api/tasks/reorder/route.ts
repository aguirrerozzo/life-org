import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { items } = await request.json();

  if (!Array.isArray(items)) {
    return NextResponse.json({ error: "Invalid items" }, { status: 400 });
  }

  // Retrieve the old tasks to determine if status actually changed (useful for system logs)
  const taskIds = items.map(i => i.id);
  const oldTasks = await prisma.task.findMany({
    where: { id: { in: taskIds }, userId: session.user.id },
    select: { id: true, statusId: true }
  });

  const statuses = await prisma.status.findMany({ select: { id: true, nameEn: true } });
  const statusMap = new Map(statuses.map(s => [s.id, s.nameEn]));

  const transactionOps = items.map((item: { id: string; statusId: string; order: number }) => {
    const old = oldTasks.find(t => t.id === item.id);
    const data: any = { statusId: item.statusId, order: item.order };

    if (old && old.statusId !== item.statusId) {
      data.comments = {
        create: {
          text: `Moved from ${statusMap.get(old.statusId)} to ${statusMap.get(item.statusId)}`,
          isSystem: true,
          userId: session.user.id
        }
      };
    }

    return prisma.task.update({
      where: { id: item.id },
      data,
    });
  });

  await prisma.$transaction(transactionOps);

  revalidatePath("/tasks");
  revalidatePath("/es/tasks");
  revalidatePath("/en/tasks");

  return NextResponse.json({ success: true });
}

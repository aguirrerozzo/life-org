import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getTask(id: string, userId: string) {
  return prisma.task.findFirst({
    where: { id, userId },
    include: {
      comments: {
        include: { user: { select: { name: true, image: true } } },
        orderBy: { createdAt: "desc" },
      },
      statusRel: true,
      taskTags: { include: { tag: true } },
    },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const task = await getTask(id, session.user.id);

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json(task);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.task.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const body = await request.json();
  const { title, description, statusId, priority, dueDate, tagIds, isRecurring, recurrenceType, recurrenceDaysOfWeek, recurrenceDay, recurrenceMonth, recurrenceTime, reminderTimes, isPayment, paymentValue } = body;

  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (statusId !== undefined) data.statusId = statusId;
  if (priority !== undefined) data.priority = priority;
  if (dueDate !== undefined) {
    data.dueDate = dueDate === "" || dueDate === null ? null : new Date(dueDate);
  }
  if (isRecurring !== undefined) data.isRecurring = isRecurring;
  if (recurrenceType !== undefined) data.recurrenceType = recurrenceType;
  if (recurrenceDaysOfWeek !== undefined) data.recurrenceDaysOfWeek = recurrenceDaysOfWeek;
  if (recurrenceDay !== undefined) data.recurrenceDay = recurrenceDay;
  if (recurrenceMonth !== undefined) data.recurrenceMonth = recurrenceMonth;
  if (recurrenceTime !== undefined) data.recurrenceTime = recurrenceTime === "" ? null : recurrenceTime;
  if (reminderTimes !== undefined) data.reminderTimes = Array.isArray(reminderTimes) ? reminderTimes : [];
  if (isPayment !== undefined) data.isPayment = isPayment;
  if (paymentValue !== undefined) data.paymentValue = isPayment ? (paymentValue !== "" && paymentValue !== null && paymentValue !== undefined ? parseFloat(paymentValue) : null) : null;

  // Auto-generate templateTitle based on final state combinations
  const finalTitle = title !== undefined ? title : existing.title;
  const finalIsRecurring = isRecurring !== undefined ? isRecurring : existing.isRecurring;
  const finalRecurrenceType = recurrenceType !== undefined ? recurrenceType : existing.recurrenceType;

  if (finalIsRecurring && finalRecurrenceType) {
    if (finalRecurrenceType === "DAILY" || finalRecurrenceType === "WEEKLY") {
      data.templateTitle = `${finalTitle} - {day} {month_en} {year}`;
    } else if (finalRecurrenceType === "MONTHLY") {
      data.templateTitle = `${finalTitle} - {month_en} {year}`;
    } else if (finalRecurrenceType === "YEARLY") {
      data.templateTitle = `${finalTitle} - {year}`;
    }
  } else if (isRecurring !== undefined && !isRecurring) {
    data.templateTitle = null;
  }

  // Activity Logging Generation
  const systemLogs = [];
  if (title !== undefined && title !== existing.title) {
    systemLogs.push(`Renamed from "${existing.title}" to "${title}"`);
  }
  if (statusId !== undefined && statusId !== existing.statusId) {
    const oldStatus = await prisma.status.findUnique({ where: { id: existing.statusId } });
    const newStatus = await prisma.status.findUnique({ where: { id: statusId } });
    if (oldStatus && newStatus) {
      systemLogs.push(`Moved from ${oldStatus.nameEn} to ${newStatus.nameEn}`);
    }
  }

  let finalTagIds = tagIds;
  if (isPayment) {
    let paymentTag = await prisma.tag.findUnique({
      where: { name: "Pago" }
    });
    if (!paymentTag) {
      paymentTag = await prisma.tag.create({
        data: { name: "Pago", color: "oklch(0.627 0.265 150)" }
      });
    }
    if (finalTagIds === undefined) {
      const existingTags = await prisma.taskTag.findMany({ where: { taskId: id } });
      finalTagIds = existingTags.map(t => t.tagId);
    }
    if (!finalTagIds.includes(paymentTag.id)) {
      finalTagIds.push(paymentTag.id);
    }
  }

  if (finalTagIds !== undefined) {
    await prisma.$transaction([
      prisma.taskTag.deleteMany({ where: { taskId: id } }),
      ...finalTagIds.map((tagId: string) =>
        prisma.taskTag.create({ data: { taskId: id, tagId } })
      ),
    ]);
  }

  if (systemLogs.length > 0) {
    data.comments = {
      create: systemLogs.map(log => ({
        text: log,
        isSystem: true,
        userId: session.user.id
      }))
    };
  }

  const task = await prisma.task.update({
    where: { id },
    data,
    include: {
      comments: {
        include: { user: { select: { name: true, image: true } } },
        orderBy: { createdAt: "desc" },
      },
      statusRel: true,
      taskTags: { include: { tag: true } },
    },
  });

  return NextResponse.json(task);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.task.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  await prisma.task.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

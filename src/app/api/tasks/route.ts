import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const tag = searchParams.get("tag");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = { userId: session.user.id };

  if (status) {
    where.statusId = { in: status.split(",") };
  }
  if (priority) {
    where.priority = { in: priority.split(",") };
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }
  if (tag) {
    where.taskTags = { some: { tag: { name: tag } } };
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      comments: {
        include: { user: { select: { name: true, image: true } } },
        orderBy: { createdAt: "desc" },
      },
      statusRel: true,
      taskTags: { include: { tag: true } },
    },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(tasks);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, description, statusId, priority, dueDate, tagIds, isRecurring, recurrenceType, recurrenceDaysOfWeek, recurrenceDay, recurrenceMonth, isPayment, paymentValue } = body;

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  if (!statusId) {
    return NextResponse.json({ error: "statusId is required" }, { status: 400 });
  }

  const maxOrder = await prisma.task.aggregate({
    where: { userId: session.user.id, statusId },
    _max: { order: true },
  });

  let generatedTemplateTitle = null;
  if (isRecurring && recurrenceType) {
    if (recurrenceType === "DAILY" || recurrenceType === "WEEKLY") {
      generatedTemplateTitle = `${title} - {day} {month_en} {year}`;
    } else if (recurrenceType === "MONTHLY") {
      generatedTemplateTitle = `${title} - {month_en} {year}`;
    } else if (recurrenceType === "YEARLY") {
      generatedTemplateTitle = `${title} - {year}`;
    }
  }

  let finalTagIds = tagIds || [];
  if (isPayment) {
    let paymentTag = await prisma.tag.findUnique({
      where: { name: "Pago" }
    });
    if (!paymentTag) {
      paymentTag = await prisma.tag.create({
        data: { name: "Pago", color: "oklch(0.627 0.265 150)" }
      });
    }
    if (!finalTagIds.includes(paymentTag.id)) {
      finalTagIds.push(paymentTag.id);
    }
  }

  const task = await prisma.task.create({
    data: {
      title,
      description,
      statusId,
      priority: priority || "MEDIUM",
      dueDate: dueDate ? new Date(dueDate) : undefined,
      order: (maxOrder._max.order ?? -1) + 1,
      isRecurring: isRecurring || false,
      recurrenceType: recurrenceType || null,
      recurrenceDaysOfWeek: recurrenceDaysOfWeek || [],
      recurrenceDay: recurrenceDay || null,
      recurrenceMonth: recurrenceMonth || null,
      templateTitle: generatedTemplateTitle,
      isPayment: isPayment || false,
      paymentValue: isPayment ? (paymentValue !== null && paymentValue !== undefined && paymentValue !== "" ? parseFloat(paymentValue) : null) : null,
      userId: session.user.id,
      taskTags: finalTagIds.length
        ? { create: finalTagIds.map((tagId: string) => ({ tagId })) }
        : undefined,
      comments: {
        create: {
          text: "Created this task",
          isSystem: true,
          userId: session.user.id
        }
      }
    },
    include: {
      comments: true,
      statusRel: true,
      taskTags: { include: { tag: true } },
    },
  });

  return NextResponse.json(task, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const comments = await prisma.comment.findMany({
    where: { taskId: id },
    include: { user: { select: { name: true, image: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(comments);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { text } = await request.json();

  if (!text) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  const task = await prisma.task.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const comment = await prisma.comment.create({
    data: {
      text,
      taskId: id,
      userId: session.user.id,
    },
    include: { user: { select: { name: true, image: true } } },
  });

  return NextResponse.json(comment, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(tags);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, color } = await request.json();

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const tag = await prisma.tag.upsert({
    where: { name },
    update: { color },
    create: { name, color },
  });

  return NextResponse.json(tag, { status: 201 });
}

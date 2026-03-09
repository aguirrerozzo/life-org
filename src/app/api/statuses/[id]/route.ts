import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { nameEn, nameEs, color, order, requiresReason } = body;

    const status = await prisma.status.findUnique({
        where: { id },
    });

    if (!status || status.userId !== session.user.id) {
        return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
    }

    const updatedStatus = await prisma.status.update({
        where: { id },
        data: {
            ...(nameEn && { nameEn }),
            ...(nameEs && { nameEs }),
            ...(color && { color }),
            ...(order !== undefined && { order }),
            ...(requiresReason !== undefined && { requiresReason }),
        },
    });

    return NextResponse.json(updatedStatus);
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const fallbackStatusId = request.nextUrl.searchParams.get("fallbackStatusId");

    if (!fallbackStatusId) {
        return NextResponse.json(
            { error: "fallbackStatusId parameter is required to migrate tasks" },
            { status: 400 }
        );
    }

    const status = await prisma.status.findUnique({
        where: { id },
    });

    if (!status || status.userId !== session.user.id) {
        return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
    }

    // Ensure fallback status belongs to user
    const fallbackStatus = await prisma.status.findUnique({
        where: { id: fallbackStatusId },
    });

    if (!fallbackStatus || fallbackStatus.userId !== session.user.id) {
        return NextResponse.json(
            { error: "Fallback status not found or unauthorized" },
            { status: 400 }
        );
    }

    // 1. Reassign all tasks
    await prisma.task.updateMany({
        where: { statusId: id, userId: session.user.id },
        data: { statusId: fallbackStatusId },
    });

    // 2. Delete the status
    await prisma.status.delete({
        where: { id },
    });

    return new NextResponse(null, { status: 204 });
}

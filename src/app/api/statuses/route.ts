import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULT_STATUSES = [
    { nameEn: "TODO", nameEs: "POR HACER", color: "oklch(0.75 0.15 85)", order: 0, requiresReason: false },
    { nameEn: "IN PROGRESS", nameEs: "EN PROGRESO", color: "oklch(0.65 0.18 250)", order: 1, requiresReason: false },
    { nameEn: "BLOCKED / ON HOLD", nameEs: "BLOQUEADO O EN HOLD", color: "oklch(0.55 0.20 160)", order: 2, requiresReason: true },
    { nameEn: "DONE", nameEs: "HECHO", color: "oklch(0.60 0.22 30)", order: 3, requiresReason: false },
];

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    let statuses = await prisma.status.findMany({
        where: { userId },
        orderBy: { order: "asc" },
    });

    // Lazy creation: if user has no statuses, seed defaults
    if (statuses.length === 0) {
        for (const ds of DEFAULT_STATUSES) {
            await prisma.status.create({
                data: { ...ds, userId },
            });
        }
        statuses = await prisma.status.findMany({
            where: { userId },
            orderBy: { order: "asc" },
        });
    }

    return NextResponse.json(statuses);
}

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { nameEn, nameEs, color, requiresReason } = body;

    if (!nameEn || !nameEs) {
        return NextResponse.json({ error: "Both EN and ES names are required" }, { status: 400 });
    }

    const userId = session.user.id;

    const maxOrder = await prisma.status.aggregate({
        where: { userId },
        _max: { order: true },
    });

    const status = await prisma.status.create({
        data: {
            nameEn,
            nameEs,
            color: color || "oklch(0.75 0.15 85)",
            requiresReason: requiresReason || false,
            order: (maxOrder._max.order ?? -1) + 1,
            userId,
        },
    });

    return NextResponse.json(status, { status: 201 });
}

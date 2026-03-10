import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth"; // Assume auth gives access to current user

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const connections = await prisma.channelConnection.findMany({
            where: { userId: session.user.id }
        });
        return NextResponse.json(connections);
    } catch (error) {
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const body = await req.json();
        const { platform, channelId } = body;

        if (!platform || !channelId) {
            return new NextResponse("Missing platform or channelId", { status: 400 });
        }

        // We already have a @@unique([userId, platform]) constraint.
        // It's usually better to upsert or delete-then-create if a user changes their number
        const connection = await prisma.channelConnection.upsert({
            where: {
                userId_platform: {
                    userId: session.user.id,
                    platform
                }
            },
            update: { channelId },
            create: {
                userId: session.user.id,
                platform,
                channelId
            }
        });

        return NextResponse.json(connection);
    } catch (error) {
        console.error("Failed to map channel:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const url = new URL(req.url);
        const platform = url.searchParams.get("platform");

        if (!platform) {
            return new NextResponse("Missing platform parameter", { status: 400 });
        }

        await prisma.channelConnection.delete({
            where: {
                userId_platform: {
                    userId: session.user.id,
                    platform
                }
            }
        });

        return new NextResponse("Deleted", { status: 200 });
    } catch (error) {
        console.error("Failed to delete channel:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

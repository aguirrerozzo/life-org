import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { tasks, defaultStatusId } = body;

        if (!Array.isArray(tasks) || tasks.length === 0) {
            return NextResponse.json({ error: "No tasks provided" }, { status: 400 });
        }

        if (!defaultStatusId) {
            return NextResponse.json({ error: "No default status found" }, { status: 400 });
        }

        // Get the current max order for the default status to append these new tasks at the bottom
        const maxOrderAgg = await prisma.task.aggregate({
            where: { userId: session.user.id, statusId: defaultStatusId },
            _max: { order: true },
        });
        let currentOrder = (maxOrderAgg._max.order ?? -1) + 1;

        let successCount = 0;

        // Use a transaction to ensure either all import or none (optional, but safer)
        // However, given that users might have bad rows, we'll process sequentially to skip bad rows
        // and just report total created. For speed on small sets (100-500), sequential is fine.

        // Quick cache for tags to avoid hammering the DB for every row
        const tagMap = new Map<string, string>();

        for (const row of tasks) {
            if (!row.Title || row.Title.trim() === "") continue;

            // 1. Parse Status (use default if missing or let's assume all go to default for now as we don't know status IDs from names safely)
            // If we wanted to parse string "status", we'd need to pre-fetch all statuses and map them by name. Let's do that:
            // Actually, standardizing on front-end's defaultStatusId ensures they don't break the kanban. 

            // 2. Parse Priority
            const validPriorities = ["LOW", "MEDIUM", "HIGH"];
            const priority = validPriorities.includes(row.Priority?.toUpperCase())
                ? row.Priority.toUpperCase()
                : "MEDIUM";

            // 3. Parse Dates
            let dueDate = undefined;
            if (row.DueDate && !isNaN(Date.parse(row.DueDate))) {
                dueDate = new Date(row.DueDate);
            }

            // 4. Parse Finance
            let isPayment = false;
            let paymentValue = null;
            if (row.Cost && row.Cost.trim() !== "") {
                const costFloat = parseFloat(row.Cost.replace(/[^0-9.-]+/g, ""));
                if (!isNaN(costFloat)) {
                    isPayment = true;
                    paymentValue = costFloat;
                }
            }

            // 5. Parse Recurrences
            const isRecurring = row.IsRecurring?.toLowerCase() === "true" || row.IsRecurring === "1";
            const validRecurrenceTypes = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"];
            const recurrenceType = (isRecurring && validRecurrenceTypes.includes(row.RecurrenceType?.toUpperCase()))
                ? row.RecurrenceType.toUpperCase()
                : null;

            // 6. Parse Tags
            const tagDocsToConnect: { tagId: string }[] = [];
            if (row.Tags && row.Tags.trim() !== "") {
                const rawTags = row.Tags.split(",").map((t: string) => t.trim()).filter((t: string) => t.length > 0);

                for (const tagName of rawTags) {
                    let tagId = tagMap.get(tagName.toLowerCase());

                    if (!tagId) {
                        // Find or create
                        let tag = await prisma.tag.findUnique({ where: { name: tagName } });
                        if (!tag) {
                            tag = await prisma.tag.create({ data: { name: tagName } });
                        }
                        tagId = tag.id;
                        tagMap.set(tagName.toLowerCase(), tagId);
                    }

                    if (tagId) {
                        tagDocsToConnect.push({ tagId });
                    }
                }
            }

            // Auto-tag Payments
            if (isPayment) {
                let paymentTagId = tagMap.get("pago");
                if (!paymentTagId) {
                    let paymentTag = await prisma.tag.findUnique({ where: { name: "Pago" } });
                    if (!paymentTag) {
                        paymentTag = await prisma.tag.create({ data: { name: "Pago", color: "oklch(0.627 0.265 150)" } });
                    }
                    paymentTagId = paymentTag.id;
                    tagMap.set("pago", paymentTagId);
                }
                if (!tagDocsToConnect.find(t => t.tagId === paymentTagId)) {
                    tagDocsToConnect.push({ tagId: paymentTagId });
                }
            }

            // Note: RemindersPreAlertMinutes is parsed here but requires future Schema modification.
            // Ignoring for DB insertion right now until Phase 3 AI Reminders schema is built.

            // Insert Task
            await prisma.task.create({
                data: {
                    title: row.Title.trim(),
                    description: row.Description?.trim() || "",
                    statusId: defaultStatusId,
                    priority,
                    dueDate,
                    order: currentOrder,
                    isRecurring,
                    recurrenceType,
                    isPayment,
                    paymentValue,
                    userId: session.user.id,
                    taskTags: tagDocsToConnect.length > 0
                        ? { create: tagDocsToConnect }
                        : undefined,
                    comments: {
                        create: [{
                            text: "Imported via CSV bulk upload",
                            isSystem: true,
                            userId: session.user.id
                        }]
                    }
                }
            });

            currentOrder++;
            successCount++;
        }

        return NextResponse.json({ success: true, count: successCount }, { status: 201 });

    } catch (error: any) {
        console.error("Bulk Import Error:", error);
        return NextResponse.json({ error: error.message || "Failed to import tasks" }, { status: 500 });
    }
}

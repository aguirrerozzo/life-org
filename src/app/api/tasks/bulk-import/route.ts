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

        // Soften validation: Let backend fetch statuses if front-end fails.
        if (!defaultStatusId) {
            console.warn("No defaultStatusId provided by client, will fetch from DB");
        }

        // We will do dynamic ordering per status in the loop instead to maintain Kanban sorting.
        const orderMap = new Map<string, number>();
        let successCount = 0;
        const skippedRows: Array<{ reason: string; row: any }> = [];

        // 1. Fetch all user statuses to map string names to DB IDs
        const userStatuses = await prisma.status.findMany({
            where: { userId: session.user.id }
        });
        const statusMap = new Map<string, string>();
        userStatuses.forEach(s => {
            if (s.nameEn) statusMap.set(s.nameEn.toLowerCase().trim(), s.id);
            if (s.nameEs) statusMap.set(s.nameEs.toLowerCase().trim(), s.id);
        });

        let fallbackStatusId = defaultStatusId;
        if (!fallbackStatusId && userStatuses.length > 0) {
            fallbackStatusId = userStatuses[0].id; // ultimate fallback
        }

        // Quick cache for tags to avoid hammering the DB for every row
        const tagMap = new Map<string, string>();

        for (const row of tasks) {
            if (!row.Title || row.Title.trim() === "") {
                skippedRows.push({ reason: "Missing or empty Title. Ensure CSV headers exactly match 'Title'.", row });
                continue;
            }

            // 1. Parse Status (Dynamic mapping)
            let assignedStatusId = fallbackStatusId;
            if (row.Status && row.Status.trim() !== "") {
                const matchedId = statusMap.get(row.Status.toLowerCase().trim());
                if (matchedId) {
                    assignedStatusId = matchedId;
                }
            }

            if (!assignedStatusId) {
                skippedRows.push({ reason: "No assignedStatusId found. Ensure user has Status columns in DB.", row });
                // If completely stripped of statuses (e.g. brand new user with broken DB state)
                continue;
            }

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

            // Determine order dynamically based on the specific column it's going into
            let currentOrder = orderMap.get(assignedStatusId);
            if (currentOrder === undefined) {
                const maxOrderAgg = await prisma.task.aggregate({
                    where: { userId: session.user.id, statusId: assignedStatusId },
                    _max: { order: true }
                });
                currentOrder = (maxOrderAgg._max.order ?? -1) + 1;
            }

            // Insert Task
            await prisma.task.create({
                data: {
                    title: row.Title.trim(),
                    description: row.Description?.trim() || "",
                    statusId: assignedStatusId,
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

            orderMap.set(assignedStatusId, currentOrder + 1);
            successCount++;
        }

        return NextResponse.json({ success: true, count: successCount, skipped: skippedRows }, { status: 201 });

    } catch (error: any) {
        console.error("Bulk Import Error:", error);
        return NextResponse.json({ error: error.message || "Failed to import tasks" }, { status: 500 });
    }
}

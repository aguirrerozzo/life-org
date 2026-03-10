import { openai } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth"; // Ensure you fetch the user auth properly

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
    const session = await auth();

    if (!session?.user?.id) {
        return new Response("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;
    const { messages } = await req.json();

    const systemInstructions = `
You are the definitive AI executive assistant for the 'life-org' platform. 
Your job is to help the user manage their tasks, finances, and life schedule seamlessly.
You have direct access to their private database via tools. 
When asked to create, find, or update a task, ALWAYS use the relevant tool first before answering.
If the user asks for a summary of their day or what is pending, query the database using 'list_tasks' and build a concise, empowering narrative.

Today's Date is: ${new Date().toISOString().split("T")[0]}
The user's Name is: ${session.user.name || "Boss"}

RULES:
- Be concise, professional, yet friendly.
- Do not make up tasks; only reference what the tools return.
- If a tool execution fails, politely inform the user.
- If the user uses vague terms like "today", "tomorrow", "next week", calculate the exact dates based on Today's Date before calling the tool.
`;

    const result = streamText({
        model: openai("gpt-4o-mini"), // Or whichever model string is appropriate
        system: systemInstructions,
        messages,
        tools: {
            create_task: tool({
                description: "Creates a new task in the user's database.",
                parameters: z.object({
                    title: z.string().describe("The name of the task."),
                    description: z.string().optional().describe("Additional context or details."),
                    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional().describe("The priority level of the task. Defaults to MEDIUM."),
                    dueDate: z.string().optional().describe("The due date in YYYY-MM-DD format."),
                    statusNameEn: z.string().optional().describe("The English name of the status column to place it in, e.g., 'To Do', 'In Progress', 'Done'. If omitted, it will be placed in the first available status.")
                }),
                execute: async ({ title, description, priority, dueDate, statusNameEn }) => {
                    // Find the target status, or default to the first one
                    let targetStatusId;
                    const userStatuses = await prisma.status.findMany({
                        where: { userId },
                        orderBy: { order: "asc" },
                    });

                    if (userStatuses.length === 0) {
                        return { error: "User has no configured task statuses." };
                    }

                    if (statusNameEn) {
                        const match = userStatuses.find(s => s.nameEn.toLowerCase() === statusNameEn.toLowerCase());
                        targetStatusId = match?.id || userStatuses[0].id;
                    } else {
                        targetStatusId = userStatuses[0].id;
                    }

                    // Generate an order int
                    const lastTask = await prisma.task.findFirst({
                        where: { userId, statusId: targetStatusId },
                        orderBy: { order: "desc" },
                        select: { order: true },
                    });
                    const order = lastTask ? lastTask.order + 1000 : 1000;

                    const newTask = await prisma.task.create({
                        data: {
                            title,
                            description: description || null,
                            priority: priority || "MEDIUM",
                            dueDate: dueDate ? new Date(dueDate + "T00:00:00.000Z") : null,
                            statusId: targetStatusId,
                            order,
                            userId,
                        },
                    });

                    return { success: true, task: newTask };
                },
            }),

            list_tasks: tool({
                description: "Fetch a list of the user's current tasks.",
                parameters: z.object({
                    statusNamesEnum: z.array(z.string()).optional().describe("Filter by specific status column English names (e.g. ['To Do', 'In Progress']). If omitted, returns all tasks across all statuses."),
                    dueDateFrom: z.string().optional().describe("Filter tasks due on or after this date (YYYY-MM-DD)."),
                    dueDateTo: z.string().optional().describe("Filter tasks due on or before this date (YYYY-MM-DD)."),
                    priorityFilter: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional().describe("Filter by a specific priority."),
                }),
                execute: async ({ statusNamesEnum, dueDateFrom, dueDateTo, priorityFilter }) => {
                    const whereClause: any = { userId };

                    // Status filter
                    if (statusNamesEnum && statusNamesEnum.length > 0) {
                        const matchingStatuses = await prisma.status.findMany({
                            where: {
                                userId,
                                nameEn: { in: statusNamesEnum, mode: "insensitive" }
                            }
                        });
                        if (matchingStatuses.length > 0) {
                            whereClause.statusId = { in: matchingStatuses.map(s => s.id) };
                        }
                    }

                    // Priority Filter
                    if (priorityFilter) {
                        whereClause.priority = priorityFilter;
                    }

                    // Date Filters
                    if (dueDateFrom || dueDateTo) {
                        whereClause.dueDate = {};
                        if (dueDateFrom) whereClause.dueDate.gte = new Date(dueDateFrom + "T00:00:00.000Z");
                        if (dueDateTo) whereClause.dueDate.lte = new Date(dueDateTo + "T23:59:59.999Z");
                    }

                    const limit = 20; // Prevent massive token overflow

                    const tasks = await prisma.task.findMany({
                        where: whereClause,
                        take: limit,
                        orderBy: [
                            { priority: 'desc' },
                            { dueDate: 'asc' }
                        ],
                        include: {
                            statusRel: { select: { nameEn: true, nameEs: true } }
                        }
                    });

                    return {
                        summary: `Found ${tasks.length} tasks matching criteria (limited to ${limit})`,
                        tasks: tasks.map(t => ({
                            title: t.title,
                            priority: t.priority,
                            dueDate: t.dueDate ? t.dueDate.toISOString().split("T")[0] : "None",
                            status: t.statusRel.nameEn,
                            isPayment: t.isPayment,
                            paymentValue: t.paymentValue
                        }))
                    };
                },
            })
        },
    });

    return result.toTextStreamResponse();
}

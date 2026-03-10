import { openai } from "@ai-sdk/openai";
import { generateText, tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Evolution API Webhook Structure (Simplified)
        // Usually nested inside body.data.message
        const messageData = body?.data?.message || body;

        // Ensure we actually have a text message
        if (!messageData || !messageData.key || !messageData.message?.conversation) {
            return new Response("OK", { status: 200 }); // Acknowledge non-text events
        }

        const remoteJid = messageData.key.remoteJid; // e.g. "5215512345678@s.whatsapp.net"
        const incomingText = messageData.message.conversation;
        const fromMe = messageData.key.fromMe;

        // We only process messages that the user sends *TO* this bot/number, 
        // OR if this is a "message to self" setup, we process if it's from the user.
        // Assuming a standard bot setup where users message a central number:
        if (fromMe) return new Response("Ignored fromMe", { status: 200 });

        // 1. Identify User via ChannelConnection
        const connection = await prisma.channelConnection.findUnique({
            where: { channelId: remoteJid },
            include: { user: true }
        });

        if (!connection) {
            // Optional: Auto-reply that they aren't registered, 
            // but for security it's better to just ignore unknown numbers.
            console.log("Unauthorized WhatsApp message from:", remoteJid);
            return new Response("Unauthorized", { status: 401 });
        }

        const userId = connection.userId;

        // 2. Load Conversation History limits (e.g. last 10 messages)
        const history = await prisma.message.findMany({
            where: { userId, platform: "whatsapp" },
            orderBy: { createdAt: "desc" },
            take: 10
        });

        // Reconstruct Ai SDK message format, oldest first
        const chatMessages = history.reverse().map(m => ({
            role: m.role as "user" | "assistant" | "system",
            content: m.content || ""
        }));

        // Append the new message
        chatMessages.push({ role: "user", content: incomingText });

        // Save incoming user message to DB
        await prisma.message.create({
            data: {
                userId,
                role: "user",
                content: incomingText,
                platform: "whatsapp"
            }
        });

        const systemInstructions = `
You are the definitive AI executive assistant for the 'life-org' platform. 
Your job is to help the user manage their tasks, finances, and life schedule seamlessly via WhatsApp.
You have direct access to their private database via tools. 
When asked to create, find, or update a task, ALWAYS use the relevant tool first before answering.

Today's Date is: ${new Date().toISOString().split("T")[0]}
The user's Name is: ${connection.user.name || "Boss"}

RULES:
- Keep answers SHORT and formatting clean for WhatsApp (use *bold* and _italics_).
- Do not make up tasks; only reference what the tools return.
- If the user uses vague terms like "today", "tomorrow", "next week", calculate the exact dates based on Today's Date.
`;

        // 3. Trigger the LLM (Using generateText instead of streamText since Webhooks are fire-and-forget)
        const result = await generateText({
            model: openai("gpt-4o-mini"),
            system: systemInstructions,
            messages: chatMessages,
            tools: {
                create_task: tool({
                    description: "Creates a new task in the user's database.",
                    parameters: z.object({
                        title: z.string().describe("The name of the task."),
                        description: z.string().optional().describe("Additional context or details."),
                        priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional().describe("The priority level of the task. Defaults to MEDIUM."),
                        dueDate: z.string().optional().describe("The due date in YYYY-MM-DD format."),
                        statusNameEn: z.string().optional().describe("The English name of the status column to place it in. If omitted, it will be placed in the first available status.")
                    }),
                    execute: async ({ title, description, priority, dueDate, statusNameEn }) => {
                        let targetStatusId;
                        const userStatuses = await prisma.status.findMany({
                            where: { userId },
                            orderBy: { order: "asc" },
                        });

                        if (userStatuses.length === 0) return { error: "User has no configured task statuses." };

                        if (statusNameEn) {
                            const match = userStatuses.find(s => s.nameEn.toLowerCase() === statusNameEn.toLowerCase());
                            targetStatusId = match?.id || userStatuses[0].id;
                        } else {
                            targetStatusId = userStatuses[0].id;
                        }

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
                        return { success: true, task: { id: newTask.id, title: newTask.title } };
                    },
                }),

                list_tasks: tool({
                    description: "Fetch a list of the user's current tasks.",
                    parameters: z.object({
                        statusNamesEnum: z.array(z.string()).optional().describe("Filter by specific status column English names."),
                        dueDateFrom: z.string().optional().describe("Filter tasks due on or after this date (YYYY-MM-DD)."),
                        dueDateTo: z.string().optional().describe("Filter tasks due on or before this date (YYYY-MM-DD)."),
                    }),
                    execute: async ({ statusNamesEnum, dueDateFrom, dueDateTo }) => {
                        const whereClause: any = { userId };

                        if (statusNamesEnum && statusNamesEnum.length > 0) {
                            const matchingStatuses = await prisma.status.findMany({
                                where: { userId, nameEn: { in: statusNamesEnum, mode: "insensitive" } }
                            });
                            if (matchingStatuses.length > 0) {
                                whereClause.statusId = { in: matchingStatuses.map(s => s.id) };
                            }
                        }

                        if (dueDateFrom || dueDateTo) {
                            whereClause.dueDate = {};
                            if (dueDateFrom) whereClause.dueDate.gte = new Date(dueDateFrom + "T00:00:00.000Z");
                            if (dueDateTo) whereClause.dueDate.lte = new Date(dueDateTo + "T23:59:59.999Z");
                        }

                        const tasks = await prisma.task.findMany({
                            where: whereClause,
                            take: 10,
                            orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
                            include: { statusRel: { select: { nameEn: true } } }
                        });

                        return {
                            summary: `Found ${tasks.length} tasks matching criteria.`,
                            tasks: tasks.map(t => ({
                                title: t.title,
                                priority: t.priority,
                                dueDate: t.dueDate ? t.dueDate.toISOString().split("T")[0] : "None",
                                status: t.statusRel.nameEn,
                            }))
                        };
                    },
                })
            },
        });

        const assistantReply = result.text;

        // Save assistant reply to DB
        await prisma.message.create({
            data: {
                userId,
                role: "assistant",
                content: assistantReply,
                platform: "whatsapp"
            }
        });

        // 4. Send the reply back via Evolution API
        // NOTE: You need to specify your Evolution API endpoint and instance name in .env
        const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
        const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
        const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME;

        if (EVOLUTION_API_URL && EVOLUTION_API_KEY && INSTANCE_NAME) {
            await fetch(`${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': EVOLUTION_API_KEY
                },
                body: JSON.stringify({
                    number: remoteJid,
                    options: {
                        delay: 1200, // Small delay to look human
                    },
                    textMessage: {
                        text: assistantReply
                    }
                })
            });
        } else {
            console.warn("Evolution API credentials not configured. WhatsApp reply skipped.");
        }

        return new Response("OK", { status: 200 });

    } catch (error) {
        console.error("WhatsApp Webhook Error:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
}

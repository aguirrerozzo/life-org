import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateText, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        // SendGrid/Resend Inbound Parse usually sends multipart/form-data or JSON depending on config.
        // Assuming a JSON payload for simplicity (e.g. Resend Webhooks)
        const body = await req.json();

        // Extract sender and text. Adjust mapping based on your exact email provider.
        const fromEmailRaw = body.from || body.envelope?.from || "";
        // Extract just the email if it comes as "Name <email@domain.com>"
        const emailMatch = fromEmailRaw.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
        const fromEmail = emailMatch ? emailMatch[1].toLowerCase() : fromEmailRaw.toLowerCase();

        const subject = body.subject || "No Subject";
        const emailText = body.text || body.html || "";

        if (!fromEmail || (!subject && !emailText)) {
            return new NextResponse("OK", { status: 200 }); // Ignore malformed
        }

        // Correct reverse lookup: Find the user who owns this email as a channel
        const validChannel = await prisma.channelConnection.findFirst({
            where: {
                platform: "email",
                channelId: fromEmail
            },
            include: { user: true }
        });

        if (!validChannel) {
            console.log("Unauthorized Email Hook attempt from:", fromEmail);
            return new NextResponse("Unauthorized sender", { status: 401 });
        }

        const userId = validChannel.userId;

        // 2. Proxy to LLM to strictly extract and create a task
        const systemPrompt = `You are the automated Email ingestion assistant for ${validChannel.user.name}.
The user forwarded an email or wrote a message directly.
Your ONLY job is to extract the actionable task and call the 'create_task' tool.
Do not write back a conversational response, strictly use the tool and finish.

Email Subject: ${subject}
Email Body: ${emailText}
Today's Date is: ${new Date().toISOString().split("T")[0]}`;

        // 3. Trigger Tool
        await generateText({
            model: openai("gpt-4o-mini"),
            system: systemPrompt,
            messages: [{ role: "user", content: "Please create a task from the email above." }],
            tools: {
                create_task: tool({
                    description: "Creates a new task extracted from the email.",
                    parameters: z.object({
                        title: z.string().describe("The name of the task (summarized from subject/body)."),
                        description: z.string().optional().describe("Detailed context from the email body."),
                        priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional().describe("Extract priority if implied, else MEDIUM."),
                        dueDate: z.string().optional().describe("Extract due date in YYYY-MM-DD if mentioned.")
                    }),
                    execute: async ({ title, description, priority, dueDate }) => {
                        // Place inbound emails into the first / default status column
                        const userStatuses = await prisma.status.findMany({
                            where: { userId },
                            orderBy: { order: "asc" },
                        });

                        if (userStatuses.length === 0) return { error: "No statuses configured" };
                        const targetStatusId = userStatuses[0].id;

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
                })
            }
        });

        // 4. (Optional) In the future, send an email back confirming creation using Resend here.

        return new NextResponse("OK", { status: 200 });

    } catch (error) {
        console.error("Email Webhook Error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

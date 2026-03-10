import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { Resend } from "resend";

export const maxDuration = 60; // CRON jobs can take longer
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
        return new NextResponse("Missing RESEND_API_KEY", { status: 500 });
    }

    const resend = new Resend(resendApiKey);

    try {
        const users = await prisma.user.findMany({
            select: { id: true, name: true, email: true }
        });

        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));

        let sentCount = 0;

        for (const user of users) {
            if (!user.email) continue;

            const pendingTasks = await prisma.task.findMany({
                where: {
                    userId: user.id,
                    dueDate: { lte: endOfDay },
                    statusRel: {
                        nameEn: { notIn: ["Done", "Hecho"] }
                    }
                },
                select: { title: true, priority: true, dueDate: true, isPayment: true, paymentValue: true }
            });

            if (pendingTasks.length === 0) continue;

            const systemPrompt = `You are the life-org AI Assistant for ${user.name || "the user"}.
Write a highly concise, warm, but assertive morning email briefing them on their tasks for today.
Here is the raw data of tasks due today or strictly overdue:
${JSON.stringify(pendingTasks, null, 2)}
Format the email cleanly with HTML tags (<h2>, <ul>, <li>, <strong>, etc) so it renders well in an inbox. Do not write markdown, write pure HTML. Focus on highlighting Urgent/High items and any Payments.`;

            const { text: emailHtmlContent } = await generateText({
                model: openai("gpt-4o-mini"),
                prompt: systemPrompt
            });

            await resend.emails.send({
                from: 'Life-Org AI Assistant <a.i@life-org.app>',
                to: user.email,
                subject: `☀️ Your Daily Agenda - ${new Date().toISOString().split("T")[0]}`,
                html: emailHtmlContent
            });

            sentCount++;
        }

        return NextResponse.json({ success: true, emailsDispatched: sentCount });

    } catch (error) {
        console.error("CRON Error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
let cachedUserId = null;
export async function getUserId() {
    if (cachedUserId)
        return cachedUserId;
    const email = process.env.USER_EMAIL;
    if (!email) {
        throw new Error("USER_EMAIL environment variable is required");
    }
    const user = await prisma.user.findUnique({
        where: { email },
    });
    if (!user) {
        throw new Error(`User not found: ${email}`);
    }
    cachedUserId = user.id;
    return cachedUserId;
}
export { prisma };

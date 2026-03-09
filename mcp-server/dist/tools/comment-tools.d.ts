import { z } from "zod";
export declare const addCommentSchema: z.ZodObject<{
    taskId: z.ZodString;
    text: z.ZodString;
}, "strip", z.ZodTypeAny, {
    text: string;
    taskId: string;
}, {
    text: string;
    taskId: string;
}>;
export declare function addComment(params: z.infer<typeof addCommentSchema>): Promise<{
    id: string;
    text: string;
    createdAt: string;
}>;

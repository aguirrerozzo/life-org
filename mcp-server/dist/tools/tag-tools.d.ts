import { z } from "zod";
export declare const listTagsSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
export declare function listTags(): Promise<{
    id: string;
    name: string;
    color: string | null;
    taskCount: number;
}[]>;
export declare const createTagSchema: z.ZodObject<{
    name: z.ZodString;
    color: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    color?: string | undefined;
}, {
    name: string;
    color?: string | undefined;
}>;
export declare function createTag(params: z.infer<typeof createTagSchema>): Promise<{
    id: string;
    name: string;
}>;

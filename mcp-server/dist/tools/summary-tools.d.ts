export declare function getTaskSummary(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byPriority: {
        LOW: number;
        MEDIUM: number;
        HIGH: number;
        URGENT: number;
    };
    byTag: Record<string, number>;
    overdueCount: number;
}>;

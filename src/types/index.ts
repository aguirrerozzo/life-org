import type { Priority, RecurrenceType } from "@prisma/client";

export type { Priority, RecurrenceType };

export const TASK_PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  LOW: "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300",
  MEDIUM: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  URGENT: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export interface StatusData {
  id: string;
  nameEn: string;
  nameEs: string;
  color: string;
  order: number;
  requiresReason?: boolean;
}

export interface TaskWithRelations {
  id: string;
  title: string;
  description: string | null;
  statusId: string;
  statusRel: StatusData;
  priority: Priority;
  dueDate: string | null;
  reminderTimes: string[];
  order: number;
  isRecurring: boolean;
  recurrenceType: RecurrenceType | null;
  recurrenceDaysOfWeek: number[];
  recurrenceDay: number | null;
  recurrenceMonth: number | null;
  recurrenceTime: string | null;
  templateTitle: string | null;
  isPayment: boolean;
  paymentValue: number | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  comments: CommentData[];
  taskTags: { tag: TagData }[];
}

export interface CommentData {
  id: string;
  text: string;
  userId: string;
  user?: { name: string | null; image: string | null };
  isSystem: boolean;
  createdAt: string;
}

export interface TagData {
  id: string;
  name: string;
  color: string | null;
}

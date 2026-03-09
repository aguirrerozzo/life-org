import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  listTasks, listTasksSchema,
  getTask, getTaskSchema,
  createTask, createTaskSchema,
  updateTask, updateTaskSchema,
  deleteTask, deleteTaskSchema,
} from "./tools/task-tools.js";
import { addComment, addCommentSchema } from "./tools/comment-tools.js";
import { listTags, listTagsSchema, createTag, createTagSchema } from "./tools/tag-tools.js";
import { getTaskSummary } from "./tools/summary-tools.js";
import {
  getReminders, getRemindersSchema,
  generateRecurringTasks, generateRecurringTasksSchema,
} from "./tools/reminder-tools.js";

const server = new McpServer({
  name: "life-org",
  version: "1.0.0",
});

// Task tools
server.tool(
  "list_tasks",
  "List tasks with optional filters. Returns task summaries (id, title, status, priority, tags, dueDate).",
  listTasksSchema.shape,
  async (params) => {
    const result = await listTasks(listTasksSchema.parse(params));
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "get_task",
  "Get full task details including description, comments, and tags.",
  getTaskSchema.shape,
  async (params) => {
    const result = await getTask(getTaskSchema.parse(params));
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "create_task",
  "Create a new task. Tags are auto-created if they don't exist.",
  createTaskSchema.shape,
  async (params) => {
    const result = await createTask(createTaskSchema.parse(params));
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "update_task",
  "Update task fields (title, description, status, priority, dueDate, tags). Only provided fields are updated.",
  updateTaskSchema.shape,
  async (params) => {
    const result = await updateTask(updateTaskSchema.parse(params));
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "delete_task",
  "Delete a task by ID.",
  deleteTaskSchema.shape,
  async (params) => {
    const result = await deleteTask(deleteTaskSchema.parse(params));
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// Comment tools
server.tool(
  "add_comment",
  "Add a comment to a task.",
  addCommentSchema.shape,
  async (params) => {
    const result = await addComment(addCommentSchema.parse(params));
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// Tag tools
server.tool(
  "list_tags",
  "List all tags with their task counts.",
  listTagsSchema.shape,
  async () => {
    const result = await listTags();
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "create_tag",
  "Create a new tag.",
  createTagSchema.shape,
  async (params) => {
    const result = await createTag(createTagSchema.parse(params));
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// Summary tool
server.tool(
  "get_task_summary",
  "Get statistics: task counts by status, priority, tag, and overdue count.",
  {},
  async () => {
    const result = await getTaskSummary();
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// Reminder tools
server.tool(
  "get_reminders",
  "Get pending reminders: overdue tasks, upcoming tasks (due within N days), and tasks without due date. Use this to check what needs attention.",
  getRemindersSchema.shape,
  async (params) => {
    const result = await getReminders(getRemindersSchema.parse(params));
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "generate_recurring_tasks",
  "Generate recurring task instances for a given month/year. Creates new TODO tasks from recurring templates. Skips if task already exists for that month. Use at the start of each month.",
  generateRecurringTasksSchema.shape,
  async (params) => {
    const result = await generateRecurringTasks(generateRecurringTasksSchema.parse(params));
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Only stderr for logging - stdout is reserved for MCP protocol
  console.error("Life Org MCP server started");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

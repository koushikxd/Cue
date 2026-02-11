import type { Model } from "@/lib/models";
import type { TaskItem } from "./index";

export type DetermineActionResponse = {
  actions: Array<{
    action: "add" | "delete" | "mark" | "sort" | "edit" | "clear" | "export";
    text?: string;
    taskId?: string;
    targetDate?: string;
    scheduled_time?: string;
    priority?: "high" | "medium" | "low"; // Priority level for the task item
    sortBy?: "newest" | "oldest" | "alphabetical" | "completed" | "priority";
    status?: "complete" | "incomplete";
    listToClear?: "all" | "completed" | "incomplete";
  }>;
};

export type DetermineActionFn = (
  text: string,
  tasks?: TaskItem[],
  model?: Model,
  timezone?: string,
  apiKey?: string
) => Promise<DetermineActionResponse>;

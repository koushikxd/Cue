import { useState, useEffect, useCallback } from "react";
import Dexie from "dexie";
import { TaskItem, SyncQueueItem } from "@/types";
import { serializeTask } from "@/lib/utils/task";
import { z } from "zod";
import { toast } from "sonner";

const TaskItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  completed: z.boolean(),
  date: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val)),
  created_at: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val))
    .optional(),
  updated_at: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val))
    .optional(),
  scheduled_time: z.string().optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  gcalEventId: z.string().optional(),
  syncedWithGCal: z.boolean().optional(),
});

const TaskArraySchema = z.array(TaskItemSchema);

class AppDatabase extends Dexie {
  tasks: Dexie.Table<TaskItem, string>;
  syncQueue: Dexie.Table<SyncQueueItem, string>;

  constructor() {
    super("cue-db");
    this.version(1).stores({
      tasks:
        "id, text, completed, date, created_at, updated_at, scheduled_time, priority",
    });

    this.version(2).stores({
      tasks:
        "id, text, completed, date, created_at, updated_at, scheduled_time, priority, gcalEventId, syncedWithGCal",
    });

    this.version(3).stores({
      tasks:
        "id, text, completed, date, created_at, updated_at, scheduled_time, priority, gcalEventId, syncedWithGCal",
      syncQueue: "id, operation, taskId, timestamp",
    });

    this.tasks = this.table("tasks");
    this.syncQueue = this.table("syncQueue");
  }
}

export const db = new AppDatabase();

export async function addToSyncQueue(item: SyncQueueItem) {
  await db.syncQueue.put(item);
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  return db.syncQueue.orderBy("timestamp").toArray();
}

export async function clearSyncQueue() {
  await db.syncQueue.clear();
}

export async function removeSyncQueueItem(id: string) {
  await db.syncQueue.delete(id);
}

export function useIndexedDB<T>(storeName: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    const loadData = async () => {
      try {
        if (storeName === "tasks") {
          const items = await db.tasks.toArray();
          if (items && items.length > 0) {
            setStoredValue(
              items.map((item) => serializeTask(item)) as unknown as T
            );
          }
        } else {
          // For other data types, we could add additional tables
          console.warn("Only 'tasks' store is currently supported");
        }
      } catch (error) {
        console.error("Failed to load from IndexedDB:", error);
      }
    };

    loadData();
  }, [storeName]);

  const setValue = useCallback(
    async (value: T | ((val: T) => T)) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);

        if (isMounted && storeName === "tasks") {
          const tasks = valueToStore as unknown as TaskItem[];

          // Clear and bulk add to ensure consistency
          await db.transaction("rw", db.tasks, async () => {
            await db.tasks.clear();
            if (tasks.length > 0) {
              await db.tasks.bulkAdd(tasks);
            }
          });
        }
      } catch (error) {
        console.error("Failed to save to IndexedDB:", error);
      }
    },
    [storeName, storedValue, isMounted]
  );

  const exportData = useCallback(async () => {
    try {
      if (storeName === "tasks") {
        const items = await db.tasks.toArray();
        const tasksJson = JSON.stringify(items, null, 2);

        // Create blob and download link
        const blob = new Blob([tasksJson], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        // Set filename with date for versioning
        const date = new Date().toISOString().split("T")[0];
        link.download = `cue-tasks-${date}.json`;
        link.href = url;
        link.click();

        // Clean up
        URL.revokeObjectURL(url);

        return { success: true, message: "Data exported successfully" };
      } else {
        return { success: false, message: "Only tasks export is supported" };
      }
    } catch (error) {
      console.error("Failed to export data:", error);
      return { success: false, message: "Failed to export data" };
    }
  }, [storeName]);

  const importData = useCallback(
    async (file: File) => {
      try {
        if (storeName !== "tasks") {
          return { success: false, message: "Only tasks import is supported" };
        }

        return new Promise<{ success: boolean; message: string }>((resolve) => {
          const reader = new FileReader();

          reader.onload = async (e) => {
            try {
              const content = e.target?.result as string;
              const parsedData = JSON.parse(content);

              // Validate the imported data structure using Zod schema
              const result = TaskArraySchema.safeParse(parsedData);

              if (!result.success) {
                const errorMessage =
                  "Invalid data format: " + result.error.message;
                toast.error(errorMessage);
                resolve({ success: false, message: errorMessage });
                return;
              }

              const importedTasks = result.data;

              // Update IndexedDB and state
              await db.transaction("rw", db.tasks, async () => {
                await db.tasks.clear();
                if (importedTasks.length > 0) {
                  await db.tasks.bulkAdd(importedTasks);
                }
              });

              // Update state with imported tasks
              setStoredValue(
                importedTasks.map((item) => serializeTask(item)) as unknown as T
              );

              resolve({
                success: true,
                message: `Imported ${importedTasks.length} tasks successfully`,
              });
            } catch (error) {
              const errorMessage = "Failed to parse imported data";
              console.error(errorMessage, error);
              toast.error(errorMessage);
              resolve({
                success: false,
                message: errorMessage,
              });
            }
          };

          reader.onerror = () => {
            const errorMessage = "Failed to read file";
            toast.error(errorMessage);
            resolve({ success: false, message: errorMessage });
          };

          reader.readAsText(file);
        });
      } catch (error) {
        const errorMessage = "Failed to import data";
        console.error(errorMessage, error);
        toast.error(errorMessage);
        return { success: false, message: errorMessage };
      }
    },
    [storeName, setStoredValue]
  );

  return [storedValue, setValue, exportData, importData] as const;
}

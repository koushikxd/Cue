import { determineAction } from "@/app/actions";
import { useIndexedDB, addOrReplaceSyncQueueItem } from "@/hooks/use-indexed-db";
import { serializeTask } from "@/lib/utils/task";
import { TaskItem } from "@/types";
import { format } from "date-fns";
import React from "react";
import { toast } from "sonner";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

interface TaskState {
  tasks: TaskItem[];
  isLoading: boolean;
  error: string | null;
}

interface TaskActions {
  setTasks: (tasks: TaskItem[] | ((prev: TaskItem[]) => TaskItem[])) => void;
  addTask: (
    task: Omit<TaskItem, "id" | "created_at" | "updated_at">
  ) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<TaskItem>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  toggleTask: (taskId: string) => Promise<void>;
  processAIActions: (
    text: string,
    selectedDate: Date,
    userSettings: any,
    googleCalendar: any
  ) => Promise<void>;
  clearTasks: (
    listToClear: "all" | "completed" | "incomplete",
    selectedDate: Date
  ) => Promise<void>;
  exportTasks: () => Promise<{ success: boolean; message: string }>;
  importTasks: (file: File) => Promise<{ success: boolean; message: string }>;
  initializeTasks: () => Promise<void>;
}

type TaskStore = TaskState & TaskActions;

const generateId = () => Math.random().toString(36).substring(7);

const canGoogleSync = (googleCalendar: any, userSettings: any) =>
  userSettings.syncWithGoogleCalendar &&
  googleCalendar.isSignedIn &&
  googleCalendar.hasGoogleConnected();

export async function syncCreate(
  task: TaskItem,
  googleCalendar: any,
  userSettings: any
): Promise<TaskItem> {
  if (!canGoogleSync(googleCalendar, userSettings)) return task;

  if (typeof navigator !== "undefined" && navigator.onLine) {
    const result = await googleCalendar.createEvent(task);
    if (result.success && result.eventId) {
      return { ...task, gcalEventId: result.eventId, syncedWithGCal: true };
    }
    if (!result.retryable) {
      return task;
    }
  }
  await addOrReplaceSyncQueueItem({
    id: generateId(),
    operation: "create",
    taskId: task.id,
    taskData: task,
    timestamp: Date.now(),
  });
  return task;
}

export async function syncUpdate(
  task: TaskItem,
  googleCalendar: any,
  userSettings: any
) {
  if (!task.gcalEventId || !canGoogleSync(googleCalendar, userSettings))
    return false;

  if (typeof navigator !== "undefined" && navigator.onLine) {
    const result = await googleCalendar.updateEvent(task, task.gcalEventId);
    if (result.success) return true;
    if (!result.retryable) return false;
  }
  await addOrReplaceSyncQueueItem({
    id: generateId(),
    operation: "update",
    taskId: task.id,
    taskData: task,
    gcalEventId: task.gcalEventId,
    timestamp: Date.now(),
  });
  return true;
}

export async function syncDelete(
  gcalEventId: string | undefined,
  taskId: string,
  googleCalendar: any,
  userSettings: any
) {
  if (!gcalEventId || !canGoogleSync(googleCalendar, userSettings))
    return false;

  if (typeof navigator !== "undefined" && navigator.onLine) {
    const result = await googleCalendar.deleteEvent(gcalEventId);
    if (result.success) return true;
    if (!result.retryable) return false;
  }
  await addOrReplaceSyncQueueItem({
    id: generateId(),
    operation: "delete",
    taskId,
    gcalEventId,
    timestamp: Date.now(),
  });
  return true;
}

export const useTaskStore = create<TaskStore>()(
  subscribeWithSelector((set, get) => ({
    tasks: [],
    isLoading: false,
    error: null,

    setTasks: (tasks) => {
      set((state) => ({
        tasks: typeof tasks === "function" ? tasks(state.tasks) : tasks,
      }));
    },

    addTask: async (taskData) => {
      const newTask = serializeTask({
        ...taskData,
        id: generateId(),
        created_at: new Date(),
        updated_at: new Date(),
      });

      set((state) => ({
        tasks: [...state.tasks, newTask],
      }));
    },

    updateTask: async (taskId, updates) => {
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId
            ? serializeTask({ ...task, ...updates, updated_at: new Date() })
            : task
        ),
      }));
    },

    deleteTask: async (taskId) => {
      set((state) => ({
        tasks: state.tasks.filter((task) => task.id !== taskId),
      }));
    },

    toggleTask: async (taskId) => {
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId
            ? { ...task, completed: !task.completed, updated_at: new Date() }
            : task
        ),
      }));
    },

    processAIActions: async (
      text,
      selectedDate,
      userSettings,
      googleCalendar
    ) => {
      if (!text.trim()) return;

      try {
        set({ isLoading: true, error: null });

        if (!userSettings.aiEnabled || !userSettings.groqApiKey) {
          let newTask = serializeTask({
            id: generateId(),
            text,
            completed: false,
            date: selectedDate,
            priority: userSettings.defaultPriority,
          });

          newTask = await syncCreate(newTask, googleCalendar, userSettings);
          set((state) => ({ tasks: [...state.tasks, newTask] }));
          toast.success("Task created", { duration: 2000 });
          return;
        }

        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const { actions } = await determineAction(
          text,
          get().tasks,
          userSettings.defaultModel || "llama-3.1-8b",
          timezone,
          userSettings.groqApiKey
        );

        let newTasks = [...get().tasks];

        await Promise.all(
          actions.map(async (action) => {
            switch (action.action) {
              case "add": {
                let taskDate = selectedDate;
                if (action.targetDate) {
                  taskDate = new Date(action.targetDate);
                }
                let newTask = serializeTask({
                  id: generateId(),
                  text: action.text || text,
                  completed: false,
                  date: taskDate,
                  scheduled_time: action.scheduled_time,
                  priority: action.priority || userSettings.defaultPriority,
                });

                newTask = await syncCreate(newTask, googleCalendar, userSettings);
                newTasks.push(newTask);
                break;
              }

              case "delete":
                if (action.taskId) {
                  const taskToDelete = newTasks.find(
                    (task) => task.id === action.taskId
                  );
                  if (taskToDelete) {
                    await syncDelete(
                      taskToDelete.gcalEventId,
                      taskToDelete.id,
                      googleCalendar,
                      userSettings
                    );
                  }
                  newTasks = newTasks.filter(
                    (task) => task.id !== action.taskId
                  );
                }
                break;

              case "mark":
                if (action.taskId) {
                  newTasks = newTasks.map((task) => {
                    if (task.id === action.taskId) {
                      const completed =
                        action.status === "complete"
                          ? true
                          : action.status === "incomplete"
                          ? false
                          : !task.completed;
                      return { ...task, completed, updated_at: new Date() };
                    }
                    return task;
                  });
                }
                break;

              case "edit":
                if (action.taskId) {
                  newTasks = await Promise.all(
                    newTasks.map(async (task) => {
                      if (task.id === action.taskId) {
                        const updatedTask = serializeTask({
                          ...task,
                          text: action.text || task.text,
                          date: action.targetDate
                            ? new Date(action.targetDate)
                            : task.date,
                          scheduled_time:
                            action.scheduled_time || task.scheduled_time,
                          priority:
                            action.priority !== undefined
                              ? action.priority
                              : task.priority,
                        });

                        await syncUpdate(updatedTask, googleCalendar, userSettings);
                        return updatedTask;
                      }
                      return task;
                    })
                  );
                }
                break;

              case "clear":
                if (action.listToClear) {
                  const dateStr = format(selectedDate, "yyyy-MM-dd");
                  let tasksToRemove: TaskItem[] = [];

                  switch (action.listToClear) {
                    case "all":
                      tasksToRemove = get().tasks.filter(
                        (task) => format(task.date, "yyyy-MM-dd") === dateStr
                      );
                      newTasks = get().tasks.filter(
                        (task) => format(task.date, "yyyy-MM-dd") !== dateStr
                      );
                      break;
                    case "completed":
                      tasksToRemove = get().tasks.filter(
                        (task) =>
                          task.completed &&
                          format(task.date, "yyyy-MM-dd") === dateStr
                      );
                      newTasks = get().tasks.filter(
                        (task) =>
                          !(
                            task.completed &&
                            format(task.date, "yyyy-MM-dd") === dateStr
                          )
                      );
                      break;
                    case "incomplete":
                      tasksToRemove = get().tasks.filter(
                        (task) =>
                          !task.completed &&
                          format(task.date, "yyyy-MM-dd") === dateStr
                      );
                      newTasks = get().tasks.filter(
                        (task) =>
                          !(
                            !task.completed &&
                            format(task.date, "yyyy-MM-dd") === dateStr
                          )
                      );
                      break;
                  }

                  for (const task of tasksToRemove) {
                    await syncDelete(
                      task.gcalEventId,
                      task.id,
                      googleCalendar,
                      userSettings
                    );
                  }
                }
                break;
            }
          })
        );

        set({ tasks: newTasks });

        if (actions.length > 0) {
          actions.forEach((action) => {
            if (action.action === "add") {
              toast.success("Task created", {
                description: action.text || text,
                duration: 2000,
              });
            }
          });
        }
      } catch (error) {
        console.error("AI Action failed:", error);

        let newTask = serializeTask({
          id: generateId(),
          text,
          completed: false,
          date: selectedDate,
          priority: userSettings.defaultPriority,
        });

        newTask = await syncCreate(newTask, googleCalendar, userSettings);
        set((state) => ({
          tasks: [...state.tasks, newTask],
          error: "AI processing failed, created simple task instead",
        }));
        toast.success("Task created", { duration: 2000 });
      } finally {
        set({ isLoading: false });
      }
    },

    clearTasks: async (listToClear, selectedDate) => {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      let tasksToRemove: TaskItem[] = [];
      let remainingTasks: TaskItem[] = [];

      const tasks = get().tasks;

      switch (listToClear) {
        case "all":
          tasksToRemove = tasks.filter(
            (task) => format(task.date, "yyyy-MM-dd") === dateStr
          );
          remainingTasks = tasks.filter(
            (task) => format(task.date, "yyyy-MM-dd") !== dateStr
          );
          break;
        case "completed":
          tasksToRemove = tasks.filter(
            (task) =>
              task.completed && format(task.date, "yyyy-MM-dd") === dateStr
          );
          remainingTasks = tasks.filter(
            (task) =>
              !(task.completed && format(task.date, "yyyy-MM-dd") === dateStr)
          );
          break;
        case "incomplete":
          tasksToRemove = tasks.filter(
            (task) =>
              !task.completed && format(task.date, "yyyy-MM-dd") === dateStr
          );
          remainingTasks = tasks.filter(
            (task) =>
              !(!task.completed && format(task.date, "yyyy-MM-dd") === dateStr)
          );
          break;
      }

      set({ tasks: remainingTasks });
      toast.success(`Cleared ${tasksToRemove.length} tasks`);
    },

    exportTasks: async () => {
      try {
        const tasks = get().tasks;
        const tasksJson = JSON.stringify(tasks, null, 2);

        const blob = new Blob([tasksJson], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        const date = new Date().toISOString().split("T")[0];
        link.download = `cue-tasks-${date}.json`;
        link.href = url;
        link.click();

        URL.revokeObjectURL(url);

        return { success: true, message: "Data exported successfully" };
      } catch (error) {
        console.error("Failed to export data:", error);
        return { success: false, message: "Failed to export data" };
      }
    },

    importTasks: async (file) => {
      try {
        return new Promise<{ success: boolean; message: string }>((resolve) => {
          const reader = new FileReader();

          reader.onload = async (e) => {
            try {
              const content = e.target?.result as string;
              const parsedData = JSON.parse(content);

              if (!Array.isArray(parsedData)) {
                throw new Error("Invalid data format: expected array");
              }

              const importedTasks = parsedData.map((task: any) =>
                serializeTask({
                  ...task,
                  date: new Date(task.date),
                  created_at: task.created_at
                    ? new Date(task.created_at)
                    : new Date(),
                  updated_at: task.updated_at
                    ? new Date(task.updated_at)
                    : new Date(),
                })
              );

              set({ tasks: importedTasks });

              resolve({
                success: true,
                message: `Imported ${importedTasks.length} tasks successfully`,
              });
            } catch (error) {
              const errorMessage = "Failed to parse imported data";
              console.error(errorMessage, error);
              resolve({ success: false, message: errorMessage });
            }
          };

          reader.onerror = () => {
            const errorMessage = "Failed to read file";
            resolve({ success: false, message: errorMessage });
          };

          reader.readAsText(file);
        });
      } catch (error) {
        const errorMessage = "Failed to import data";
        console.error(errorMessage, error);
        return { success: false, message: errorMessage };
      }
    },

    initializeTasks: async () => {
      set({ isLoading: true });
      try {
        set({ isLoading: false });
      } catch (error) {
        set({ error: "Failed to initialize tasks", isLoading: false });
      }
    },
  }))
);

export const useTaskStoreWithPersistence = () => {
  const store = useTaskStore();
  const [indexedTasks, setIndexedTasks, exportData, importData] = useIndexedDB<
    TaskItem[]
  >("tasks", []);

  React.useEffect(() => {
    if (indexedTasks.length > 0 && store.tasks.length === 0) {
      store.setTasks(indexedTasks);
    }
  }, [indexedTasks, store]);

  React.useEffect(() => {
    const unsubscribe = useTaskStore.subscribe(
      (state) => state.tasks,
      (tasks) => {
        setIndexedTasks(tasks);
      }
    );

    return unsubscribe;
  }, [setIndexedTasks]);

  return {
    ...store,
    exportData,
    importData,
  };
};

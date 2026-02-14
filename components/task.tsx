"use client";

import { Button } from "@/components/ui/button";
import {
  filterTasksByDate,
  formatDate,
  serializeTask,
  sortTasks,
} from "@/lib/utils/task";
import { TaskItem } from "@/types";
import { addDays } from "date-fns";
import { CalendarIcon, ViewIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { useSwipeable } from "react-swipeable";
import { Progress } from "./progress";
import { TaskList } from "./task-list";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  syncDelete,
  syncUpdate,
  useTaskStoreWithPersistence,
} from "@/stores/task-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useGoogleCalendar } from "@/hooks";

const EmptyState = ({ isMobile }: { isMobile: boolean }) => {
  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const shortcutKey = isMac ? "⌘K" : "Ctrl+K";
  return (
    <div className="flex flex-col items-center justify-center text-center min-h-[60dvh] p-8 space-y-2">
      {!isMobile && (
        <p className="text-sm text-muted-foreground max-w-[280px]">
          Press <kbd className="bg-muted px-1 rounded">{shortcutKey}</kbd> to
          add a new task
        </p>
      )}
      {isMobile && (
        <p className="text-sm text-muted-foreground max-w-[280px]">
          Use the input box below to add a new task
        </p>
      )}
    </div>
  );
};

export const calculateProgress = (tasks: TaskItem[]) => {
  const completedCount = tasks.filter((task) => task.completed).length;
  return tasks.length > 0
    ? Math.round((completedCount / tasks.length) * 100)
    : 0;
};

const TaskSkeleton = () => (
  <div className="space-y-1" aria-label="Loading task items">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="px-4 py-2.5 flex items-center gap-3">
        <div className="w-5 h-5 bg-muted-foreground/20 animate-pulse" />
        <div className="flex-1">
          <div className="h-2.5 w-32 bg-muted-foreground/20 animate-pulse" />
        </div>
      </div>
    ))}
  </div>
);

interface TaskProps {
  isMobile?: boolean;
  onDateChange?: (date: Date) => void;
}

export default function Task({ isMobile = false, onDateChange }: TaskProps) {
  const [isClientLoaded, setIsClientLoaded] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);

  const { tasks, toggleTask, deleteTask, updateTask } =
    useTaskStoreWithPersistence();
  const { settings } = useSettingsStore();
  const googleCalendar = useGoogleCalendar();

  const [viewState, dispatch] = useReducer(
    (
      state: { mode: "day" | "all"; key: number },
      action: { type: string; payload?: any }
    ) => {
      switch (action.type) {
        case "SET_DAY_MODE":
          return { mode: "day" as const, key: state.key + 1 };
        case "SET_ALL_MODE":
          return { mode: "all" as const, key: state.key + 1 };
        default:
          return state;
      }
    },
    { mode: settings.defaultViewMode === "all" ? "all" : "day", key: 0 }
  );

  const viewMode = viewState.mode;

  useEffect(() => {
    setIsClientLoaded(true);
  }, []);

  useEffect(() => {
    if (settings.defaultViewMode === "all") {
      dispatch({ type: "SET_ALL_MODE" });
    } else {
      dispatch({ type: "SET_DAY_MODE" });
    }
  }, [settings.defaultViewMode]);

  const dateFilteredTasks = useMemo(
    () => (isClientLoaded ? filterTasksByDate(tasks, selectedDate) : []),
    [tasks, selectedDate, isClientLoaded]
  );

  const allTasks = useMemo(
    () => (isClientLoaded ? tasks : []),
    [tasks, isClientLoaded]
  );

  const filteredTasks = useMemo(() => {
    if (!isClientLoaded) return [];
    if (viewMode === "day") {
      return [...dateFilteredTasks];
    } else {
      return [...allTasks];
    }
  }, [viewMode, dateFilteredTasks, allTasks, isClientLoaded]);

  const sortedTasks = useMemo(() => {
    if (!isClientLoaded) return [];
    return sortTasks([...filteredTasks], settings.defaultSortBy);
  }, [filteredTasks, settings.defaultSortBy, isClientLoaded]);

  const taskCounts = useMemo(() => {
    if (!isClientLoaded) return { completed: 0, remaining: 0, progress: 0 };

    const tasksToCount =
      viewMode === "day" ? [...dateFilteredTasks] : [...allTasks];
    const completed = tasksToCount.filter((task) => task.completed).length;
    const remaining = tasksToCount.filter((task) => !task.completed).length;
    const progress =
      tasksToCount.length > 0
        ? Math.round((completed / tasksToCount.length) * 100)
        : 0;

    return { completed, remaining, progress };
  }, [dateFilteredTasks, allTasks, viewMode, isClientLoaded]);

  const handleDeleteTask = useCallback(
    async (id: string) => {
      const taskToDelete = tasks.find((task) => task.id === id);

      await syncDelete(taskToDelete?.gcalEventId, id, googleCalendar, settings);

      await deleteTask(id);
    },
    [tasks, googleCalendar, settings, deleteTask]
  );

  const handleToggleTask = useCallback(
    async (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;

      if (settings.autoRemoveCompleted && !task.completed) {
        await handleDeleteTask(id);
      } else {
        const updatedTask = {
          ...task,
          completed: !task.completed,
          updated_at: new Date(),
        };

        if (task.gcalEventId) {
          await syncUpdate(updatedTask, googleCalendar, settings);
        }

        await toggleTask(id);
      }
    },
    [toggleTask, tasks, settings, googleCalendar, handleDeleteTask]
  );

  const startEditing = useCallback((id: string, text: string) => {
    setEditingTaskId(id);
    setEditText(text);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingTaskId(null);
    setEditText("");
  }, []);

  const handleEditTask = useCallback(
    async (updatedTask: TaskItem) => {
      if (!updatedTask.text.trim()) {
        cancelEditing();
        return;
      }

      try {
        const task = tasks.find((t) => t.id === updatedTask.id);
        if (!task) return;

        const finalTask = serializeTask({
          ...task,
          text: updatedTask.text,
          scheduled_time: updatedTask.scheduled_time,
          priority: updatedTask.priority,
        });

        if (
          task.gcalEventId &&
          (task.text !== updatedTask.text ||
            task.scheduled_time !== updatedTask.scheduled_time ||
            task.priority !== updatedTask.priority)
        ) {
          await syncUpdate(finalTask, googleCalendar, settings);
        }

        await updateTask(updatedTask.id, finalTask);
        cancelEditing();
      } catch (error) {
        console.error("Failed to update task:", error);
      }
    },
    [
      tasks,
      updateTask,
      cancelEditing,
      googleCalendar,
      settings,
    ]
  );

  const handleDateSelect = useCallback(
    (date: Date | undefined) => {
      if (date) {
        setSelectedDate(date);
        onDateChange?.(date);
        setCalendarOpen(false);
        setTimeout(() => {
          const trigger = document.querySelector(
            '[data-calendar-trigger="true"]'
          );
          if (trigger instanceof HTMLElement) {
            trigger.focus();
          }
        }, 100);
      }
    },
    [onDateChange]
  );

  const handleViewModeChange = useCallback(
    (mode: "day" | "all") => {
      if (mode === viewMode) return;

      if (mode === "day") {
        dispatch({ type: "SET_DAY_MODE" });
      } else {
        dispatch({ type: "SET_ALL_MODE" });
      }
    },
    [viewMode]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && editingTaskId) {
        cancelEditing();
      }

      if (e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        if (viewMode === "day") {
          handleViewModeChange("all");
        } else {
          handleViewModeChange("day");
        }
      }

      if (e.altKey) {
        if (e.key === "[" || e.code === "BracketLeft") {
          e.preventDefault();
          if (viewMode === "all") {
            handleViewModeChange("day");
          }
          setSelectedDate((prev) => {
            const newDate = addDays(prev, -1);
            onDateChange?.(newDate);
            return newDate;
          });
        }

        if (e.key === "]" || e.code === "BracketRight") {
          e.preventDefault();
          if (viewMode === "all") {
            handleViewModeChange("day");
          }
          setSelectedDate((prev) => {
            const newDate = addDays(prev, 1);
            onDateChange?.(newDate);
            return newDate;
          });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    viewMode,
    setSelectedDate,
    editingTaskId,
    cancelEditing,
    handleViewModeChange,
    onDateChange,
  ]);

  useEffect(() => {
    onDateChange?.(selectedDate);
  }, [onDateChange, selectedDate]);

  // Handle swipe gestures for mobile
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (viewMode === "day" && isMobile) {
        handleViewModeChange("all");
      }
    },
    onSwipedRight: () => {
      if (viewMode === "all" && isMobile) {
        handleViewModeChange("day");
      }
    },
    trackMouse: false,
    trackTouch: true,
    delta: 50,
    preventScrollOnSwipe: false,
    rotationAngle: 0,
  });

  return (
    <div className="w-full flex flex-col h-full bg-neutral-900">
      <div className="flex items-center justify-between sticky bg-neutral-900 top-0 z-30 py-2 border-b border-neutral-800/40">
        <div className="flex items-center gap-2">
          <div className="flex h-9 overflow-hidden border-input rounded-md border bg-neutral-900 dark:bg-neutral-900/80 relative">
            <div
              className="absolute h-full bg-neutral-800 z-0 w-1/2 transition-transform duration-300 ease-out"
              style={{
                transform:
                  viewMode === "day" ? "translateX(0)" : "translateX(100%)",
              }}
            />
            <button
              type="button"
              onClick={() => {
                if (viewMode !== "day") {
                  handleViewModeChange("day");
                }
              }}
              className={`px-3 py-2 text-xs cursor-pointer font-medium flex items-center gap-1.5 transition-colors relative z-10 w-1/2 justify-center ${
                viewMode === "day"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground/80"
              }`}
              aria-label="Switch to day view"
              aria-pressed={viewMode === "day"}
              title="View tasks by day"
            >
              <CalendarIcon size={14} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (viewMode !== "all") {
                  handleViewModeChange("all");
                }
              }}
              className={`px-3 py-2 text-xs cursor-pointer font-medium flex items-center gap-1.5 transition-colors relative z-10 w-1/2 justify-center ${
                viewMode === "all"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground/80"
              }`}
              aria-label="Switch to all tasks view"
              aria-pressed={viewMode === "all"}
              title="View all tasks"
            >
              <ViewIcon size={14} />
            </button>
          </div>
          {viewMode === "day" && (
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="group h-9 px-4 py-2 hover:cursor-pointer bg-neutral-900 dark:bg-neutral-900/80 border border-border hover:bg-background/70 dark:hover:bg-neutral-800 transition-all duration-300 ease-in-out flex items-center gap-2 lg:gap-3 w-auto"
                  aria-label={`Select date: currently ${formatDate(
                    selectedDate
                  )}`}
                  data-calendar-trigger="true"
                >
                  <span className="font-medium text-foreground text-center dark:text-zinc-200">
                    {formatDate(selectedDate)}
                  </span>
                  <span className="flex-1 lg:flex items-center text-xs font-normal text-muted-foreground dark:text-neutral-400 hidden">
                    <span>{taskCounts.remaining}</span>
                    <span className="ml-1">
                      {taskCounts.remaining === 1 ? "task" : "tasks"}
                    </span>
                    {taskCounts.completed > 0 && (
                      <span className="flex items-center ml-1 animate-in slide-in-from-left-2 duration-300 ease-in-out w-auto max-w-[200px] transition-all overflow-hidden">
                        <span className="h-1 w-1 rounded-full bg-muted-foreground/30 mx-1.5 animate-in fade-in duration-300" />
                        <span className="text-muted-foreground/70 dark:text-neutral-500 animate-in fade-in duration-300">
                          {taskCounts.completed}
                        </span>
                        <span className="ml-1 text-muted-foreground/60 dark:text-neutral-500 animate-in fade-in duration-300">
                          done
                        </span>
                      </span>
                    )}
                  </span>
                  {filteredTasks.length > 0 && (
                    <span className="flex lg:hidden items-center">
                      <Progress progress={taskCounts.progress} size={16} />
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0 border-border/40 bg-neutral-900 dark:bg-neutral-900 shadow-md"
                align="start"
              >
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  initialFocus
                  disabled={(date) => date < new Date("1900-01-01")}
                />
              </PopoverContent>
            </Popover>
          )}
          {viewMode === "all" && (
            <div className="h-9 px-4 py-2 bg-neutral-900 dark:bg-neutral-900/80 border border-border/40 rounded-md flex items-center dark:border-input gap-2">
              <span className="flex items-center text-xs font-normal text-muted-foreground dark:text-neutral-400">
                <span>{tasks.filter((t) => !t.completed).length}</span>
                <span className="ml-1">active</span>
                {tasks.filter((t) => t.completed).length > 0 && (
                  <span className="flex items-center ml-1">
                    <span className="h-1 w-1 rounded-full bg-muted-foreground/30 mx-1.5" />
                    <span className="text-muted-foreground/70 dark:text-neutral-500">
                      {tasks.filter((t) => t.completed).length}
                    </span>
                    <span className="ml-1 text-muted-foreground/60 dark:text-neutral-500">
                      done
                    </span>
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
        {filteredTasks.length > 0 && (
          <div className="hidden lg:flex items-center">
            <Progress progress={taskCounts.progress} size={24} />
          </div>
        )}
      </div>
      <div className="pt-[0.5px] bg-neutral-800 relative z-10"></div>
      <div
        className="flex-1 overflow-hidden relative"
        {...(isMobile ? swipeHandlers : {})}
      >
        {!isClientLoaded ? (
          <div className="overflow-y-auto h-full">
            <TaskSkeleton />
          </div>
        ) : sortedTasks.length === 0 ? (
          <div className="overflow-y-auto h-full">
            <EmptyState isMobile={isMobile} />
          </div>
        ) : (
          <div className="relative h-full overflow-hidden">
            <div
              className="absolute inset-0 transition-all duration-300 ease-in-out"
              style={{
                transform: `translateX(${viewMode === "day" ? "0%" : "-100%"})`,
                opacity: viewMode === "day" ? 1 : 0,
                visibility: viewMode === "day" ? "visible" : "hidden",
              }}
            >
              <div className="h-full overflow-y-auto">
                <TaskList
                  tasks={sortTasks(
                    [...dateFilteredTasks],
                    settings.defaultSortBy
                  )}
                  onToggle={handleToggleTask}
                  onDelete={handleDeleteTask}
                  onEdit={startEditing}
                  editingTaskId={editingTaskId}
                  editText={editText}
                  setEditText={setEditText}
                  handleEditTask={handleEditTask}
                  cancelEditing={cancelEditing}
                  viewMode="day"
                  pendingIndicator={settings.pendingEnabled}
                />
              </div>
            </div>

            <div
              className="absolute inset-0 transition-all duration-300 ease-in-out"
              style={{
                transform: `translateX(${viewMode === "all" ? "0%" : "100%"})`,
                opacity: viewMode === "all" ? 1 : 0,
                visibility: viewMode === "all" ? "visible" : "hidden",
              }}
            >
              <div className="h-full overflow-y-auto">
                <TaskList
                  tasks={sortTasks([...allTasks], settings.defaultSortBy)}
                  onToggle={handleToggleTask}
                  onDelete={handleDeleteTask}
                  onEdit={startEditing}
                  editingTaskId={editingTaskId}
                  editText={editText}
                  setEditText={setEditText}
                  handleEditTask={handleEditTask}
                  cancelEditing={cancelEditing}
                  viewMode="all"
                  pendingIndicator={settings.pendingEnabled}
                />
              </div>
            </div>
          </div>
        )}
      </div>
      {isMobile && sortedTasks.length <= 3 && (
        <div className="mb-6 flex z-0 items-center w-full justify-center">
          <span className="text-xs text-muted-foreground/60 bg-muted/30 px-2.5 py-1 rounded-full border border-border/10 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 bg-muted-foreground/40 rounded-full"></span>
            Swipe to switch views
          </span>
        </div>
      )}
    </div>
  );
}

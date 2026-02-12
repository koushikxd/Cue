"use client";

import { SettingsPopover } from "@/components/settings-button";
import { SyncPopover } from "@/components/sync-button";
import { TaskDetailPopover } from "@/components/task-detail-popover";
import { TaskEditDialog } from "@/components/task-edit-dialog";
import { TaskList } from "@/components/task-list";
import { Button } from "@/components/ui/button";
import { formatTimeDisplay } from "@/components/ui/time-picker";
import { useGoogleCalendar } from "@/hooks";
import { cn } from "@/lib/utils";
import { serializeTask, sortTasks } from "@/lib/utils/task";
import { useSettingsStore } from "@/stores/settings-store";
import {
  syncDelete,
  syncUpdate,
  useTaskStoreWithPersistence,
} from "@/stores/task-store";
import type { TaskItem } from "@/types";
import { CaretLeft, CaretRight, Plus } from "@phosphor-icons/react";
import {
  add,
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isEqual,
  isSameDay,
  isSameMonth,
  isToday,
  parse,
  startOfToday,
  startOfWeek,
} from "date-fns";
import {
  AlertCircle,
  CalendarFold,
  CalendarRange,
  ListChecks,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";

interface CalendarEvent {
  id: string;
  name: string;
  time: string;
  datetime: string;
  priority?: "high" | "medium" | "low";
}

interface CalendarData {
  day: Date;
  events: CalendarEvent[];
}

type ViewMode = "month" | "day" | "all";

interface CalendarViewProps {
  onDateChange?: (date: Date) => void;
  onNewTaskClick?: (date: Date) => void;
  isMobile: boolean;
  sync?: {
    isOnline: boolean;
    isSyncing: boolean;
    pendingCount: number;
    lastSyncTime: Date | null;
    syncNow: () => Promise<void>;
    refreshPendingCount: () => Promise<void>;
  };
}

const colStartClasses = [
  "",
  "col-start-2",
  "col-start-3",
  "col-start-4",
  "col-start-5",
  "col-start-6",
  "col-start-7",
] as const;

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const getPriorityColor = (priority?: string): string => {
  switch (priority) {
    case "high":
      return "bg-red-500/20 border-red-500/50 text-red-400";
    case "medium":
      return "bg-orange-500/20 border-orange-500/50 text-orange-400";
    case "low":
      return "bg-blue-500/20 border-blue-500/50 text-blue-400";
    default:
      return "bg-neutral-500/20 border-neutral-500/50 text-neutral-400";
  }
};

const TaskEvent = memo<{
  event: CalendarEvent;
  task: TaskItem;
  isPastDue: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleComplete: () => void;
}>(({ event, task, isPastDue, onEdit, onDelete, onToggleComplete }) => (
  <TaskDetailPopover
    task={task}
    onEdit={onEdit}
    onDelete={onDelete}
    onToggleComplete={onToggleComplete}
  >
    <div
      className={cn(
        "text-xs p-2 border truncate cursor-pointer hover:opacity-90 transition-all duration-200 hover:scale-[1.01] rounded-md shadow-sm backdrop-blur-sm",
        getPriorityColor(event.priority),
        task.completed && "opacity-60 line-through",
      )}
    >
      <p className="font-medium text-white truncate leading-tight text-[11px]">
        {event.name}
      </p>
      {(event.time !== "All day" || isPastDue) && (
        <div className="flex items-center gap-1.5 mt-1">
          {event.time !== "All day" && (
            <span className="text-neutral-300 text-[9px] font-medium bg-neutral-900/40 px-1 py-0.5 rounded">
              {event.time}
            </span>
          )}
          {isPastDue && (
            <div className="flex items-center gap-1">
              <AlertCircle className="w-2.5 h-2.5 text-yellow-500" />
              <span className="text-yellow-500 text-[9px] font-medium">
                Pending
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  </TaskDetailPopover>
));

TaskEvent.displayName = "TaskEvent";

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

function CalendarView({
  onDateChange,
  onNewTaskClick,
  isMobile,
  sync,
}: CalendarViewProps) {
  const { settings } = useSettingsStore();

  const [viewMode, setViewMode] = useState<ViewMode>(settings.defaultViewMode);
  const [selectedDay, setSelectedDay] = useState(startOfToday());
  const [currentMonth, setCurrentMonth] = useState(
    format(startOfToday(), "MMM-yyyy"),
  );
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const { tasks, updateTask, deleteTask, toggleTask } =
    useTaskStoreWithPersistence();
  const googleCalendar = useGoogleCalendar();

  const today = useMemo(() => startOfToday(), []);
  const firstDayCurrentMonth = useMemo(
    () => parse(currentMonth, "MMM-yyyy", new Date()),
    [currentMonth],
  );

  const calendarDays = useMemo(() => {
    return eachDayOfInterval({
      start: startOfWeek(firstDayCurrentMonth),
      end: endOfWeek(endOfMonth(firstDayCurrentMonth)),
    });
  }, [firstDayCurrentMonth]);

  const calendarData = useMemo((): CalendarData[] => {
    return calendarDays.map((day) => ({
      day,
      events: tasks
        .filter((task) => isSameDay(task.date, day))
        .map((task) => ({
          id: task.id,
          name: task.text,
          time: task.scheduled_time
            ? formatTimeDisplay(task.scheduled_time)
            : "All day",
          datetime: format(task.date, "yyyy-MM-dd"),
          priority: task.priority,
        })),
    }));
  }, [tasks, calendarDays]);

  const filteredTasksForView = useMemo(() => {
    if (viewMode === "day") {
      return tasks.filter((task) => isSameDay(task.date, selectedDay));
    }
    if (viewMode === "all") {
      return tasks;
    }
    return [];
  }, [tasks, selectedDay, viewMode]);

  const sortedTasksForView = useMemo(() => {
    return sortTasks([...filteredTasksForView], settings.defaultSortBy);
  }, [filteredTasksForView, settings.defaultSortBy]);

  const periodTitles = useMemo(() => {
    const monthTitle = format(firstDayCurrentMonth, "MMMM yyyy");
    const dayTitle = format(selectedDay, "EEEE, MMMM d, yyyy");

    const monthSubtitle = `${format(firstDayCurrentMonth, "MMM d")} - ${format(
      endOfMonth(firstDayCurrentMonth),
      "MMM d, yyyy",
    )}`;

    return {
      month: { title: monthTitle, subtitle: monthSubtitle },
      day: { title: dayTitle, subtitle: "Tasks for selected day" },
      all: { title: "All Tasks", subtitle: "Complete task management" },
    };
  }, [firstDayCurrentMonth, selectedDay]);

  const isDateBeforeToday = useCallback((dateInput?: string | Date) => {
    if (!dateInput) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const taskDate =
      typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    taskDate.setHours(0, 0, 0, 0);

    return taskDate < today;
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  const previousPeriod = useCallback(() => {
    if (viewMode === "month") {
      const firstDayNextMonth = add(firstDayCurrentMonth, { months: -1 });
      setCurrentMonth(format(firstDayNextMonth, "MMM-yyyy"));
    } else if (viewMode === "day") {
      setSelectedDay(addDays(selectedDay, -1));
    } else if (viewMode === "all") {
      setViewMode("day");
      setSelectedDay(addDays(selectedDay, -1));
    }
  }, [viewMode, firstDayCurrentMonth, selectedDay]);

  const nextPeriod = useCallback(() => {
    if (viewMode === "month") {
      const firstDayNextMonth = add(firstDayCurrentMonth, { months: 1 });
      setCurrentMonth(format(firstDayNextMonth, "MMM-yyyy"));
    } else if (viewMode === "day") {
      setSelectedDay(addDays(selectedDay, 1));
    } else if (viewMode === "all") {
      setViewMode("day");
      setSelectedDay(addDays(selectedDay, 1));
    }
  }, [viewMode, firstDayCurrentMonth, selectedDay]);

  const goToToday = useCallback(() => {
    setSelectedDay(today);
    setCurrentMonth(format(today, "MMM-yyyy"));
  }, [today]);

  const handleTaskEdit = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        setEditingTask(task);
        setEditDialogOpen(true);
      }
    },
    [tasks],
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
      settings.syncWithGoogleCalendar,
      googleCalendar,
    ],
  );

  const handleTaskSave = useCallback(
    async (updatedTask: TaskItem) => {
      const task = tasks.find((t) => t.id === updatedTask.id);
      if (!task) return;

      if (
        task.gcalEventId &&
        (task.text !== updatedTask.text ||
          task.scheduled_time !== updatedTask.scheduled_time ||
          task.priority !== updatedTask.priority)
      ) {
        await syncUpdate(updatedTask, googleCalendar, settings);
      }

      await updateTask(updatedTask.id, {
        ...updatedTask,
        updated_at: new Date(),
      });
    },
    [updateTask, tasks, settings.syncWithGoogleCalendar, googleCalendar],
  );

  const handleTaskDelete = useCallback(
    async (taskId: string) => {
      const taskToDelete = tasks.find((task) => task.id === taskId);

      await syncDelete(taskToDelete?.gcalEventId, taskId, googleCalendar, settings);

      await deleteTask(taskId);
    },
    [tasks, settings.syncWithGoogleCalendar, googleCalendar, deleteTask],
  );

  const handleTaskToggleComplete = useCallback(
    async (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      if (settings.autoRemoveCompleted && !task.completed) {
        await handleTaskDelete(taskId);
      } else {
        const updatedTask = {
          ...task,
          completed: !task.completed,
          updated_at: new Date(),
        };

        if (task.gcalEventId) {
          await syncUpdate(updatedTask, googleCalendar, settings);
        }

        await toggleTask(taskId);
      }
    },
    [
      tasks,
      settings.autoRemoveCompleted,
      settings.syncWithGoogleCalendar,
      googleCalendar,
      toggleTask,
      handleTaskDelete,
    ],
  );

  const handleDayClick = useCallback((day: Date) => {
    setSelectedDay(day);
  }, []);

  const handleDayDoubleClick = useCallback(
    (day: Date) => {
      setSelectedDay(day);
      onNewTaskClick?.(day);
    },
    [onNewTaskClick],
  );

  useEffect(() => {
    onDateChange?.(selectedDay);
  }, [selectedDay, onDateChange]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && editingTaskId) {
        cancelEditing();
      }

      if (e.altKey) {
        if (e.key === "[" || e.code === "BracketLeft") {
          e.preventDefault();
          previousPeriod();
        }

        if (e.key === "]" || e.code === "BracketRight") {
          e.preventDefault();
          nextPeriod();
        }
      }
      if (e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        if (viewMode === "month") {
          handleViewModeChange("all");
        } else if (viewMode === "all") {
          handleViewModeChange("day");
        } else {
          handleViewModeChange("month");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    viewMode,
    previousPeriod,
    nextPeriod,
    handleViewModeChange,
    editingTaskId,
    cancelEditing,
  ]);

  useEffect(() => {
    if (!isMobile) {
      setViewMode(settings.defaultViewMode);
    }
  }, [settings.defaultViewMode, isMobile]);

  const renderMonthView = useCallback(() => {
    return (
      <>
        <div className="sticky top-0 z-10 grid grid-cols-7 border-b border-neutral-800/40 text-center text-sm font-medium leading-6 bg-neutral-900/95 backdrop-blur-sm">
          {WEEK_DAYS.map((day) => (
            <div
              key={day}
              className="border-r border-neutral-800/40 py-4 text-neutral-400 last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-7">
            {calendarDays.map((day, dayIdx) => {
              const dayEvents =
                calendarData.find((d) => isSameDay(d.day, day))?.events || [];

              return (
                <div
                  key={day.getTime()}
                  onClick={() => handleDayClick(day)}
                  onDoubleClick={() => handleDayDoubleClick(day)}
                  className={cn(
                    dayIdx === 0 && colStartClasses[getDay(day)],
                    !isSameMonth(day, firstDayCurrentMonth) &&
                      "bg-neutral-900/50 text-neutral-600",
                    "relative flex flex-col border-b border-r border-neutral-800/40 hover:bg-neutral-800/30 cursor-pointer transition-all duration-200 ease-in-out overflow-hidden group last:border-r-0",
                    "h-[190px] max-h-[190px]",
                    isEqual(day, selectedDay) &&
                      "bg-neutral-800/50 ring-2 ring-neutral-700/50 ring-inset",
                  )}
                >
                  <header className="flex items-center justify-between p-3 pb-2.5 flex-shrink-0">
                    <button
                      type="button"
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all duration-200 hover:scale-105",
                        isEqual(day, selectedDay) &&
                          isToday(day) &&
                          "bg-white text-black shadow-md",
                        isEqual(day, selectedDay) &&
                          !isToday(day) &&
                          "bg-neutral-700 text-white shadow-md",
                        !isEqual(day, selectedDay) &&
                          isToday(day) &&
                          "bg-gradient-to-br from-neutral-700 to-neutral-600 text-white shadow-md",
                        !isEqual(day, selectedDay) &&
                          !isToday(day) &&
                          "hover:bg-neutral-800 hover:text-white",
                        !isSameMonth(day, firstDayCurrentMonth) &&
                          "text-neutral-600",
                      )}
                    >
                      <time dateTime={format(day, "yyyy-MM-dd")}>
                        {format(day, "d")}
                      </time>
                    </button>
                  </header>
                  <div className="flex-1 px-3 -mt-1 space-y-1.5 relative min-h-0 pb-3 overflow-y-auto">
                    {dayEvents.slice(0, 3).map((event, index) => {
                      const task = tasks.find((t) => t.id === event.id);
                      if (!task) return null;

                      const isPastDue =
                        settings.pendingEnabled &&
                        task.date &&
                        isDateBeforeToday(task.date) &&
                        !task.completed;

                      return (
                        <TaskEvent
                          key={event.id}
                          event={event}
                          task={task}
                          isPastDue={isPastDue}
                          onEdit={() => handleTaskEdit(event.id)}
                          onDelete={() => handleTaskDelete(event.id)}
                          onToggleComplete={() =>
                            handleTaskToggleComplete(event.id)
                          }
                        />
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDay(day);
                          setViewMode("day");
                        }}
                        className="text-[10px] text-neutral-500 font-medium cursor-pointer hover:text-neutral-400 transition-colors duration-200 px-1 py-0.5"
                      >
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </>
    );
  }, [
    calendarDays,
    calendarData,
    firstDayCurrentMonth,
    selectedDay,
    tasks,
    settings.pendingEnabled,
    isDateBeforeToday,
    handleDayClick,
    handleDayDoubleClick,
    handleTaskEdit,
    handleTaskDelete,
    handleTaskToggleComplete,
  ]);

  const renderTasksView = useCallback(() => {
    return (
      <div className="flex-1 flex justify-center bg-neutral-900">
        <div className="w-full max-w-2xl">
          <div className="overflow-y-auto h-full">
            {sortedTasksForView.length === 0 ? (
              <EmptyState isMobile={false} />
            ) : (
              <TaskList
                tasks={sortedTasksForView}
                onToggle={handleTaskToggleComplete}
                onDelete={handleTaskDelete}
                onEdit={startEditing}
                editingTaskId={editingTaskId}
                editText={editText}
                setEditText={setEditText}
                handleEditTask={handleEditTask}
                cancelEditing={cancelEditing}
                viewMode={viewMode === "day" ? "day" : "all"}
                pendingIndicator={settings.pendingEnabled}
              />
            )}
          </div>
        </div>
      </div>
    );
  }, [
    sortedTasksForView,
    handleTaskToggleComplete,
    handleTaskDelete,
    startEditing,
    editingTaskId,
    editText,
    setEditText,
    handleEditTask,
    cancelEditing,
    viewMode,
    settings.pendingEnabled,
  ]);

  const currentPeriod = periodTitles[viewMode];

  return (
    <main className="flex flex-col w-full h-full mx-auto bg-neutral-900">
      <div className="flex flex-col space-y-4 p-4 md:flex-row md:items-center md:justify-between md:space-y-0 border-b border-neutral-800/40">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <h2 className="text-xl font-semibold text-foreground">
              {currentPeriod.title}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {currentPeriod.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-10 overflow-hidden border border-neutral-700 rounded-lg bg-neutral-900 dark:bg-neutral-900/80 relative shadow-sm">
            <div
              className="absolute h-full bg-neutral-800 z-0 transition-transform duration-300 ease-out rounded-md"
              style={{
                width: "calc(34.333%)",
                transform:
                  viewMode === "all"
                    ? "translateX(0px)"
                    : viewMode === "day"
                      ? "translateX(calc(95.44%))"
                      : "translateX(calc(196%))",
              }}
            />
            <button
              type="button"
              onClick={() => handleViewModeChange("all")}
              className={cn(
                "px-3 py-2 text-sm cursor-pointer font-medium flex items-center gap-1.5 transition-colors relative z-10 justify-center",
                "flex-1 min-w-0",
                viewMode === "all"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground/80",
              )}
              aria-label="Switch to all tasks view"
              aria-pressed={viewMode === "all"}
              title="All tasks view (Shift+Tab to cycle)"
            >
              <ListChecks size={14} className="shrink-0" />
              <span className="hidden sm:inline">All</span>
            </button>
            <button
              type="button"
              onClick={() => handleViewModeChange("day")}
              className={cn(
                "px-3 py-2 text-sm cursor-pointer font-medium flex items-center gap-1.5 transition-colors relative z-10 justify-center",
                "flex-1 min-w-0",
                viewMode === "day"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground/80",
              )}
              aria-label="Switch to day view"
              aria-pressed={viewMode === "day"}
              title="Day view (Shift+Tab to cycle)"
            >
              <CalendarFold size={14} className="shrink-0" />
              <span className="hidden sm:inline">Day</span>
            </button>
            <button
              type="button"
              onClick={() => handleViewModeChange("month")}
              className={cn(
                "px-3 py-2 text-sm cursor-pointer font-medium flex items-center gap-1.5 transition-colors relative z-10 justify-center",
                "flex-1 min-w-0",
                viewMode === "month"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground/80",
              )}
              aria-label="Switch to month view"
              aria-pressed={viewMode === "month"}
              title="Month view (Shift+Tab to cycle)"
            >
              <CalendarRange size={14} className="shrink-0" />
              <span className="hidden sm:inline">Month</span>
            </button>
          </div>

          <div className="inline-flex -space-x-px rounded-lg border border-neutral-800 shadow-sm">
            <Button
              onClick={previousPeriod}
              className="rounded-none cursor-pointer shadow-none first:rounded-l-lg last:rounded-r-lg focus-visible:z-10 bg-transparent border-0 hover:bg-neutral-800/50 transition-colors duration-200"
              variant="outline"
              size="icon"
              aria-label={`Previous ${viewMode} (Alt+[)`}
            >
              <CaretLeft size={16} />
            </Button>
            <Button
              onClick={goToToday}
              className="rounded-none cursor-pointer shadow-none first:rounded-l-lg last:rounded-r-lg focus-visible:z-10 bg-transparent border-0 hover:bg-neutral-800/50 px-4 transition-colors duration-200"
              variant="outline"
            >
              Today
            </Button>
            <Button
              onClick={nextPeriod}
              className="rounded-none cursor-pointer shadow-none first:rounded-l-lg last:rounded-r-lg focus-visible:z-10 bg-transparent border-0 hover:bg-neutral-800/50 transition-colors duration-200"
              variant="outline"
              size="icon"
              aria-label={`Next ${viewMode} (Alt+])`}
            >
              <CaretRight size={16} />
            </Button>
          </div>

          <Button
            onClick={() => onNewTaskClick?.(selectedDay)}
            variant="outline"
            className="gap-2 cursor-pointer bg-neutral-800/50 hover:bg-neutral-700/50 border-neutral-700/50 text-neutral-200 transition-all duration-200 hover:shadow-md px-4 py-2 h-10"
          >
            <Plus size={16} weight="bold" className="text-neutral-300" />
            <span className="flex items-center gap-2">
              New Task
              <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-neutral-400 bg-neutral-900/50 border border-neutral-700/50 rounded-md">
                ⌘K
              </kbd>
            </span>
          </Button>

          <div className="flex gap-3">
            <SyncPopover sync={sync} />
            <SettingsPopover isMobile={isMobile} />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {(viewMode === "day" || viewMode === "all") && renderTasksView()}
        {viewMode === "month" && renderMonthView()}
      </div>

      <TaskEditDialog
        task={editingTask}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleTaskSave}
        isMobile={isMobile}
      />
    </main>
  );
}

export default CalendarView;

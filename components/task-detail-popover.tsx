"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatTimeDisplay } from "@/components/ui/time-picker";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/task";
import { useSettingsStore } from "@/stores/settings-store";
import { TaskItem } from "@/types";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  CheckCheck,
  CheckCircle2,
  Circle,
  Edit3,
  Trash2,
} from "lucide-react";
import { ReactNode, useCallback, useState } from "react";
import { TextWithLinks } from "./task-list";

interface TaskDetailPopoverProps {
  task: TaskItem;
  children: ReactNode;
  onEdit: () => void;
  onDelete: () => void;
  onToggleComplete?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const PriorityBadge = ({
  priority,
}: {
  priority?: "high" | "medium" | "low";
}) => {
  if (!priority) return null;

  const priorityConfig = {
    high: {
      color: "bg-red-500/15 border-red-500/30 text-red-400",
      dot: "bg-red-500",
      label: "High",
    },
    medium: {
      color: "bg-orange-500/15 border-orange-500/30 text-orange-400",
      dot: "bg-orange-500",
      label: "Medium",
    },
    low: {
      color: "bg-blue-500/15 border-blue-500/30 text-blue-400",
      dot: "bg-blue-500",
      label: "Low",
    },
  };

  const config = priorityConfig[priority];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium",
        config?.color,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", config?.dot)} />
      {config?.label}
    </div>
  );
};

const TaskStatusIndicator = ({
  completed,
  isPastDue,
}: {
  completed: boolean;
  isPastDue: boolean;
}) => {
  return (
    <div className="flex items-center gap-2">
      {completed ? (
        <CheckCircle2 className="w-4 h-4 text-green-500" />
      ) : isPastDue ? (
        <AlertCircle className="w-4 h-4 text-yellow-500" />
      ) : (
        <Circle className="w-4 h-4 text-muted-foreground" />
      )}
      <span
        className={cn(
          "text-sm font-medium",
          completed ? "text-green-500" : "text-muted-foreground",
        )}
      >
        {completed ? "Completed" : "Pending"}
      </span>
    </div>
  );
};

export function TaskDetailPopover({
  task,
  children,
  onEdit,
  onDelete,
  onToggleComplete,
  open,
  onOpenChange,
}: TaskDetailPopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const { settings } = useSettingsStore();

  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  const isDateBeforeToday = useCallback((dateInput?: string | Date) => {
    if (!dateInput) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const taskDate =
      typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    taskDate.setHours(0, 0, 0, 0);

    return taskDate < today;
  }, []);

  const isPastDue =
    settings.pendingEnabled &&
    task.date &&
    isDateBeforeToday(task.date) &&
    !task.completed;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} modal>
      <PopoverTrigger asChild>{children}</PopoverTrigger>

      <PopoverContent
        className="w-[380px] p-0 bg-neutral-900/95 border-neutral-700/50 backdrop-blur-md shadow-xl"
        align="start"
        sideOffset={8}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{
              type: "tween",
              ease: "easeOut",
              duration: 0.15,
            }}
            className="relative"
          >
            <div className="flex items-start justify-between p-4 pb-3 border-b border-neutral-700/50">
              <div className="flex-1 pr-3">
                <h3 className="font-semibold text-base text-neutral-100 leading-tight">
                  Task Details
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {task.created_at &&
                    `Created ${formatDate(new Date(task.created_at))}`}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-neutral-400  transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                    setIsOpen(false);
                  }}
                  title="Edit task"
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                    setIsOpen(false);
                  }}
                  title="Delete task"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-neutral-300">Task</h4>
                <p
                  className={cn(
                    "text-sm leading-relaxed break-words whitespace-pre-line p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/30",
                    task.completed && "line-through text-neutral-500",
                  )}
                >
                  {task.text}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-neutral-300">
                    Status
                  </h4>
                  <TaskStatusIndicator
                    completed={task.completed}
                    isPastDue={isPastDue}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-neutral-300">Date</h4>
                  <div className="flex items-center gap-2 text-sm text-neutral-400">
                    <span className="text-sm text-muted-foreground font-medium">
                      {new Date(task.date).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                {task.scheduled_time && (
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-neutral-300">
                      Time
                    </h4>
                    <div className="flex items-center gap-2 text-sm text-neutral-400">
                      <span>{formatTimeDisplay(task.scheduled_time)}</span>
                    </div>
                  </div>
                )}

                {task.priority && (
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-neutral-300">
                      Priority
                    </h4>
                    <PriorityBadge priority={task.priority} />
                  </div>
                )}

                {task.description && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-neutral-300">
                      Description
                    </h4>
                    <p className="text-sm text-neutral-400 p-3 rounded-lg bg-neutral-800/30 border border-neutral-700/20 italic">
                      <TextWithLinks
                        text={task.description}
                        isCompleted={task.completed}
                      />
                    </p>
                  </div>
                )}
              </div>

              {onToggleComplete && (
                <div className="pt-2 border-t border-neutral-700/30">
                  <Button
                    variant={task.completed ? "outline" : "default"}
                    size="sm"
                    className={cn(
                      "w-full font-medium transition-all",
                      task.completed
                        ? "border-neutral-600 text-neutral-300 hover:bg-neutral-700/50"
                        : "bg-green-600 hover:bg-green-700 text-white",
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleComplete();
                      setIsOpen(false);
                    }}
                  >
                    {task.completed ? (
                      <>
                        <Circle className="w-4 h-4 mr-2" />
                        Mark as Incomplete
                      </>
                    ) : (
                      <>
                        <CheckCheck className="w-4 h-4 mr-2" />
                        Mark as Complete
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </PopoverContent>
    </Popover>
  );
}

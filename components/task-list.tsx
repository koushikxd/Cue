import { Button } from "@/components/ui/button";
import { CircleCheckbox } from "@/components/ui/circle-checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TimePicker, formatTimeDisplay } from "@/components/ui/time-picker";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/task";
import { TaskItem } from "@/types";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, Clock, ExternalLink, Pencil, X } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useSettingsStore } from "@/stores/settings-store";

const PriorityIndicator = memo(
  ({ priority }: { priority?: "high" | "medium" | "low" }) => {
    if (!priority) return null;

    const styleMap = {
      high: "bg-red-500/20 border-red-500/50 text-red-400",
      medium: "bg-orange-500/20 border-orange-500/50 text-orange-400",
      low: "bg-blue-500/20 border-blue-500/50 text-blue-400",
    };
    return (
      <div
        className={cn(
          "text-xs px-1.5 py-0.5 border capitalize",
          styleMap[priority],
        )}
      >
        {priority}
      </div>
    );
  },
);
PriorityIndicator.displayName = "PriorityIndicator";

const TimeDisplay = memo(({ time }: { time?: string }) => {
  if (!time) return null;

  return (
    <motion.div
      layout
      className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5"
    >
      <Clock className="w-3 h-3" />
      <span>{formatTimeDisplay(time)}</span>
    </motion.div>
  );
});
TimeDisplay.displayName = "TimeDisplay";

const TaskEditForm = memo(
  ({
    task,
    editText,
    setEditText,
    editTime,
    setEditTime,
    editPriority,
    setEditPriority,
    handleEditTask,
    cancelEditing,
  }: {
    task: any;
    editText: string;
    setEditText: (text: string) => void;
    editTime: string;
    setEditTime: (time: string) => void;
    editPriority: "high" | "medium" | "low" | undefined;
    setEditPriority: (priority: "high" | "medium" | "low" | undefined) => void;
    handleEditTask: (task: TaskItem) => void;
    cancelEditing: () => void;
  }) => {
    const editInputRef = useRef<HTMLInputElement>(null);

    const handleEditInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target;
        const newValue = input.value;
        const newPosition = input.selectionStart;

        setEditText(newValue);
        requestAnimationFrame(() => {
          if (input && newPosition !== null) {
            input.setSelectionRange(newPosition, newPosition);
          }
        });
      },
      [setEditText],
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
          handleEditTask({
            ...task,
            text: editText,
            scheduled_time: editTime,
            priority: editPriority,
          });
        } else if (e.key === "Escape") {
          cancelEditing();
        }
      },
      [task, editText, editTime, editPriority, handleEditTask, cancelEditing],
    );

    const handleSave = useCallback(() => {
      handleEditTask({
        ...task,
        text: editText,
        scheduled_time: editTime,
        priority: editPriority,
      });
    }, [task, editText, editTime, editPriority, handleEditTask]);

    return (
      <motion.div
        className="flex-1 flex flex-col w-full py-1 gap-4"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          type: "tween",
          ease: "easeOut",
          duration: 0.2,
          opacity: { duration: 0.15 },
        }}
      >
        <div className="w-full">
          <Input
            ref={editInputRef}
            value={editText}
            onChange={handleEditInputChange}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full h-12 py-2 text-base font-normal bg-background border border-border/20 shadow-sm focus-visible:ring-1 focus-visible:ring-primary px-3"
            placeholder="Edit task..."
          />
        </div>

        <div className="flex w-full gap-2">
          <Select
            value={editPriority || ""}
            onValueChange={(value: string) =>
              setEditPriority(
                value === "none"
                  ? undefined
                  : (value as "high" | "medium" | "low"),
              )
            }
          >
            <SelectTrigger className="h-12 bg-background/50 backdrop-blur-sm border border-border/10 px-3 flex-1 min-w-[140px] transition-all duration-200 hover:border-border/30 focus:border-border/40 focus:ring-0 focus:ring-offset-0">
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent className="border-border/20 bg-neutral-800/90 dark:bg-neutral-800/90 backdrop-blur-md   overflow-hidden">
              <SelectItem value="none" className="text-neutral-400">
                <span>None</span>
              </SelectItem>
              <SelectItem
                value="high"
                className="text-red-500 dark:text-red-400 transition-colors duration-150 hover:bg-accent/50 focus:bg-accent/70"
              >
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                    <span className="h-3 w-3   bg-red-500/90"></span>
                  </span>
                  <span>High</span>
                </div>
              </SelectItem>
              <SelectItem
                value="medium"
                className="text-orange-500 dark:text-orange-400 transition-colors duration-150 hover:bg-accent/50 focus:bg-accent/70"
              >
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3   bg-orange-500/90"></span>
                  <span>Medium</span>
                </div>
              </SelectItem>
              <SelectItem
                value="low"
                className="text-blue-500 dark:text-blue-400 transition-colors duration-150 hover:bg-accent/50 focus:bg-accent/70"
              >
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3   bg-blue-500/90"></span>
                  <span>Low</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <TimePicker
            time={editTime}
            onChange={setEditTime}
            className="border border-border/20 bg-accent  hover:cursor-pointer hover:bg-neutral-700/90    flex-1 min-w-[140px]"
          />
        </div>
        <div className="flex justify-end gap-3 mt-1">
          <Button
            variant="outline"
            className="  text-sm font-medium bg-muted/30 hover:bg-muted/50 border-border/10 text-muted-foreground"
            onClick={cancelEditing}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            className="  text-sm font-medium"
            onClick={handleSave}
          >
            Save
          </Button>
        </div>
      </motion.div>
    );
  },
);
TaskEditForm.displayName = "TaskEditForm";

export const TextWithLinks = memo(
  ({ text, isCompleted }: { text: string; isCompleted: boolean }) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    if (!text.match(urlRegex)) {
      return <>{text}</>;
    }

    const parts = text.split(urlRegex);
    const matches = text.match(urlRegex) || [];

    return (
      <>
        {parts.map((part, i) => {
          if (i % 2 === 0) {
            return part;
          }
          const url = matches[(i - 1) / 2];
          return (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "text-primary hover:underline inline-flex items-center gap-0.5 transition-colors max-w-[200px]",
                isCompleted
                  ? "text-muted-foreground/60 hover:text-muted-foreground/80"
                  : "hover:text-primary/80",
              )}
            >
              <span className="truncate">{url}</span>
              <ExternalLink className="w-3 h-3 flex-shrink-0 ml-0.5" />
            </a>
          );
        })}
      </>
    );
  },
);
TextWithLinks.displayName = "TextWithLinks";

interface TaskListProps {
  tasks: TaskItem[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, text: string) => void;
  editingTaskId: string | null;
  editText: string;
  setEditText: (text: string) => void;
  handleEditTask: (task: TaskItem) => void;
  cancelEditing: () => void;
  viewMode?: "day" | "all";
  pendingIndicator?: boolean;
}

export function TaskList({
  tasks,
  onToggle,
  onDelete,
  onEdit,
  editingTaskId,
  editText,
  setEditText,
  handleEditTask,
  cancelEditing,
  viewMode = "day",
  pendingIndicator,
}: TaskListProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [editTime, setEditTime] = useState<string>("");
  const [editPriority, setEditPriority] = useState<
    "high" | "medium" | "low" | undefined
  >(undefined);

  const { settings } = useSettingsStore();

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  useEffect(() => {
    if (editingTaskId) {
      const task = tasks.find((t) => t.id === editingTaskId);
      setEditTime(task?.scheduled_time || "");
      setEditPriority(task?.priority);
    }
  }, [editingTaskId, tasks]);

  const isDateBeforeToday = useCallback((dateInput?: string | Date) => {
    if (!dateInput) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const taskDate =
      typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    taskDate.setHours(0, 0, 0, 0);

    return taskDate < today;
  }, []);

  const animationVariants = {
    initial: { opacity: 1 },
    animate: { opacity: 1 },
    exit: { opacity: 0, transition: { duration: 0.15 } },
  };

  const animationTransition = {
    type: "tween" as const,
    ease: "easeInOut" as const,
    duration: 0.2,
  };

  return (
    <div className="space-y-px">
      <AnimatePresence initial={false}>
        {tasks.map((task) => {
          const isPending =
            settings.pendingEnabled &&
            pendingIndicator &&
            !task.completed &&
            task.date &&
            isDateBeforeToday(task.date);
          return (
            <motion.div
              key={task.id}
              initial={animationVariants.initial}
              animate={animationVariants.animate}
              exit={animationVariants.exit}
              transition={animationTransition}
              layout="position"
              className={cn(
                "group flex items-center py-2.5 px-4 gap-3.5",
                task.completed && editingTaskId !== task.id
                  ? "text-muted-foreground/50"
                  : "hover:bg-muted/40",
                editingTaskId === task.id && "bg-muted/60",
                isPending && "border-l-2 border-l-yellow-500/60",
                "transition-colors",
              )}
            >
              {editingTaskId === task.id ? (
                <TaskEditForm
                  task={task}
                  editText={editText}
                  setEditText={setEditText}
                  editTime={editTime}
                  setEditTime={setEditTime}
                  editPriority={editPriority}
                  setEditPriority={setEditPriority}
                  handleEditTask={handleEditTask}
                  cancelEditing={cancelEditing}
                />
              ) : (
                <>
                  <motion.div
                    layout="position"
                    className={cn(editingTaskId === task.id && "self-start")}
                  >
                    <CircleCheckbox
                      checked={task.completed}
                      onCheckedChange={() => onToggle(task.id)}
                      className={cn(
                        "hover:cursor-pointer",
                        task.completed
                          ? "border-muted-foreground/50 bg-muted-foreground/20"
                          : isPending
                            ? "border-yellow-500/50 hover:border-yellow-500"
                            : "hover:border-primary/50",
                      )}
                    />
                  </motion.div>
                  <motion.div
                    layout="position"
                    className="flex-1 flex flex-col min-w-0 cursor-pointer"
                    onClick={() => onToggle(task.id)}
                  >
                    <motion.div
                      layout="position"
                      className="flex items-center gap-1.5"
                    >
                      <motion.span
                        layout="position"
                        className={cn(
                          "text-[15px] transition-colors duration-100 break-words whitespace-pre-line",
                          task.completed &&
                            "line-through text-muted-foreground/50",
                        )}
                      >
                        <TextWithLinks
                          text={task.text}
                          isCompleted={task.completed}
                        />
                      </motion.span>
                    </motion.div>
                    <motion.div
                      layout="position"
                      className="flex flex-wrap items-center gap-2 mt-1.5"
                    >
                      {viewMode === "all" && task.date && (
                        <span className="text-xs text-muted-foreground/80 bg-muted/40 px-1.5 py-0.5 rounded-sm border border-muted/20">
                          {formatDate(new Date(task.date))}
                        </span>
                      )}
                      <TimeDisplay time={task.scheduled_time} />
                      {task.priority && (
                        <PriorityIndicator priority={task.priority} />
                      )}
                      {isPending && (
                        <div className="flex items-center gap-1 text-xs text-yellow-500/80 bg-yellow-500/10 px-2 py-0.5 border border-yellow-500/20">
                          <AlertCircle className="w-3 h-3" />
                          <span className="font-medium">Pending</span>
                        </div>
                      )}
                    </motion.div>
                  </motion.div>

                  <motion.div
                    layout="position"
                    className="flex items-center gap-1 ml-auto"
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-7 w-7 text-muted-foreground cursor-pointer hover:text-foreground  ",
                        isMobile
                          ? "opacity-80"
                          : "opacity-0 group-hover:opacity-80 transition-opacity",
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(task.id, task.text);
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-7 w-7 text-muted-foreground cursor-pointer hover:text-destructive  ",
                        isMobile
                          ? "opacity-80"
                          : "opacity-0 group-hover:opacity-80 transition-opacity",
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(task.id);
                      }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </motion.div>
                </>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

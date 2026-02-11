"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TimePicker } from "@/components/ui/time-picker";
import { cn } from "@/lib/utils";
import { TaskItem } from "@/types";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

interface TaskEditDialogProps {
  task: TaskItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedTask: TaskItem) => Promise<void>;
  isMobile?: boolean;
}

const PriorityOption = ({
  priority,
  color,
}: {
  priority: string;
  color: string;
}) => (
  <div className="flex items-center gap-2">
    <span className={cn("h-3 w-3 rounded-sm", color)} />
    <span className="capitalize">{priority}</span>
  </div>
);

function TaskEditForm({
  task,
  onSave,
  onCancel,
  inDrawer = false,
}: {
  task: TaskItem;
  onSave: (updatedTask: TaskItem) => Promise<void>;
  onCancel: () => void;
  inDrawer?: boolean;
}) {
  const [editText, setEditText] = useState(task.text);
  const [editTime, setEditTime] = useState(task.scheduled_time || "");
  const [editPriority, setEditPriority] = useState<
    "high" | "medium" | "low" | undefined
  >(task.priority);
  const [editDescription, setEditDescription] = useState(
    task.description || "",
  );
  const [isLoading, setIsLoading] = useState(false);

  const textInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textInputRef.current) {
      // Focus and select all text for easy editing
      textInputRef.current.focus();
      textInputRef.current.select();
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!editText.trim()) return;

    setIsLoading(true);
    try {
      await onSave({
        ...task,
        text: editText.trim(),
        scheduled_time: editTime || undefined,
        priority: editPriority,
        description: editDescription.trim() || undefined,
        updated_at: new Date(),
      });
    } catch (error) {
      console.error("Failed to save task:", error);
    } finally {
      setIsLoading(false);
    }
  }, [task, editText, editTime, editPriority, editDescription, onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    },
    [handleSave, onCancel],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="space-y-6"
    >
      <div className="space-y-2">
        <Label
          htmlFor="task-text"
          className="text-sm font-medium text-neutral-300"
        >
          Task
        </Label>
        <Input
          id="task-text"
          ref={textInputRef}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter task description..."
          className={cn(
            "w-full text-base font-normal bg-background border border-border/20 shadow-sm focus-visible:ring-1 focus-visible:ring-primary",
            inDrawer ? "h-12" : "h-11",
          )}
        />
      </div>

      <div
        className={cn(
          "grid gap-4",
          inDrawer ? "grid-cols-1 gap-4" : "grid-cols-2 gap-4",
        )}
      >
        <div className="space-y-2">
          <Label className="text-sm font-medium text-neutral-300">Time</Label>
          <TimePicker
            time={editTime}
            onChange={setEditTime}
            className={cn(
              "w-full justify-start border border-border/20 cursor-pointer bg-neutral-800/95 hover:bg-accent/50",
              inDrawer ? "h-12" : "h-[37px]",
            )}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-neutral-300">
            Priority
          </Label>
          <Select
            value={editPriority || "none"}
            onValueChange={(value: string) =>
              setEditPriority(
                value === "none"
                  ? undefined
                  : (value as "high" | "medium" | "low"),
              )
            }
          >
            <SelectTrigger
              className={cn(
                "w-full bg-background cursor-pointer border border-border/20 transition-all duration-200 hover:border-border/30 focus:border-border/40 focus:ring-0 focus:ring-offset-0",
                inDrawer ? "h-12" : "h-10",
              )}
            >
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent className="border-border/20 bg-neutral-800/95 backdrop-blur-md">
              <SelectItem value="none" className="text-neutral-400">
                <span>None</span>
              </SelectItem>
              <SelectItem
                value="high"
                className="text-red-400 hover:bg-accent/50 focus:bg-accent/70"
              >
                <PriorityOption priority="high" color="bg-red-500" />
              </SelectItem>
              <SelectItem
                value="medium"
                className="text-orange-400 hover:bg-accent/50 focus:bg-accent/70"
              >
                <PriorityOption priority="medium" color="bg-orange-500" />
              </SelectItem>
              <SelectItem
                value="low"
                className="text-blue-400 hover:bg-accent/50 focus:bg-accent/70"
              >
                <PriorityOption priority="low" color="bg-blue-500" />
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="task-description"
          className="text-sm font-medium text-neutral-300"
        >
          Description
          <span className="text-neutral-500 font-normal">(optional)</span>
        </Label>
        <Textarea
          id="task-description"
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a description or additional details..."
          className={cn(
            "w-full min-h-[80px] resize-none text-sm bg-neutral-800/95 border border-border/20 shadow-sm focus-visible:ring-1 focus-visible:ring-primary",
            inDrawer && "min-h-[100px]",
          )}
        />
      </div>

      <div
        className={cn("flex gap-3 pt-2", inDrawer ? "flex-col" : "justify-end")}
      >
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className={cn(
            "font-medium border-border/20 text-muted-foreground hover:bg-muted/50",
            inDrawer ? "h-12 w-full" : "px-4",
          )}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!editText.trim() || isLoading}
          className={cn(
            "font-medium bg-primary hover:bg-primary/90",
            inDrawer ? "h-12 w-full" : "px-4",
          )}
        >
          {isLoading ? "Saving..." : "Save"}
        </Button>
      </div>
      {!inDrawer && (
        <div className="pt-2 border-t border-border/20">
          <p className="text-xs text-neutral-500 text-center">
            Press{" "}
            <kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px]">
              ⌘ + Enter
            </kbd>{" "}
            to save or{" "}
            <kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px]">
              Esc
            </kbd>{" "}
            to cancel
          </p>
        </div>
      )}
    </motion.div>
  );
}

export function TaskEditDialog({
  task,
  open,
  onOpenChange,
  onSave,
  isMobile = false,
}: TaskEditDialogProps) {
  const handleSave = useCallback(
    async (updatedTask: TaskItem) => {
      await onSave(updatedTask);
      onOpenChange(false);
    },
    [onSave, onOpenChange],
  );

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  if (!task) return null;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="bg-neutral-900 border-t border-neutral-800/70">
          <DrawerHeader className="pb-6">
            <DrawerTitle className="text-xl font-semibold text-neutral-100">
              Edit Task
            </DrawerTitle>
            <DrawerDescription className="text-neutral-400">
              Update your task details and save changes.
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-6">
            <TaskEditForm
              task={task}
              onSave={handleSave}
              onCancel={handleCancel}
              inDrawer={true}
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-neutral-900 border-neutral-800/70 p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl font-semibold text-neutral-100">
            Edit Task
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            Update your task details and save changes.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6">
          <TaskEditForm
            task={task}
            onSave={handleSave}
            onCancel={handleCancel}
            inDrawer={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

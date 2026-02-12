export interface TaskItem {
  id: string;
  text: string;
  completed: boolean;
  date: Date;
  created_at?: Date;
  updated_at?: Date;
  scheduled_time?: string;
  priority?: "high" | "medium" | "low";
  description?: string;
  gcalEventId?: string;
  syncedWithGCal?: boolean;
}

export interface SyncQueueItem {
  id: string;
  operation: "create" | "update" | "delete";
  taskId: string;
  taskData?: TaskItem;
  gcalEventId?: string;
  timestamp: number;
}

export type SortOption =
  | "newest"
  | "oldest"
  | "alphabetical"
  | "completed"
  | "priority";

export interface TaskListProps {
  tasks: TaskItem[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, text: string, emoji?: string) => void;
  editingTaskId: string | null;
  editText: string;
  setEditText: (text: string) => void;
  handleEditTask: (task: TaskItem) => void;
  cancelEditing: () => void;
}

export interface CircleCheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
}

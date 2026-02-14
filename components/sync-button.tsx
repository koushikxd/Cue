"use client";

import React, { useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FileInput } from "@/components/ui/file-input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  ArrowsClockwise,
  CloudArrowDown,
  FileArrowDown,
  FileArrowUp,
} from "@phosphor-icons/react";
import GoogleCalendarSync from "@/components/google-calendar-sync";
import { useTaskStoreWithPersistence } from "@/stores/task-store";

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: Date | null;
  syncNow: () => Promise<void>;
  refreshPendingCount: () => Promise<void>;
}

interface SyncPopoverProps {
  className?: string;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
  sync?: SyncState;
}

export function SyncPopover({
  className,
  align = "end",
  side = "bottom",
  sideOffset = 8,
  sync,
}: SyncPopoverProps) {
  const [syncOpen, setSyncOpen] = useState(false);
  const { exportTasks, importTasks } = useTaskStoreWithPersistence();

  const handleExport = useCallback(async () => {
    try {
      const result = await exportTasks();
      toast.success(result.message);
    } catch (error) {
      toast.error("Failed to export data", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSyncOpen(false);
    }
  }, [exportTasks]);

  const handleImport = useCallback(
    async (file: File) => {
      try {
        const result = await importTasks(file);
        toast.success(result.message);
      } catch (error) {
        toast.error("Failed to import data", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setSyncOpen(false);
      }
    },
    [importTasks],
  );

  const handleSyncNow = useCallback(async () => {
    if (!sync) return;
    await sync.syncNow();
  }, [sync]);

  const formatLastSync = (date: Date | null) => {
    if (!date) return null;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    return `${diffHr}h ago`;
  };

  return (
    <Popover open={syncOpen} onOpenChange={setSyncOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          data-sync-trigger
          className={cn(
            "relative px-2 bg-transparent border-0 shadow-none h-9 hover:cursor-pointer hover:bg-accent/30 hover:text-accent-foreground dark:text-neutral-400 dark:hover:text-foreground",
            className,
          )}
        >
          <ArrowsClockwise
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              syncOpen && "rotate-180",
              sync?.isSyncing && "animate-spin",
            )}
          />
          {sync && sync.pendingCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-orange-500 text-[9px] font-medium text-white">
              {sync.pendingCount > 9 ? "9+" : sync.pendingCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[240px] p-0 border-border/40 bg-neutral-800 dark:bg-neutral-800 shadow-md"
        align={align}
        side={side}
        sideOffset={sideOffset}
      >
        <div className="flex flex-col">
          <div className="px-3 pt-3 pb-2">
            <h3 className="text-sm font-medium">Data Sync</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {sync?.lastSyncTime
                ? `Last synced ${formatLastSync(sync.lastSyncTime)}`
                : "Backup or restore your tasks"}
            </p>
          </div>
          {sync && (
            <div className="px-1 py-1 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSyncNow}
                disabled={sync.isSyncing}
                className="justify-start w-full h-8 gap-2 px-2 text-xs font-normal hover:cursor-pointer text-neutral-300 hover:text-foreground hover:bg-accent/30 disabled:opacity-50"
              >
                <CloudArrowDown weight="light" className="size-4" />
                {sync.isSyncing
                  ? "Syncing..."
                  : sync.pendingCount > 0
                    ? `Sync now (${sync.pendingCount} pending)`
                    : "Sync now"}
              </Button>
            </div>
          )}
          <div className="px-1 py-1 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExport}
              className="justify-start w-full h-8 gap-2 px-2 text-xs font-normal hover:cursor-pointer text-neutral-300 hover:text-foreground hover:bg-accent/30"
            >
              <FileArrowUp weight="light" className="size-4" />
              Export tasks as JSON
            </Button>
            <FileInput onFileSelect={handleImport} accept=".json">
              <Button
                variant="ghost"
                size="sm"
                className="justify-start w-full h-8 gap-2 px-2 text-xs font-normal hover:cursor-pointer text-neutral-300 hover:text-foreground hover:bg-accent/30"
              >
                <FileArrowDown weight="light" className="size-4" />
                Import from JSON file
              </Button>
            </FileInput>
          </div>
          <div className="border-t px-3 py-2.5">
            <GoogleCalendarSync />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

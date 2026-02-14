import { useCallback, useEffect, useRef, useState } from "react";
import { useGoogleCalendar } from "./use-google-calendar";
import { useTaskStore } from "@/stores/task-store";
import { useSettingsStore } from "@/stores/settings-store";

import {
  getSyncQueue,
  removeSyncQueueItem,
  updateSyncQueueItem,
} from "./use-indexed-db";
import { serializeTask } from "@/lib/utils/task";
import { toast } from "sonner";

const generateId = () => Math.random().toString(36).substring(7);
const MAX_SYNC_RETRIES = 3;

export function useSync() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const isFlushing = useRef(false);
  const hasSyncedForCurrentOnlineSession = useRef(false);

  const googleCalendar = useGoogleCalendar();
  const { settings } = useSettingsStore();

  const canSync =
    googleCalendar.isSignedIn &&
    googleCalendar.hasGoogleConnected() &&
    settings.syncWithGoogleCalendar;

  const canSyncRef = useRef(canSync);
  canSyncRef.current = canSync;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const googleCalendarRef = useRef(googleCalendar);
  googleCalendarRef.current = googleCalendar;

  const refreshPendingCount = useCallback(async () => {
    try {
      const queue = await getSyncQueue();
      setPendingCount(queue.length);
    } catch {
      setPendingCount(0);
    }
  }, []);

  useEffect(() => {
    refreshPendingCount();
    const interval = setInterval(refreshPendingCount, 10000);
    return () => clearInterval(interval);
  }, [refreshPendingCount]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const flushQueue = useCallback(async () => {
    if (isFlushing.current || !canSyncRef.current) {
      return { processed: 0, retrying: 0, dropped: 0 };
    }
    isFlushing.current = true;

    const gcal = googleCalendarRef.current;

    try {
      const queue = await getSyncQueue();
      if (queue.length === 0) {
        return { processed: 0, retrying: 0, dropped: 0 };
      }

      let processed = 0;
      let retrying = 0;
      let dropped = 0;
      const currentTasks = useTaskStore.getState().tasks;
      const updatedTasks = [...currentTasks];

      for (const item of queue) {
        try {
          let result: { success: boolean; retryable: boolean; message?: string } = {
            success: false,
            retryable: true,
            message: "Unknown sync failure",
          };
          switch (item.operation) {
            case "create": {
              if (!item.taskData) {
                result = { success: true, retryable: false, message: "" };
                break;
              }
              const createResult = await gcal.createEvent(item.taskData, { silent: true });
              result = createResult;
              if (createResult.success && createResult.eventId) {
                const idx = updatedTasks.findIndex((t) => t.id === item.taskId);
                if (idx !== -1) {
                  updatedTasks[idx] = {
                    ...updatedTasks[idx],
                    gcalEventId: createResult.eventId,
                    syncedWithGCal: true,
                  };
                }
              }
              break;
            }
            case "update": {
              if (!item.taskData || !item.gcalEventId) {
                result = { success: true, retryable: false, message: "" };
                break;
              }
              result = await gcal.updateEvent(
                item.taskData,
                item.gcalEventId,
                { silent: true }
              );
              break;
            }
            case "delete": {
              if (!item.gcalEventId) {
                result = { success: true, retryable: false, message: "" };
                break;
              }
              result = await gcal.deleteEvent(item.gcalEventId, { silent: true });
              break;
            }
          }

          if (result.success) {
            await removeSyncQueueItem(item.id);
            processed++;
            continue;
          }

          const nextRetryCount = (item.retryCount ?? 0) + 1;
          if (!result.retryable || nextRetryCount >= MAX_SYNC_RETRIES) {
            await removeSyncQueueItem(item.id);
            dropped++;
            continue;
          }

          await updateSyncQueueItem(item.id, {
            retryCount: nextRetryCount,
            lastError: result.message,
            timestamp: Date.now(),
          });
          retrying++;
        } catch (error) {
          console.error("Failed to process sync queue item:", error);
        }
      }

      if (processed > 0) {
        useTaskStore.getState().setTasks(updatedTasks);
      }

      await refreshPendingCount();
      return { processed, retrying, dropped };
    } finally {
      isFlushing.current = false;
    }
  }, [refreshPendingCount]);

  const pullFromCalendar = useCallback(async () => {
    if (!canSyncRef.current) return 0;

    const gcal = googleCalendarRef.current;
    const pullAll = settingsRef.current.pullAllCalendarEvents;

    try {
      const remoteEvents = await gcal.fetchEvents(pullAll);
      if (!remoteEvents || remoteEvents.length === 0) return 0;

      const currentTasks = useTaskStore.getState().tasks;
      const updatedTasks = [...currentTasks];
      let changeCount = 0;

      for (const remote of remoteEvents) {
        const localIdx = updatedTasks.findIndex(
          (t) => t.gcalEventId === remote.gcalEventId
        );

        if (localIdx !== -1) {
          const local = updatedTasks[localIdx];
          const localUpdated = local.updated_at?.getTime() || 0;
          const remoteUpdated = new Date(remote.gcalUpdated).getTime();

          if (remoteUpdated > localUpdated) {
            updatedTasks[localIdx] = serializeTask({
              ...local,
              text: remote.text,
              completed: remote.completed,
              date: remote.date,
              scheduled_time: remote.scheduled_time,
              priority: remote.priority,
              description: remote.description,
              updated_at: new Date(remote.gcalUpdated),
            });
            changeCount++;
          }
        } else {
          updatedTasks.push(
            serializeTask({
              id: generateId(),
              text: remote.text,
              completed: remote.completed,
              date: remote.date,
              scheduled_time: remote.scheduled_time,
              priority: remote.priority,
              description: remote.description,
              gcalEventId: remote.gcalEventId,
              syncedWithGCal: true,
              created_at: remote.created_at,
              updated_at: remote.updated_at,
            })
          );
          changeCount++;
        }
      }

      if (changeCount > 0) {
        useTaskStore.getState().setTasks(updatedTasks);
      }

      return changeCount;
    } catch (error) {
      console.error("Failed to pull from calendar:", error);
      return 0;
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (!isOnline) {
      toast.error("You're offline", { duration: 1500 });
      return;
    }
    if (!canSyncRef.current) {
      toast.error("Sync not available", {
        description: "Sign in and connect Google Calendar to sync",
        duration: 2000,
      });
      return;
    }
    setIsSyncing(true);

    try {
      const flushed = await flushQueue();
      const pulled = await pullFromCalendar();
      setLastSyncTime(new Date());

      if (flushed.retrying > 0) {
        toast.error(`${flushed.retrying} sync change(s) will retry`, {
          duration: 2000,
        });
      }

      if (flushed.processed > 0 || pulled > 0 || flushed.dropped > 0) {
        toast.success(
          `Synced${flushed.processed > 0 ? ` - ${flushed.processed} pushed` : ""}${pulled > 0 ? ` - ${pulled} pulled` : ""}${flushed.dropped > 0 ? ` - ${flushed.dropped} dropped` : ""}`,
          { duration: 2000 }
        );
      } else {
        toast.success("Already up to date", { duration: 1500 });
      }
    } catch (error) {
      console.error("Sync failed:", error);
      toast.error("Sync failed");
    } finally {
      setIsSyncing(false);
      await refreshPendingCount();
    }
  }, [isOnline, flushQueue, pullFromCalendar, refreshPendingCount]);

  useEffect(() => {
    if (!isOnline || !canSync) {
      hasSyncedForCurrentOnlineSession.current = false;
      return;
    }
    if (hasSyncedForCurrentOnlineSession.current) return;
    hasSyncedForCurrentOnlineSession.current = true;

    const timeout = setTimeout(async () => {
      setIsSyncing(true);
      try {
        await flushQueue();
        await pullFromCalendar();
        setLastSyncTime(new Date());
      } catch (error) {
        console.error("Auto-sync failed:", error);
      } finally {
        setIsSyncing(false);
        await refreshPendingCount();
      }
    }, 1500);
    return () => clearTimeout(timeout);
  }, [isOnline, canSync, flushQueue, pullFromCalendar, refreshPendingCount]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncTime,
    syncNow,
    refreshPendingCount,
  };
}

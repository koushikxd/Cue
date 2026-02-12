import { useCallback, useEffect, useRef, useState } from "react";
import { useGoogleCalendar } from "./use-google-calendar";
import { useTaskStore } from "@/stores/task-store";
import { useSettingsStore } from "@/stores/settings-store";

import { getSyncQueue, removeSyncQueueItem } from "./use-indexed-db";
import { serializeTask } from "@/lib/utils/task";
import { toast } from "sonner";

const generateId = () => Math.random().toString(36).substring(7);

export function useSync() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const isFlushing = useRef(false);

  const googleCalendar = useGoogleCalendar();
  const { settings } = useSettingsStore();

  const canSync =
    googleCalendar.isSignedIn &&
    googleCalendar.hasGoogleConnected() &&
    settings.syncWithGoogleCalendar;

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
    if (isFlushing.current || !canSync) return 0;
    isFlushing.current = true;

    try {
      const queue = await getSyncQueue();
      if (queue.length === 0) return 0;

      let processed = 0;
      const currentTasks = useTaskStore.getState().tasks;
      const updatedTasks = [...currentTasks];

      for (const item of queue) {
        try {
          let success = false;
          switch (item.operation) {
            case "create": {
              if (!item.taskData) {
                success = true;
                break;
              }
              const eventId = await googleCalendar.createEvent(item.taskData);
              if (eventId) {
                const idx = updatedTasks.findIndex((t) => t.id === item.taskId);
                if (idx !== -1) {
                  updatedTasks[idx] = {
                    ...updatedTasks[idx],
                    gcalEventId: eventId,
                    syncedWithGCal: true,
                  };
                }
                success = true;
              }
              break;
            }
            case "update": {
              if (!item.taskData || !item.gcalEventId) {
                success = true;
                break;
              }
              success = await googleCalendar.updateEvent(
                item.taskData,
                item.gcalEventId
              );
              break;
            }
            case "delete": {
              if (!item.gcalEventId) {
                success = true;
                break;
              }
              success = await googleCalendar.deleteEvent(item.gcalEventId);
              break;
            }
          }
          if (success) {
            await removeSyncQueueItem(item.id);
            processed++;
          }
        } catch (error) {
          console.error("Failed to process sync queue item:", error);
        }
      }

      if (processed > 0) {
        useTaskStore.getState().setTasks(updatedTasks);
      }

      await refreshPendingCount();
      return processed;
    } finally {
      isFlushing.current = false;
    }
  }, [canSync, googleCalendar, refreshPendingCount]);

  const pullFromCalendar = useCallback(async () => {
    if (!canSync) return 0;

    try {
      const remoteEvents = await googleCalendar.fetchEvents(
        settings.pullAllCalendarEvents
      );
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
  }, [canSync, googleCalendar, settings.pullAllCalendarEvents]);

  const syncNow = useCallback(async () => {
    if (!canSync || !isOnline) return;
    setIsSyncing(true);

    try {
      const flushed = await flushQueue();
      const pulled = await pullFromCalendar();
      setLastSyncTime(new Date());

      if (flushed > 0 || pulled > 0) {
        toast.success(
          `Synced${flushed > 0 ? ` - ${flushed} pushed` : ""}${pulled > 0 ? ` - ${pulled} pulled` : ""}`,
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
  }, [canSync, isOnline, flushQueue, pullFromCalendar, refreshPendingCount]);

  useEffect(() => {
    if (!isOnline || !canSync) return;

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

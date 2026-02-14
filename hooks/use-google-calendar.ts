import { TaskItem } from "@/types";
import { useAuth, useUser } from "@clerk/nextjs";
import { useCallback, useState } from "react";
import { toast } from "sonner";

const CUE_MARKER = "[cue]";
const CUE_DONE_MARKER = "[done]";

interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
}

export interface GoogleSyncResult {
  success: boolean;
  retryable: boolean;
  eventId?: string;
  message?: string;
}

interface SyncRequestOptions {
  silent?: boolean;
}

interface GCalEventResponse {
  id: string;
  summary?: string;
  description?: string;
  updated?: string;
  status?: string;
  start?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
}

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

const isPermanentGoogleError = (message: string) => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("event type cannot be changed") ||
    normalized.includes("cannot be changed") ||
    normalized.includes("not found")
  );
};

const isRetryableStatusCode = (status: number) =>
  RETRYABLE_STATUS_CODES.has(status);

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

function eventToTask(event: GCalEventResponse): Omit<TaskItem, "id"> & { gcalEventId: string; gcalUpdated: string } {
  const description = event.description || "";
  const isCompleted = description.includes(CUE_DONE_MARKER);
  const cleanDesc = description.replace(CUE_MARKER, "").replace(CUE_DONE_MARKER, "").trim();

  let priority: TaskItem["priority"] = undefined;
  let taskDescription = cleanDesc;
  const priorityMatch = cleanDesc.match(/^Priority:\s*(high|medium|low)/i);
  if (priorityMatch) {
    priority = priorityMatch[1].toLowerCase() as TaskItem["priority"];
    taskDescription = cleanDesc.replace(/^Priority:\s*(high|medium|low)\s*/i, "").trim();
  }

  let date: Date;
  let scheduled_time: string | undefined;

  if (event.start?.dateTime) {
    date = new Date(event.start.dateTime);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    scheduled_time = `${hours}:${minutes}`;
  } else if (event.start?.date) {
    date = new Date(event.start.date + "T00:00:00");
  } else {
    date = new Date();
  }

  return {
    text: event.summary || "Untitled",
    completed: isCompleted,
    date,
    scheduled_time,
    priority,
    description: taskDescription || undefined,
    gcalEventId: event.id,
    syncedWithGCal: true,
    gcalUpdated: event.updated || new Date().toISOString(),
    created_at: new Date(),
    updated_at: event.updated ? new Date(event.updated) : new Date(),
  };
}

export function useGoogleCalendar() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const [isSyncing, setIsSyncing] = useState(false);

  const hasGoogleConnected = useCallback(() => {
    if (!isSignedIn || !user) return false;
    return user.externalAccounts.some(
      (account) =>
        account.provider === "google" &&
        account.verification?.status === "verified"
    );
  }, [isSignedIn, user]);

  const getGoogleToken = useCallback(
    async (options?: SyncRequestOptions): Promise<string | null> => {
    if (!isSignedIn || !user) return null;

    try {
      const googleAccount = user.externalAccounts.find(
        (account) =>
          account.provider === "google" &&
          account.verification?.status === "verified"
      );

      if (!googleAccount) {
        if (!options?.silent) {
        toast.error("Google account not connected", {
          description: "Please connect your Google account in settings",
        });
        }
        return null;
      }
      const response = await fetch(`/api/get-oauth-token?provider=google`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get OAuth token");
      }

      const data = await response.json();
      return data.token;
    } catch (error) {
      console.error("Failed to get Google token:", error);
      if (!options?.silent) {
        toast.error("Failed to get Google Calendar access", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
      return null;
    }
    },
    [isSignedIn, user]
  );

  const taskToEvent = useCallback((task: TaskItem): GoogleCalendarEvent => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const descriptionParts = [];
    if (task.priority) {
      descriptionParts.push(`Priority: ${task.priority}`);
    }
    if (task.description) {
      descriptionParts.push(task.description);
    }
    if (task.completed) {
      descriptionParts.push(CUE_DONE_MARKER);
    }
    descriptionParts.push(CUE_MARKER);
    const description = descriptionParts.join("\n\n");

    if (task.scheduled_time) {
      const startDateTime = new Date(task.date);
      const [hours, minutes] = task.scheduled_time.split(":").map(Number);
      startDateTime.setHours(hours, minutes, 0, 0);

      const endDateTime = new Date(startDateTime);
      endDateTime.setHours(endDateTime.getHours() + 1);

      return {
        summary: task.text,
        description,
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: timezone,
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: timezone,
        },
      };
    }

    const startDate = new Date(task.date);
    const endDate = new Date(task.date);
    endDate.setDate(endDate.getDate() + 1);

    return {
      summary: task.text,
      description,
      start: {
        date: startDate.toISOString().split("T")[0],
      },
      end: {
        date: endDate.toISOString().split("T")[0],
      },
    };
  }, []);

  const createEvent = useCallback(
    async (
      task: TaskItem,
      options?: SyncRequestOptions
    ): Promise<GoogleSyncResult> => {
      if (!isSignedIn || !hasGoogleConnected()) {
        return { success: false, retryable: false, message: "Google account not connected" };
      }

      try {
        setIsSyncing(true);
        const token = await getGoogleToken(options);
        if (!token) {
          return {
            success: false,
            retryable: false,
            message: "Failed to get Google Calendar token",
          };
        }

        const event = taskToEvent(task);
        const response = await fetch(
          "https://www.googleapis.com/calendar/v3/calendars/primary/events",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(event),
          }
        );

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          const message = error.error?.message || "Failed to create event";
          const retryable =
            isRetryableStatusCode(response.status) &&
            !isPermanentGoogleError(message);
          if (!options?.silent) {
            toast.error("Failed to sync with Google Calendar", {
              description: message,
            });
          }
          return { success: false, retryable, message };
        }

        const result = await response.json();
        return { success: true, retryable: false, eventId: result.id };
      } catch (error) {
        console.error("Error creating Google Calendar event:", error);
        const message = getErrorMessage(error, "Unknown error");
        if (!options?.silent) {
          toast.error("Failed to sync with Google Calendar", {
            description: message,
          });
        }
        return { success: false, retryable: true, message };
      } finally {
        setIsSyncing(false);
      }
    },
    [isSignedIn, hasGoogleConnected, getGoogleToken, taskToEvent]
  );

  const updateEvent = useCallback(
    async (
      task: TaskItem,
      eventId: string,
      options?: SyncRequestOptions
    ): Promise<GoogleSyncResult> => {
      if (!isSignedIn || !hasGoogleConnected() || !eventId) {
        return { success: false, retryable: false, message: "Google account not connected" };
      }

      try {
        setIsSyncing(true);
        const token = await getGoogleToken(options);
        if (!token) {
          return {
            success: false,
            retryable: false,
            message: "Failed to get Google Calendar token",
          };
        }

        const event = taskToEvent(task);
        const patchBody: Partial<GoogleCalendarEvent> = {
          summary: event.summary,
          description: event.description,
          start: event.start,
          end: event.end,
        };
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(patchBody),
          }
        );

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          const message = error.error?.message || "Failed to update event";
          const retryable =
            isRetryableStatusCode(response.status) &&
            !isPermanentGoogleError(message);
          if (!options?.silent) {
            toast.error("Failed to update Google Calendar event", {
              description: message,
            });
          }
          return { success: false, retryable, message };
        }

        return { success: true, retryable: false };
      } catch (error) {
        console.error("Error updating Google Calendar event:", error);
        const message = getErrorMessage(error, "Unknown error");
        if (!options?.silent) {
          toast.error("Failed to update Google Calendar event", {
            description: message,
          });
        }
        return { success: false, retryable: true, message };
      } finally {
        setIsSyncing(false);
      }
    },
    [isSignedIn, hasGoogleConnected, getGoogleToken, taskToEvent]
  );

  const deleteEvent = useCallback(
    async (
      eventId: string,
      options?: SyncRequestOptions
    ): Promise<GoogleSyncResult> => {
      if (!isSignedIn || !hasGoogleConnected() || !eventId) {
        return { success: false, retryable: false, message: "Google account not connected" };
      }

      try {
        setIsSyncing(true);
        const token = await getGoogleToken(options);
        if (!token) {
          return {
            success: false,
            retryable: false,
            message: "Failed to get Google Calendar token",
          };
        }

        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (
          !response.ok &&
          response.status !== 404 &&
          response.status !== 410
        ) {
          const error = await response.json().catch(() => ({}));
          const message = error.error?.message || "Failed to delete event";
          const retryable =
            isRetryableStatusCode(response.status) &&
            !isPermanentGoogleError(message);
          if (!options?.silent) {
            toast.error("Failed to delete Google Calendar event", {
              description: message,
            });
          }
          return { success: false, retryable, message };
        }

        return { success: true, retryable: false };
      } catch (error) {
        console.error("Error deleting Google Calendar event:", error);
        const message = getErrorMessage(error, "Unknown error");
        if (!options?.silent) {
          toast.error("Failed to delete Google Calendar event", {
            description: message,
          });
        }
        return { success: false, retryable: true, message };
      } finally {
        setIsSyncing(false);
      }
    },
    [isSignedIn, hasGoogleConnected, getGoogleToken]
  );

  const fetchEvents = useCallback(
    async (pullAll: boolean = false) => {
      if (!isSignedIn || !hasGoogleConnected()) return [];

      try {
        setIsSyncing(true);
        const token = await getGoogleToken();
        if (!token) return [];

        const now = new Date();
        const timeMin = new Date(now);
        timeMin.setDate(timeMin.getDate() - 30);
        const timeMax = new Date(now);
        timeMax.setDate(timeMax.getDate() + 90);

        const params = new URLSearchParams({
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          singleEvents: "true",
          orderBy: "startTime",
          maxResults: "500",
        });

        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || "Failed to fetch events");
        }

        const data = await response.json();
        const events: GCalEventResponse[] = data.items || [];

        const filtered = pullAll
          ? events
          : events.filter((e) => e.description?.includes(CUE_MARKER));

        return filtered
          .filter((e) => e.status !== "cancelled")
          .map((e) => eventToTask(e));
      } catch (error) {
        console.error("Error fetching Google Calendar events:", error);
        return [];
      } finally {
        setIsSyncing(false);
      }
    },
    [isSignedIn, hasGoogleConnected, getGoogleToken]
  );

  return {
    isSignedIn,
    hasGoogleConnected,
    isSyncing,
    createEvent,
    updateEvent,
    deleteEvent,
    fetchEvents,
  };
}

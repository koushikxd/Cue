import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SortOption } from "@/types";

export interface UserSettings {
  aiEnabled: boolean;
  autoRemoveCompleted: boolean;
  pendingEnabled: boolean;
  defaultViewMode: "month" | "day" | "all";
  defaultPriority: "high" | "medium" | "low" | undefined;
  defaultSortBy: SortOption;
  syncWithGoogleCalendar: boolean;
}

export const defaultSettings: UserSettings = {
  aiEnabled: true,
  autoRemoveCompleted: false,
  pendingEnabled: true,
  defaultViewMode: "all",
  defaultPriority: undefined,
  defaultSortBy: "newest",
  syncWithGoogleCalendar: true,
};

interface SettingsState {
  settings: UserSettings;
}

interface SettingsActions {
  updateSettings: (updates: Partial<UserSettings>) => void;
  resetSettings: () => void;
}

type SettingsStore = SettingsState & SettingsActions;

const isBrowser = () =>
  typeof window !== "undefined" &&
  typeof localStorage !== "undefined" &&
  typeof localStorage.getItem === "function";

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,

      updateSettings: (updates) => {
        set((state) => ({
          settings: { ...state.settings, ...updates },
        }));
      },

      resetSettings: () => {
        set({ settings: defaultSettings });
      },
    }),
    {
      name: "user-settings",
      version: 1,
      storage: {
        getItem: (name) => {
          if (!isBrowser()) return null;
          const value = localStorage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: (name, value) => {
          if (!isBrowser()) return;
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          if (!isBrowser()) return;
          localStorage.removeItem(name);
        },
      },
    }
  )
);

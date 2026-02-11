import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SortOption } from "@/types";
import type { Model } from "@/lib/models";

export interface UserSettings {
  aiEnabled: boolean;
  groqApiKey: string;
  defaultModel: Model;
  autoRemoveCompleted: boolean;
  pendingEnabled: boolean;
  defaultViewMode: "month" | "day" | "all";
  defaultPriority: "high" | "medium" | "low" | undefined;
  defaultSortBy: SortOption;
  syncWithGoogleCalendar: boolean;
}

export const defaultSettings: UserSettings = {
  aiEnabled: true,
  groqApiKey: "",
  defaultModel: "llama-3.1-8b",
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
      version: 3,
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as { settings: UserSettings };
        if (version < 2) {
          state.settings = { ...defaultSettings, ...state.settings, groqApiKey: "" };
        }
        if (version < 3) {
          state.settings = { ...state.settings, defaultModel: "llama-3.1-8b" };
        }
        return state;
      },
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

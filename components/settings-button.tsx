"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, ExternalLink, ListRestart, Settings } from "lucide-react";
import { modelOptions } from "@/lib/models";
import { useSettingsStore, defaultSettings } from "@/stores/settings-store";
import { useGoogleCalendar } from "@/hooks/use-google-calendar";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";

interface SettingsPopoverProps {
  isMobile?: boolean;
  className?: string;
}

export function SettingsPopover({
  isMobile = false,
  className,
}: SettingsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const { settings, updateSettings, resetSettings } = useSettingsStore();
  const { isSignedIn } = useAuth();
  const { hasGoogleConnected } = useGoogleCalendar();

  const handleSwitchChange = useCallback(
    (checked: boolean, setting: keyof typeof settings) => {
      updateSettings({ [setting]: checked });
    },
    [updateSettings]
  );

  const handleSelectChange = useCallback(
    (value: string, setting: keyof typeof settings) => {
      updateSettings({
        [setting]:
          setting === "defaultPriority" && value === "none" ? undefined : value,
      });
    },
    [updateSettings]
  );

  const handleResetSettings = useCallback(() => {
    resetSettings();
    toast.success("Settings reset to defaults");
  }, [resetSettings]);

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
  }, []);

  const isDefaultSettings = useMemo(
    () => JSON.stringify(settings) === JSON.stringify(defaultSettings),
    [settings]
  );

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 px-2 border-0 hover:cursor-pointer shadow-none bg-transparent hover:bg-accent/30 hover:text-accent-foreground dark:text-neutral-400 dark:hover:text-foreground",
            className
          )}
        >
          <Settings
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              isOpen && "rotate-90"
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px]" align="end" sideOffset={8}>
        <div className="space-y-4">
          <div
            className={cn(
              "flex items-center justify-between",
              isDefaultSettings && "py-1.5"
            )}
          >
            <h4 className="font-medium text-base leading-none">Settings</h4>
            <Button
              variant="ghost"
              size="icon"
              title="Reset to default settings"
              onClick={handleResetSettings}
              className={cn(
                "h-7 w-7 hover:bg-accent/40 cursor-pointer flex border-0 text-muted-foreground hover:text-foreground transition-colors",
                isDefaultSettings && "hidden"
              )}
            >
              <ListRestart className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="ai-enabled" className="text-xs">
                AI Features
              </Label>
              <p className="text-xs text-muted-foreground">
                Enable AI capabilities for task creation
              </p>
            </div>
            <Switch
              id="ai-enabled"
              checked={settings.aiEnabled}
              onCheckedChange={(checked) =>
                handleSwitchChange(checked, "aiEnabled")
              }
            />
          </div>
          {settings.aiEnabled && (
            <div className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="groq-api-key" className="text-xs">
                  Groq API Key
                </Label>
                <p className="text-xs text-muted-foreground">
                  Required for AI features
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Input
                    id="groq-api-key"
                    type={showApiKey ? "text" : "password"}
                    value={settings.groqApiKey}
                    onChange={(e) =>
                      updateSettings({ groqApiKey: e.target.value })
                    }
                    placeholder="gsk_..."
                    className="h-8 text-xs pr-8 font-mono"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-8 w-8 hover:bg-transparent text-muted-foreground hover:text-foreground"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Get your free API key
                <ExternalLink className="h-3 w-3" />
              </a>
              {settings.groqApiKey && (
                <div className="flex items-center justify-between pt-1">
                  <div className="space-y-1">
                    <Label htmlFor="default-model" className="text-xs">
                      AI Model
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Model used for task processing
                    </p>
                  </div>
                  <Select
                    value={settings.defaultModel}
                    onValueChange={(value) =>
                      handleSelectChange(value, "defaultModel")
                    }
                  >
                    <SelectTrigger className="max-w-[120px] w-full cursor-pointer h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                      {modelOptions.map((model) => (
                        <SelectItem
                          key={model.id}
                          value={model.id}
                          className="cursor-pointer hover:bg-accent/30"
                        >
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="auto-remove-completed" className="text-xs">
                Auto Remove
              </Label>
              <p className="text-xs text-muted-foreground">
                Automatically remove completed tasks
              </p>
            </div>
            <Switch
              id="auto-remove-completed"
              checked={settings.autoRemoveCompleted}
              onCheckedChange={(checked) =>
                handleSwitchChange(checked, "autoRemoveCompleted")
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="pending-enabled" className="text-xs">
                Pending Indicator
              </Label>
              <p className="text-xs text-muted-foreground">
                Enable Pending Indicator for overdue tasks
              </p>
            </div>
            <Switch
              id="pending-enabled"
              checked={settings.pendingEnabled}
              onCheckedChange={(checked) =>
                handleSwitchChange(checked, "pendingEnabled")
              }
            />
          </div>
          {hasGoogleConnected() && (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="sync-with-google-calendar" className="text-xs">
                    Sync with Google Calendar
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Sync tasks with Google Calendar
                  </p>
                </div>
                <Switch
                  id="sync-with-google-calendar"
                  checked={settings.syncWithGoogleCalendar}
                  disabled={!hasGoogleConnected()}
                  onCheckedChange={(checked) =>
                    handleSwitchChange(checked, "syncWithGoogleCalendar")
                  }
                />
              </div>
              {isSignedIn && settings.syncWithGoogleCalendar && (
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="pull-all-events" className="text-xs">
                      Pull All Calendar Events
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Import all events, not just Cue tasks
                    </p>
                  </div>
                  <Switch
                    id="pull-all-events"
                    checked={settings.pullAllCalendarEvents}
                    onCheckedChange={(checked) =>
                      handleSwitchChange(checked, "pullAllCalendarEvents")
                    }
                  />
                </div>
              )}
            </>
          )}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="default-view" className="text-xs">
                Default View
              </Label>
              <p className="text-xs text-muted-foreground">
                Preferred default view mode
              </p>
            </div>
            <Select
              value={settings.defaultViewMode}
              onValueChange={(value) =>
                handleSelectChange(value, "defaultViewMode")
              }
            >
              <SelectTrigger className="max-w-[95px] w-full cursor-pointer h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {!isMobile && (
                  <SelectItem
                    value="month"
                    className="cursor-pointer hover:bg-accent/30"
                  >
                    Month
                  </SelectItem>
                )}
                <SelectItem
                  value="day"
                  className="cursor-pointer hover:bg-accent/30"
                >
                  Day
                </SelectItem>
                <SelectItem
                  value="all"
                  className="cursor-pointer hover:bg-accent/30"
                >
                  All
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="default-priority" className="text-xs">
                Default Priority
              </Label>
              <p className="text-xs text-muted-foreground">
                Default priority for new tasks
              </p>
            </div>
            <Select
              value={settings.defaultPriority || "none"}
              onValueChange={(value) =>
                handleSelectChange(value, "defaultPriority")
              }
            >
              <SelectTrigger className="max-w-[95px] w-full cursor-pointer h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem
                  value="none"
                  className="cursor-pointer hover:bg-accent/30"
                >
                  None
                </SelectItem>
                <SelectItem
                  value="high"
                  className="cursor-pointer hover:bg-accent/30"
                >
                  High
                </SelectItem>
                <SelectItem
                  value="medium"
                  className="cursor-pointer hover:bg-accent/30"
                >
                  Medium
                </SelectItem>
                <SelectItem
                  value="low"
                  className="cursor-pointer hover:bg-accent/30"
                >
                  Low
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="default-sort" className="text-xs">
                Default Sort
              </Label>
              <p className="text-xs text-muted-foreground">
                Preferred task sorting order
              </p>
            </div>
            <Select
              value={settings.defaultSortBy}
              onValueChange={(value) =>
                handleSelectChange(value, "defaultSortBy")
              }
            >
              <SelectTrigger className="max-w-[95px] w-full cursor-pointer h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem
                  value="newest"
                  className="cursor-pointer hover:bg-accent/30"
                >
                  Newest
                </SelectItem>
                <SelectItem
                  value="oldest"
                  className="cursor-pointer hover:bg-accent/30"
                >
                  Oldest
                </SelectItem>
                <SelectItem
                  value="priority"
                  className="cursor-pointer hover:bg-accent/30"
                >
                  Priority
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

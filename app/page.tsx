"use client";

import CalendarView from "@/components/calendar-view";
import { SettingsPopover } from "@/components/settings-button";
import { SyncPopover } from "@/components/sync-button";
import Task from "@/components/task";
import AiInput from "@/components/ui/ai-input";
import { useGoogleCalendar, useSync } from "@/hooks";
import { useSettingsStore } from "@/stores/settings-store";
import { useTaskStoreWithPersistence } from "@/stores/task-store";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

function HomePage() {
  const inputRef = useRef<HTMLDivElement>(null);
  const [currentSelectedDate, setCurrentSelectedDate] = useState(new Date());
  const [isInputVisible, setIsInputVisible] = useState(false);

  const { settings } = useSettingsStore();
  const { processAIActions } = useTaskStoreWithPersistence();
  const googleCalendar = useGoogleCalendar();
  const sync = useSync();

  const aiDisabled = !settings.aiEnabled || !settings.groqApiKey;

  useHotkeys("meta+k, ctrl+k", (e) => {
    e.preventDefault();
    setIsInputVisible((prev) => !prev);
  });

  const handleClose = useCallback(() => setIsInputVisible(false), []);

  const handleSubmit = useCallback(
    async (text: string, onComplete?: () => void) => {
      if (!text.trim()) return;

      try {
        await processAIActions(
          text,
          currentSelectedDate,
          settings,
          googleCalendar,
        );
        onComplete?.();
      } catch (error) {
        console.error("Failed to process task input:", error);
        onComplete?.();
      }
    },
    [processAIActions, currentSelectedDate, settings, googleCalendar],
  );

  return (
    <>
      <main className="hidden md:flex flex-col w-full h-full mx-auto bg-neutral-900">
        <CalendarView
          onDateChange={setCurrentSelectedDate}
          onNewTaskClick={(date) => {
            setCurrentSelectedDate(date);
            setIsInputVisible(true);
          }}
          isMobile={false}
          sync={sync}
        />
        <AnimatePresence>
          {isInputVisible && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end justify-center"
              onClick={handleClose}
            >
              <div
                className="w-full max-w-lg mb-8"
                onClick={(e) => e.stopPropagation()}
              >
                <AiInput
                  placeholder="What's next?"
                  minHeight={48}
                  onSubmit={(text) => handleSubmit(text, handleClose)}
                  onClose={handleClose}
                  isMobile={false}
                  aiDisabled={aiDisabled}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <main className="flex md:hidden flex-col w-full h-full mx-auto bg-neutral-900">
        <div className="fixed z-40 flex gap-2 top-5 right-5">
          <SyncPopover sync={sync} />
          <SettingsPopover isMobile={true} />
        </div>
        <div className="flex-1 w-full max-w-md mx-auto px-4 pt-3 pb-[130px] bg-neutral-900 overflow-hidden">
          <Task isMobile={true} onDateChange={setCurrentSelectedDate} />
        </div>
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-50 shadow-lg bg-neutral-900"
          ref={inputRef}
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
        >
          <div className="max-w-md pb-2 mx-auto">
            <AiInput
              placeholder="What's next?"
              minHeight={50}
              onClose={handleClose}
              onSubmit={handleSubmit}
              isMobile={true}
              aiDisabled={aiDisabled}
              className={aiDisabled ? "ai-disabled" : ""}
            />
          </div>
        </motion.div>
      </main>
    </>
  );
}

export default HomePage;

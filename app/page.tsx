"use client";

import CalendarView from "@/components/calendar-view";
import { SettingsPopover } from "@/components/settings-button";
import { SyncPopover } from "@/components/sync-button";
import Task from "@/components/task";
import AiInput from "@/components/ui/ai-input";
import { useGoogleCalendar, useMediaQuery } from "@/hooks";
import { useSettingsStore } from "@/stores/settings-store";
import { useTaskStoreWithPersistence } from "@/stores/task-store";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

function HomePage() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const inputRef = useRef<HTMLDivElement>(null);
  const [currentSelectedDate, setCurrentSelectedDate] = useState(new Date());
  const [isInputVisible, setIsInputVisible] = useState(isMobile ? true : false);

  const { settings } = useSettingsStore();
  const { processAIActions } = useTaskStoreWithPersistence();
  const googleCalendar = useGoogleCalendar();

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

  if (!isMobile) {
    return (
      <main className="flex flex-col w-full h-full mx-auto bg-neutral-900">
        <CalendarView
          onDateChange={setCurrentSelectedDate}
          onNewTaskClick={(date) => {
            setCurrentSelectedDate(date);
            setIsInputVisible(true);
          }}
          isMobile={isMobile}
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
                  aiDisabled={!settings.aiEnabled}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    );
  }
  return (
    <main className="flex flex-col w-full h-full mx-auto bg-neutral-900">
      <div className="fixed z-40 flex gap-2 top-5 right-5">
        <SyncPopover />
        <SettingsPopover isMobile={isMobile} />
      </div>

      <div
        className={`flex-1 w-full max-w-md mx-auto px-4 pt-3 ${
          isInputVisible ? "pb-[130px]" : "pb-6"
        } bg-neutral-900 overflow-hidden`}
      >
        <Task isMobile={isMobile} onDateChange={setCurrentSelectedDate} />
      </div>
      <AnimatePresence>
        {(isInputVisible || isMobile) && (
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 shadow-lg bg-neutral-900"
            ref={inputRef}
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <div className="max-w-md pb-2 mx-auto">
              <AiInput
                placeholder="What's next?"
                minHeight={50}
                onClose={handleClose}
                onSubmit={handleSubmit}
                isMobile={isMobile}
                aiDisabled={!settings.aiEnabled}
                className={settings.aiEnabled ? "" : "ai-disabled"}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* <div className="fixed bottom-0 left-0 right-0 z-[9999] text-center">
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/privacy-policy"
            className="text-neutral-400 text-xs hover:text-white transition-colors"
          >
            Privacy Policy
          </Link>
          <span className="text-neutral-600">•</span>
          <Link
            href="https://github.com/koushikyemula/cue"
            className="text-neutral-400 text-xs hover:text-white transition-colors"
          >
            GitHub
          </Link>
        </div>
      </div> */}
    </main>
  );
}

export default HomePage;

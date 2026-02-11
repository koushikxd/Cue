"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, Share, X } from "lucide-react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useMediaQuery } from "@/hooks";

export function InstallPWA({ promptDelay = 1500 }: { promptDelay?: number }) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [isDismissed, setIsDismissed] = useLocalStorage(
    "installPromptDismissed",
    false,
  );
  const [lastPromptDate, setLastPromptDate] = useLocalStorage(
    "lastPromptDate",
    0,
  );

  useEffect(() => {
    if (isDesktop) return;

    const daysSinceLastDismissal =
      (Date.now() - lastPromptDate) / (1000 * 60 * 60 * 24);
    if (isDismissed && daysSinceLastDismissal < 2) return;

    if (isDismissed && daysSinceLastDismissal >= 2) {
      setIsDismissed(false);
    }

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;

    if (isStandalone) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(navigator as any).standalone &&
      !("MSStream" in window);

    if (isIOS && !isDismissed) {
      const timer = setTimeout(() => setShowIOSPrompt(true), promptDelay);
      return () => clearTimeout(timer);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", () => {
      setInstallPrompt(null);
      setShowIOSPrompt(false);
    });

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, [isDismissed, lastPromptDate, promptDelay, isDesktop, setIsDismissed]);

  const handleInstallClick = () => {
    if (!installPrompt) return;

    installPrompt.prompt();

    installPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === "accepted") {
        setInstallPrompt(null);
      }
    });
  };

  const handleDismiss = () => {
    setInstallPrompt(null);
    setShowIOSPrompt(false);
    setIsDismissed(true);
    setLastPromptDate(Date.now());
  };

  const renderChromePrompt = () => {
    if (!installPrompt || isDismissed) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-auto md:max-w-sm p-3 bg-neutral-800 shadow-md rounded-md border border-neutral-800/40 z-50"
      >
        <div className="flex items-center gap-3">
          <img
            src="/icons/icon-192x192.png"
            alt="App Icon"
            className="w-10 h-10 rounded-md"
          />
          <div className="flex-grow">
            <p className="text-sm font-medium text-neutral-200">Install app</p>
            <p className="text-xs text-neutral-400">For the best experience</p>
          </div>
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 bg-neutral-900 hover:bg-accent/30 text-neutral-200 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4" />
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-neutral-400 hover:bg-neutral-700/80 hover:text-neutral-300 rounded-full transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    );
  };

  // Render the iOS instructions
  const renderIOSPrompt = () => {
    if (!showIOSPrompt || isDismissed) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -30 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="fixed top-5 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-auto md:max-w-sm p-3 bg-neutral-800 shadow-md rounded-md border border-neutral-800 z-50"
      >
        <div className="flex items-start gap-3">
          <img
            src="/icons/icon-192-192.png"
            alt="App Icon"
            className="w-10 h-10 rounded-md mt-0.5"
          />
          <div className="flex-grow">
            <p className="text-sm font-medium text-neutral-200">Install app</p>
            <p className="mt-0.5 text-xs text-neutral-400 flex items-center gap-1">
              Tap <Share className="w-3 h-3 text-neutral-300" /> then &quot;Add
              to Home Screen&quot;
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-300 -mt-1 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    );
  };

  if (isDesktop) {
    return null;
  }

  return (
    <AnimatePresence>
      {renderChromePrompt()}
      {renderIOSPrompt()}
    </AnimatePresence>
  );
}

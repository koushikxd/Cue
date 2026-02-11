"use client";

import { AIHelpDialog } from "@/components/ai-help-dialog";
import { ShortcutsDialog } from "@/components/shortcuts-dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAutoResizeTextarea } from "@/hooks";
import { cn } from "@/lib/utils";
import { ArrowElbowRightUp } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";

type Command = {
  name: string;
  description: string;
  execute: () => void;
};

interface AIInputProps {
  id?: string;
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
  defaultSelected?: string;
  onSubmit?: (text: string, onComplete?: () => void) => void | Promise<void>;
  onClose: () => void;
  className?: string;
  isMobile?: boolean;
  aiDisabled?: boolean;
  showHelpText?: boolean;
}

function AIInput({
  id = "ai-input",
  placeholder = "Add a task...",
  minHeight = 64,
  maxHeight = 200,
  onSubmit,
  onClose,
  className,
  isMobile = false,
  aiDisabled = false,
  showHelpText = true,
}: AIInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);

  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight,
  });

  const commands = useMemo<Record<string, Command>>(
    () => ({
      "?help": {
        name: "?help",
        description: "Shows help information",
        execute: () => {
          setShowHelpDialog(true);
          setInputValue("");
          adjustHeight(true);
        },
      },
      "?shortcuts": {
        name: "?shortcuts",
        description: "Shows keyboard shortcuts",
        execute: () => {
          setShowShortcutsDialog(true);
          setInputValue("");
          adjustHeight(true);
        },
      },
    }),
    [adjustHeight],
  );

  const commandNames = useMemo(() => Object.keys(commands), [commands]);

  const adjustedPlaceholder = useMemo(() => {
    return placeholder;
  }, [placeholder]);

  useEffect(() => {
    const textareaElement = textareaRef.current;
    if (textareaElement) {
      const timerId = setTimeout(() => {
        textareaElement.focus();
      }, 100);
      return () => clearTimeout(timerId);
    }
  }, [textareaRef]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !e.metaKey &&
        !e.ctrlKey &&
        document.activeElement !== textareaRef.current
      ) {
        e.preventDefault();
        if (textareaRef.current && !submitted) {
          textareaRef.current.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [submitted, textareaRef]);

  const handleSubmit = useCallback(() => {
    const trimmedInput = inputValue.trim();

    const command = commands[trimmedInput];
    if (command) {
      command.execute();
      return;
    }

    if (trimmedInput && !submitted) {
      setSubmitted(true);
      setInputValue("");
      adjustHeight(true);

      const handleComplete = () => {
        setSubmitted(false);
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      };

      // Call onSubmit with the completion callback
      const result = onSubmit?.(trimmedInput, handleComplete);

      // If onSubmit returns a promise, handle it
      if (result && typeof result === "object" && "then" in result) {
        result.catch(() => {
          // Reset on error
          setSubmitted(false);
          if (textareaRef.current) {
            textareaRef.current.focus();
          }
        });
      }
    }
  }, [inputValue, submitted, onSubmit, adjustHeight, commands, textareaRef]);

  const handleTabCompletion = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Tab" && !e.shiftKey && inputValue.startsWith("?")) {
        e.preventDefault();

        const matchingCommands = commandNames.filter(
          (cmd) => cmd.startsWith(inputValue) && cmd !== inputValue,
        );

        if (matchingCommands.length > 0) {
          setInputValue(matchingCommands[0]);
        }
      }
    },
    [inputValue, commandNames],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Handle tab completion
      handleTabCompletion(e);

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }

      // Handle Cmd+K or Ctrl+K to close
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        e.stopPropagation();
        onClose?.();
      }

      // Handle Esc to close
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose?.();
      }
    },
    [handleSubmit, onClose, handleTabCompletion],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);

      if (!newValue.trim()) {
        adjustHeight(true);
      } else {
        adjustHeight();
      }
    },
    [adjustHeight],
  );

  const containerClass = useMemo(
    () => cn("w-full py-4 px-4 sm:px-0 pointer-events-auto", className),
    [className],
  );

  const inputContainerClass = useMemo(
    () =>
      cn(
        "relative border transition-all duration-200 ease-in-out",
        "border-black/10 dark:border-white/10",
        isFocused
          ? "border-black/30 dark:border-white/30 shadow-sm"
          : "border-black/10 dark:border-white/10",
        " bg-black/[0.03] dark:bg-neutral-900",
        aiDisabled && "dark:border-neutral-700/50",
      ),
    [isFocused, aiDisabled],
  );

  const textareaClass = useMemo(
    () =>
      cn(
        "max-w-xl w-full pr-10 py-4 placeholder:text-black/50 dark:placeholder:text-neutral-400",
        "border-none focus:ring-0 text-black dark:text-white resize-none text-wrap",
        "focus-visible:ring-0 focus-visible:ring-offset-0 leading-[1.2]",
        `min-h-[${minHeight}px] transition-all duration-200 scrollbar-hide`,
        aiDisabled && "pl-16",
      ),
    [minHeight, aiDisabled],
  );

  const submitButtonClass = useMemo(
    () =>
      cn(
        "absolute right-3 top-1/2 -translate-y-1/2 py-1 px-1",
        submitted ? "bg-none" : "bg-black/5 dark:bg-neutral-800",
      ),
    [submitted],
  );

  const iconClass = useMemo(
    () =>
      cn(
        "w-4 h-4 transition-opacity dark:text-white",
        inputValue ? "opacity-100" : "opacity-30",
      ),
    [inputValue],
  );

  const handleTextareaClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (textareaRef.current && !submitted) {
        textareaRef.current.focus();
      }
    },
    [submitted, textareaRef],
  );

  return (
    <>
      <AIHelpDialog
        open={showHelpDialog}
        onOpenChange={setShowHelpDialog}
        isMobile={isMobile}
      />
      <ShortcutsDialog
        open={showShortcutsDialog}
        onOpenChange={setShowShortcutsDialog}
        isMobile={isMobile}
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={containerClass}
      >
        <div className="relative max-w-lg w-full mx-auto">
          <motion.div
            className={inputContainerClass}
            whileTap={{ scale: 0.995 }}
          >
            <div className="flex flex-col">
              <div
                className="overflow-y-auto px-4 cursor-text scrollbar-hide"
                style={{ maxHeight: `${maxHeight - 48}px` }}
                onClick={handleTextareaClick}
              >
                <Textarea
                  ref={textareaRef}
                  id={id}
                  placeholder={adjustedPlaceholder}
                  className={textareaClass}
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  disabled={submitted}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <motion.button
              onClick={handleSubmit}
              className={submitButtonClass}
              type="button"
              disabled={submitted || !inputValue.trim()}
            >
              {submitted ? (
                <div
                  className="w-4 h-4 bg-black dark:bg-white animate-spin transition duration-700"
                  style={{ animationDuration: "3s" }}
                />
              ) : (
                <ArrowElbowRightUp className={iconClass} />
              )}
            </motion.button>
            {aiDisabled && (
              <div className="absolute left-3 top-[50%] -translate-y-1/2 pointer-events-none">
                <span className="flex items-center gap-1 text-xs text-neutral-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-neutral-700"></span>
                  <span>Manual</span>
                </span>
              </div>
            )}
          </motion.div>
          {showHelpText && (
            <p className="h-4 text-xs mt-2 text-center text-black/70 dark:text-neutral-500">
              Type{" "}
              <span className="font-mono bg-neutral-800/70 px-1 py-0.5 rounded text-neutral-400">
                ?help
              </span>{" "}
              {!isMobile && (
                <>
                  or{" "}
                  <span className="font-mono bg-neutral-800/70 px-1 py-0.5 rounded text-neutral-400">
                    ?shortcuts
                  </span>{" "}
                </>
              )}
              for assistance
            </p>
          )}
        </div>
      </motion.div>
    </>
  );
}

export default memo(AIInput);

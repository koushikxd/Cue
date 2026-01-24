"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Command, Info, Keyboard } from "lucide-react";
import { useEffect, useState } from "react";

interface ShortcutHelp {
  title: string;
  keys: React.ReactNode;
  description: string;
}

export function ShortcutsDialog({
  open,
  onOpenChange,
  isMobile,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isMobile?: boolean;
}) {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(navigator.userAgent.indexOf("Mac") !== -1);
  }, []);

  const shortcuts: ShortcutHelp[] = [
    {
      title: "Command Menu",
      keys: (
        <span className="flex items-center gap-1">
          {isMac ? <Command className="h-3 w-3" /> : <span>Ctrl</span>}
          <span>+</span>
          <span>K</span>
        </span>
      ),
      description: "Toggle input",
    },
    {
      title: "Focus Input",
      keys: <span>/</span>,
      description: "Focus the AI input",
    },
    {
      title: "Close",
      keys: <span>Esc</span>,
      description: "Close input",
    },
    {
      title: "View Toggle",
      keys: (
        <span className="flex items-center gap-1">
          <span>Shift</span>
          <span>+</span>
          <span>Tab</span>
        </span>
      ),
      description: "Toggle between daily tasks and overall tasks",
    },
    {
      title: "Previous Day",
      keys: (
        <span className="flex items-center gap-1">
          <span>{isMac ? "Option" : "Alt"}</span>
          <span>+</span>
          <span>[</span>
        </span>
      ),
      description: "Navigate to previous day in date view",
    },
    {
      title: "Next Day",
      keys: (
        <span className="flex items-center gap-1">
          <span>{isMac ? "Option" : "Alt"}</span>
          <span>+</span>
          <span>]</span>
        </span>
      ),
      description: "Navigate to next day in date view",
    },
  ];

  const ShortcutsList = () => (
    <div className={`grid grid-cols-1 gap-y-3 ${isMobile ? "px-1" : ""}`}>
      {shortcuts.map((shortcut, i) => (
        <div key={i} className="flex items-center justify-between group">
          <div className="flex flex-col">
            <span className="text-sm text-neutral-300 group-hover:text-neutral-200 transition-colors">
              {shortcut.title}
            </span>
            <span className="text-xs text-neutral-500 group-hover:text-neutral-400 transition-colors">
              {shortcut.description}
            </span>
          </div>
          <div className="font-mono text-xs bg-neutral-800/70 px-2 py-1 rounded text-neutral-300 flex items-center ml-3 shrink-0">
            {shortcut.keys}
          </div>
        </div>
      ))}
    </div>
  );

  const FooterNote = () => (
    <div className="mt-4 pt-3 border-t border-neutral-800/50 text-center">
      <p className="text-xs text-neutral-500 flex items-center justify-center gap-1">
        <Info className="h-3 w-3" />
        Type{" "}
        <span className="font-mono bg-neutral-800/70 px-1 py-0.5 rounded text-neutral-400">
          ?shortcuts
        </span>
      </p>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="bg-neutral-900 border-t border-neutral-800/70">
          <div className="pt-2"></div>
          <DrawerHeader className="pb-2">
            <div className="flex items-center gap-2 mb-1">
              <Keyboard className="h-4 w-4 text-neutral-400" />
              <DrawerTitle className="text-base font-medium text-neutral-200">
                Keyboard Shortcuts
              </DrawerTitle>
            </div>
            <DrawerDescription className="text-neutral-400 text-xs">
              Navigate and interact more efficiently
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-6">
            <ShortcutsList />
            <FooterNote />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-neutral-900 border-neutral-800/70 p-6">
        <DialogHeader className="pb-3">
          <div className="flex items-center gap-2 mb-1">
            <Keyboard className="h-4 w-4 text-neutral-400" />
            <DialogTitle className="text-base font-medium text-neutral-200">
              Keyboard Shortcuts
            </DialogTitle>
          </div>
          <DialogDescription className="text-neutral-400 text-sm">
            Navigate and interact more efficiently with these shortcuts
          </DialogDescription>
        </DialogHeader>

        <ShortcutsList />
        <FooterNote />
      </DialogContent>
    </Dialog>
  );
}

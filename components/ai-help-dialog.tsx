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
import {
  AlertCircleIcon,
  CalendarIcon,
  CheckCircle2Icon,
  EditIcon,
  ExternalLinkIcon,
  FileDownIcon,
  InfoIcon,
  KeyIcon,
  ListIcon,
  PlusIcon,
  SortAscIcon,
  SparklesIcon,
  TrashIcon,
  XCircleIcon,
} from "lucide-react";

interface ActionHelp {
  icon: React.ReactNode;
  title: string;
  example: string;
}

export function AIHelpDialog({
  open,
  onOpenChange,
  isMobile,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isMobile?: boolean;
}) {
  const actions: ActionHelp[] = [
    {
      icon: <PlusIcon className="h-4 w-4" />,
      title: "Add",
      example: "buy groceries",
    },
    {
      icon: <CalendarIcon className="h-4 w-4" />,
      title: "Set Date/Time",
      example: "meeting tomorrow 3pm",
    },
    {
      icon: <AlertCircleIcon className="h-4 w-4" />,
      title: "Set Priority",
      example: "urgent: finish report",
    },
    {
      icon: <CheckCircle2Icon className="h-4 w-4" />,
      title: "Mark Complete",
      example: "finished the report",
    },
    {
      icon: <XCircleIcon className="h-4 w-4" />,
      title: "Mark Incomplete",
      example: "redo presentation",
    },
    {
      icon: <EditIcon className="h-4 w-4" />,
      title: "Edit",
      example: "change meeting to 5pm",
    },
    {
      icon: <TrashIcon className="h-4 w-4" />,
      title: "Delete",
      example: "remove grocery task",
    },
    {
      icon: <SortAscIcon className="h-4 w-4" />,
      title: "Sort",
      example: "sort by priority",
    },
    {
      icon: <ListIcon className="h-4 w-4" />,
      title: "Clear List",
      example: "clear completed tasks",
    },
    {
      icon: <FileDownIcon className="h-4 w-4" />,
      title: "Export",
      example: "export my tasks",
    },
  ];

  const ApiKeyBanner = () => (
    <div className="mb-4 p-3 bg-neutral-800/50 border border-neutral-700/50 rounded-lg">
      <div className="flex items-start gap-2.5">
        <KeyIcon className="h-4 w-4 text-neutral-400 mt-0.5 shrink-0" />
        <div className="space-y-1.5">
          <p className="text-xs text-neutral-300">
            AI features require your own Groq API key. Add it in{" "}
            <span className="font-medium text-neutral-200">Settings</span> to
            get started.
          </p>
          <a
            href="https://console.groq.com/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            Get a free Groq API key
            <ExternalLinkIcon className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );

  const ActionsList = () => (
    <div
      className={`grid ${
        isMobile ? "grid-cols-1" : "grid-cols-2"
      } gap-x-6 gap-y-4`}
    >
      {actions.map((action, i) => (
        <div key={i} className="flex items-start gap-3 group">
          <div className="text-neutral-500 group-hover:text-neutral-400 transition-colors pt-0.5 shrink-0">
            {action.icon}
          </div>
          <div className="flex flex-col">
            <span className="text-sm text-neutral-300 group-hover:text-neutral-200 transition-colors">
              {action.title}
            </span>
            <span className="text-xs text-neutral-500 group-hover:text-neutral-400 transition-colors font-mono mt-0.5">
              e.g., &quot;{action.example}&quot;
            </span>
          </div>
        </div>
      ))}
    </div>
  );

  const FooterNote = () => (
    <div className="mt-6 pt-4 border-t border-neutral-800/50 text-center">
      <p className="text-xs text-neutral-500 flex items-center justify-center gap-1">
        <InfoIcon className="h-3 w-3" />
        Type{" "}
        <span className="font-mono bg-neutral-800/70 px-1 py-0.5 rounded text-neutral-400">
          ?help
        </span>{" "}
        anytime
      </p>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="bg-neutral-900 border-t border-neutral-800/70">
          <DrawerHeader className="pb-4">
            <div className="flex items-center gap-2 mb-1">
              <SparklesIcon className="h-4 w-4 text-neutral-400" />
              <DrawerTitle className="text-base font-medium text-neutral-200">
                AI Capabilities
              </DrawerTitle>
            </div>
            <DrawerDescription className="text-neutral-400">
              This input understands natural language. Add tasks, set dates,
              mark as complete, and more using simple english.
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-6">
            <ApiKeyBanner />
            <ActionsList />
            <FooterNote />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl bg-neutral-900 border-neutral-800/70 p-6">
        <DialogHeader className="pb-4">
          <div className="flex items-center gap-2 mb-1">
            <SparklesIcon className="h-4 w-4 text-neutral-400" />
            <DialogTitle className="text-base font-medium text-neutral-200">
              AI Capabilities
            </DialogTitle>
          </div>
          <DialogDescription className="text-neutral-400">
            This input understands natural language. Add tasks, set dates, mark
            as complete, and more using simple english.
          </DialogDescription>
        </DialogHeader>

        <ApiKeyBanner />
        <ActionsList />
        <FooterNote />
      </DialogContent>
    </Dialog>
  );
}

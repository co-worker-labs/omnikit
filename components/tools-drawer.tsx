"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogPanel } from "@headlessui/react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "../i18n/navigation";
import { getToolCards, getToolIconColor } from "../libs/tools";
import type { ToolCard } from "../libs/tools";
import { searchTools } from "../libs/tools-search";
import { useIsMobile } from "../hooks/use-is-mobile";

interface ToolsDrawerProps {
  open: boolean;
  onClose: () => void;
}

function DrawerContent({
  filteredTools,
  currentPath,
  focusedIndex,
  onSelect,
  onCardRef,
  t,
}: {
  filteredTools: ToolCard[];
  currentPath: string;
  focusedIndex: number;
  onSelect: (path: string) => void;
  onCardRef: (index: number, el: HTMLButtonElement | null) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  if (filteredTools.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-fg-muted">
        {t("nav.noMatchingTools")}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-1.5 overflow-y-auto p-3">
      {filteredTools.map((tool, index) => {
        const Icon = tool.icon;
        const isActive = tool.path === currentPath;
        const isFocused = index === focusedIndex;

        return (
          <button
            key={tool.path}
            ref={(el) => onCardRef(index, el)}
            className={`flex flex-col items-start gap-1.5 rounded-lg p-3 text-left transition-colors border-l-2 ${
              isActive
                ? "border-accent-cyan bg-accent-cyan/10"
                : isFocused
                  ? "border-accent-cyan bg-accent-cyan/10"
                  : "border-transparent hover:bg-accent-cyan/8"
            }`}
            onClick={() => onSelect(tool.path)}
          >
            <div className="flex items-center gap-2">
              <Icon size={16} className="shrink-0" style={{ color: getToolIconColor(tool.path) }} />
              <span className="text-sm font-medium text-fg-primary truncate">{tool.title}</span>
            </div>
            <p className="text-xs text-fg-muted line-clamp-2 leading-relaxed">{tool.description}</p>
          </button>
        );
      })}
    </div>
  );
}

export default function ToolsDrawer({ open, onClose }: ToolsDrawerProps) {
  const router = useRouter();
  const currentPath = usePathname();
  const t = useTranslations("common");
  const tTools = useTranslations("tools");
  const isMobile = useIsMobile();

  const [query, setQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const cardRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const toolCards = getToolCards(tTools);
  const filteredTools = searchTools(query, toolCards);

  /* eslint-disable react-hooks/set-state-in-effect -- reset state when drawer opens */
  useEffect(() => {
    if (open) {
      setQuery("");
      setFocusedIndex(-1);
      cardRefs.current.clear();
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (focusedIndex < 0) return;
    const el = cardRefs.current.get(focusedIndex);
    el?.scrollIntoView({ block: "nearest" });
  }, [focusedIndex]);

  function handleCardRef(index: number, el: HTMLButtonElement | null) {
    if (el) {
      cardRefs.current.set(index, el);
    } else {
      cardRefs.current.delete(index);
    }
  }

  function handleSelect(path: string) {
    router.push(path);
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = focusedIndex + 1;
      setFocusedIndex(next >= filteredTools.length ? 0 : next);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = focusedIndex - 1;
      setFocusedIndex(prev < 0 ? filteredTools.length - 1 : prev);
    } else if (e.key === "Enter" && focusedIndex >= 0) {
      e.preventDefault();
      const tool = filteredTools[focusedIndex];
      if (tool) handleSelect(tool.path);
    }
  }

  const desktopPanel = (
    <div className="fixed inset-y-0 right-0 flex w-1/2 lg:w-[30%] lg:max-w-[500px]">
      <DialogPanel
        className="w-full bg-bg-surface border-l border-border-default flex flex-col"
        style={{ animation: "drawer-slide-in-right 200ms ease-out" }}
      >
        <div className="flex items-center gap-2 border-b border-border-default px-4 py-3">
          <Search size={16} className="text-fg-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setFocusedIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            placeholder={t("nav.searchTools")}
            className="w-full bg-transparent text-sm text-fg-primary placeholder:text-fg-muted outline-none"
          />
        </div>

        <DrawerContent
          filteredTools={filteredTools}
          currentPath={currentPath}
          focusedIndex={focusedIndex}
          onSelect={handleSelect}
          onCardRef={handleCardRef}
          t={t}
        />
      </DialogPanel>
    </div>
  );

  const mobilePanel = (
    <div className="fixed inset-x-0 bottom-0 flex">
      <DialogPanel
        className="w-full max-h-[85vh] bg-bg-surface rounded-t-2xl border-t border-border-default flex flex-col"
        style={{ animation: "drawer-slide-in-up 200ms ease-out" }}
      >
        <div className="flex justify-center pt-2 pb-1">
          <div className="h-1 w-8 rounded-full bg-border-default" />
        </div>

        <div className="flex items-center gap-2 border-b border-border-default px-4 py-3">
          <Search size={16} className="text-fg-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setFocusedIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            placeholder={t("nav.searchTools")}
            className="w-full bg-transparent text-sm text-fg-primary placeholder:text-fg-muted outline-none"
          />
        </div>

        <DrawerContent
          filteredTools={filteredTools}
          currentPath={currentPath}
          focusedIndex={focusedIndex}
          onSelect={handleSelect}
          onCardRef={handleCardRef}
          t={t}
        />
      </DialogPanel>
    </div>
  );

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div
        className="fixed inset-0 bg-black/40"
        style={{ animation: "backdrop-fade-in 200ms ease-out" }}
        aria-hidden="true"
      />

      {isMobile ? mobilePanel : desktopPanel}
    </Dialog>
  );
}

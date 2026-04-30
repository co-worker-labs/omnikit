"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { useRouter, usePathname } from "../i18n/navigation";
import {
  LayoutGrid,
  Sun,
  Moon,
  ClipboardX,
  Maximize,
  Minimize,
  Globe,
  GripVertical,
} from "lucide-react";
import { useTheme } from "../libs/theme";
import { useTranslations, useLocale } from "next-intl";
import { Dropdown } from "./ui/dropdown";
import { useFullscreen } from "../hooks/use-fullscreen";
import { useDraggable } from "../hooks/use-draggable";
import { showToast } from "../libs/toast";
import ToolsDrawer from "./tools-drawer";

const languages = [
  { code: "en", label: "English", shortLabel: "EN" },
  { code: "zh-CN", label: "简体中文", shortLabel: "中" },
  { code: "zh-TW", label: "繁體中文", shortLabel: "繁" },
];

// Approximate toolbar width: 5 buttons × 34px + drag handle 30px + border paddings
// Used as fallback before element is measured
const TOOLBAR_WIDTH = 200;

export default function FloatingToolbar() {
  const router = useRouter();
  const currentPath = usePathname();
  const { theme, toggleTheme } = useTheme();
  const t = useTranslations("common");
  const currentLocale = useLocale();
  const [spinning, setSpinning] = useState(false);
  const [flipping, setFlipping] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const fullscreen = useFullscreen();
  const [clipAnimating, setClipAnimating] = useState(false);
  const [globeBouncing, setGlobeBouncing] = useState(false);
  const isClipboardSupported = useSyncExternalStore(
    () => () => {},
    () => typeof navigator !== "undefined" && !!navigator.clipboard,
    () => false
  );

  const defaultPosition =
    typeof window !== "undefined"
      ? { x: window.innerWidth - TOOLBAR_WIDTH - 12, y: 12 }
      : { x: 0, y: 0 };

  const { ref, style, handlePointerDown, isDragging } = useDraggable({
    storageKey: "floatingToolbarPosition",
    defaultPosition,
  });

  const handleClearClipboard = async () => {
    setClipAnimating(true);
    try {
      await navigator.clipboard.writeText("");
      showToast(t("clearedClipboard"), "success");
    } catch {
      showToast(t("clipboardClearFailed"), "danger");
    }
  };

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setDrawerOpen(true);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div
      ref={ref}
      style={style}
      onPointerDown={handlePointerDown}
      className="z-[40] flex items-center gap-0 bg-bg-surface/80 backdrop-blur-xl rounded-xl shadow-lg border border-border-default transition-opacity duration-200"
    >
      <div
        className="flex h-[34px] w-[30px] shrink-0 items-center justify-center text-fg-muted hover:text-accent-cyan transition-colors border-r border-border-default cursor-grab"
        aria-hidden="true"
      >
        <GripVertical size={14} />
      </div>

      <button
        type="button"
        className={`flex h-[34px] w-[34px] items-center justify-center text-fg-secondary hover:text-accent-cyan hover:bg-accent-cyan/10 transition-colors border-r border-border-default ${spinning ? "nav-btn-spin" : ""}`}
        onClick={() => {
          setSpinning(true);
          setDrawerOpen(true);
        }}
        onAnimationEnd={() => setSpinning(false)}
        aria-label={t("nav.tools")}
        title={t("nav.searchToolsHint")}
      >
        <LayoutGrid size={16} />
      </button>
      <ToolsDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {isClipboardSupported && (
        <button
          type="button"
          className={`flex h-[34px] w-[34px] items-center justify-center text-fg-secondary hover:text-accent-cyan hover:bg-accent-cyan/10 transition-colors border-r border-border-default ${clipAnimating ? "nav-btn-clear" : ""}`}
          onClick={handleClearClipboard}
          onAnimationEnd={() => setClipAnimating(false)}
          aria-label={t("nav.clearClipboard")}
          title={t("nav.clearClipboard")}
        >
          <ClipboardX size={16} />
        </button>
      )}

      {fullscreen.isSupported && (
        <button
          type="button"
          className="flex h-[34px] w-[34px] items-center justify-center text-fg-secondary hover:text-accent-cyan hover:bg-accent-cyan/10 transition-colors border-r border-border-default"
          onClick={() => fullscreen.toggle()}
          aria-label={fullscreen.isFullscreen ? t("nav.exitFullscreen") : t("nav.fullscreen")}
          title={fullscreen.isFullscreen ? t("nav.exitFullscreen") : t("nav.fullscreen")}
        >
          {fullscreen.isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
        </button>
      )}

      <button
        type="button"
        className={`flex h-[34px] w-[34px] items-center justify-center text-fg-secondary hover:text-accent-cyan hover:bg-accent-cyan/10 transition-colors border-r border-border-default ${flipping ? "nav-btn-flip" : ""}`}
        onClick={() => {
          setFlipping(true);
          toggleTheme();
        }}
        onAnimationEnd={() => setFlipping(false)}
        aria-label={t(theme === "dark" ? "nav.switchToLight" : "nav.switchToDark")}
      >
        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      <Dropdown
        trigger={
          <button
            type="button"
            className={`flex h-[34px] w-[34px] items-center justify-center text-fg-secondary hover:text-accent-cyan hover:bg-accent-cyan/10 transition-colors ${globeBouncing ? "nav-btn-bounce" : ""}`}
            onClick={() => setGlobeBouncing(true)}
            onAnimationEnd={() => setGlobeBouncing(false)}
            aria-label={t("language")}
          >
            <Globe size={16} />
          </button>
        }
        items={languages.map((lang) => ({
          label: lang.label,
          onClick: () => router.replace(currentPath, { locale: lang.code }),
          active: lang.code === currentLocale,
        }))}
      />
    </div>
  );
}

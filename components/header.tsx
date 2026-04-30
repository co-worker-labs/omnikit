"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { useRouter, usePathname, Link } from "../i18n/navigation";
import { LayoutGrid, Sun, Moon, ClipboardX, Maximize, Minimize } from "lucide-react";
import { useTheme } from "../libs/theme";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "./language_switcher";
import ToolsDrawer from "./tools-drawer";
import { useFullscreen } from "../hooks/use-fullscreen";
import { showToast } from "../libs/toast";

export type HeaderPosition = "sticky" | "none" | "hidden";

export default function Header({ position, title }: { position: HeaderPosition; title?: string }) {
  const router = useRouter();
  const currentPath = usePathname();
  const { theme, toggleTheme } = useTheme();
  const t = useTranslations("common");
  const [spinning, setSpinning] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [flipping, setFlipping] = useState(false);
  const fullscreen = useFullscreen();
  const [clipAnimating, setClipAnimating] = useState(false);
  const isClipboardSupported = useSyncExternalStore(
    () => () => {},
    () => typeof navigator !== "undefined" && !!navigator.clipboard,
    () => false
  );

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

  const handleClearClipboard = async () => {
    setClipAnimating(true);
    try {
      await navigator.clipboard.writeText("");
      showToast(t("clearedClipboard"), "success");
    } catch {
      showToast(t("clipboardClearFailed"), "danger");
    }
  };

  if (position === "hidden") {
    return <></>;
  }

  const positionClass = position === "sticky" ? "sticky top-0 z-50" : "relative z-40";

  return (
    <>
      <nav className={`${positionClass} bg-bg-surface/80 backdrop-blur-md`}>
        <div className="mx-auto flex items-center justify-between px-4 py-2 lg:px-6">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 text-fg-primary hover:text-accent-cyan transition-colors"
          >
            <img src="/favicon.svg" alt="Logo" height={28} width={28} />
            <span className={`font-bold ${!title ? "" : "hidden md:inline"}`}>
              {t("nav.brand")}
            </span>
          </Link>

          {title && (
            <h1 className="mx-4 truncate text-center text-sm font-bold text-fg-secondary">
              {title}
            </h1>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-fg-secondary hover:text-accent-cyan hover:bg-accent-cyan/10 transition-colors ${spinning ? "nav-btn-spin" : ""}`}
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
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-fg-secondary hover:text-accent-cyan hover:bg-accent-cyan/10 transition-colors ${clipAnimating ? "nav-btn-clear" : ""}`}
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
                className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-secondary hover:text-accent-cyan hover:bg-accent-cyan/10 transition-colors"
                onClick={() => fullscreen.toggle()}
                aria-label={fullscreen.isFullscreen ? t("nav.exitFullscreen") : t("nav.fullscreen")}
                title={fullscreen.isFullscreen ? t("nav.exitFullscreen") : t("nav.fullscreen")}
              >
                {fullscreen.isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
              </button>
            )}

            <button
              type="button"
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-fg-secondary hover:text-accent-cyan hover:bg-accent-cyan/10 transition-colors ${flipping ? "nav-btn-flip" : ""}`}
              onClick={() => {
                setFlipping(true);
                toggleTheme();
              }}
              onAnimationEnd={() => setFlipping(false)}
              aria-label={t(theme === "dark" ? "nav.switchToLight" : "nav.switchToDark")}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <LanguageSwitcher />
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-accent-cyan/20 to-transparent" />
      </nav>
    </>
  );
}

"use client";

import { useSyncExternalStore, useEffect, useCallback } from "react";

interface UseFullscreenReturn {
  isFullscreen: boolean;
  toggle: () => void;
  isSupported: boolean;
  requestFullscreen: () => void;
}

function subscribe(callback: () => void) {
  const handler = () => {
    if (document.fullscreenElement) {
      sessionStorage.setItem("omnikit-fullscreen", "true");
    } else {
      sessionStorage.removeItem("omnikit-fullscreen");
    }
    callback();
  };
  document.addEventListener("fullscreenchange", handler);
  return () => document.removeEventListener("fullscreenchange", handler);
}

function getFullscreen() {
  return !!document.fullscreenElement;
}

export function useFullscreen(): UseFullscreenReturn {
  const isFullscreen = useSyncExternalStore(subscribe, getFullscreen, () => false);

  const isSupported = useSyncExternalStore(
    () => () => {},
    () => typeof document !== "undefined" && !!document.fullscreenEnabled,
    () => false
  );

  const requestFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (document.fullscreenElement) {
      sessionStorage.setItem("omnikit-fullscreen", "true");
    } else if (sessionStorage.getItem("omnikit-fullscreen") === "true") {
      requestFullscreen();
    }
  }, [requestFullscreen]);

  const toggle = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      requestFullscreen();
    }
  };

  return { isFullscreen, toggle, isSupported, requestFullscreen };
}

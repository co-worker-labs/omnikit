"use client";

import { useState, useEffect } from "react";

interface UseFullscreenReturn {
  isFullscreen: boolean;
  toggle: () => void;
  isSupported: boolean;
}

export function useFullscreen(): UseFullscreenReturn {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggle = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  };

  return { isFullscreen, toggle, isSupported: true };
}

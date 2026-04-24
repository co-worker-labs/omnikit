"use client";

import { useEffect } from "react";
import { ThemeProvider, type Theme } from "../libs/theme";
import { ToastProvider, useToastContext } from "../components/ui/toast";
import { registerToastFn } from "../libs/toast";

function ToastBridge() {
  const { addToast } = useToastContext();
  useEffect(() => {
    registerToastFn(addToast);
  }, [addToast]);
  return null;
}

export function Providers({
  children,
  initialTheme,
}: {
  children: React.ReactNode;
  initialTheme: Theme;
}) {
  return (
    <ThemeProvider initialTheme={initialTheme}>
      <ToastProvider>
        <ToastBridge />
        {children}
      </ToastProvider>
    </ThemeProvider>
  );
}

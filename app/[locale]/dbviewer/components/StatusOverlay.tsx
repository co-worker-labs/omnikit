"use client";

import { useTranslations } from "next-intl";
import { Loader2, StopCircle } from "lucide-react";
import { Button } from "../../../../components/ui/button";

interface StatusOverlayProps {
  variant: "initializing" | "running" | "error";
  errorMessage?: string;
  onAbort?: () => void;
}

export function StatusOverlay({ variant, errorMessage, onAbort }: StatusOverlayProps) {
  const t = useTranslations("dbviewer");

  if (variant === "error") {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-sm text-danger">{errorMessage ?? t("upload.engineFailed")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-12">
      <Loader2 size={24} className="animate-spin text-accent-cyan" />
      <p className="text-sm text-fg-secondary">
        {variant === "initializing" ? t("upload.initializing") : t("result.running")}
      </p>
      {variant === "running" && onAbort && (
        <Button size="sm" variant="danger" onClick={onAbort}>
          <StopCircle size={14} />
          {t("editor.stop")}
        </Button>
      )}
    </div>
  );
}

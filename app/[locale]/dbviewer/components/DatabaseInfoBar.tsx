"use client";

import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import type { DbInfo } from "../../../../libs/dbviewer/types";

function humanSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n < 10 ? n.toFixed(1) : Math.round(n)} ${units[i]}`;
}

interface Props {
  info: DbInfo;
  onClose: () => void;
}

export function DatabaseInfoBar({ info, onClose }: Props) {
  const t = useTranslations("dbviewer");
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border-default bg-bg-elevated px-4 py-2">
      <span className="font-medium text-fg-primary">{info.name}</span>
      <span className="text-fg-secondary text-sm">{humanSize(info.sizeBytes)}</span>
      <button
        type="button"
        onClick={onClose}
        className="ml-auto inline-flex items-center gap-1 rounded-lg border border-border-default px-3 py-1 text-sm text-fg-secondary hover:border-danger hover:text-danger transition-colors"
        aria-label={t("info.close")}
      >
        <X size={14} />
        {t("info.close")}
      </button>
    </div>
  );
}

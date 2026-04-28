"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Download } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import type { CellValue, ColumnMeta } from "../../../../libs/dbviewer/types";
import { toCsv, toJson } from "../../../../libs/dbviewer/export";

interface ExportButtonsProps {
  columns: ColumnMeta[];
  rows: CellValue[][];
  done: boolean;
  onLoadAll: () => void;
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportButtons({ columns, rows, done, onLoadAll }: ExportButtonsProps) {
  const t = useTranslations("dbviewer");
  const [confirming, setConfirming] = useState(false);

  function doExport(format: "csv" | "json") {
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    if (format === "csv") {
      downloadBlob(toCsv(columns, rows), `data-result-${ts}.csv`, "text/csv;charset=utf-8");
    } else {
      downloadBlob(toJson(columns, rows), `data-result-${ts}.json`, "application/json");
    }
    setConfirming(false);
  }

  if (!done && !confirming) {
    return (
      <div className="flex items-center gap-2 text-xs text-fg-secondary">
        <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>
          <Download size={12} />
          {t("result.exportCsv")}
        </Button>
      </div>
    );
  }

  if (!done && confirming) {
    return (
      <div className="flex items-center gap-2 text-xs text-fg-secondary rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
        <span>{t("result.exportConfirm", { loaded: rows.length })}</span>
        <Button size="sm" variant="outline" onClick={() => doExport("csv")}>
          {t("result.exportLoaded")}
        </Button>
        <Button
          size="sm"
          variant="outline-cyan"
          onClick={() => {
            setConfirming(false);
            onLoadAll();
          }}
        >
          {t("result.exportLoadAll")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => doExport("csv")}>
        <Download size={12} />
        {t("result.exportCsv")}
      </Button>
      <Button size="sm" variant="outline" onClick={() => doExport("json")}>
        <Download size={12} />
        {t("result.exportJson")}
      </Button>
    </div>
  );
}

"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useTranslations } from "next-intl";
import { Database, Upload } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { showToast } from "../../../../libs/toast";
import { MAX_DB_BYTES, SAMPLE_DB_PATH } from "../../../../libs/dbviewer/constants";

interface FileUploadProps {
  onFile: (buffer: ArrayBuffer, name: string) => void;
  disabled?: boolean;
}

const ACCEPT = ".db,.sqlite,.sqlite3";

export function FileUpload({ onFile, disabled }: FileUploadProps) {
  const t = useTranslations("dbviewer");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [drag, setDrag] = useState<"idle" | "over" | "invalid">("idle");
  const dragCounter = useRef(0);

  function readFile(file: File) {
    if (file.size > MAX_DB_BYTES) {
      showToast(t("upload.tooLarge"), "danger", 3000);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const buf = reader.result;
      if (buf instanceof ArrayBuffer) onFile(buf, file.name);
    };
    reader.readAsArrayBuffer(file);
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) readFile(f);
    e.target.value = "";
  }

  function isAcceptable(file: File): boolean {
    const lower = file.name.toLowerCase();
    return lower.endsWith(".db") || lower.endsWith(".sqlite") || lower.endsWith(".sqlite3");
  }

  function onDragEnter(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragCounter.current++;
    const item = e.dataTransfer.items?.[0];
    const ok = !item || item.kind === "file";
    setDrag(ok ? "over" : "invalid");
  }
  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }
  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) setDrag("idle");
  }
  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragCounter.current = 0;
    setDrag("idle");
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (!isAcceptable(f)) {
      showToast(t("upload.unsupported"), "danger", 2500);
      return;
    }
    readFile(f);
  }

  async function loadSample() {
    try {
      const res = await fetch(SAMPLE_DB_PATH);
      const buf = await res.arrayBuffer();
      onFile(buf, "sample.db");
    } catch {
      showToast(t("upload.engineFailed"), "danger", 3000);
    }
  }

  const borderClass =
    drag === "over"
      ? "border-accent-cyan bg-accent-cyan-dim/30 scale-[1.01]"
      : drag === "invalid"
        ? "border-danger bg-red-500/5"
        : "border-dashed border-border-default";

  return (
    <div
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      aria-disabled={disabled}
      className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 ${borderClass} p-10 transition-all duration-200 cursor-pointer text-center ${disabled ? "opacity-60 pointer-events-none" : ""}`}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-cyan/10 text-accent-cyan">
        {drag === "over" ? <Upload size={28} /> : <Database size={28} />}
      </div>
      <div>
        <p className="text-fg-primary font-medium">
          {drag === "over" ? t("upload.releaseToLoad") : t("upload.drop")}
        </p>
        <p className="text-fg-secondary text-sm mt-1">{t("upload.click")}</p>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <Button
          variant="outline-cyan"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            void loadSample();
          }}
          disabled={disabled}
        >
          {t("upload.tryDemo")}
        </Button>
      </div>
      <p className="text-fg-muted text-xs mt-2">{t("upload.privacy")}</p>
      <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={onChange} />
    </div>
  );
}

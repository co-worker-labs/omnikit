"use client";

import { useRef, useId, type ChangeEvent, type DragEvent } from "react";
import { useTranslations } from "next-intl";
import { Upload } from "lucide-react";
import { LineNumberedTextarea } from "../../../../components/ui/line-numbered-textarea";
import { showToast } from "../../../../libs/toast";
import { isBinaryFile } from "../../../../libs/diff/binary-sniff";
import { MAX_FILE_BYTES } from "../../../../libs/diff/compute";
import { formatJson } from "../../../../libs/diff/json-format";

export interface DiffInputProps {
  value: string;
  onChange: (next: string) => void;
  label: string;
  placeholder: string;
  accent: "cyan" | "purple";
  containerHeight?: string;
}

export function DiffInput({
  value,
  onChange,
  label,
  placeholder,
  accent,
  containerHeight = "35vh",
}: DiffInputProps) {
  const t = useTranslations("diff");
  const tc = useTranslations("common");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dropRef = useRef<HTMLDivElement | null>(null);
  const inputId = useId();

  const dotClass = accent === "cyan" ? "bg-accent-cyan/60" : "bg-accent-purple/60";
  const labelClass = accent === "cyan" ? "text-accent-cyan" : "text-accent-purple";

  async function handleFile(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      showToast(t("tooLarge"), "danger", 3000);
      return;
    }
    const binary = await isBinaryFile(file);
    if (binary) {
      showToast(t("binaryRejected"), "danger", 3000);
      return;
    }
    const text = await file.text();
    onChange(text);
  }

  function onPick(ev: ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (file) void handleFile(file);
  }

  function onDrop(ev: DragEvent<HTMLDivElement>) {
    ev.preventDefault();
    const file = ev.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  function onDragOver(ev: DragEvent<HTMLDivElement>) {
    ev.preventDefault();
  }

  function onFormatJson() {
    const result = formatJson(value);
    if (!result.ok) {
      showToast(t("formatJsonInvalid", { message: result.message }), "danger", 4000);
      return;
    }
    onChange(result.text);
  }

  const lineCount = value.split("\n").length;
  const showLineNumbers = lineCount <= 5000 && value.length < 512 * 1024;

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap justify-between items-center">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${dotClass}`} />
          <span className={`font-mono text-sm font-semibold ${labelClass}`}>{label}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1 text-xs text-fg-secondary hover:text-accent-cyan transition-colors cursor-pointer"
          >
            <Upload size={14} />
            {t("uploadFile")}
          </button>
          <input
            ref={fileInputRef}
            id={`${inputId}-file`}
            type="file"
            className="hidden"
            onChange={onPick}
            aria-label={t("uploadFile")}
          />
          <button
            type="button"
            onClick={onFormatJson}
            disabled={!value}
            className="text-xs text-accent-purple hover:text-accent-purple/80 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            {t("formatJson")}
          </button>
          <button
            type="button"
            className="text-danger text-xs hover:text-danger/80 transition-colors cursor-pointer"
            onClick={() => {
              onChange("");
              showToast(tc("cleared"), "danger", 2000);
            }}
          >
            {tc("clear")}
          </button>
        </div>
      </div>
      <div
        ref={dropRef}
        onDrop={onDrop}
        onDragOver={onDragOver}
        className="relative mt-1"
        style={{ height: containerHeight }}
      >
        <LineNumberedTextarea
          placeholder={placeholder}
          rows={12}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-sm h-full"
          showLineNumbers={showLineNumbers}
        />
      </div>
    </div>
  );
}

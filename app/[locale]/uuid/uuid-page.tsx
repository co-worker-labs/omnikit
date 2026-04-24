"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, Clipboard, Lock, Download } from "lucide-react";
import { useTranslations } from "next-intl";
import "rc-slider/assets/index.css";
import Slider from "rc-slider";

import {
  generate,
  formatUuid,
  parseUuid,
  UuidBytes,
  UuidVersion,
  UuidFormat,
  NAMESPACES,
  isValidUuid,
  NamespaceLabel,
} from "../../../libs/uuid/main";
import { showToast } from "../../../libs/toast";
import Layout from "../../../components/layout";
import { Button } from "../../../components/ui/button";

const VERSIONS: UuidVersion[] = ["v1", "v3", "v4", "v5", "v7"];
const DEFAULT_VERSION: UuidVersion = "v4";
const FORMATS: UuidFormat[] = ["standard", "no-hyphens", "braces"];
const TOAST_MS = 1500;

type NamespaceChoice = NamespaceLabel | "Custom";
const NAMESPACE_CHOICES: NamespaceChoice[] = ["DNS", "URL", "OID", "X500", "Custom"];

export default function UuidPage() {
  const t = useTranslations("uuid");
  const tc = useTranslations("common");
  const title = t("shortTitle");

  const [version, setVersion] = useState<UuidVersion>(DEFAULT_VERSION);
  const [format, setFormat] = useState<UuidFormat>("standard");
  const [upper, setUpper] = useState(false);
  const [count, setCount] = useState(1);
  const [bytesList, setBytesList] = useState<UuidBytes[]>([]);
  const [nsChoice, setNsChoice] = useState<NamespaceChoice>("DNS");
  const [customNs, setCustomNs] = useState("");
  const [nameInput, setNameInput] = useState("");
  const nameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialized = useRef(false);

  const nsValue = nsChoice === "Custom" ? customNs : NAMESPACES[nsChoice];
  const nsValid = nsChoice !== "Custom" || isValidUuid(customNs);
  const canGenerateNamespace = nsValid && nameInput.length > 0;

  useEffect(() => {
    return () => {
      if (nameTimerRef.current) clearTimeout(nameTimerRef.current);
    };
  }, []);

  function runGenerate(
    v: UuidVersion = version,
    n: number = count,
    ns: string = nsValue,
    name: string = nameInput
  ) {
    if (v === "v3" || v === "v5") {
      if (!isValidUuid(ns) || name.length === 0) {
        setBytesList([]);
        return;
      }
      const out = generate({ version: v, count: 1, namespace: ns, name });
      setBytesList(out);
      return;
    }
    const out = generate({ version: v, count: n });
    setBytesList(out);
  }

  function onChangeVersion(v: UuidVersion) {
    setVersion(v);
    runGenerate(v, count);
  }

  function onNameChange(value: string) {
    setNameInput(value);
    if (version !== "v3" && version !== "v5") return;
    if (nameTimerRef.current) clearTimeout(nameTimerRef.current);
    nameTimerRef.current = setTimeout(() => {
      runGenerate(version, count, nsValue, value);
    }, 300);
  }

  function onNamespaceChoiceChange(choice: NamespaceChoice) {
    setNsChoice(choice);
    if (version !== "v3" && version !== "v5") return;
    const resolved = choice === "Custom" ? customNs : NAMESPACES[choice];
    if (isValidUuid(resolved) && nameInput.length > 0) {
      runGenerate(version, count, resolved, nameInput);
    } else {
      setBytesList([]);
    }
  }

  function onCustomNsChange(value: string) {
    setCustomNs(value);
    if ((version !== "v3" && version !== "v5") || nsChoice !== "Custom") return;
    if (isValidUuid(value) && nameInput.length > 0) {
      runGenerate(version, count, value, nameInput);
    } else {
      setBytesList([]);
    }
  }

  function formatAll(): string[] {
    return bytesList.map((b) => formatUuid(b, format, upper));
  }

  function copyCurrent() {
    if (bytesList.length === 0) return;
    navigator.clipboard.writeText(formatUuid(bytesList[0], format, upper));
    showToast(tc("copied"), "success", TOAST_MS);
  }

  function copyAll() {
    if (bytesList.length === 0) return;
    navigator.clipboard.writeText(formatAll().join("\n"));
    showToast(tc("copied"), "success", TOAST_MS);
  }

  function downloadTxt() {
    if (bytesList.length === 0) return;
    const blob = new Blob([formatAll().join("\n") + "\n"], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = t("downloadFilename");
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      runGenerate();
    }
  });

  const displayed = bytesList.length > 0 ? formatUuid(bytesList[0], format, upper) : "";

  return (
    <Layout title={title}>
      <div className="container mx-auto px-4 pt-3 pb-6">
        <div className="flex items-start gap-2 border-l-2 border-accent-cyan bg-accent-cyan-dim/30 rounded-r-lg p-3 my-4">
          <Lock size={18} className="text-accent-cyan mt-0.5 shrink-0" />
          <span className="text-sm text-fg-secondary leading-relaxed">{t("localGenerated")}</span>
        </div>

        <div className="relative mt-2">
          {count === 1 ? (
            <div className="flex items-center relative py-4 sm:py-5 px-4 sm:px-5">
              <div className="flex-1 text-center whitespace-nowrap overflow-x-auto scrollbar-none text-2xl sm:text-3xl font-mono leading-normal">
                {displayed || (
                  <span className="text-fg-muted text-base">{t("waitingForName")}</span>
                )}
              </div>
              <div className="hidden md:flex items-center gap-1 border-l border-border-default pl-3">
                <button
                  type="button"
                  className="text-fg-muted hover:text-accent-cyan transition-colors cursor-pointer p-2"
                  onClick={copyCurrent}
                  title={tc("copy")}
                  disabled={!displayed}
                >
                  <Clipboard size={18} />
                </button>
              </div>
            </div>
          ) : (
            <div className="max-h-[40vh] overflow-y-auto border border-border-default rounded-lg divide-y divide-border-default">
              {formatAll().map((s, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 hover:bg-bg-elevated/40">
                  <span className="font-mono text-sm flex-1 truncate">{s}</span>
                  <button
                    type="button"
                    className="text-fg-muted hover:text-accent-cyan transition-colors cursor-pointer p-1"
                    onClick={() => {
                      navigator.clipboard.writeText(s);
                      showToast(tc("copied"), "success", TOAST_MS);
                    }}
                    title={tc("copy")}
                  >
                    <Clipboard size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 px-1">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-accent-purple" />
              <span className="font-mono text-xs font-semibold text-fg-muted uppercase tracking-wider">
                {t("version")}
              </span>
            </div>
            <div className="flex items-center rounded-full border border-border-default p-0.5 text-xs font-mono font-semibold">
              {VERSIONS.map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`px-3 py-1 rounded-full transition-all duration-200 cursor-pointer ${
                    version === v
                      ? "bg-accent-cyan text-bg-base shadow-glow"
                      : "text-fg-muted hover:text-fg-secondary"
                  }`}
                  onClick={() => onChangeVersion(v)}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="w-full h-px bg-border-default" />
        </div>

        {(version === "v3" || version === "v5") && (
          <div className="mt-4 px-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-mono text-sm font-medium text-fg-secondary">
                {t("namespace")}
              </span>
              <select
                value={nsChoice}
                onChange={(e) => onNamespaceChoiceChange(e.target.value as NamespaceChoice)}
                className="font-mono text-sm bg-bg-elevated border border-border-default rounded-lg px-2 py-1 text-fg-primary focus:outline-none focus:border-accent-cyan"
              >
                {NAMESPACE_CHOICES.map((ns) => (
                  <option key={ns} value={ns}>
                    {ns}
                  </option>
                ))}
              </select>
            </div>
            {nsChoice === "Custom" && (
              <div className="mb-3">
                <input
                  type="text"
                  value={customNs}
                  onChange={(e) => onCustomNsChange(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full font-mono text-sm bg-bg-elevated border rounded-lg px-3 py-2 text-fg-primary focus:outline-none focus:border-accent-cyan placeholder:text-fg-muted"
                  style={{
                    borderColor: customNs.length > 0 && !nsValid ? "#ef4444" : undefined,
                  }}
                />
                {customNs.length > 0 && !nsValid && (
                  <span className="text-xs text-red-500 mt-1 block">{t("invalidNamespace")}</span>
                )}
              </div>
            )}
            <div>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder={t("namePlaceholder")}
                className="w-full font-mono text-sm bg-bg-elevated border border-border-default rounded-lg px-3 py-2 text-fg-primary focus:outline-none focus:border-accent-cyan placeholder:text-fg-muted"
              />
            </div>
          </div>
        )}

        {version !== "v3" && version !== "v5" && (
          <div className="mt-4 px-1">
            <div className="flex items-center justify-between px-2">
              <label className="font-mono text-sm font-medium text-fg-secondary">
                {t("quantity")}
              </label>
              <span className="font-mono text-sm font-bold text-accent-cyan">{count}</span>
            </div>
            <div className="mt-2 px-2">
              <Slider
                min={1}
                max={100}
                step={1}
                value={count}
                railStyle={{ backgroundColor: "var(--color-bg-elevated)", height: "6px" }}
                trackStyle={{ backgroundColor: "var(--color-accent-cyan)", height: "6px" }}
                handleStyle={{
                  backgroundColor: "var(--color-accent-cyan)",
                  height: "30px",
                  width: "30px",
                  marginTop: "-12px",
                  marginLeft: "-12px",
                  border: "0",
                  transform: "none",
                  opacity: "100",
                }}
                onChange={(value) => {
                  const n = value as number;
                  setCount(n);
                  runGenerate(version, n);
                }}
              />
            </div>
            <div className="flex justify-between mt-1 px-2">
              <span className="font-mono text-xs text-fg-muted">1</span>
              <span className="font-mono text-xs text-fg-muted">100</span>
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-4 px-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium text-fg-secondary">{t("format")}</span>
            <div className="flex items-center rounded-full border border-border-default p-0.5 text-xs font-mono font-semibold">
              {FORMATS.map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`px-3 py-1 rounded-full transition-all duration-200 cursor-pointer ${
                    format === f
                      ? "bg-accent-cyan text-bg-base shadow-glow"
                      : "text-fg-muted hover:text-fg-secondary"
                  }`}
                  onClick={() => setFormat(f)}
                >
                  {t(
                    f === "standard"
                      ? "formatStandard"
                      : f === "no-hyphens"
                        ? "formatNoHyphens"
                        : "formatBraces"
                  )}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded accent-[#06D6A0] bg-bg-input border-border-default cursor-pointer"
              checked={upper}
              onChange={(e) => setUpper(e.target.checked)}
            />
            <span className="text-fg-secondary text-sm">{t("uppercase")}</span>
          </label>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={() => runGenerate()}
            className="w-full rounded-full font-bold !border-emerald-400 !text-emerald-400 hover:!bg-emerald-400/10"
          >
            <RefreshCw size={16} />
            {t("generate")}
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={copyCurrent}
            disabled={!displayed}
            className="w-full rounded-full font-bold !border-blue-500 !text-blue-500 hover:!bg-blue-500/10"
          >
            <Clipboard size={16} />
            {t("copy")}
          </Button>
          {count > 1 && (
            <>
              <Button
                variant="outline"
                size="lg"
                onClick={copyAll}
                className="w-full rounded-full font-bold !border-accent-purple !text-accent-purple hover:!bg-accent-purple-dim"
              >
                <Clipboard size={16} />
                {t("copyAll")}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={downloadTxt}
                className="w-full rounded-full font-bold !border-accent-cyan !text-accent-cyan hover:!bg-accent-cyan-dim"
              >
                <Download size={16} />
                {t("download")}
              </Button>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

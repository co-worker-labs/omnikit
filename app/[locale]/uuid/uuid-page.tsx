"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, Clipboard, Lock } from "lucide-react";
import { useTranslations } from "next-intl";

import { generate, formatUuid, UuidBytes, UuidVersion, UuidFormat } from "../../../libs/uuid/main";
import { showToast } from "../../../libs/toast";
import Layout from "../../../components/layout";
import { Button } from "../../../components/ui/button";

const VERSIONS: UuidVersion[] = ["v1", "v3", "v4", "v5", "v7"];
const DEFAULT_VERSION: UuidVersion = "v4";
const FORMATS: UuidFormat[] = ["standard", "no-hyphens", "braces"];
const TOAST_MS = 1500;

export default function UuidPage() {
  const t = useTranslations("uuid");
  const tc = useTranslations("common");
  const title = t("shortTitle");

  const [version, setVersion] = useState<UuidVersion>(DEFAULT_VERSION);
  const [format, setFormat] = useState<UuidFormat>("standard");
  const [upper, setUpper] = useState(false);
  const [bytesList, setBytesList] = useState<UuidBytes[]>([]);
  const initialized = useRef(false);

  function runGenerate(v: UuidVersion = version) {
    if (v === "v3" || v === "v5") {
      setBytesList([]);
      return;
    }
    const out = generate({ version: v, count: 1 });
    setBytesList(out);
  }

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      runGenerate();
    }
  });

  function onChangeVersion(v: UuidVersion) {
    setVersion(v);
    runGenerate(v);
  }

  function copyCurrent() {
    if (bytesList.length === 0) return;
    const s = formatUuid(bytesList[0], format, upper);
    navigator.clipboard.writeText(s);
    showToast(tc("copied"), "success", TOAST_MS);
  }

  const displayed = bytesList.length > 0 ? formatUuid(bytesList[0], format, upper) : "";

  return (
    <Layout title={title}>
      <div className="container mx-auto px-4 pt-3 pb-6">
        <div className="flex items-start gap-2 border-l-2 border-accent-cyan bg-accent-cyan-dim/30 rounded-r-lg p-3 my-4">
          <Lock size={18} className="text-accent-cyan mt-0.5 shrink-0" />
          <span className="text-sm text-fg-secondary leading-relaxed">{t("localGenerated")}</span>
        </div>

        <div className="relative mt-2">
          <div className="flex items-center relative py-4 sm:py-5 px-4 sm:px-5">
            <div className="flex-1 text-center whitespace-nowrap overflow-x-auto scrollbar-none text-2xl sm:text-3xl font-mono leading-normal">
              {displayed || <span className="text-fg-muted text-base">{t("waitingForName")}</span>}
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

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-3">
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
        </div>
      </div>
    </Layout>
  );
}

"use client";

import { useState } from "react";
import { CopyButton } from "../../../components/ui/copy-btn";
import Layout from "../../../components/layout";
import { showToast } from "../../../libs/toast";
import { useTranslations } from "next-intl";
import { StyledTextarea, StyledCheckbox } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { ChevronsDown, ChevronsUp, X } from "lucide-react";

function encodeComponent(input: string): string {
  return encodeURIComponent(input);
}

function decodeComponent(input: string): string {
  return decodeURIComponent(input);
}

function encodeUrl(input: string): string {
  return encodeURI(input);
}

function decodeUrl(input: string): string {
  return decodeURI(input);
}

function encodeForm(input: string): string {
  const normalized = input.replace(/\r\n|\r|\n/g, "\r\n");
  return new URLSearchParams({ v: normalized }).toString().slice(2);
}

function decodeForm(input: string): string {
  const escaped = input.replace(/&/g, "%26").replace(/=/g, "%3D");
  return new URLSearchParams("v=" + escaped).get("v") ?? "";
}

type Mode = "component" | "url" | "form";

function encodeFor(mode: Mode, input: string): string {
  if (mode === "component") return encodeComponent(input);
  if (mode === "url") return encodeUrl(input);
  return encodeForm(input);
}

function decodeFor(mode: Mode, input: string): string {
  if (mode === "component") return decodeComponent(input);
  if (mode === "url") return decodeUrl(input);
  return decodeForm(input);
}

function Conversion() {
  const t = useTranslations("urlencoder");
  const tc = useTranslations("common");
  const [rawContent, setRawContent] = useState<string>("");
  const [encodedContent, setEncodedContent] = useState<string>("");
  const [mode, setMode] = useState<Mode>("component");
  const [isTrimRaw, setIsTrimRaw] = useState<boolean>(true);

  function doEncode() {
    const raw = isTrimRaw ? rawContent.trim() : rawContent;
    const out = encodeFor(mode, raw);
    setEncodedContent(out);
    setRawContent(raw);
    showToast(tc("encoded"), "success", 2000);
  }

  function doDecode() {
    const encoded = encodedContent.trim();
    try {
      const out = decodeFor(mode, encoded);
      setRawContent(out);
      setEncodedContent(encoded);
      showToast(tc("decoded"), "success", 2000);
    } catch {
      showToast(t("decodeFailed"), "danger", 3000);
    }
  }

  function isDisabledEncode(): boolean {
    const raw = isTrimRaw ? rawContent.trim() : rawContent;
    return !raw;
  }

  function isDisabledDecode(): boolean {
    return !encodedContent.trim();
  }

  function isDisabledClear(): boolean {
    const raw = isTrimRaw ? rawContent.trim() : rawContent;
    return !raw && !encodedContent.trim();
  }

  const modeOptions: { value: Mode; labelKey: "mode.component" | "mode.url" | "mode.form" }[] = [
    { value: "component", labelKey: "mode.component" },
    { value: "url", labelKey: "mode.url" },
    { value: "form", labelKey: "mode.form" },
  ];

  return (
    <section id="conversion">
      <div>
        <div className="flex flex-wrap justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-cyan/60" />
            <span className="font-mono text-sm font-semibold text-accent-cyan">
              {t("plainText")}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <StyledCheckbox
              label={tc("trimWhiteSpace")}
              id="isTrimCheck"
              checked={isTrimRaw}
              onChange={(e) => setIsTrimRaw(e.target.checked)}
            />
            <button
              type="button"
              className="text-danger text-xs hover:text-danger/80 transition-colors cursor-pointer"
              onClick={() => {
                setRawContent("");
                showToast(tc("cleared"), "danger", 2000);
              }}
            >
              {tc("clear")}
            </button>
          </div>
        </div>
        <div className="relative mt-1">
          <StyledTextarea
            id="rawContentTextarea"
            placeholder={t("plainTextPlaceholder")}
            rows={6}
            value={rawContent}
            onChange={(e) => setRawContent(e.target.value)}
            className="font-mono text-sm"
          />
          <CopyButton getContent={() => rawContent} className="absolute end-2 top-2" />
        </div>
      </div>

      <div
        role="radiogroup"
        aria-label={t("mode.label")}
        className="mt-4 inline-flex rounded-full border border-border-default overflow-hidden"
      >
        {modeOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={mode === opt.value}
            onClick={() => setMode(opt.value)}
            className={
              "px-4 py-1.5 text-sm font-semibold transition-colors cursor-pointer " +
              (mode === opt.value
                ? "bg-accent-cyan text-bg-base"
                : "bg-transparent text-fg-secondary hover:bg-bg-elevated")
            }
          >
            {t(opt.labelKey)}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 items-center">
        <Button
          variant="primary"
          size="md"
          disabled={isDisabledEncode()}
          onClick={doEncode}
          className="rounded-full font-bold"
        >
          {t("encode")}
          <ChevronsDown size={16} className="ms-1" />
        </Button>
        <Button
          variant="primary"
          size="md"
          disabled={isDisabledDecode()}
          onClick={doDecode}
          className="rounded-full font-bold"
        >
          {t("decode")}
          <ChevronsUp size={16} className="ms-1" />
        </Button>
        <Button
          variant="danger"
          size="md"
          disabled={isDisabledClear()}
          onClick={() => {
            setRawContent("");
            setEncodedContent("");
            showToast(tc("allCleared"), "danger", 2000);
          }}
          className="rounded-full font-bold"
        >
          {tc("clearAll")}
          <X size={16} className="ms-1" />
        </Button>
      </div>

      <div className="mt-4">
        <div className="flex flex-wrap justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-purple/60" />
            <span className="font-mono text-sm font-semibold text-accent-purple">
              {t("encodedText")}
            </span>
          </div>
          <button
            type="button"
            className="text-danger text-xs hover:text-danger/80 transition-colors cursor-pointer"
            onClick={() => {
              setEncodedContent("");
              showToast(tc("cleared"), "danger", 2000);
            }}
          >
            {tc("clear")}
          </button>
        </div>
        <div className="relative mt-1">
          <StyledTextarea
            id="encodedContentTextarea"
            placeholder={t("encodedOutput")}
            rows={6}
            value={encodedContent}
            onChange={(e) => setEncodedContent(e.target.value)}
            className="font-mono text-sm"
          />
          <CopyButton getContent={() => encodedContent} className="absolute end-2 top-2" />
        </div>
      </div>
    </section>
  );
}

export default function UrlencoderPage() {
  const tc = useTranslations("common");
  const t = useTranslations("tools");
  const title = t("urlencoder.shortTitle");

  return (
    <Layout title={title}>
      <div className="container mx-auto px-4 pt-3 pb-6">
        <div className="flex items-start gap-2 border-l-2 border-accent-cyan bg-accent-cyan-dim/30 rounded-r-lg p-3 my-4">
          <span className="text-sm text-fg-secondary leading-relaxed">
            {tc("alert.notTransferred")}
          </span>
        </div>

        <Conversion />
      </div>
    </Layout>
  );
}

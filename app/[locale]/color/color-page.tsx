"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Layout from "../../../components/layout";
import { CopyButton } from "../../../components/ui/copy-btn";
import { StyledInput } from "../../../components/ui/input";
import { Accordion } from "../../../components/ui/accordion";
import { ColorPicker } from "../../../components/color/color-picker";
import { ImagePaletteDropzone } from "../../../components/color/image-palette-dropzone";
import { VisionFilterDefs } from "../../../components/color/vision-filter-defs";
import { ColorHistoryBar } from "../../../components/color/color-history-bar";
import { parse, formatAll } from "../../../libs/color/convert";
import { closestName } from "../../../libs/color/named";
import {
  cssVariable,
  tailwindClass,
  tailwindThemeBlock,
  type TailwindPrefix,
} from "../../../libs/color/css-export";
import { wcagJudgement, suggestPassing } from "../../../libs/color/contrast";
import { apcaJudgement } from "../../../libs/color/apca";
import { harmony, monochromatic, HARMONY_TYPES } from "../../../libs/color/palette";
import { VISION_MODES, visionFilterStyle, type VisionMode } from "../../../libs/color/vision";
import { STORAGE_KEYS } from "../../../libs/storage-keys";
import { showToast } from "../../../libs/toast";
import { Eye, Info, ArrowLeftRight } from "lucide-react";

const TAILWIND_PREFIXES: TailwindPrefix[] = ["bg", "text", "border", "ring"];
const FORMATS = ["hex", "rgb", "hsl", "hsv", "cmyk", "lab", "oklch"] as const;
const HISTORY_LIMIT = 20;

function loadHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.color);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function saveHistory(list: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEYS.color, JSON.stringify(list));
  } catch {
    // intentionally empty
  }
}

function pushHistory(prev: string[], hex: string): string[] {
  const normalized = hex.length === 9 ? hex.slice(0, 7) : hex;
  const filtered = prev.filter((c) => c.toLowerCase() !== normalized.toLowerCase());
  return [normalized, ...filtered].slice(0, HISTORY_LIMIT);
}

function VisionToggle({
  value,
  onChange,
}: {
  value: VisionMode;
  onChange: (v: VisionMode) => void;
}) {
  const t = useTranslations("color.vision");
  return (
    <label className="inline-flex items-center gap-2 my-3">
      <Eye size={14} className="text-fg-muted" />
      <span className="text-xs text-fg-muted font-mono uppercase tracking-wider">
        {t("label")}:
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as VisionMode)}
        className="bg-bg-input border border-border-default rounded px-2 py-1 text-sm text-fg-primary"
      >
        {VISION_MODES.map((m) => (
          <option key={m} value={m}>
            {t(m)}
          </option>
        ))}
      </select>
    </label>
  );
}

interface ConverterTabProps {
  color: string;
  onColorChange: (hex: string) => void;
}

function ConverterTab({ color, onColorChange }: ConverterTabProps) {
  const t = useTranslations("color.converter");

  const parsed = parse(color);
  const formats = parsed ? formatAll(parsed) : null;
  const name = parsed ? closestName(parsed) : "";

  const [varName, setVarName] = useState("--color-primary");
  const [twPrefix, setTwPrefix] = useState<TailwindPrefix>("bg");
  const [edit, setEdit] = useState<Record<string, string>>({});

  function commitInput(field: string, raw: string) {
    const c = parse(raw);
    if (c) {
      onColorChange(c.toHex());
      setEdit((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function handleInputChange(field: string, raw: string) {
    const c = parse(raw);
    if (c && c.toHex().toLowerCase() !== color.toLowerCase()) {
      onColorChange(c.toHex());
      setEdit((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    } else if (!c && raw.trim()) {
      setEdit((prev) => ({ ...prev, [field]: raw }));
    } else if (!raw.trim()) {
      setEdit((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-3">
        <ColorPicker value={color} onChange={onColorChange} />
        {parsed && (
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(name)}
            className="text-xs text-fg-muted hover:text-accent-cyan transition-colors"
            title={t("closestName")}
          >
            {t("closestName")}: <span className="font-mono">{name}</span>
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {FORMATS.map((f) => {
          const value = formats?.[f] ?? "";
          const display = edit[f] ?? value;
          const invalid = edit[f] !== undefined;
          return (
            <div key={f} className="flex items-center gap-2">
              <span className="font-mono text-xs text-fg-muted w-14 shrink-0">{t(f)}</span>
              <StyledInput
                aria-invalid={invalid}
                className={`font-mono text-sm ${invalid ? "border-danger" : ""}`}
                value={display}
                onChange={(e) => setEdit((prev) => ({ ...prev, [f]: e.target.value }))}
                onBlur={() => commitInput(f, display)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitInput(f, display);
                }}
              />
              <CopyButton getContent={() => value} />
            </div>
          );
        })}
        <div className="text-xs text-fg-muted/80 mt-1">{t("hsvNote")}</div>
      </div>

      <div className="md:col-span-2 rounded-lg border border-border-default p-4 flex flex-col gap-2">
        <span className="font-mono text-xs text-fg-muted uppercase tracking-wider">
          {t("cssVariable")}
        </span>
        <div className="flex items-center gap-2">
          <StyledInput
            value={varName}
            onChange={(e) => setVarName(e.target.value)}
            placeholder={t("cssVariableName")}
            className="font-mono text-sm max-w-[200px]"
          />
          <code className="flex-1 font-mono text-sm">{cssVariable(varName, color)}</code>
          <CopyButton getContent={() => cssVariable(varName, color)} />
        </div>
      </div>

      <div className="md:col-span-2 rounded-lg border border-border-default p-4 flex flex-col gap-3">
        <span className="font-mono text-xs text-fg-muted uppercase tracking-wider">
          {t("tailwindClass")}
        </span>
        <div className="flex flex-wrap gap-2 text-xs font-mono font-semibold">
          {TAILWIND_PREFIXES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setTwPrefix(p)}
              className={`px-3 py-1 rounded-full transition-all duration-200 cursor-pointer ${
                twPrefix === p
                  ? "bg-accent-cyan text-bg-base shadow-glow"
                  : "border border-border-default text-fg-muted hover:text-fg-secondary hover:border-fg-muted"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 font-mono text-sm">{tailwindClass(twPrefix, color)}</code>
          <CopyButton getContent={() => tailwindClass(twPrefix, color)} />
        </div>
        <div className="border-t border-border-subtle pt-3 flex flex-col gap-2">
          <span className="text-xs text-fg-muted">{t("tailwindTheme")}</span>
          <pre className="font-mono text-sm overflow-x-auto bg-bg-input rounded p-2">
            {tailwindThemeBlock(varName, formats?.oklch ?? color)}
          </pre>
          <CopyButton getContent={() => tailwindThemeBlock(varName, formats?.oklch ?? color)} />
        </div>
      </div>
    </div>
  );
}

interface PaletteTabProps {
  color: string;
  onColorChange: (hex: string) => void;
}

function Swatch({ hex, onClick }: { hex: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={hex}
      className="group relative h-12 w-12 rounded border border-border-default hover:scale-105 transition-transform"
      style={{ backgroundColor: hex }}
    >
      <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 font-mono text-[10px] text-fg-muted opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        {hex}
      </span>
    </button>
  );
}

function PaletteTab({ color, onColorChange }: PaletteTabProps) {
  const t = useTranslations("color.palette");

  const monoColors = monochromatic(color, 5);
  const harmonyRows: Array<{ key: string; colors: string[] }> = [
    ...HARMONY_TYPES.map((k) => ({
      key: k === "split-complementary" ? "splitComplementary" : k,
      colors: harmony(color, k),
    })),
    { key: "monochromatic", colors: monoColors },
  ];

  function copyAll(colors: string[]) {
    navigator.clipboard.writeText(colors.join(", "));
    showToast("OK", "success", 1200);
  }

  return (
    <div className="flex flex-col gap-6">
      {harmonyRows.map(({ key, colors }) => (
        <div key={key} className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-semibold text-fg-muted uppercase tracking-wider">
              {t(key)}
            </span>
            <button
              type="button"
              onClick={() => copyAll(colors)}
              className="text-xs text-fg-muted hover:text-accent-cyan transition-colors"
            >
              {t("copyAll")}
            </button>
          </div>
          <div className="flex flex-wrap gap-3 pb-5">
            {colors.map((c, i) => (
              <Swatch key={`${c}-${i}`} hex={c} onClick={() => onColorChange(c)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface ContrastTabProps {
  fg: string;
  bg: string;
  onFgChange: (hex: string) => void;
  onBgChange: (hex: string) => void;
}

function PassFail({ pass, label }: { pass: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-fg-secondary">{label}</span>
      <span
        className={
          pass ? "text-accent-cyan font-mono font-semibold" : "text-danger font-mono font-semibold"
        }
      >
        {pass ? "✓" : "✗"}
      </span>
    </div>
  );
}

function ContrastTab({ fg, bg, onFgChange, onBgChange }: ContrastTabProps) {
  const t = useTranslations("color.contrast");
  const wcag = wcagJudgement(fg, bg);
  const apca = apcaJudgement(fg, bg);
  const suggestion = suggestPassing(fg, bg);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs text-fg-muted uppercase tracking-wider">
            {t("foreground")}
          </span>
          <ColorPicker value={fg} onChange={onFgChange} />
        </div>
        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs text-fg-muted uppercase tracking-wider">
            {t("background")}
          </span>
          <ColorPicker value={bg} onChange={onBgChange} />
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          onFgChange(bg);
          onBgChange(fg);
        }}
        className="self-start inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border-default text-sm text-fg-secondary hover:text-accent-cyan transition-colors"
      >
        <ArrowLeftRight size={14} />
        {t("swap")}
      </button>

      <div
        className="rounded-lg border border-border-default p-6"
        style={{ backgroundColor: bg, color: fg }}
      >
        <p className="text-base mb-2">The quick brown fox 敏捷的棕色狐狸</p>
        <p className="text-lg font-semibold">The quick brown fox 敏捷的棕色狐狸</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-border-default p-4 flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-xs font-semibold text-fg-muted uppercase tracking-wider">
              {t("wcagTitle")}
            </span>
            <span className="font-mono text-lg font-bold text-accent-cyan">
              {wcag.ratio.toFixed(2)}:1
            </span>
          </div>
          <PassFail pass={wcag.normalAA} label={`${t("normal")} AA`} />
          <PassFail pass={wcag.normalAAA} label={`${t("normal")} AAA`} />
          <PassFail pass={wcag.largeAA} label={`${t("large")} AA`} />
          <PassFail pass={wcag.largeAAA} label={`${t("large")} AAA`} />
        </div>
        <div className="rounded-lg border border-border-default p-4 flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-xs font-semibold text-fg-muted uppercase tracking-wider">
              {t("apcaTitle")}
            </span>
            <span className="font-mono text-lg font-bold text-accent-purple">
              Lc {apca.lc.toFixed(0)}
            </span>
          </div>
          <PassFail pass={apca.body} label={t("bodyText")} />
          <PassFail pass={apca.headline} label={t("headline")} />
          <PassFail pass={apca.fluent} label={t("fluent")} />
        </div>
      </div>

      {suggestion && (
        <div className="flex items-center gap-3 rounded-lg border border-accent-purple bg-bg-elevated/30 p-4">
          <div
            className="h-8 w-8 rounded border border-border-default shrink-0"
            style={{ backgroundColor: suggestion.color }}
          />
          <div className="flex-1 text-sm text-fg-secondary">
            <span className="font-semibold text-fg-primary">{t("suggestionTitle")}:</span>{" "}
            {t("suggestionText", {
              color: suggestion.color,
              target: `${t(suggestion.target === "foreground" ? "foreground" : "background")} AA`,
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              if (suggestion.target === "foreground") onFgChange(suggestion.color);
              else onBgChange(suggestion.color);
            }}
            className="px-3 py-1.5 rounded-md bg-accent-cyan text-bg-base font-mono text-xs"
          >
            {t("useThis")}
          </button>
        </div>
      )}
    </div>
  );
}

function Description() {
  const t = useTranslations("color.description");
  return (
    <div className="mt-8 space-y-6">
      <div className="flex items-start gap-2 border-l-2 border-accent-purple bg-accent-purple-dim/30 rounded-r-lg p-4">
        <Info size={18} className="text-accent-purple mt-0.5 shrink-0" />
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-fg-primary">{t("title")}</h3>
          <p className="text-sm text-fg-secondary leading-relaxed">{t("introP1")}</p>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-4 rounded-full bg-accent-cyan" />
          <span className="font-mono text-xs font-semibold text-fg-muted uppercase tracking-wider">
            {t("spacesTitle")}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(
            [
              "spaceHex",
              "spaceRgb",
              "spaceHsl",
              "spaceHsv",
              "spaceCmyk",
              "spaceLab",
              "spaceOklch",
            ] as const
          ).map((k) => (
            <div
              key={k}
              className="rounded-lg border border-border-default bg-bg-elevated/30 p-3 text-sm text-fg-secondary leading-relaxed"
            >
              {t(k)}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-4 rounded-full bg-accent-cyan" />
          <span className="font-mono text-xs font-semibold text-fg-muted uppercase tracking-wider">
            {t("contrastTitle")}
          </span>
        </div>
        <p className="text-sm text-fg-secondary leading-relaxed">{t("contrastP1")}</p>
        <p className="text-sm text-fg-secondary leading-relaxed mt-2">{t("contrastP2")}</p>
      </div>

      <div className="flex items-start gap-2 border-l-2 border-accent-cyan bg-accent-cyan-dim/30 rounded-r-lg p-4">
        <div className="space-y-2 text-sm text-fg-secondary leading-relaxed">
          <h3 className="text-sm font-semibold text-fg-primary">{t("tipsTitle")}</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>{t("tipEyedropper")}</li>
            <li>{t("tipImage")}</li>
            <li>{t("tipOklch")}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function ImagePaletteSection({
  palette,
  onPaletteChange,
  onColorSelect,
  onClear,
}: {
  palette: string[];
  onPaletteChange: (hexes: string[]) => void;
  onColorSelect: (hex: string) => void;
  onClear: () => void;
}) {
  const t = useTranslations("color.palette");
  const tc = useTranslations("color.errors");

  function copyAll(colors: string[]) {
    navigator.clipboard.writeText(colors.join(", "));
    showToast("OK", "success", 1200);
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <ImagePaletteDropzone
        onPalette={onPaletteChange}
        onError={(key) => showToast(tc(key), "danger", 2400)}
        onClear={onClear}
      />
      <div className="flex flex-col gap-3">
        {palette.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-3">
              {palette.map((c, i) => (
                <Swatch key={`${c}-${i}`} hex={c} onClick={() => onColorSelect(c)} />
              ))}
            </div>
            <button
              type="button"
              onClick={() => copyAll(palette)}
              className="self-start text-xs text-fg-muted hover:text-accent-cyan transition-colors"
            >
              {t("copyAll")}
            </button>
          </>
        ) : (
          <span className="text-sm text-fg-muted">{t("imageDrop")}</span>
        )}
      </div>
    </div>
  );
}

export default function ColorPage() {
  const ts = useTranslations("tools");
  const tc = useTranslations("common");
  const tTabs = useTranslations("color.tabs");

  const [color, setColor] = useState("#06d6a0");
  const [background, setBackground] = useState("#ffffff");
  const [history, setHistory] = useState<string[]>([]);
  const [imagePalette, setImagePalette] = useState<string[]>([]);
  const [vision, setVision] = useState<VisionMode>("none");

  useEffect(() => {
    const id = setTimeout(() => setHistory(loadHistory()), 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      setHistory((prev) => {
        const next = pushHistory(prev, color);
        if (next !== prev) saveHistory(next);
        return next;
      });
    }, 800);
    return () => clearTimeout(handle);
  }, [color]);

  function clearHistory() {
    setHistory([]);
    saveHistory([]);
  }

  function clearImagePalette() {
    setImagePalette([]);
  }

  return (
    <Layout title={ts("color.shortTitle")}>
      <VisionFilterDefs />
      <div className="container mx-auto px-4 pt-3 pb-6" style={visionFilterStyle(vision)}>
        <div className="flex items-start gap-2 border-l-2 border-accent-cyan bg-accent-cyan-dim/30 rounded-r-lg p-3 my-4">
          <span className="text-sm text-fg-secondary leading-relaxed">
            {tc("alert.notTransferred")}
          </span>
        </div>

        <VisionToggle value={vision} onChange={setVision} />

        <Accordion
          items={[
            {
              title: tTabs("imagePalette"),
              content: (
                <ImagePaletteSection
                  palette={imagePalette}
                  onPaletteChange={setImagePalette}
                  onColorSelect={setColor}
                  onClear={clearImagePalette}
                />
              ),
              defaultOpen: false,
            },
            {
              title: tTabs("converter"),
              content: <ConverterTab color={color} onColorChange={setColor} />,
              defaultOpen: true,
            },
            {
              title: tTabs("palette"),
              content: <PaletteTab color={color} onColorChange={setColor} />,
            },
            {
              title: tTabs("contrast"),
              content: (
                <ContrastTab
                  fg={color}
                  bg={background}
                  onFgChange={setColor}
                  onBgChange={setBackground}
                />
              ),
            },
          ]}
        />

        <Description />
      </div>
      <ColorHistoryBar history={history} onSelect={setColor} onClear={clearHistory} />
    </Layout>
  );
}

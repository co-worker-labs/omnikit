"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Layout from "../../../components/layout";
import { StyledInput } from "../../../components/ui/input";
import { CopyButton } from "../../../components/ui/copy-btn";
import {
  type Radix,
  type BitWidth,
  DEFAULT_VALUE,
  DEFAULT_BIT_WIDTH,
  BIT_MASKS,
  parseInput,
  formatValue,
  getAsciiInfo,
  getBits,
  bitsToValue,
  getReferenceTable,
} from "../../../libs/numbase/main";

const PANELS: Array<{ radix: Radix; labelKey: string; prefix: string }> = [
  { radix: 10, labelKey: "decimal", prefix: "DEC" },
  { radix: 16, labelKey: "hexadecimal", prefix: "HEX 0x" },
  { radix: 8, labelKey: "octal", prefix: "OCT 0o" },
  { radix: 2, labelKey: "binary", prefix: "BIN 0b" },
];

const BIT_WIDTHS: BitWidth[] = [8, 16, 32, 64];

const referenceData = getReferenceTable();

function BitWidthSelector({
  value,
  onChange,
}: {
  value: BitWidth;
  onChange: (w: BitWidth) => void;
}) {
  const t = useTranslations("numbase");
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-fg-secondary font-medium">{t("bitWidth")}</span>
      <div
        role="radiogroup"
        className="inline-flex rounded-full border border-border-default overflow-hidden"
      >
        {BIT_WIDTHS.map((w) => (
          <button
            key={w}
            type="button"
            role="radio"
            aria-checked={value === w}
            onClick={() => onChange(w)}
            className={
              "px-3 py-1 text-xs font-mono font-medium transition-colors cursor-pointer " +
              (value === w
                ? "bg-accent-cyan text-bg-base"
                : "bg-transparent text-fg-secondary hover:bg-bg-elevated")
            }
          >
            {w}
          </button>
        ))}
      </div>
    </div>
  );
}

function ConversionPanel({
  label,
  prefix,
  value,
  radix,
  bitWidth,
  error,
  onInputChange,
}: {
  label: string;
  prefix: string;
  value: bigint;
  radix: Radix;
  bitWidth: BitWidth;
  error: string | null;
  onInputChange: (input: string) => void;
}) {
  const displayValue = formatValue(value, radix, bitWidth);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="font-mono font-bold text-fg-secondary text-sm">{prefix}</span>
        <CopyButton getContent={() => displayValue} />
      </div>
      <StyledInput
        value={displayValue}
        onChange={(e) => onInputChange(e.target.value)}
        className={`font-mono ${error ? "border-danger ring-danger/20" : ""}`}
      />
      {error && <p className="text-danger text-xs">{error}</p>}
    </div>
  );
}

function BitVisualEditor({
  value,
  bitWidth,
  onBitToggle,
}: {
  value: bigint;
  bitWidth: BitWidth;
  onBitToggle: (index: number) => void;
}) {
  const bits = getBits(value, bitWidth);

  return (
    <div className="grid grid-cols-8 sm:grid-cols-16 lg:grid-cols-32 gap-x-0.5 gap-y-2">
      {bits.map((bit, i) => {
        const isActive = bit === 1;
        return (
          <div
            key={i}
            className={`flex flex-col items-center gap-1 ${i % 4 === 0 && i > 0 ? "border-l border-border-subtle pl-1.5" : ""}`}
          >
            <span className="text-[10px] font-mono text-fg-muted">{bitWidth - 1 - i}</span>
            <button
              type="button"
              onClick={() => onBitToggle(i)}
              className={`w-7 h-8 rounded font-mono font-bold text-xs flex items-center justify-center cursor-pointer transition-colors duration-150 ${isActive ? "bg-accent-cyan/20 border border-accent-cyan/40 text-accent-cyan" : "bg-bg-input border border-border-default text-fg-muted"}`}
            >
              {bit}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function AsciiMapping({ value }: { value: bigint }) {
  const t = useTranslations("numbase");
  const info = getAsciiInfo(value);
  const num = Number(value);

  return (
    <div className="flex items-center gap-3 px-3 py-2 border border-border-default rounded-lg bg-bg-elevated/30">
      <span className="text-xs text-fg-muted font-mono">{t("asciiChar")}</span>
      <span className="font-mono font-bold text-accent-cyan">
        {info.char || <span className="text-fg-muted">—</span>}
      </span>
      <span className="text-fg-muted">|</span>
      <span className="font-mono text-fg-secondary text-sm">{info.codePoint}</span>
      {num < 0 || num > 127 ? (
        <>
          <span className="text-fg-muted">|</span>
          <span className="text-fg-muted text-xs">—</span>
        </>
      ) : null}
    </div>
  );
}

function ReferenceTable() {
  const t = useTranslations("numbase");
  return (
    <div className="mt-3 rounded-lg border border-border-default bg-bg-elevated/50 p-3">
      <table className="w-full table-fixed text-xs font-mono border-collapse">
        <caption className="caption-top pb-2 font-semibold text-fg-primary text-sm">
          {t("referenceTitle")}
        </caption>
        <thead>
          <tr className="border-b border-border-default text-fg-muted">
            <th className="px-2 py-1 text-start font-semibold">{t("refDec")}</th>
            <th className="px-2 py-1 text-start font-semibold">{t("refHex")}</th>
            <th className="px-2 py-1 text-start font-semibold">{t("refOct")}</th>
            <th className="px-2 py-1 text-start font-semibold">{t("refBin")}</th>
          </tr>
        </thead>
        <tbody className="text-fg-secondary">
          {referenceData.map((row, idx) => (
            <tr key={idx} className="border-b border-border-subtle even:bg-bg-surface">
              <td className="px-3 py-2 tabular-nums">{row.dec}</td>
              <td className="px-3 py-2 font-semibold text-accent-cyan">{row.hex}</td>
              <td className="px-3 py-2 tabular-nums">{row.oct}</td>
              <td className="px-3 py-2 tabular-nums">{row.bin}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Converter() {
  const t = useTranslations("numbase");
  const [value, setValue] = useState<bigint>(DEFAULT_VALUE);
  const [bitWidth, setBitWidth] = useState<BitWidth>(DEFAULT_BIT_WIDTH);
  const [activeError, setActiveError] = useState<{
    radix: Radix;
    message: string;
  } | null>(null);

  function handleInputChange(input: string, radix: Radix) {
    const trimmed = input.trim();
    if (!trimmed) {
      setValue(0n);
      setActiveError(null);
      return;
    }

    const result = parseInput(trimmed, radix, bitWidth);
    if (result.error) {
      setActiveError({ radix, message: t("invalidInput") });
      return;
    }

    setValue(result.value);
    setActiveError(null);
  }

  function handleBitToggle(index: number) {
    const bits = getBits(value, bitWidth);
    bits[index] = bits[index] === 1 ? 0 : 1;
    const newValue = bitsToValue(bits, bitWidth);
    setValue(newValue);
    setActiveError(null);
  }

  function handleBitWidthChange(newWidth: BitWidth) {
    const masked = value & BIT_MASKS[newWidth];
    setValue(masked);
    setBitWidth(newWidth);
    setActiveError(null);
  }

  return (
    <div className="space-y-4">
      <BitWidthSelector value={bitWidth} onChange={handleBitWidthChange} />

      <div className="grid grid-cols-1 gap-3">
        {PANELS.map((panel) => (
          <ConversionPanel
            key={panel.radix}
            label={t(panel.labelKey)}
            prefix={panel.prefix}
            value={value}
            radix={panel.radix}
            bitWidth={bitWidth}
            error={activeError && activeError.radix === panel.radix ? activeError.message : null}
            onInputChange={(input) => handleInputChange(input, panel.radix)}
          />
        ))}
      </div>

      <div className="border border-border-default rounded-lg p-3">
        <BitVisualEditor value={value} bitWidth={bitWidth} onBitToggle={handleBitToggle} />
      </div>

      <AsciiMapping value={value} />
    </div>
  );
}

function Description() {
  const t = useTranslations("numbase");
  return (
    <section className="py-3 space-y-4">
      <div>
        <h2 className="font-semibold text-fg-primary text-base">{t("descriptions.whatIsTitle")}</h2>
        <p className="text-fg-secondary text-sm leading-relaxed">{t("descriptions.whatIs")}</p>
      </div>
      <div>
        <h2 className="font-semibold text-fg-primary text-base">
          {t("descriptions.twosComplementTitle")}
        </h2>
        <p className="text-fg-secondary text-sm leading-relaxed">
          {t("descriptions.twosComplement")}
        </p>
      </div>
    </section>
  );
}

export default function NumbasePage() {
  const ts = useTranslations("tools");

  return (
    <Layout title={ts("numbase.shortTitle")}>
      <div className="container mx-auto px-4 pt-3 pb-6">
        <Converter />
        <Description />
        <ReferenceTable />
      </div>
    </Layout>
  );
}

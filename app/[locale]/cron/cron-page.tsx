"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import Layout from "../../../components/layout";
import { NeonTabs } from "../../../components/ui/tabs";
import { CopyButton } from "../../../components/ui/copy-btn";
import { StyledSelect } from "../../../components/ui/input";
import { StyledTextarea } from "../../../components/ui/input";
import { Badge } from "../../../components/ui/badge";
import { showToast } from "../../../libs/toast";
import { STORAGE_KEYS } from "../../../libs/storage-keys";
import {
  parseCron,
  describeCron,
  nextExecutions,
  generateCron,
  migrateExpression,
  getFieldKindsForMode,
  tokenToString,
  PRESETS,
  type CronMode,
  type CronFieldKind,
  type ParsedCron,
  type ExecutionResult,
  type CronFieldValue,
} from "../../../libs/cron/main";
import { FieldEditor } from "./field-editor";

const DEFAULT_EXPRESSIONS: Record<CronMode, string> = {
  standard: "0 9 * * 1-5",
  spring: "0 0 9 * * 1-5",
  quartz: "0 0 9 ? * MON-FRI *",
};

const COLOR_BY_KIND: Record<CronFieldKind, string> = {
  second: "text-accent-cyan",
  minute: "text-accent-purple",
  hour: "text-cron-hour",
  dayOfMonth: "text-cron-dom",
  month: "text-cron-month",
  dayOfWeek: "text-cron-dow",
  year: "text-fg-secondary",
};

interface PersistedState {
  mode: CronMode;
  expression: string;
  timezone: "local" | "utc";
}

function loadPersisted(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.cron);
    if (!raw) return null;
    const v = JSON.parse(raw) as PersistedState;
    if (!["standard", "spring", "quartz"].includes(v.mode)) return null;
    return v;
  } catch {
    return null;
  }
}

function savePersisted(s: PersistedState) {
  try {
    window.localStorage.setItem(STORAGE_KEYS.cron, JSON.stringify(s));
  } catch {
    // intentionally silent
  }
}

function ColoredExpression({ expression, mode }: { expression: string; mode: CronMode }) {
  const kinds = getFieldKindsForMode(mode);
  const tokens = expression.split(/\s+/);
  return (
    <span className="font-mono text-base">
      {tokens.map((tok, i) => (
        <span key={i} className={kinds[i] ? COLOR_BY_KIND[kinds[i]] : ""}>
          {tok}
          {i < tokens.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}

function formatRelative(
  future: Date,
  now: Date,
  t: (k: string, p?: Record<string, string | number>) => string
): string {
  const diffMs = future.getTime() - now.getTime();
  if (Math.abs(diffMs) < 1000) return t("output.relative.now");
  const past = diffMs < 0;
  const abs = Math.abs(diffMs);
  const days = Math.floor(abs / 86_400_000);
  const hours = Math.floor((abs % 86_400_000) / 3_600_000);
  const minutes = Math.floor((abs % 3_600_000) / 60_000);
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes && !days) parts.push(`${minutes}m`);
  if (parts.length === 0) parts.push(`${Math.floor(abs / 1000)}s`);
  return past ? t("output.relative.past") : t("output.relative.in", { value: parts.join(" ") });
}

function formatAbsolute(d: Date, tz: "local" | "utc", locale: string): string {
  const fmt = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: tz === "utc" ? "UTC" : undefined,
  });
  return fmt.format(d);
}

function OutputArea({
  expression,
  mode,
  parsed,
  description,
  result,
  timezone,
  onTimezoneChange,
}: {
  expression: string;
  mode: CronMode;
  parsed: ParsedCron;
  description: string;
  result: ExecutionResult;
  timezone: "local" | "utc";
  onTimezoneChange: (tz: "local" | "utc") => void;
}) {
  const t = useTranslations("cron");
  const tc = useTranslations("common");
  const locale = useLocale();
  const now = new Date();

  return (
    <div className="mt-6 rounded-xl border border-border-default bg-bg-surface p-4 space-y-4">
      {/* Expression row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <ColoredExpression expression={expression} mode={mode} />
        <CopyButton getContent={() => expression} />
      </div>

      {/* Description */}
      <div className="border-t border-border-default pt-4">
        <div className="text-sm font-medium text-fg-secondary mb-1">{t("output.description")}</div>
        <div className="text-fg-primary text-base">{description || tc("noData")}</div>
      </div>

      {/* Warnings */}
      {mode !== "quartz" &&
        parsed.valid &&
        parsed.fields.dayOfMonth &&
        parsed.fields.dayOfMonth.type !== "any" &&
        parsed.fields.dayOfWeek &&
        parsed.fields.dayOfWeek.type !== "any" && (
          <div className="border-t border-border-default pt-3">
            <div className="text-sm text-amber-500 dark:text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2">
              {t("warn.bothDayFieldsSet")}
            </div>
          </div>
        )}

      {/* Executions */}
      <div className="border-t border-border-default pt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-fg-secondary">{t("output.nextExecutions")}</div>
          <StyledSelect
            value={timezone}
            onChange={(e) => onTimezoneChange(e.target.value as "local" | "utc")}
            className="max-w-[120px]"
          >
            <option value="local">{t("timezone.local")}</option>
            <option value="utc">{t("timezone.utc")}</option>
          </StyledSelect>
        </div>
        <table className="w-full text-sm">
          <thead className="text-fg-muted text-left">
            <tr>
              <th className="py-1 pr-2 w-8">{t("output.header.num")}</th>
              <th className="py-1 pr-2">{t("output.header.dateTime")}</th>
              <th className="py-1">{t("output.header.relative")}</th>
            </tr>
          </thead>
          <tbody>
            {result.executions.map((d, i) => (
              <tr key={i} className="border-t border-border-default">
                <td className="py-1 pr-2 text-fg-muted">{i + 1}</td>
                <td className="py-1 pr-2 font-mono">{formatAbsolute(d, timezone, locale)}</td>
                <td className="py-1 text-fg-secondary">
                  {formatRelative(
                    d,
                    now,
                    t as (k: string, p?: Record<string, string | number>) => string
                  )}
                </td>
              </tr>
            ))}
            {result.executions.length === 0 && (
              <tr>
                <td colSpan={3} className="py-2 text-fg-muted">
                  {tc("noData")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {result.notice && (
          <div className="mt-2 text-xs text-fg-muted">
            {result.notice === "warn.neverTriggers"
              ? t("warn.neverTriggers")
              : t("warn.searchWindowExhausted", { found: result.executions.length, requested: 5 })}
          </div>
        )}
      </div>
    </div>
  );
}

function ModeSelector({ mode, onChange }: { mode: CronMode; onChange: (m: CronMode) => void }) {
  const t = useTranslations("cron");
  const options: { value: CronMode; label: string }[] = [
    { value: "standard", label: t("mode.standard") },
    { value: "spring", label: t("mode.spring") },
    { value: "quartz", label: t("mode.quartz") },
  ];
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-fg-secondary mb-2">{t("mode.label")}</label>
      <div className="flex gap-2 flex-wrap">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              mode === o.value
                ? "border-accent-cyan text-accent-cyan bg-accent-cyan-dim"
                : "border-border-default text-fg-secondary hover:text-fg-primary"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ParseTab({
  rawInput,
  setRawInput,
  parseError,
  parseErrorParams,
}: {
  rawInput: string;
  setRawInput: (v: string) => void;
  parseError: string | null;
  parseErrorParams: Record<string, string | number>;
}) {
  const t = useTranslations("cron");
  return (
    <div>
      <StyledTextarea
        value={rawInput}
        onChange={(e) => setRawInput(e.target.value)}
        placeholder={t("parse.placeholder")}
        rows={2}
        className="font-mono text-sm"
      />
      {parseError && <p className="mt-1 text-sm text-danger">{t(parseError, parseErrorParams)}</p>}
    </div>
  );
}

function GenerateTab({
  mode,
  parsed,
  onApplyPreset,
  onEditField,
}: {
  mode: CronMode;
  parsed: ParsedCron;
  expression: string;
  onApplyPreset: (preset: (typeof PRESETS)[number]) => void;
  onEditField: (kind: CronFieldKind) => void;
}) {
  const t = useTranslations("cron");
  const kinds = getFieldKindsForMode(mode);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-medium text-fg-secondary mb-2">{t("presetSection")}</div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.filter((p) => p.mode === "standard" || p.mode === mode).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onApplyPreset(p)}
              className="px-3 py-1.5 text-sm rounded-full border border-border-default text-fg-secondary hover:text-accent-cyan hover:border-accent-cyan transition-colors"
            >
              {t(p.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {kinds.map((kind) => (
          <FieldCard
            key={kind}
            kind={kind}
            value={parsed.fields[kind]}
            onClick={() => onEditField(kind)}
          />
        ))}
      </div>
    </div>
  );
}

function FieldCard({
  kind,
  value,
  onClick,
}: {
  kind: CronFieldKind;
  value: CronFieldValue | undefined;
  onClick: () => void;
}) {
  const t = useTranslations("cron");
  const colorClass = COLOR_BY_KIND[kind];
  const display = value ? tokenToString(value) : "*";
  const typeKey = `fieldType.${value?.type ?? "any"}`;
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-xl border border-border-default bg-bg-surface p-3 hover:border-accent-cyan transition-colors"
    >
      <div className={`flex items-center gap-2 mb-2 ${colorClass}`}>
        <span className="w-2 h-2 rounded-full bg-current" />
        <span className="text-sm font-medium">{t(`field.${kind}`)}</span>
      </div>
      <div className="font-mono text-base text-fg-primary mb-1">{display}</div>
      <Badge>{t(typeKey)}</Badge>
    </button>
  );
}

function Description() {
  const t = useTranslations("cron");
  return (
    <section className="mt-8 space-y-4">
      <div>
        <h4 className="font-semibold text-fg-primary text-base">{t("descriptions.whatIsTitle")}</h4>
        <p className="mt-1 text-fg-secondary text-sm leading-relaxed">{t("descriptions.whatIs")}</p>
      </div>
      <div>
        <h4 className="font-semibold text-fg-primary text-base">{t("descriptions.dstTitle")}</h4>
        <p className="mt-1 text-fg-secondary text-sm leading-relaxed">{t("descriptions.dst")}</p>
      </div>
    </section>
  );
}

export default function CronPage() {
  const t = useTranslations("cron");
  const ts = useTranslations("tools");
  const locale = useLocale();

  const [mode, setMode] = useState<CronMode>("standard");
  const [expression, setExpression] = useState<string>(DEFAULT_EXPRESSIONS.standard);
  const [timezone, setTimezone] = useState<"local" | "utc">("local");
  const [rawInput, setRawInput] = useState<string>(DEFAULT_EXPRESSIONS.standard);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseErrorParams, setParseErrorParams] = useState<Record<string, string | number>>({});
  const [editingField, setEditingField] = useState<CronFieldKind | null>(null);

  // Hydrate from URL (priority) or localStorage on mount.
  /* eslint-disable react-hooks/set-state-in-effect -- one-shot hydration from external source */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const urlMode = params.get("mode") as CronMode | null;
    const urlExpr = params.get("expr");
    const urlTz = params.get("tz") as "local" | "utc" | null;

    if (urlMode && ["standard", "spring", "quartz"].includes(urlMode)) {
      setMode(urlMode);
      if (urlExpr) {
        setExpression(urlExpr);
        setRawInput(urlExpr);
      } else {
        setExpression(DEFAULT_EXPRESSIONS[urlMode]);
        setRawInput(DEFAULT_EXPRESSIONS[urlMode]);
      }
      if (urlTz === "local" || urlTz === "utc") setTimezone(urlTz);
      return;
    }

    const persisted = loadPersisted();
    if (persisted) {
      setMode(persisted.mode);
      setExpression(persisted.expression);
      setRawInput(persisted.expression);
      setTimezone(persisted.timezone);
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persist on change (debounced 500ms).
  useEffect(() => {
    const id = setTimeout(() => savePersisted({ mode, expression, timezone }), 500);
    return () => clearTimeout(id);
  }, [mode, expression, timezone]);

  // Debounced parse from raw input.

  useEffect(() => {
    const id = setTimeout(() => {
      if (rawInput.trim() === "") {
        setParseError(null);
        setParseErrorParams({});
        return;
      }
      const p = parseCron(rawInput, mode);
      if (p.valid) {
        setExpression(p.expression);
        setParseError(null);
        setParseErrorParams({});
      } else {
        setParseError(p.errors[0]?.messageKey ?? "errors.invalidSyntax");
        setParseErrorParams(p.errors[0]?.params ?? {});
      }
    }, 150);
    return () => clearTimeout(id);
  }, [rawInput, mode]);

  // Derived values
  const parsed: ParsedCron = parseCron(expression, mode);
  const description = describeCron(
    parsed,
    t as unknown as (k: string, p?: Record<string, string | number>) => string,
    locale
  );
  const result: ExecutionResult = nextExecutions(parsed, 5, { tz: timezone });

  function handleModeChange(next: CronMode) {
    if (next === mode) return;
    const r = migrateExpression(expression, mode, next);
    setMode(next);
    setExpression(r.expression);
    setRawInput(r.expression);
    for (const key of r.warnings) {
      showToast(t(key, { value: "", mode: next, token: "" }), "warning", 3000);
    }
  }

  return (
    <Layout title={ts("cron.shortTitle")}>
      <div className="container mx-auto px-4 pt-3 pb-6">
        <ModeSelector mode={mode} onChange={handleModeChange} />

        <NeonTabs
          tabs={[
            {
              label: t("tab.generate"),
              content: (
                <GenerateTab
                  mode={mode}
                  parsed={parsed}
                  expression={expression}
                  onApplyPreset={(p) => {
                    const r = migrateExpression(p.expression, p.mode, mode);
                    setExpression(r.expression);
                    setRawInput(r.expression);
                    for (const key of r.warnings) {
                      showToast(t(key, { value: "", mode, token: "" }), "warning", 3000);
                    }
                  }}
                  onEditField={(k) => setEditingField(k)}
                />
              ),
            },
            {
              label: t("tab.parse"),
              content: (
                <ParseTab
                  rawInput={rawInput}
                  setRawInput={setRawInput}
                  parseError={parseError}
                  parseErrorParams={parseErrorParams}
                />
              ),
            },
          ]}
        />

        <OutputArea
          expression={expression}
          mode={mode}
          parsed={parsed}
          description={description}
          result={result}
          timezone={timezone}
          onTimezoneChange={setTimezone}
        />

        <Description />
      </div>

      {editingField && (
        <FieldEditor
          open={true}
          onClose={() => setEditingField(null)}
          onApply={(value) => {
            const nextFields = { ...parsed.fields, [editingField]: value } as Record<
              CronFieldKind,
              CronFieldValue
            >;
            // Maintain Quartz '?' invariant
            if (mode === "quartz") {
              if (
                editingField === "dayOfMonth" &&
                value.type !== "noSpecific" &&
                value.type !== "any"
              ) {
                nextFields.dayOfWeek = { type: "noSpecific" };
              } else if (
                editingField === "dayOfWeek" &&
                value.type !== "noSpecific" &&
                value.type !== "any"
              ) {
                nextFields.dayOfMonth = { type: "noSpecific" };
              }
            }
            const next = generateCron(nextFields, mode);
            setExpression(next);
            setRawInput(next);
          }}
          mode={mode}
          kind={editingField}
          initial={parsed.fields[editingField]}
        />
      )}
    </Layout>
  );
}

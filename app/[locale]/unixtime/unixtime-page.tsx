"use client";

import { useEffect, useSyncExternalStore, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ChevronDown, Clock, Eraser, Globe, Pause, Play, RotateCcw, Zap } from "lucide-react";
import Layout from "../../../components/layout";
import { CopyButton } from "../../../components/ui/copy-btn";
import { StyledInput } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import {
  parseTimestamp,
  formatRelative,
  formatTimezoneOffset,
  formatIsoInTz,
  formatRfcInTz,
  localIsoWeekNumber,
  buildDate,
  presetParts,
  type UnitMode,
  type Tz,
  type Preset,
} from "../../../libs/unixtime/main";
import { showToast } from "../../../libs/toast";

const emptySubscribe = () => () => {};

function useCurrentTimestampSeconds(): string {
  return useSyncExternalStore(
    emptySubscribe,
    () => Math.trunc(Date.now() / 1000).toString(),
    () => ""
  );
}

let _partsCache: { date: string; time: string; ms: number } | null = null;
let _partsKey = "";

function useNowParts(): { date: string; time: string; ms: number } | null {
  return useSyncExternalStore(
    emptySubscribe,
    () => {
      const p = presetParts("now", "local");
      const key = `${p.date}|${p.time}`;
      if (key !== _partsKey) {
        _partsKey = key;
        _partsCache = { date: p.date, time: p.time, ms: 0 };
      }
      return _partsCache;
    },
    () => null
  );
}

function LiveClock() {
  const t = useTranslations("unixtime");
  const [now, setNow] = useState<Date | null>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [paused]);

  const timestamp = now ? Math.trunc(now.getTime() / 1000) : 0;
  const tzName = now ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";
  const tzOffset = now ? formatTimezoneOffset(now.getTimezoneOffset()) : "";
  const localStr = now
    ? `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())} ${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`
    : "";

  return (
    <section
      className="rounded-lg border border-border-default bg-bg-surface p-5"
      suppressHydrationWarning
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-accent-cyan/60" />
          <span className="font-mono text-sm font-semibold text-accent-cyan">
            {t("liveClock.title")}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setPaused((p) => !p);
            showToast(paused ? t("toast.resumed") : t("toast.paused"), "info", 1500);
          }}
          aria-pressed={paused}
          aria-label={paused ? t("liveClock.resume") : t("liveClock.pause")}
          className={`transition-colors duration-200 ${paused ? "text-accent-cyan" : "text-fg-muted hover:text-fg-secondary"}`}
        >
          {paused ? <Play size={18} /> : <Pause size={18} />}
        </button>
      </div>
      <div className="flex items-center justify-between gap-3 my-2">
        <span className="font-mono text-3xl font-bold tabular-nums" aria-live="off">
          {now ? timestamp : "\u00A0"}
        </span>
        {now && <CopyButton getContent={() => timestamp.toString()} />}
      </div>
      <div className="space-y-1 mt-3 text-sm font-mono">
        {now && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-fg-muted">
                {t("liveClock.localLabel")} ({tzName}, {tzOffset})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>{localStr}</span>
              <CopyButton getContent={() => localStr} />
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
  "Pacific/Auckland",
] as const;

const ROW_KEYS = ["iso", "rfc"] as const;

function RelativeTime({ date, locale }: { date: Date; locale: string }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const text = formatRelative(date, now, locale);

  return (
    <>
      {text || "\u00A0"}
      {text && (
        <CopyButton
          getContent={() => formatRelative(date, new Date(), locale)}
          className="ms-1.5 opacity-60 hover:opacity-100"
        />
      )}
    </>
  );
}

function TimestampToDate() {
  const t = useTranslations("unixtime");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [raw, setRaw] = useState("");
  const [mode, setMode] = useState<UnitMode>("auto");
  const [tz, setTz] = useState<string>("UTC");

  const defaultTs = useCurrentTimestampSeconds();
  const currentRaw = raw || defaultTs;

  const parsed = parseTimestamp(currentRaw, mode);
  const date = parsed.ms !== undefined ? new Date(parsed.ms) : null;

  const localStr = date ? date.toLocaleString(locale, { hour12: false }) : "";
  const tzTimeStr = date ? date.toLocaleString(locale, { hour12: false, timeZone: tz }) : "";
  const dayWeek = date
    ? `${new Intl.DateTimeFormat(locale, { weekday: "long" }).format(date)}, ${t("tsToDate.weekShort")}${localIsoWeekNumber(date)}`
    : "";

  const rows: Record<(typeof ROW_KEYS)[number], string> = date
    ? {
        iso: formatIsoInTz(date, tz),
        rfc: formatRfcInTz(date, tz),
      }
    : { iso: "", rfc: "" };

  return (
    <section
      className="rounded-lg border border-border-default bg-bg-surface p-5"
      suppressHydrationWarning
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2.5 h-2.5 rounded-full bg-accent-cyan/60" />
        <span className="font-mono text-sm font-semibold text-accent-cyan">
          {t("tsToDate.title")}
        </span>
      </div>

      <fieldset className="mb-3">
        <legend className="block text-sm font-medium text-fg-secondary mb-1">
          {t("tsToDate.quickLegend")}
        </legend>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline-cyan"
            size="sm"
            onClick={() => {
              const ts = Math.trunc(Date.now() / 1000);
              setRaw(ts.toString());
              if (mode === "milliseconds") setMode("auto");
              showToast(t("toast.applied"), "success", 1500);
            }}
          >
            <Zap size={14} />
            {t("tsToDate.now")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const d = new Date();
              d.setHours(0, 0, 0, 0);
              setRaw(Math.trunc(d.getTime() / 1000).toString());
              if (mode === "milliseconds") setMode("auto");
              showToast(t("toast.applied"), "success", 1500);
            }}
          >
            <Clock size={14} />
            {t("tsToDate.todayLocal")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const now = new Date();
              const utcMidnight = Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate()
              );
              setRaw(Math.trunc(utcMidnight / 1000).toString());
              if (mode === "milliseconds") setMode("auto");
              showToast(t("toast.applied"), "success", 1500);
            }}
          >
            <Globe size={14} />
            {t("tsToDate.todayUtc")}
          </Button>
        </div>
      </fieldset>

      <fieldset className="mb-3">
        <legend className="block text-sm font-medium text-fg-secondary mb-1">
          {t("tsToDate.unitLegend")}
        </legend>
        <div className="flex gap-3 text-sm">
          {(["auto", "seconds", "milliseconds"] as UnitMode[]).map((m) => (
            <label key={m} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="unit-mode"
                value={m}
                checked={mode === m}
                onChange={() => setMode(m)}
                className="accent-[#06D6A0]"
              />
              <span className="text-fg-secondary">
                {m === "auto"
                  ? t("tsToDate.unitAuto")
                  : m === "seconds"
                    ? t("tsToDate.unitSeconds")
                    : t("tsToDate.unitMilliseconds")}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1">
          <StyledInput
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label={t("tsToDate.inputLabel")}
            placeholder={t("tsToDate.inputPlaceholder")}
            value={raw}
            onChange={(e) => setRaw(e.target.value.replace(/[^0-9]/g, ""))}
            className="font-mono"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setRaw("");
            showToast(tc("cleared"), "info", 1500);
          }}
          aria-label={t("tsToDate.clear")}
          className="text-fg-muted hover:text-danger transition-colors duration-200"
        >
          <Eraser size={18} />
        </button>
      </div>

      {parsed.error && (
        <p className="text-danger text-sm mb-2">{t(`errors.${parsed.error}` as const)}</p>
      )}

      {date && (
        <div className="space-y-3 mt-3">
          <div className="rounded-lg border border-border-default overflow-hidden">
            <table className="w-full">
              <tbody>
                <tr className="border-b border-border-default last:border-b-0">
                  <th
                    scope="row"
                    className="py-2 px-3 w-32 text-left text-fg-muted text-xs font-mono uppercase tracking-wider"
                  >
                    {t("tsToDate.rows.local")}
                  </th>
                  <td className="py-2 px-3 font-mono text-sm break-all">
                    {localStr}
                    <CopyButton
                      getContent={() => localStr}
                      className="ms-1.5 opacity-60 hover:opacity-100"
                    />
                  </td>
                </tr>
                <tr className="border-b border-border-default last:border-b-0">
                  <th
                    scope="row"
                    className="py-2 px-3 w-32 text-left text-fg-muted text-xs font-mono uppercase tracking-wider"
                  >
                    {t("tsToDate.rows.dayWeek")}
                  </th>
                  <td className="py-2 px-3 font-mono text-sm break-all">
                    {dayWeek}
                    <CopyButton
                      getContent={() => dayWeek}
                      className="ms-1.5 opacity-60 hover:opacity-100"
                    />
                  </td>
                </tr>
                <tr>
                  <th
                    scope="row"
                    className="py-2 px-3 w-32 text-left text-fg-muted text-xs font-mono uppercase tracking-wider"
                  >
                    {t("tsToDate.rows.relative")}
                  </th>
                  <td className="py-2 px-3 font-mono text-sm break-all">
                    <RelativeTime date={date} locale={locale} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="rounded-lg border border-border-default overflow-hidden">
            <table className="w-full">
              <tbody>
                <tr className="border-b border-border-default last:border-b-0">
                  <th
                    scope="row"
                    className="relative py-2 px-3 w-32 text-left text-fg-muted text-xs font-mono uppercase tracking-wider"
                  >
                    <select
                      value={tz}
                      onChange={(e) => setTz(e.target.value)}
                      aria-label={t("tsToDate.rows.timezone")}
                      className="w-full cursor-pointer appearance-none bg-transparent outline-none border-none p-0 text-inherit font-inherit tracking-inherit uppercase"
                    >
                      {COMMON_TIMEZONES.map((z) => (
                        <option key={z} value={z}>
                          {z.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={10}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-fg-muted"
                    />
                  </th>
                  <td className="py-2 px-3 font-mono text-sm break-all">
                    {tzTimeStr}
                    <CopyButton
                      getContent={() => tzTimeStr}
                      className="ms-1.5 opacity-60 hover:opacity-100"
                    />
                  </td>
                </tr>
                {ROW_KEYS.map((k, i) => (
                  <tr
                    key={k}
                    className={i < ROW_KEYS.length - 1 ? "border-b border-border-default" : ""}
                  >
                    <th
                      scope="row"
                      className="py-2 px-3 w-32 text-left text-fg-muted text-xs font-mono uppercase tracking-wider"
                    >
                      {t(`tsToDate.rows.${k}` as const)}
                    </th>
                    <td className="py-2 px-3 font-mono text-sm break-all">
                      {rows[k]}
                      <CopyButton
                        getContent={() => rows[k]}
                        className="ms-1.5 opacity-60 hover:opacity-100"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function DateToTimestamp() {
  const t = useTranslations("unixtime");
  const tc = useTranslations("common");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [ms, setMs] = useState("0");
  const [tz, setTz] = useState<string>("local");

  const nowParts = useNowParts();
  const currentDate = date || nowParts?.date || "";
  const currentTime = time || nowParts?.time || "";
  const currentMs = ms !== "0" ? ms : (nowParts?.ms.toString() ?? "0");

  const buildTz: Tz = tz === "local" ? "local" : tz;
  const built = buildDate({
    date: currentDate,
    time: currentTime,
    ms: Number(currentMs),
    tz: buildTz,
  });
  const seconds = built ? Math.trunc(built.getTime() / 1000).toString() : "";
  const milliseconds = built ? built.getTime().toString() : "";

  function applyPreset(preset: Preset) {
    if (preset === "now") {
      const parts = presetParts("now", buildTz);
      setDate(parts.date);
      setTime(parts.time);
      setMs(parts.ms.toString());
      return;
    }
    const presetTz: Tz = preset === "todayMidnightUtc" ? "utc" : "local";
    const parts = presetParts(preset, presetTz);
    setDate(parts.date);
    setTime(parts.time);
    setMs(parts.ms.toString());
    if (presetTz === "utc") setTz("UTC");
    else setTz("local");
  }

  return (
    <section
      className="rounded-lg border border-border-default bg-bg-surface p-5"
      suppressHydrationWarning
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2.5 h-2.5 rounded-full bg-accent-purple/60" />
        <span className="font-mono text-sm font-semibold text-accent-purple">
          {t("dateToTs.title")}
        </span>
      </div>

      <fieldset className="mb-3">
        <legend className="block text-sm font-medium text-fg-secondary mb-1">
          {t("dateToTs.quickLegend")}
        </legend>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline-purple"
            size="sm"
            onClick={() => {
              applyPreset("now");
              showToast(t("toast.applied"), "success", 1500);
            }}
          >
            <Zap size={14} />
            {t("dateToTs.now")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              applyPreset("todayMidnightLocal");
              showToast(t("toast.applied"), "success", 1500);
            }}
          >
            <Clock size={14} />
            {t("dateToTs.todayLocal")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              applyPreset("todayMidnightUtc");
              showToast(t("toast.applied"), "success", 1500);
            }}
          >
            <Globe size={14} />
            {t("dateToTs.todayUtc")}
          </Button>
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <StyledInput
          type="date"
          aria-label={t("dateToTs.dateLabel")}
          value={currentDate}
          onChange={(e) => setDate(e.target.value)}
          min="1970-01-01"
          max="9999-12-31"
        />
        <StyledInput
          type="time"
          step={1}
          aria-label={t("dateToTs.timeLabel")}
          value={currentTime}
          onChange={(e) => setTime(e.target.value)}
        />
      </div>

      <div className="mb-2">
        <label className="block text-sm font-medium text-fg-secondary mb-1">
          {t("dateToTs.msLabel")}
        </label>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              aria-label={t("dateToTs.msLabel")}
              placeholder="0~999"
              value={currentMs}
              onChange={(e) => setMs(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
              className="w-full bg-bg-input border border-border-default rounded-lg px-3 py-2 text-fg-primary placeholder:text-fg-muted focus:outline-none focus:border-accent-cyan focus:shadow-input-focus transition-all duration-200 font-mono"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setMs("0");
              showToast(tc("reset"), "info", 1500);
            }}
            aria-label={t("dateToTs.msLabel")}
            className="text-fg-muted hover:text-fg-secondary transition-colors duration-200 shrink-0"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      <div className="mb-2">
        <div className="relative">
          <select
            value={tz}
            onChange={(e) => setTz(e.target.value)}
            aria-label={t("dateToTs.tzLegend")}
            className="w-full cursor-pointer appearance-none rounded-lg border border-border-default bg-bg-input px-3 py-2 pr-8 text-sm font-mono text-fg-primary outline-none focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan"
          >
            <option value="local">{t("dateToTs.tzLocal")}</option>
            {COMMON_TIMEZONES.map((z) => (
              <option key={z} value={z}>
                {z.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-fg-muted"
          />
        </div>
      </div>

      {built && (
        <div className="rounded-lg border border-border-default overflow-hidden">
          <table className="w-full">
            <tbody>
              <tr className="border-b border-border-default">
                <th
                  scope="row"
                  className="py-2 px-3 w-40 text-left text-fg-muted text-xs font-mono uppercase tracking-wider"
                >
                  {t("dateToTs.rows.seconds")}
                </th>
                <td className="py-2 px-3 font-mono text-sm">
                  {seconds}
                  <CopyButton
                    getContent={() => seconds}
                    className="ms-1.5 opacity-60 hover:opacity-100"
                  />
                </td>
              </tr>
              <tr>
                <th
                  scope="row"
                  className="py-2 px-3 w-40 text-left text-fg-muted text-xs font-mono uppercase tracking-wider"
                >
                  {t("dateToTs.rows.milliseconds")}
                </th>
                <td className="py-2 px-3 font-mono text-sm">
                  {milliseconds}
                  <CopyButton
                    getContent={() => milliseconds}
                    className="ms-1.5 opacity-60 hover:opacity-100"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Description() {
  const t = useTranslations("unixtime.description");
  const items: {
    titleKey: "whatIsTitle" | "secMsTitle" | "y2k38Title" | "tzTitle";
    bodyKey: "whatIs" | "secMs" | "y2k38" | "tz";
  }[] = [
    { titleKey: "whatIsTitle", bodyKey: "whatIs" },
    { titleKey: "secMsTitle", bodyKey: "secMs" },
    { titleKey: "y2k38Title", bodyKey: "y2k38" },
    { titleKey: "tzTitle", bodyKey: "tz" },
  ];
  return (
    <section className="rounded-lg border border-border-default bg-bg-surface p-5 space-y-3">
      {items.map(({ titleKey, bodyKey }) => (
        <div key={titleKey}>
          <h3 className="font-mono text-sm font-semibold text-accent-cyan mb-1">{t(titleKey)}</h3>
          <p className="text-sm text-fg-secondary leading-relaxed">{t(bodyKey)}</p>
        </div>
      ))}
    </section>
  );
}

export default function UnixtimePage() {
  const tt = useTranslations("tools");
  return (
    <Layout title={tt("unixtime.shortTitle")}>
      <div className="container mx-auto px-4 pt-3 pb-6 space-y-4">
        <LiveClock />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TimestampToDate />
          <DateToTimestamp />
        </div>
        <Description />
      </div>
    </Layout>
  );
}

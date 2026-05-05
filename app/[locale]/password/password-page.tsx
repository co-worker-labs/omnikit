"use client";

import "rc-slider/assets/index.css";
import Slider from "rc-slider";
import { ChangeEvent, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  memorable_capitalize_checked,
  memorable_full_words_checked,
  random_uppercase_checked,
  random_lowercase_checked,
  random_numbers_checked,
  random_symbols_checked,
  random_avoid_amibugous_checked,
  printPassword,
  maskPassword,
  copyPassword,
  generate,
  defaultCharacters,
  defaultLength,
  SavedRecord,
  PasswordLength,
  PasswordType,
} from "../../../libs/password/main";

import { showToast } from "../../../libs/toast";
import { STORAGE_KEYS } from "../../../libs/storage-keys";
import Layout from "../../../components/layout";
import { useTranslations } from "next-intl";
import { CopyButton } from "../../../components/ui/copy-btn";
import { Button } from "../../../components/ui/button";
import { StyledCheckbox } from "../../../components/ui/input";
import { NeonTabs } from "../../../components/ui/tabs";
import { Accordion } from "../../../components/ui/accordion";
import { analyzeStrength } from "../../../libs/password/strength";
import type { StrengthResult } from "../../../libs/password/strength";

import {
  Clipboard,
  RefreshCw,
  Trash2,
  BookmarkPlus,
  Eye,
  EyeOff,
  Lock,
  KeyRound,
  ShieldCheck,
  CircleHelp,
} from "lucide-react";

const default_type = "Random";

const alert_copy_timeout = 2000;
const alert_del_timeout = 2000;
const alert_gen_timeout = 1000;
const alert_saved_timeout = 1000;
const saved_password_auto_hide_ms = 5000;

function getScoreStyle(score: 0 | 1 | 2 | 3 | 4) {
  const styles = [
    { width: "20%", color: "var(--color-danger)", label: "strengthVeryWeak" },
    { width: "40%", color: "var(--color-danger)", label: "strengthWeak" },
    { width: "60%", color: "orange", label: "strengthFair" },
    { width: "80%", color: "var(--color-accent-cyan)", label: "strengthStrong" },
    { width: "100%", color: "var(--color-accent-cyan)", label: "strengthVeryStrong" },
  ];
  return styles[score];
}

function SavedCardStrengthBar({ password }: { password: string }) {
  const [result, setResult] = useState<StrengthResult | null>(null);

  useEffect(() => {
    if (!password) return;
    analyzeStrength(password).then(setResult);
  }, [password]);

  if (!result) {
    return <div className="h-1 bg-bg-elevated" />;
  }

  const style = getScoreStyle(result.score);
  return (
    <div className="h-1 bg-bg-elevated">
      <div
        className="h-full transition-all"
        style={{ width: style.width, backgroundColor: style.color }}
      />
    </div>
  );
}

function SavedPasswords({
  list,
  delCallback,
  clearAll,
}: {
  list: Array<SavedRecord>;
  delCallback: (index: number) => void;
  clearAll: () => void;
}) {
  const t = useTranslations("password");
  const tc = useTranslations("common");
  const [visibleMap, setVisibleMap] = useState<Record<string, boolean>>({});
  const hideTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  function clearHideTimer(rid: string) {
    const timer = hideTimersRef.current[rid];
    if (timer) {
      clearTimeout(timer);
      delete hideTimersRef.current[rid];
    }
  }

  function scheduleHide(rid: string) {
    clearHideTimer(rid);
    hideTimersRef.current[rid] = setTimeout(() => {
      setVisibleMap((prev) => ({ ...prev, [rid]: false }));
      delete hideTimersRef.current[rid];
    }, saved_password_auto_hide_ms);
  }

  useEffect(() => {
    const timers = hideTimersRef.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  function passwordHash(pw: string[], type: string): string {
    const str = type + ":" + pw.join("");
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return "h_" + Math.abs(hash).toString(36);
  }

  function setRecordVisibility(rid: string, next: boolean) {
    setVisibleMap((prev) => ({ ...prev, [rid]: next }));
    if (next) {
      scheduleHide(rid);
    } else {
      clearHideTimer(rid);
    }
  }

  function onDel(index: number) {
    delCallback(index);
    showToast(tc("deleted"), "danger", alert_del_timeout);
  }

  function onClearAll() {
    clearAll();
    showToast(tc("cleared"), "danger", alert_del_timeout);
  }

  function toggleAllVisibility() {
    const rids = list.map((r) => passwordHash(r.password, r.type));
    const allVisible = rids.every((rid) => visibleMap[rid] === true);
    const nextVisible = !allVisible;
    const newMap = { ...visibleMap };
    rids.forEach((rid) => {
      newMap[rid] = nextVisible;
      if (nextVisible) {
        scheduleHide(rid);
      } else {
        clearHideTimer(rid);
      }
    });
    setVisibleMap(newMap);
  }

  return (
    <div className="mt-6" hidden={list.length == 0}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-4 rounded-full bg-accent-cyan" />
          <span className="font-mono text-xs font-semibold text-fg-muted uppercase tracking-wider">
            {t("savedTitle")}
          </span>
          <button
            type="button"
            className="text-fg-muted hover:text-accent-cyan bg-fg-muted/10 hover:bg-accent-cyan/10 transition-colors cursor-pointer ml-1 rounded p-1"
            aria-label={
              list.every((r) => visibleMap[passwordHash(r.password, r.type)] === true)
                ? t("hidePassword")
                : t("showPassword")
            }
            onClick={toggleAllVisibility}
          >
            {list.every((r) => visibleMap[passwordHash(r.password, r.type)] === true) ? (
              <EyeOff size={14} aria-hidden="true" />
            ) : (
              <Eye size={14} aria-hidden="true" />
            )}
          </button>
        </div>
        <button
          className="text-danger text-xs hover:text-danger/80 transition-colors cursor-pointer"
          onClick={onClearAll}
        >
          {t("clearAllWithCount", { count: list.length })}
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {list.map((record, index) => {
          const datetime = new Date(record.timestamp).toLocaleString();
          const rid = passwordHash(record.password, record.type);
          const isRecordVisible = visibleMap[rid] ?? false;
          return (
            <div key={rid} className="border border-border-default rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="font-mono text-xs text-fg-muted">{datetime}</span>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    className="text-fg-muted hover:text-accent-cyan transition-colors cursor-pointer p-1"
                    aria-label={isRecordVisible ? t("hidePassword") : t("showPassword")}
                    onClick={() => setRecordVisibility(rid, !isRecordVisible)}
                  >
                    {isRecordVisible ? (
                      <EyeOff size={14} aria-hidden="true" />
                    ) : (
                      <Eye size={14} aria-hidden="true" />
                    )}
                  </button>
                  <CopyButton getContent={() => copyPassword(record.type, record.password)} />
                  <button
                    type="button"
                    className="text-fg-muted hover:text-danger transition-colors cursor-pointer p-1"
                    aria-label={tc("delete")}
                    onClick={() => onDel(index)}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 px-3 py-2">
                <div
                  className="flex-1 text-center whitespace-nowrap overflow-x-auto scrollbar-none text-lg sm:text-xl font-mono"
                  dangerouslySetInnerHTML={{
                    __html: isRecordVisible
                      ? printPassword(record.type, record.password)
                      : maskPassword(record.type, record.password),
                  }}
                />
              </div>
              <SavedCardStrengthBar password={copyPassword(record.type, record.password)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StrengthBar({ password }: { password: string }) {
  const t = useTranslations("password");
  const [result, setResult] = useState<StrengthResult | null>(null);

  useEffect(() => {
    if (!password) return;
    analyzeStrength(password).then(setResult);
  }, [password]);

  if (!password || !result) {
    return <div className="h-2 w-full bg-bg-elevated overflow-hidden rounded-full" />;
  }

  const style = getScoreStyle(result.score);

  return (
    <>
      <div className="h-2 w-full bg-bg-elevated overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: style.width, backgroundColor: style.color }}
        />
      </div>
      <div className="flex justify-between items-center mt-2.5 px-3 pb-1">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: style.color }}
          />
          <span className="text-sm font-semibold" style={{ color: style.color }}>
            {t(style.label)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-fg-muted tabular-nums">{result.score} / 4</span>
        </div>
      </div>
    </>
  );
}

function CrackTimeDisplay({ result }: { result: StrengthResult }) {
  const t = useTranslations("password");

  let timeText: string;
  if (result.crackTimeUnit === "instant") {
    timeText = t("crackTimeInstant");
  } else {
    const unitKey =
      `crackTime${result.crackTimeUnit.charAt(0).toUpperCase()}${result.crackTimeUnit.slice(1)}` as string;
    timeText = t(unitKey, { n: result.crackTimeValue });
  }

  return (
    <div className="mt-3 px-3">
      <span className="text-xl font-bold" style={{ color: getScoreStyle(result.score).color }}>
        {timeText}
      </span>
      <span className="text-sm text-fg-muted ml-2">{t("crackTimeLabel")}</span>
    </div>
  );
}

function Checker({ initialInput }: { initialInput: string }) {
  const t = useTranslations("password");
  const tc = useTranslations("common");
  const [input, setInput] = useState(initialInput);
  const [prevInitial, setPrevInitial] = useState(initialInput);
  if (initialInput !== prevInitial) {
    setPrevInitial(initialInput);
    setInput(initialInput);
  }
  const [visible, setVisible] = useState(false);
  const [result, setResult] = useState<StrengthResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!input) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      analyzeStrength(input).then(setResult);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input]);

  const style = result ? getScoreStyle(result.score) : null;
  const activeResult = input ? result : null;
  const activeStyle = activeResult ? style : null;

  return (
    <section>
      <div className="relative mt-2">
        <div className="flex items-center relative py-3 px-4">
          <input
            type={visible ? "text" : "password"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("enterPassword")}
            aria-label={t("enterPassword")}
            autoComplete="off"
            spellCheck={false}
            className="w-full text-xl font-mono bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50 rounded text-fg-primary placeholder:text-fg-muted pr-20"
          />
          <div className="flex items-center gap-1">
            {input && (
              <button
                type="button"
                className="text-fg-muted hover:text-danger transition-colors cursor-pointer p-1"
                aria-label={tc("clear")}
                onClick={() => {
                  setInput("");
                }}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              className="text-fg-muted hover:text-accent-cyan transition-colors cursor-pointer p-1"
              aria-label={visible ? t("hidePassword") : t("showPassword")}
              onClick={() => setVisible(!visible)}
            >
              {visible ? (
                <EyeOff size={18} aria-hidden="true" />
              ) : (
                <Eye size={18} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {activeResult && activeStyle && (
          <>
            <div className="h-2 w-full bg-bg-elevated overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: activeStyle.width, backgroundColor: activeStyle.color }}
              />
            </div>
            <div className="flex justify-between items-center mt-2.5 px-3 pb-1">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: activeStyle.color }}
                />
                <span className="text-sm font-semibold" style={{ color: activeStyle.color }}>
                  {t(activeStyle.label)}
                </span>
              </div>
              <span className="text-sm text-fg-muted tabular-nums">{activeResult.score} / 4</span>
            </div>
            <CrackTimeDisplay result={activeResult} />

            {activeResult.warningKey && (
              <div className="mt-4 mx-3 flex items-start gap-2 border-l-2 border-danger bg-danger/10 rounded-r-lg p-3">
                <span className="text-sm text-danger leading-relaxed">
                  {t.has(activeResult.warningKey)
                    ? t(activeResult.warningKey)
                    : activeResult.warningKey}
                </span>
              </div>
            )}

            {activeResult.suggestionKeys.length > 0 && (
              <ul className="mt-3 mx-3 space-y-1">
                {activeResult.suggestionKeys.map((key, i) => (
                  <li key={i} className="text-sm text-fg-muted flex items-start gap-2">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-fg-muted shrink-0" />
                    <span>{t.has(key) ? t(key) : key}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {!activeResult && input && (
          <div className="h-2 w-full bg-bg-elevated overflow-hidden rounded-full" />
        )}
      </div>
    </section>
  );
}

function Generator({
  saved,
  setSaved,
  onCheckPassword,
}: {
  saved: SavedRecord[];
  setSaved: React.Dispatch<React.SetStateAction<SavedRecord[]>>;
  onCheckPassword: (password: string) => void;
}) {
  const t = useTranslations("password");
  const tc = useTranslations("common");
  const [passwordType, setPasswordType] = useState<PasswordType>(default_type);
  const [characters, setCharacters] = useState<number>(defaultCharacters(default_type));
  const [passwordLength, setPasswordLength] = useState<PasswordLength>(defaultLength(default_type));
  const [visible, setVisible] = useState<boolean>(true);

  const [password, setPassword] = useState<string[]>([]);

  const didInit = useRef(false);
  useEffect(() => {
    if (!didInit.current) {
      didInit.current = true;
      setPassword(
        generate(default_type, defaultCharacters(default_type), defaultLength(default_type).current)
      );
    }
  }, []);

  function onTypeChange(event: ChangeEvent<HTMLInputElement>) {
    let type: PasswordType = event.target.checked ? "Memorable" : "Random";
    const newChars = defaultCharacters(type);
    const newLength = defaultLength(type);

    setPasswordType(type);
    setCharacters(newChars);
    setPasswordLength(newLength);
    setPassword(generate(type, newChars, newLength.current));
  }

  function bitOperate(currentValue: number, checked: boolean, checkedValue: number) {
    if (checked) {
      return currentValue | checkedValue;
    } else {
      return currentValue & ~checkedValue;
    }
  }

  function onCheckBoxChange(event: ChangeEvent<HTMLInputElement>) {
    const name = event.target.name;
    const checked = event.target.checked;

    let chars = characters;
    switch (name) {
      case "uppercase":
        chars = bitOperate(chars, checked, random_uppercase_checked);
        break;
      case "lowercase":
        chars = bitOperate(chars, checked, random_lowercase_checked);
        break;
      case "symbols":
        chars = bitOperate(chars, checked, random_symbols_checked);
        break;
      case "numbers":
        chars = bitOperate(chars, checked, random_numbers_checked);
        break;
      case "avoidAmibugous":
        chars = bitOperate(chars, checked, random_avoid_amibugous_checked);
        break;
      case "capitalize":
        chars = bitOperate(chars, checked, memorable_capitalize_checked);
        break;
      case "fullwords":
        chars = bitOperate(chars, checked, memorable_full_words_checked);
        break;
      default:
        console.error("Invalid checkbox name: " + name);
        return;
    }
    if (passwordType == "Memorable" || (chars != 0 && chars != random_avoid_amibugous_checked)) {
      setCharacters(chars);
      setPassword(generate(passwordType, chars, passwordLength.current));
    }
  }

  function copyAction() {
    navigator.clipboard.writeText(copyPassword(passwordType, password));
    showToast(tc("copied"), "success", alert_copy_timeout);
  }

  function generateAction() {
    const password = generate(passwordType, characters, passwordLength.current);
    setPassword(password);
    showToast(tc("generated"), "info", alert_gen_timeout, "generatedAlert");
  }

  function setLength(length: number) {
    setPasswordLength({
      current: length,
      min: passwordLength.min,
      max: passwordLength.max,
    });
    setPassword(generate(passwordType, characters, length));
  }

  function addToSavedAction() {
    if (saved.length == 0 || saved[0].password != password) {
      const savedTemp = [
        {
          type: passwordType,
          password: password,
          characters: characters,
          timestamp: new Date().getTime(),
        },
      ];
      savedTemp.push(...saved);
      setSaved(savedTemp);
      showToast(tc("bookmarked"), "success", alert_saved_timeout);
    }
  }

  return (
    <section id="generator">
      <div className="relative mt-2">
        <div className="flex items-center relative py-4 sm:py-5 px-4 sm:px-5">
          <div
            className="flex-1 text-center whitespace-nowrap overflow-x-auto scrollbar-none text-2xl sm:text-3xl font-mono leading-normal"
            dangerouslySetInnerHTML={{
              __html:
                password.length > 0
                  ? visible
                    ? printPassword(passwordType, password)
                    : maskPassword(passwordType, password)
                  : "",
            }}
          />
          <div className="hidden md:flex items-center gap-1 border-l border-border-default pl-3">
            <button
              type="button"
              className="text-fg-muted hover:text-accent-cyan transition-colors cursor-pointer p-2"
              onClick={() => setVisible(!visible)}
              aria-label={visible ? t("hidePassword") : t("showPassword")}
            >
              {visible ? (
                <EyeOff size={18} aria-hidden="true" />
              ) : (
                <Eye size={18} aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              className="text-fg-muted hover:text-accent-cyan transition-colors cursor-pointer p-2"
              onClick={copyAction}
              aria-label={tc("copy")}
            >
              <Clipboard size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
        <StrengthBar password={password.length > 0 ? copyPassword(passwordType, password) : ""} />
      </div>
      <div className="mt-6 px-1">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 rounded-full bg-accent-purple" />
            <span className="font-mono text-xs font-semibold text-fg-muted uppercase tracking-wider">
              {t("customizeYourPassword")}
            </span>
          </div>
          <div className="flex items-center rounded-full border border-border-default p-0.5 text-xs font-mono font-semibold">
            <button
              type="button"
              className={`px-3 py-1 rounded-full transition-all duration-200 cursor-pointer ${
                passwordType == "Random"
                  ? "bg-accent-cyan text-bg-base shadow-glow"
                  : "text-fg-muted hover:text-fg-secondary"
              }`}
              onClick={() => {
                if (passwordType != "Random")
                  onTypeChange({ target: { checked: false } } as ChangeEvent<HTMLInputElement>);
              }}
            >
              {t("random")}
            </button>
            <button
              type="button"
              className={`px-3 py-1 rounded-full transition-all duration-200 cursor-pointer ${
                passwordType == "Memorable"
                  ? "bg-accent-cyan text-bg-base shadow-glow"
                  : "text-fg-muted hover:text-fg-secondary"
              }`}
              onClick={() => {
                if (passwordType != "Memorable")
                  onTypeChange({ target: { checked: true } } as ChangeEvent<HTMLInputElement>);
              }}
            >
              {t("memorable")}
            </button>
          </div>
        </div>
        <div className="w-full h-px bg-border-default" />
        <div className="flex flex-wrap px-3">
          <div className="w-full lg:w-1/2 mt-4">
            <div className="flex items-center justify-between px-2">
              <label className="font-mono text-sm font-medium text-fg-secondary">
                {t("passwordLength")}
              </label>
              <span className="font-mono text-sm font-bold text-accent-cyan">
                {passwordLength.current}
              </span>
            </div>
            <div className="mt-2 px-2">
              <Slider
                min={passwordLength.min}
                max={passwordLength.max}
                step={1}
                value={passwordLength.current}
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
                  setLength(value as number);
                }}
              />
            </div>
            <div className="flex justify-between mt-1 px-2">
              <span className="font-mono text-xs text-fg-muted">{passwordLength.min}</span>
              <span className="font-mono text-xs text-fg-muted">{passwordLength.max}</span>
            </div>
          </div>
          <div className="w-full lg:w-1/2 mt-3 lg:pl-6">
            {passwordType == "Random" && (
              <div className="flex flex-wrap">
                <div className="w-1/2">
                  <StyledCheckbox
                    label={t("uppercase")}
                    checked={(characters & random_uppercase_checked) != 0}
                    id="uppercaseCheck"
                    name="uppercase"
                    onChange={onCheckBoxChange}
                    className="py-2"
                  />
                </div>
                <div className="w-1/2">
                  <StyledCheckbox
                    label={t("lowercase")}
                    checked={(characters & random_lowercase_checked) != 0}
                    id="lowercaseCheck"
                    name="lowercase"
                    onChange={onCheckBoxChange}
                    className="py-2"
                  />
                </div>
                <div className="w-1/2">
                  <StyledCheckbox
                    label={t("numbers")}
                    checked={(characters & random_numbers_checked) != 0}
                    id="numbersCheck"
                    name="numbers"
                    onChange={onCheckBoxChange}
                    className="py-2"
                  />
                </div>
                <div className="w-1/2">
                  <StyledCheckbox
                    label={t("symbols")}
                    checked={(characters & random_symbols_checked) != 0}
                    id="symoblsCheck"
                    name="symbols"
                    onChange={onCheckBoxChange}
                    className="py-2"
                  />
                </div>
                <div className="w-auto">
                  <StyledCheckbox
                    label={t("avoidAmbiguous")}
                    checked={(characters & random_avoid_amibugous_checked) != 0}
                    id="avoidAmibugousCheck"
                    name="avoidAmibugous"
                    onChange={onCheckBoxChange}
                    className="py-2"
                  />
                </div>
              </div>
            )}
            {passwordType == "Memorable" && (
              <div className="flex flex-wrap">
                <div className="w-1/2">
                  <StyledCheckbox
                    label={t("capitalize")}
                    checked={(characters & memorable_capitalize_checked) != 0}
                    id="capitalizeCheck"
                    name="capitalize"
                    onChange={onCheckBoxChange}
                    className="py-2"
                  />
                </div>
                <div className="w-1/2">
                  <StyledCheckbox
                    label={t("fullWords")}
                    checked={(characters & memorable_full_words_checked) != 0}
                    id="fullwordsCheck"
                    name="fullwords"
                    onChange={onCheckBoxChange}
                    className="py-2"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-3">
        <Button
          variant="primary"
          size="lg"
          onClick={generateAction}
          className="w-full rounded-full font-bold"
        >
          <RefreshCw size={16} />
          {t("generatePassword")}
        </Button>
        <div className="grid grid-cols-3 gap-3">
          <Button
            variant="outline-blue"
            size="lg"
            onClick={copyAction}
            className="w-full rounded-full font-bold"
          >
            <Clipboard size={16} />
            {t("copyPassword")}
          </Button>
          <Button
            variant="outline-purple"
            size="lg"
            onClick={addToSavedAction}
            className="w-full rounded-full font-bold"
          >
            <BookmarkPlus size={16} />
            {t("bookmarkPassword")}
          </Button>
          <Button
            variant="outline-cyan"
            size="lg"
            onClick={() => onCheckPassword(copyPassword(passwordType, password))}
            className="w-full rounded-full font-bold"
          >
            <ShieldCheck size={16} />
            {t("checkThisPassword")}
          </Button>
        </div>
      </div>
    </section>
  );
}

const SAVED_PASSWORDS_KEY = STORAGE_KEYS.savedPasswords;

function subscribeToSavedPasswords(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot(): string {
  return localStorage.getItem(SAVED_PASSWORDS_KEY) ?? "[]";
}

function getServerSnapshot(): string {
  return "[]";
}

function parseSavedPasswords(raw: string): SavedRecord[] {
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function Description() {
  const t = useTranslations("password");
  const steps = [1, 2, 3, 4, 5].map((i) => ({
    title: t(`descriptions.step${i}Title`),
    desc: t(`descriptions.step${i}Desc`),
  }));
  const faqItems = [1, 2, 3, 4, 5].map((i) => ({
    title: t(`descriptions.faq${i}Q`),
    content: <p>{t(`descriptions.faq${i}A`)}</p>,
  }));
  return (
    <section id="description" className="mt-8">
      <div className="mb-4">
        <h2 className="font-semibold text-fg-primary text-base text-pretty">
          {t("descriptions.stepsTitle")}
        </h2>
      </div>
      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-accent-cyan text-bg-base text-xs font-bold flex items-center justify-center">
              {i + 1}
            </span>
            <div>
              <span className="font-medium text-fg-primary text-sm">{step.title}</span>
              <p className="text-fg-secondary text-sm leading-relaxed text-pretty">{step.desc}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <CircleHelp size={16} className="text-accent-cyan shrink-0" aria-hidden="true" />
          <h2 className="font-semibold text-fg-primary text-base text-pretty">
            {t("descriptions.faqTitle")}
          </h2>
        </div>
        <Accordion items={faqItems} />
      </div>
    </section>
  );
}

export default function PasswordPage() {
  const t = useTranslations("password");
  const tTools = useTranslations("tools");
  const title = tTools("password.shortTitle");

  const [activeTab, setActiveTab] = useState(0);
  const [checkerInput, setCheckerInput] = useState("");

  const rawSaved = useSyncExternalStore(subscribeToSavedPasswords, getSnapshot, getServerSnapshot);
  const saved = parseSavedPasswords(rawSaved);

  const setSaved = (updater: SavedRecord[] | ((prev: SavedRecord[]) => SavedRecord[])) => {
    const current = parseSavedPasswords(localStorage.getItem(SAVED_PASSWORDS_KEY) ?? "[]");
    const next = typeof updater === "function" ? updater(current) : updater;
    localStorage.setItem(SAVED_PASSWORDS_KEY, JSON.stringify(next));
    window.dispatchEvent(new StorageEvent("storage", { key: SAVED_PASSWORDS_KEY }));
  };

  return (
    <Layout title={title}>
      <div className="container mx-auto px-4 pt-3 pb-6">
        <div className="flex items-start gap-2 border-l-2 border-accent-cyan bg-accent-cyan-dim/30 rounded-r-lg p-3 mb-4">
          <Lock size={18} className="text-accent-cyan mt-0.5 shrink-0" />
          <span className="text-sm text-fg-secondary leading-relaxed">{t("localGenerated")}</span>
        </div>
        <NeonTabs
          selectedIndex={activeTab}
          onChange={setActiveTab}
          tabs={[
            {
              label: t("tabGenerator"),
              content: (
                <Generator
                  saved={saved}
                  setSaved={setSaved}
                  onCheckPassword={(pw) => {
                    setCheckerInput(pw);
                    setActiveTab(1);
                  }}
                />
              ),
            },
            {
              label: t("tabChecker"),
              content: <Checker initialInput={checkerInput} />,
            },
          ]}
        />
        <div className="mt-8 flex flex-col gap-3">
          <div className="flex items-start gap-2 border-l-2 border-accent-cyan bg-accent-cyan-dim/30 rounded-r-lg p-3">
            <KeyRound size={18} className="text-accent-cyan mt-0.5 shrink-0" />
            <span className="text-sm text-fg-secondary leading-relaxed">{t("securityTip")}</span>
          </div>
          <div className="flex items-start gap-2 border-l-2 border-accent-purple bg-accent-purple-dim/30 rounded-r-lg p-3">
            <ShieldCheck size={16} className="text-accent-purple mt-0.5 shrink-0" />
            <span className="text-sm text-fg-secondary leading-relaxed">
              {t("strengthInfoDesc")}
            </span>
          </div>
        </div>
        <SavedPasswords
          list={saved}
          delCallback={(index) => {
            const temp = saved.slice(0, index);
            temp.push(...saved.slice(index + 1));
            setSaved(temp);
          }}
          clearAll={() => {
            setSaved([]);
          }}
        />
        <Description />
      </div>
    </Layout>
  );
}

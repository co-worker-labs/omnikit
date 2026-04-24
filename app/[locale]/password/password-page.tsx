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
  calculateEntropy,
} from "../../../libs/password/main";

import { showToast } from "../../../libs/toast";
import { STORAGE_KEYS } from "../../../libs/storage-keys";
import Layout from "../../../components/layout";
import { useTranslations } from "next-intl";
import { CopyButton } from "../../../components/ui/copy-btn";
import { Button } from "../../../components/ui/button";
import { StyledCheckbox } from "../../../components/ui/input";

import {
  Clipboard,
  RefreshCw,
  Trash2,
  BookmarkPlus,
  Eye,
  EyeOff,
  Shield,
  XCircle,
  Lock,
  KeyRound,
  BarChart3,
} from "lucide-react";

const default_type = "Random";

const alert_copy_timeout = 2000;
const alert_del_timeout = 2000;
const alert_gen_timeout = 1000;
const alert_saved_timeout = 1000;
const saved_password_auto_hide_ms = 5000;

function getPasswordLevelStyle(type: PasswordType, password: string[], characters: number) {
  const entropy = calculateEntropy(password, type, characters);

  let width = undefined;
  let backgroundColor = undefined;
  let strengthLabel = undefined;

  if (entropy >= 80) {
    width = "100%";
    backgroundColor = "var(--color-accent-cyan)";
    strengthLabel = "strengthVeryStrong";
  } else if (entropy >= 60) {
    width = "75%";
    backgroundColor = "var(--color-accent-cyan)";
    strengthLabel = "strengthStrong";
  } else if (entropy >= 40) {
    width = "50%";
    backgroundColor = "orange";
    strengthLabel = "strengthGood";
  } else if (entropy >= 20) {
    width = "25%";
    backgroundColor = "var(--color-danger)";
    strengthLabel = "strengthFair";
  } else {
    width = "0%";
    strengthLabel = entropy >= 10 ? "strengthWeak" : "strengthVeryWeak";
  }

  return {
    width: width,
    backgroundColor: backgroundColor,
    entropy: Math.round(entropy),
    strengthLabel,
  };
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
            title={
              list.every((r) => visibleMap[passwordHash(r.password, r.type)] === true)
                ? t("hidePassword")
                : t("showPassword")
            }
            onClick={toggleAllVisibility}
          >
            {list.every((r) => visibleMap[passwordHash(r.password, r.type)] === true) ? (
              <EyeOff size={14} />
            ) : (
              <Eye size={14} />
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
          const { width, backgroundColor } = getPasswordLevelStyle(
            record.type,
            record.password,
            record.characters
          );
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
                    title={isRecordVisible ? t("hidePassword") : t("showPassword")}
                    onClick={() => setRecordVisibility(rid, !isRecordVisible)}
                  >
                    {isRecordVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <CopyButton getContent={() => copyPassword(record.type, record.password)} />
                  <button
                    type="button"
                    className="text-fg-muted hover:text-danger transition-colors cursor-pointer p-1"
                    title={tc("delete")}
                    onClick={() => onDel(index)}
                  >
                    <Trash2 size={14} />
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
              <div className="h-1 bg-bg-elevated">
                <div
                  className="h-full transition-all"
                  style={{ width: width, backgroundColor: backgroundColor }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Generator({
  saved,
  setSaved,
}: {
  saved: SavedRecord[];
  setSaved: React.Dispatch<React.SetStateAction<SavedRecord[]>>;
}) {
  const t = useTranslations("password");
  const tc = useTranslations("common");
  const [passwordType, setPasswordType] = useState<PasswordType>(default_type);
  const [characters, setCharacters] = useState<number>(defaultCharacters(default_type));
  const [passwordLength, setPasswordLength] = useState<PasswordLength>(defaultLength(default_type));
  const [visible, setVisible] = useState<boolean>(true);

  const [password, setPassword] = useState<string[]>([]);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      setPassword(generate(passwordType, characters, passwordLength.current));
    }
  });

  const levelStyle =
    password.length > 0
      ? getPasswordLevelStyle(passwordType, password, characters)
      : { width: "0%", backgroundColor: undefined, strengthLabel: "", entropy: 0 };

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
      <div className="flex items-start gap-2 border-l-2 border-accent-cyan bg-accent-cyan-dim/30 rounded-r-lg p-3 my-4">
        <Lock size={18} className="text-accent-cyan mt-0.5 shrink-0" />
        <span className="text-sm text-fg-secondary leading-relaxed">{t("localGenerated")}</span>
      </div>
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
              title={visible ? t("hidePassword") : t("showPassword")}
            >
              {visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            <button
              type="button"
              className="text-fg-muted hover:text-accent-cyan transition-colors cursor-pointer p-2"
              onClick={copyAction}
              title={tc("copy")}
            >
              <Clipboard size={18} />
            </button>
          </div>
        </div>
        <div className="h-2 w-full bg-bg-elevated overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: levelStyle.width, backgroundColor: levelStyle.backgroundColor }}
          />
        </div>
        <div className="flex justify-between items-center mt-2.5 px-3 pb-1">
          <div className="flex items-center gap-2">
            {levelStyle.backgroundColor && (
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: levelStyle.backgroundColor }}
              />
            )}
            {levelStyle.strengthLabel && (
              <span className="text-sm font-semibold" style={{ color: levelStyle.backgroundColor }}>
                {t(levelStyle.strengthLabel)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-fg-muted">{levelStyle.entropy} bits</span>
          </div>
        </div>
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
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-4 gap-3">
        <Button
          variant="outline"
          size="lg"
          onClick={generateAction}
          className="w-full rounded-full font-bold !border-emerald-400 !text-emerald-400 hover:!bg-emerald-400/10"
        >
          <RefreshCw size={16} />
          {t("generatePassword")}
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={copyAction}
          className="w-full rounded-full font-bold !border-blue-500 !text-blue-500 hover:!bg-blue-500/10"
        >
          <Clipboard size={16} />
          {t("copyPassword")}
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={addToSavedAction}
          className="w-full rounded-full font-bold !border-accent-purple !text-accent-purple hover:!bg-accent-purple-dim"
        >
          <BookmarkPlus size={16} />
          {t("bookmarkPassword")}
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => {
            navigator.clipboard.writeText("");
            showToast(tc("clearedClipboard"), "danger", 1000);
          }}
          className="w-full rounded-full font-bold !border-danger !text-danger hover:!bg-danger/10"
        >
          <XCircle size={16} />
          {t("clearClipboard")}
        </Button>
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

export default function PasswordPage() {
  const t = useTranslations("password");
  const title = t("shortTitle");

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
        <Generator saved={saved} setSaved={setSaved} />
        <div className="mt-8 flex flex-col gap-3">
          <div className="flex items-start gap-2 border-l-2 border-accent-cyan bg-accent-cyan-dim/30 rounded-r-lg p-3">
            <KeyRound size={18} className="text-accent-cyan mt-0.5 shrink-0" />
            <span className="text-sm text-fg-secondary leading-relaxed">{t("securityTip")}</span>
          </div>
          <div className="flex items-start gap-2 border-l-2 border-accent-purple bg-accent-purple-dim/30 rounded-r-lg p-3">
            <BarChart3 size={16} className="text-accent-purple mt-0.5 shrink-0" />
            <span className="text-sm text-fg-secondary leading-relaxed">
              {t("entropyVerifiedDesc")}
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
      </div>
    </Layout>
  );
}

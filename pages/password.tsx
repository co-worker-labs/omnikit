import "rc-slider/assets/index.css";
import Slider from "rc-slider";
import { ChangeEvent, useMemo, useRef, useState } from "react";
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
  HistoryRecord,
  PasswordLength,
  PasswordType,
  calculateEntropy,
} from "../libs/password/main";

import { GetStaticProps } from "next";
import { showToast } from "../libs/toast";
import Layout from "../components/layout";
import { ToolPageHeadBuilder } from "../components/head_builder";
import { useTranslation } from "next-i18next/pages";
import { serverSideTranslations } from "next-i18next/pages/serverSideTranslations";
import { CopyButton } from "../components/ui/copy-btn";
import { Button } from "../components/ui/button";
import { StyledCheckbox } from "../components/ui/input";

import { Card } from "../components/ui/card";
import {
  Clipboard,
  RefreshCw,
  Trash2,
  BookmarkPlus,
  Eye,
  EyeOff,
  Shield,
  Computer,
  File,
  XCircle,
} from "lucide-react";

const default_type = "Random";

const alert_copy_timeout = 2000;
const alert_del_timeout = 2000;
const alert_gen_timeout = 1000;
const alert_history_timeout = 1000;

function getPasswordLevelStyle(type: PasswordType, password: string[], characters: number) {
  const entropy = calculateEntropy(password, type, characters);

  let width = undefined;
  let backgroundColor = undefined;
  let strengthLabel = undefined;

  if (entropy >= 80) {
    width = "100%";
    backgroundColor = "#06D6A0";
    strengthLabel = "strengthVeryStrong";
  } else if (entropy >= 60) {
    width = "75%";
    backgroundColor = "#06D6A0";
    strengthLabel = "strengthStrong";
  } else if (entropy >= 40) {
    width = "50%";
    backgroundColor = "orange";
    strengthLabel = "strengthGood";
  } else if (entropy >= 20) {
    width = "25%";
    backgroundColor = "red";
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

function PasswordHistory({
  list,
  delCallback,
  clearAll,
}: {
  list: Array<HistoryRecord>;
  delCallback: (index: number) => void;
  clearAll: () => void;
}) {
  const { t } = useTranslation(["common", "password"]);
  const [visibleMap, setVisibleMap] = useState<Record<string, boolean>>({});

  function passwordHash(pw: string[], type: string): string {
    const str = type + ":" + pw.join("");
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return "h_" + Math.abs(hash).toString(36);
  }

  function onDel(index: number) {
    delCallback(index);
    showToast(t("common:common.deleted"), "danger", alert_del_timeout);
  }

  function onClearAll() {
    clearAll();
    showToast(t("common:common.cleared"), "danger", alert_del_timeout);
  }

  return (
    <div className="mt-6" hidden={list.length == 0}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-lg font-bold text-fg-primary">{t("password:historyTitle")}</span>
        <button
          className="text-danger text-sm bg-transparent border-none cursor-pointer"
          onClick={onClearAll}
        >
          {t("password:clearAllWithCount", { count: list.length })}
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
          const isRecordVisible = visibleMap[rid] !== undefined ? visibleMap[rid] : record.visible;
          return (
            <Card key={rid} hover={false}>
              <div className="flex items-center justify-between px-3 pt-2">
                <span className="text-xs text-fg-muted">{datetime}</span>
                <div className="hidden md:flex items-center gap-1">
                  <button
                    type="button"
                    className="text-fg-muted hover:text-accent-cyan transition-colors cursor-pointer p-1"
                    title={
                      isRecordVisible ? t("password:hidePassword") : t("password:showPassword")
                    }
                    onClick={() => setVisibleMap((prev) => ({ ...prev, [rid]: !isRecordVisible }))}
                  >
                    {isRecordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <CopyButton getContent={() => copyPassword(record.type, record.password)} />
                  <button
                    type="button"
                    className="text-fg-muted hover:text-danger transition-colors cursor-pointer p-1"
                    title={t("common:common.delete")}
                    onClick={() => onDel(index)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="flex items-center">
                <div
                  className="flex-1 text-center whitespace-nowrap overflow-x-auto text-xl sm:text-2xl font-mono px-3 py-2"
                  dangerouslySetInnerHTML={{
                    __html: isRecordVisible
                      ? printPassword(record.type, record.password)
                      : maskPassword(record.type, record.password),
                  }}
                />
              </div>
              <div className="h-1 w-full bg-bg-elevated">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: width, backgroundColor: backgroundColor }}
                />
              </div>
              <div className="flex md:hidden justify-around items-center py-1">
                <button
                  type="button"
                  className="p-1 text-fg-muted hover:text-accent-cyan transition-colors cursor-pointer"
                  title={isRecordVisible ? t("password:hidePassword") : t("password:showPassword")}
                  onClick={() => setVisibleMap((prev) => ({ ...prev, [rid]: !isRecordVisible }))}
                >
                  {isRecordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button
                  type="button"
                  className="p-1 text-fg-muted hover:text-accent-cyan transition-colors cursor-pointer"
                  onClick={() => {
                    navigator.clipboard.writeText(copyPassword(record.type, record.password));
                    showToast(t("common:common.copied"), "success", alert_copy_timeout);
                  }}
                >
                  <Clipboard size={16} />
                </button>
                <button
                  type="button"
                  className="p-1 text-fg-muted hover:text-danger transition-colors cursor-pointer"
                  onClick={() => onDel(index)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Generator() {
  const { t } = useTranslation(["common", "password"]);
  const [passwordType, setPasswordType] = useState<PasswordType>(default_type);
  const [characters, setCharacters] = useState<number>(defaultCharacters(default_type));
  const [passwordLength, setPasswordLength] = useState<PasswordLength>(defaultLength(default_type));
  const [visible, setVisible] = useState<boolean>(true);

  const [password, setPassword] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    return generate(
      default_type,
      defaultCharacters(default_type),
      defaultLength(default_type).current
    );
  });
  const [history, setHistory] = useState<HistoryRecord[]>([]);

  const levelStyle = useMemo(
    () =>
      password.length > 0
        ? getPasswordLevelStyle(passwordType, password, characters)
        : { width: "0%", backgroundColor: undefined, strengthLabel: "", entropy: 0 },
    [passwordType, password, characters]
  );

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
    showToast(t("common:common.copied"), "success", alert_copy_timeout);
  }

  function generateAction() {
    const password = generate(passwordType, characters, passwordLength.current);
    setPassword(password);
    showToast(t("common:common.generated"), "info", alert_gen_timeout, "generatedAlert");
  }

  function setLength(length: number) {
    setPasswordLength({
      current: length,
      min: passwordLength.min,
      max: passwordLength.max,
    });
    setPassword(generate(passwordType, characters, length));
  }

  function addToHistoryAction() {
    if (history.length == 0 || history[0].password != password) {
      const historyTemp = [
        {
          type: passwordType,
          password: password,
          characters: characters,
          timestamp: new Date().getTime(),
          visible: visible,
        },
      ];
      historyTemp.push(...history);
      setHistory(historyTemp);
      showToast(t("common:common.savedToHistory"), "success", alert_history_timeout);
    }
  }

  return (
    <section id="generator">
      <div className="flex items-start gap-2 border-l-2 border-accent-cyan bg-accent-cyan-dim/30 rounded-r-lg p-3">
        <Shield size={18} className="text-accent-cyan mt-0.5 shrink-0" />
        <span className="text-sm text-fg-secondary leading-relaxed">
          {t("password:securityTip")}
        </span>
      </div>
      <Card className="relative mt-2" hover={false}>
        <div className="flex items-center relative py-4 sm:py-5 px-4 sm:px-5">
          <div
            className="flex-1 text-center whitespace-nowrap overflow-x-auto text-2xl sm:text-3xl font-mono leading-normal select-none"
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
              title={visible ? t("password:hidePassword") : t("password:showPassword")}
            >
              {visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            <button
              type="button"
              className="text-fg-muted hover:text-accent-cyan transition-colors cursor-pointer p-2"
              onClick={copyAction}
              title={t("common:common.copy")}
            >
              <Clipboard size={18} />
            </button>
          </div>
        </div>
        <div className="h-2 w-full bg-bg-elevated rounded-b-xl overflow-hidden">
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
            <span className="text-sm font-semibold" style={{ color: levelStyle.backgroundColor }}>
              {t(`password:${levelStyle.strengthLabel}`)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-fg-muted">{levelStyle.entropy} bits</span>
          </div>
        </div>
      </Card>
      <Card className="mt-6" hover={false}>
        <div className="p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xl font-bold">{t("password:customizeYourPassword")}</span>
            <label className="flex items-center gap-2 cursor-pointer border border-border-default rounded-full px-3 py-1.5 hover:border-accent-cyan/40 transition-colors">
              <input
                type="checkbox"
                className="w-4 h-4 rounded accent-[#06D6A0] cursor-pointer"
                id="memorableSwitch"
                checked={passwordType == "Memorable"}
                onChange={onTypeChange}
              />
              <span className="font-semibold text-sm text-danger">{t("password:memorable")}</span>
            </label>
          </div>
          <div className="w-full h-px bg-border-default" />
          <div className="flex flex-wrap px-3">
            <div className="w-full lg:w-1/2 mt-4">
              <div className="flex items-center justify-between px-2">
                <label className="text-lg">{t("password:passwordLength")}</label>
                <span className="text-accent-cyan font-bold">{passwordLength.current}</span>
              </div>
              <div className="mt-2 px-2">
                <Slider
                  min={passwordLength.min}
                  max={passwordLength.max}
                  step={1}
                  value={passwordLength.current}
                  railStyle={{ backgroundColor: "#1e1e2e", height: "6px" }}
                  trackStyle={{ backgroundColor: "#06D6A0", height: "6px" }}
                  handleStyle={{
                    backgroundColor: "#06D6A0",
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
                <span className="text-sm text-fg-muted">{passwordLength.min}</span>
                <span className="text-sm text-fg-muted">{passwordLength.max}</span>
              </div>
            </div>
            <div className="w-full lg:w-1/2 mt-3 lg:pl-6">
              {passwordType == "Random" && (
                <div className="flex flex-wrap">
                  <div className="w-1/2">
                    <StyledCheckbox
                      label={t("password:uppercase")}
                      checked={(characters & random_uppercase_checked) != 0}
                      id="uppercaseCheck"
                      name="uppercase"
                      onChange={onCheckBoxChange}
                      className="py-2"
                    />
                  </div>
                  <div className="w-1/2">
                    <StyledCheckbox
                      label={t("password:lowercase")}
                      checked={(characters & random_lowercase_checked) != 0}
                      id="lowercaseCheck"
                      name="lowercase"
                      onChange={onCheckBoxChange}
                      className="py-2"
                    />
                  </div>
                  <div className="w-1/2">
                    <StyledCheckbox
                      label={t("password:numbers")}
                      checked={(characters & random_numbers_checked) != 0}
                      id="numbersCheck"
                      name="numbers"
                      onChange={onCheckBoxChange}
                      className="py-2"
                    />
                  </div>
                  <div className="w-1/2">
                    <StyledCheckbox
                      label={t("password:symbols")}
                      checked={(characters & random_symbols_checked) != 0}
                      id="symoblsCheck"
                      name="symbols"
                      onChange={onCheckBoxChange}
                      className="py-2"
                    />
                  </div>
                  <div className="w-auto">
                    <StyledCheckbox
                      label={t("password:avoidAmbiguous")}
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
                      label={t("password:capitalize")}
                      checked={(characters & memorable_capitalize_checked) != 0}
                      id="capitalizeCheck"
                      name="capitalize"
                      onChange={onCheckBoxChange}
                      className="py-2"
                    />
                  </div>
                  <div className="w-1/2">
                    <StyledCheckbox
                      label={t("password:fullWords")}
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
      </Card>
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-4 gap-3">
        <Button
          variant="primary"
          size="lg"
          onClick={generateAction}
          className="w-full rounded-full font-bold"
        >
          <RefreshCw size={16} />
          {t("password:generatePassword")}
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={copyAction}
          className="w-full rounded-full font-bold border-blue-500 text-blue-500 bg-blue-500/10 hover:bg-blue-500/20"
        >
          <Clipboard size={16} />
          {t("password:copyPassword")}
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={addToHistoryAction}
          className="w-full rounded-full font-bold border-amber-500 text-amber-500 bg-amber-500/10 hover:bg-amber-500/20"
        >
          <BookmarkPlus size={16} />
          {t("common:common.save")}
        </Button>
        <Button
          variant="danger"
          size="lg"
          onClick={() => {
            navigator.clipboard.writeText("");
            showToast(t("common:common.clearedClipboard"), "danger", 1000);
          }}
          className="w-full rounded-full font-bold bg-danger/10"
        >
          <XCircle size={16} />
          {t("password:clearClipboard")}
        </Button>
      </div>

      <PasswordHistory
        list={history}
        delCallback={(index) => {
          const temp = history.slice(0, index);
          temp.push(...history.slice(index + 1));
          setHistory(temp);
        }}
        clearAll={() => {
          setHistory([]);
        }}
      />
    </section>
  );
}

function PasswordPage() {
  const { t } = useTranslation(["tools", "password"]);
  const title = t("password.title");

  return (
    <>
      <ToolPageHeadBuilder toolPath="/password" />
      <Layout title={title}>
        <div className="container mx-auto px-4 pt-4">
          <Generator />
          <div className="mt-12 mb-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card hover={false} className="text-center py-6">
              <Shield size={24} className="text-accent-cyan mx-auto mb-2" />
              <p className="font-semibold text-accent-cyan text-base">
                {t("password:entropyVerified")}
              </p>
              <p className="text-sm text-fg-muted mt-1">{t("password:entropyVerifiedDesc")}</p>
            </Card>
            <Card hover={false} className="text-center py-6">
              <Computer size={24} className="text-accent-cyan mx-auto mb-2" />
              <p className="font-semibold text-accent-cyan text-base">{t("password:fullyLocal")}</p>
              <p className="text-sm text-fg-muted mt-1">{t("password:fullyLocalDesc")}</p>
            </Card>
            <Card hover={false} className="text-center py-6">
              <File size={24} className="text-accent-cyan mx-auto mb-2" />
              <p className="font-semibold text-accent-cyan text-base">{t("password:auditReady")}</p>
              <p className="text-sm text-fg-muted mt-1">{t("password:auditReadyDesc")}</p>
            </Card>
          </div>
        </div>
      </Layout>
    </>
  );
}

export const getStaticProps: GetStaticProps = async (context) => {
  const locale = context.locale || "en";
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common", "password", "tools"])),
    },
  };
};

export default PasswordPage;

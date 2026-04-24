"use client";

import { useState } from "react";
import { CopyButton } from "../../../components/ui/copy-btn";
import Layout from "../../../components/layout";
import { showToast } from "../../../libs/toast";
import { useTranslations } from "next-intl";
import {
  StyledTextarea,
  StyledInput,
  StyledSelect,
  StyledCheckbox,
} from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { ChevronsDown, ChevronsUp, X } from "lucide-react";

const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function Conversion() {
  const t = useTranslations("base64");
  const tc = useTranslations("common");
  const [rawContent, setRawContent] = useState<string>("");
  const [isTrimRaw, setIsTrimRaw] = useState<boolean>(true);
  const [rawCharset, setRawCharset] = useState<BufferEncoding>("utf-8");
  const [encodedContent, setEncodedContent] = useState<string>("");
  const [basicAuthEnabled, setBasicAuthEnabled] = useState<boolean>(false);
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  function updateRawContent(value: string) {
    setRawContent(value);
    const arr = parse2BasicAuth(value);
    setUsername(arr[0]);
    setPassword(arr[1]);
  }

  function parse2BasicAuth(value: string): string[] {
    const index = value.indexOf(":");
    if (index > -1) {
      return [value.substring(0, index), value.substring(index + 1)];
    } else {
      return [value, ""];
    }
  }

  function buildBasicAuth(username: string, password: string) {
    return username + ":" + password;
  }

  function updateEncodedContent(value: string) {
    setEncodedContent(value);
  }

  function doEncode() {
    const raw = isTrimRaw ? rawContent.trim() : rawContent;
    const encoded = Buffer.from(raw, rawCharset).toString("base64");
    updateEncodedContent(encoded);
    updateRawContent(raw);
    showToast(tc("encoded"), "success", 2000);
  }

  function doDecode() {
    let encoded = encodedContent.trim();
    if (basicAuthEnabled) {
      if (encoded.match(/^(basic).*/gi)) {
        encoded = encoded.substring("Basic ".length).trim();
      }
    }
    const raw = Buffer.from(encoded, "base64").toString(rawCharset);
    updateEncodedContent(encoded);
    updateRawContent(raw);
    showToast(tc("decoded"), "success", 2000);
  }

  function isDisabledEncode(): boolean {
    const raw = isTrimRaw ? rawContent.trim() : rawContent;
    return !raw;
  }

  function isDiabledDecode(): boolean {
    return !encodedContent.trim();
  }

  function isDiabledClear(): boolean {
    const raw = isTrimRaw ? rawContent.trim() : rawContent;
    const encoded = encodedContent.trim();
    return !raw && !encoded;
  }

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
              onChange={(e) => {
                setIsTrimRaw(e.target.checked);
              }}
            />
            <button
              type="button"
              className="text-danger text-xs hover:text-danger/80 transition-colors cursor-pointer"
              onClick={() => {
                updateRawContent("");
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
            onChange={(e) => {
              updateRawContent(e.target.value);
            }}
            className="font-mono text-sm"
          />
          <CopyButton getContent={() => rawContent} className="absolute end-2 top-2" />
        </div>
      </div>

      <div className="mt-4">
        <StyledCheckbox
          label={t("basicAuthentication")}
          id="basicAuthFlag"
          checked={basicAuthEnabled}
          onChange={(e) => setBasicAuthEnabled(e.target.checked)}
        />
        {basicAuthEnabled && (
          <div className="flex gap-0 mt-2">
            <StyledInput
              type="text"
              placeholder={t("username")}
              aria-label={t("username")}
              value={username}
              onChange={(e) => {
                updateRawContent(buildBasicAuth(e.target.value, password));
              }}
              className="rounded-r-none"
            />
            <span className="flex items-center px-2 bg-bg-elevated border-y border-border-default text-fg-muted font-mono">
              :
            </span>
            <StyledInput
              type="text"
              placeholder={t("password")}
              aria-label={t("password")}
              value={password}
              onChange={(e) => {
                updateRawContent(buildBasicAuth(username, e.target.value));
              }}
              className="rounded-l-none"
            />
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 items-center">
        <StyledSelect
          aria-label="Plain Content Charset"
          value={rawCharset}
          onChange={(e) => {
            setRawCharset(e.target.value as BufferEncoding);
          }}
          className="appearance-none rounded-full font-bold text-center"
        >
          <option value="ascii">ASCII</option>
          <option value="utf-8">UTF-8</option>
        </StyledSelect>
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
          disabled={isDiabledDecode()}
          onClick={doDecode}
          className="rounded-full font-bold"
        >
          {t("decode")}
          <ChevronsUp size={16} className="ms-1" />
        </Button>
        <Button
          variant="danger"
          size="md"
          disabled={isDiabledClear()}
          onClick={() => {
            updateRawContent("");
            updateEncodedContent("");
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
            onChange={(e) => {
              updateEncodedContent(e.target.value);
            }}
            className="font-mono text-sm"
          />
          <CopyButton getContent={() => encodedContent} className="absolute end-2 top-2" />
        </div>
      </div>
    </section>
  );
}

function Description() {
  const t = useTranslations("base64");
  return (
    <section id="description" className="mt-8">
      <div className="mb-4">
        <h5 className="font-semibold text-fg-primary text-base">{t("descriptions.whatIsTitle")}</h5>
        <div className="mt-1 space-y-1.5 text-fg-secondary text-sm leading-relaxed">
          <p>{t("descriptions.whatIsP1")}</p>
          <p>{t("descriptions.whatIsP2")}</p>
          <p>{t("descriptions.whatIsP3")}</p>
        </div>
      </div>

      <div className="mb-4">
        <h5 className="font-semibold text-fg-primary text-base">{t("descriptions.howTitle")}</h5>
        <p className="text-fg-secondary text-sm mt-1 leading-relaxed">{t("descriptions.howP1")}</p>
        <ol className="list-decimal list-inside text-fg-secondary text-sm mt-1 space-y-1">
          <li>{t("descriptions.howStep1")}</li>
          <li>{t("descriptions.howStep2")}</li>
          <li>{t("descriptions.howStep3")}</li>
          <li>{t("descriptions.howStep4")}</li>
        </ol>
        <div className="mt-3 rounded-lg border border-border-default bg-bg-elevated/50 p-3">
          <table className="w-full table-fixed text-xs font-mono border-collapse">
            <caption className="caption-top pb-2 font-semibold text-fg-primary text-sm">
              {t("descriptions.tableCaption")}
            </caption>
            <thead>
              <tr className="border-b border-border-default text-fg-muted">
                {[0, 1].flatMap((i) => [
                  <th key={`v-${i}`} className="px-2 py-1 text-start font-semibold">
                    {t("descriptions.tableValue")}
                  </th>,
                  <th key={`c-${i}`} className="px-2 py-1 text-start font-semibold">
                    {t("descriptions.tableChar")}
                  </th>,
                ])}
              </tr>
            </thead>
            <tbody className="text-fg-secondary">
              {Array.from({ length: 32 }, (_, row) => (
                <tr key={row} className="odd:bg-bg-elevated/40">
                  {[0, 32].flatMap((offset) => {
                    const value = row + offset;
                    return [
                      <td key={`v-${offset}`} className="px-2 py-1 tabular-nums">
                        {value}
                      </td>,
                      <td key={`c-${offset}`} className="px-2 py-1 font-semibold text-accent-cyan">
                        {BASE64_ALPHABET[value]}
                      </td>,
                    ];
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-4">
        <h5 className="font-semibold text-fg-primary text-base">{t("descriptions.whyTitle")}</h5>
        <div className="mt-1 space-y-1.5 text-fg-secondary text-sm leading-relaxed">
          <p>{t("descriptions.whyP1")}</p>
          <p>{t("descriptions.whyP2")}</p>
        </div>
      </div>

      <div className="mb-4">
        <h5 className="font-semibold text-fg-primary text-base">
          {t("descriptions.useCasesTitle")}
        </h5>
        <div className="mt-1 space-y-1.5 text-fg-secondary text-sm leading-relaxed">
          <p>{t("descriptions.useCasesP1")}</p>
          <p>{t("descriptions.useCasesP2")}</p>
        </div>
      </div>

      <div className="mb-4">
        <h5 className="font-semibold text-fg-primary text-base">
          {t("descriptions.limitationsTitle")}
        </h5>
        <div className="mt-1 space-y-1.5 text-fg-secondary text-sm leading-relaxed">
          <p>{t("descriptions.limitationsP1")}</p>
          <p>{t("descriptions.limitationsP2")}</p>
        </div>
      </div>
    </section>
  );
}

export default function Base64Page() {
  const tc = useTranslations("common");
  const t = useTranslations("tools");
  const title = t("base64.shortTitle");

  return (
    <Layout title={title}>
      <div className="container mx-auto px-4 pt-3 pb-6">
        <div className="flex items-start gap-2 border-l-2 border-accent-cyan bg-accent-cyan-dim/30 rounded-r-lg p-3 my-4">
          <span className="text-sm text-fg-secondary leading-relaxed">
            {tc("alert.notTransferred")}
          </span>
        </div>

        <Conversion />
        <Description />
      </div>
    </Layout>
  );
}

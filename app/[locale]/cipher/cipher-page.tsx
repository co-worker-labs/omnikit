"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CopyButton } from "../../../components/ui/copy-btn";
import Layout from "../../../components/layout";
import { showToast } from "../../../libs/toast";
import {
  StyledTextarea,
  StyledInput,
  StyledSelect,
  StyledCheckbox,
} from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { ChevronsDown, ChevronsUp, X } from "lucide-react";
import CryptoJS from "crypto-js";

type Algorithms = "AES" | "DES" | "Triple DES" | "Rabbit" | "RC4" | "RC4Drop";
type BlockMode = "CBC" | "CFB" | "CTR" | "OFB" | "ECB";
type PaddingScheme = "Pkcs7" | "Iso97971" | "AnsiX923" | "Iso10126" | "ZeroPadding" | "NoPadding";

function Conversion() {
  const t = useTranslations("cipher");
  const tc = useTranslations("common");
  const [rawContent, setRawContent] = useState<string>("");
  const [isTrimRaw, setIsTrimRaw] = useState<boolean>(true);
  const [passphrase, setPassphrase] = useState<string>("");
  const [encryptedContent, setEncryptedContent] = useState<string>("");

  const [algorithm, setAlgorithm] = useState<Algorithms>("AES");
  const [mode, setMode] = useState<BlockMode>("CBC");
  const [paddingScheme, setPaddingScheme] = useState<PaddingScheme>("Pkcs7");
  const [droppedWords, setDroppedWords] = useState<number>(192);

  function getRawContent() {
    return isTrimRaw ? rawContent.trim() : rawContent;
  }

  function isDisabledEncrypt(): boolean {
    const raw = getRawContent();
    const phrase = passphrase.trim();
    return !raw || !phrase;
  }

  function isDisabledDecrypt(): boolean {
    const encrypted = encryptedContent.trim();
    const phrase = passphrase.trim();
    return !encrypted || !phrase;
  }

  function isDisabledClear(): boolean {
    const raw = getRawContent();
    const encrypted = encryptedContent.trim();
    const phrase = passphrase.trim();
    return !raw && !encrypted && !phrase;
  }

  function getMode() {
    switch (mode) {
      case "CBC":
        return CryptoJS.mode.CBC;
      case "CFB":
        return CryptoJS.mode.CFB;
      case "CTR":
        return CryptoJS.mode.CTR;
      case "ECB":
        return CryptoJS.mode.ECB;
      case "OFB":
        return CryptoJS.mode.OFB;
    }
  }

  function getPaddingScheme() {
    switch (paddingScheme) {
      case "AnsiX923":
        return CryptoJS.pad.AnsiX923;
      case "Iso10126":
        return CryptoJS.pad.Iso10126;
      case "Iso97971":
        return CryptoJS.pad.Iso97971;
      case "NoPadding":
        return CryptoJS.pad.NoPadding;
      case "ZeroPadding":
        return CryptoJS.pad.ZeroPadding;
      case "Pkcs7":
        return CryptoJS.pad.Pkcs7;
    }
  }

  function doEncrypt() {
    const raw = isTrimRaw ? rawContent.trim() : rawContent;
    const phrase = passphrase.trim();
    if (raw && phrase) {
      let encrypted;
      switch (algorithm) {
        case "AES":
          encrypted = CryptoJS.AES.encrypt(raw, phrase, {
            mode: getMode(),
            padding: getPaddingScheme(),
          });
          break;
        case "DES":
          encrypted = CryptoJS.DES.encrypt(raw, phrase, {
            mode: getMode(),
            padding: getPaddingScheme(),
          });
          break;
        case "Triple DES":
          encrypted = CryptoJS.TripleDES.encrypt(raw, phrase, {
            mode: getMode(),
            padding: getPaddingScheme(),
          });
          break;
        case "RC4":
          encrypted = CryptoJS.RC4.encrypt(raw, phrase, {
            mode: getMode(),
            padding: getPaddingScheme(),
          });
          break;
        case "RC4Drop":
          encrypted = CryptoJS.RC4Drop.encrypt(raw, phrase, {
            mode: getMode(),
            padding: getPaddingScheme(),
            drop: droppedWords,
          });
          break;
        case "Rabbit":
          encrypted = CryptoJS.Rabbit.encrypt(raw, phrase, {
            mode: getMode(),
            padding: getPaddingScheme(),
          });
          break;
      }
      setPassphrase(phrase);
      setRawContent(raw);
      setEncryptedContent(encrypted.toString());
      showToast(tc("encrypted"), "success", 3000);
    }
  }

  function doDecrypt() {
    const encrypted = encryptedContent.trim();
    const phrase = passphrase.trim();
    if (encrypted && phrase) {
      let decrypted;
      switch (algorithm) {
        case "AES":
          decrypted = CryptoJS.AES.decrypt(encrypted, phrase, {
            mode: getMode(),
            padding: getPaddingScheme(),
          });
          break;
        case "DES":
          decrypted = CryptoJS.DES.decrypt(encrypted, phrase, {
            mode: getMode(),
            padding: getPaddingScheme(),
          });
          break;
        case "Triple DES":
          decrypted = CryptoJS.TripleDES.decrypt(encrypted, phrase, {
            mode: getMode(),
            padding: getPaddingScheme(),
          });
          break;
        case "RC4":
          decrypted = CryptoJS.RC4.decrypt(encrypted, phrase, {
            mode: getMode(),
            padding: getPaddingScheme(),
          });
          break;
        case "RC4Drop":
          decrypted = CryptoJS.RC4Drop.decrypt(encrypted, phrase, {
            mode: getMode(),
            padding: getPaddingScheme(),
            drop: droppedWords,
          });
          break;
        case "Rabbit":
          decrypted = CryptoJS.Rabbit.decrypt(encrypted, phrase, {
            mode: getMode(),
            padding: getPaddingScheme(),
          });
          break;
      }
      setEncryptedContent(encrypted);
      setPassphrase(phrase);
      try {
        setRawContent(decrypted.toString(CryptoJS.enc.Utf8));
        showToast(tc("decrypted"), "success", 3000);
      } catch (e) {
        showToast(tc("alert.invalidCipher"), "danger", 3000);
      }
    }
  }

  return (
    <section id="conversion">
      <div>
        <div className="flex flex-wrap justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-cyan/60" />
            <span className="font-mono text-sm font-semibold text-accent-cyan">
              {t("plaintext")}
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
            placeholder={t("plaintextPlaceholder")}
            rows={5}
            value={rawContent}
            onChange={(e) => {
              setRawContent(e.target.value);
            }}
            className="font-mono text-sm"
          />
          <CopyButton getContent={() => rawContent} className="absolute end-2 top-2" />
        </div>
      </div>

      <div className="mt-4">
        <div className="flex flex-wrap justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-purple/60" />
            <span className="font-mono text-sm font-semibold text-accent-purple">
              {t("secretPassphrase")}
            </span>
          </div>
          <button
            type="button"
            className="text-danger text-xs hover:text-danger/80 transition-colors cursor-pointer"
            onClick={() => {
              setPassphrase("");
              showToast(tc("cleared"), "danger", 2000);
            }}
          >
            {tc("clear")}
          </button>
        </div>
        <div className="relative mt-1">
          <StyledTextarea
            id="passphraseTextarea"
            placeholder={t("passphrasePlaceholder")}
            rows={3}
            value={passphrase}
            onChange={(e) => {
              setPassphrase(e.target.value);
            }}
            className="font-mono text-sm"
          />
          <CopyButton getContent={() => passphrase.trim()} className="absolute end-2 top-2" />
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-4 rounded-full bg-accent-cyan" />
          <span className="font-mono text-xs font-semibold text-fg-muted uppercase tracking-wider">
            Settings
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 sm:flex-col sm:items-stretch sm:gap-0">
            <label className="shrink-0 w-28 text-xs text-fg-muted font-mono uppercase tracking-wider sm:w-auto sm:mb-1.5">
              {t("algorithms")}
            </label>
            <StyledSelect
              aria-label="Cipher Algorithms"
              value={algorithm}
              onChange={(e) => {
                setAlgorithm(e.target.value as Algorithms);
                if ((e.target.value as Algorithms) == "RC4Drop") {
                  setDroppedWords(192);
                }
              }}
              className="appearance-none rounded-full font-bold text-center flex-1 sm:w-full"
            >
              <option value="AES">AES</option>
              <option value="DES">DES</option>
              <option value="Triple DES">Triple DES</option>
              <option value="Rabbit">Rabbit</option>
              <option value="RC4">RC4</option>
              <option value="RC4Drop">RC4Drop</option>
            </StyledSelect>
          </div>
          <div className="flex items-center gap-3 sm:flex-col sm:items-stretch sm:gap-0">
            <label className="shrink-0 w-28 text-xs text-fg-muted font-mono uppercase tracking-wider sm:w-auto sm:mb-1.5">
              {t("blockMode")}
            </label>
            <StyledSelect
              aria-label="Block Mode"
              value={mode}
              onChange={(e) => {
                setMode(e.target.value as BlockMode);
              }}
              className="appearance-none rounded-full font-bold text-center flex-1 sm:w-full"
            >
              <option value="CBC">CBC</option>
              <option value="CFB">CFB</option>
              <option value="CTR">CTR</option>
              <option value="OFB">OFB</option>
              <option value="ECB">ECB</option>
            </StyledSelect>
          </div>
          <div className="flex items-center gap-3 sm:flex-col sm:items-stretch sm:gap-0">
            <label className="shrink-0 w-28 text-xs text-fg-muted font-mono uppercase tracking-wider sm:w-auto sm:mb-1.5">
              {t("paddingScheme")}
            </label>
            <StyledSelect
              aria-label="Padding Scheme"
              value={paddingScheme}
              onChange={(e) => {
                setPaddingScheme(e.target.value as PaddingScheme);
              }}
              className="appearance-none rounded-full font-bold text-center flex-1 sm:w-full"
            >
              <option value="Pkcs7">Pkcs7</option>
              <option value="Iso97971">Iso97971</option>
              <option value="AnsiX923">AnsiX923</option>
              <option value="Iso10126">Iso10126</option>
              <option value="ZeroPadding">ZeroPadding</option>
              <option value="NoPadding">NoPadding</option>
            </StyledSelect>
          </div>
          {algorithm == "RC4Drop" && (
            <div className="flex items-center gap-3 sm:flex-col sm:items-stretch sm:gap-0">
              <label
                htmlFor="droppedWords"
                className="shrink-0 w-28 text-xs text-fg-muted font-mono uppercase tracking-wider sm:w-auto sm:mb-1.5"
              >
                {t("droppedWords")}
              </label>
              <StyledInput
                type="number"
                id="droppedWords"
                min={1}
                value={droppedWords}
                onChange={(e) => {
                  setDroppedWords(parseInt(e.target.value));
                }}
                className="rounded-full font-bold text-center flex-1 sm:w-full"
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Button
          variant="primary"
          size="md"
          disabled={isDisabledEncrypt()}
          onClick={doEncrypt}
          className="rounded-full font-bold"
        >
          {tc("encrypted")}
          <ChevronsDown size={16} className="ms-1" />
        </Button>
        <Button
          variant="primary"
          size="md"
          disabled={isDisabledDecrypt()}
          onClick={doDecrypt}
          className="rounded-full font-bold"
        >
          {tc("decrypted")}
          <ChevronsUp size={16} className="ms-1" />
        </Button>
        <Button
          variant="danger"
          size="md"
          disabled={isDisabledClear()}
          onClick={() => {
            setRawContent("");
            setEncryptedContent("");
            setPassphrase("");
            showToast(tc("allCleared"), "danger", 2000);
          }}
          className="rounded-full font-bold col-span-2 md:col-span-1"
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
              {t("ciphertext")}
            </span>
          </div>
          <button
            type="button"
            className="text-danger text-xs hover:text-danger/80 transition-colors cursor-pointer"
            onClick={() => {
              setEncryptedContent("");
              showToast(tc("cleared"), "danger", 2000);
            }}
          >
            {tc("clear")}
          </button>
        </div>
        <div className="relative mt-1">
          <StyledTextarea
            id="encryptedContentTextarea"
            placeholder={t("ciphertextOutput")}
            rows={5}
            value={encryptedContent}
            onChange={(e) => {
              setEncryptedContent(e.target.value);
            }}
            className="font-mono text-sm"
          />
          <CopyButton getContent={() => encryptedContent.trim()} className="absolute end-2 top-2" />
        </div>
      </div>
    </section>
  );
}

function Description() {
  const t = useTranslations("cipher");
  return (
    <section id="description" className="mt-8">
      <div className="mb-4">
        <h5 className="font-semibold text-fg-primary text-base">{t("descriptions.aesTitle")}</h5>
        <p className="text-fg-secondary text-sm mt-1 leading-relaxed">{t("descriptions.aes")}</p>
      </div>
      <div className="mb-4">
        <h5 className="font-semibold text-fg-primary text-base">{t("descriptions.desTitle")}</h5>
        <p className="text-fg-secondary text-sm mt-1 leading-relaxed">{t("descriptions.des")}</p>
        <p className="text-fg-secondary text-sm mt-1 leading-relaxed">
          {t("descriptions.tripleDes")}
        </p>
      </div>
      <div className="mb-4">
        <h5 className="font-semibold text-fg-primary text-base">{t("descriptions.rabbitTitle")}</h5>
        <p className="text-fg-secondary text-sm mt-1 leading-relaxed">{t("descriptions.rabbit")}</p>
      </div>
      <div className="mb-4">
        <h5 className="font-semibold text-fg-primary text-base">{t("descriptions.rc4Title")}</h5>
        <p className="text-fg-secondary text-sm mt-1 leading-relaxed">{t("descriptions.rc4")}</p>
        <p className="text-fg-secondary text-sm mt-1 leading-relaxed">
          {t("descriptions.rc4drop")}
        </p>
        <p className="text-fg-secondary text-sm mt-1 leading-relaxed">
          {t("descriptions.rc4dropConfig")}
        </p>
      </div>
    </section>
  );
}

export default function CipherPage() {
  const tc = useTranslations("common");
  const t = useTranslations("tools");
  return (
    <Layout title={t("cipher.shortTitle")}>
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

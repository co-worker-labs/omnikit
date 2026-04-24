"use client";

import { ChangeEvent, useState } from "react";
import Layout from "../../../components/layout";
import { showToast } from "../../../libs/toast";
import { formatBytes } from "../../../utils/storage";
import { CopyButton } from "../../../components/ui/copy-btn";
import { useTranslations } from "next-intl";
import { NeonTabs } from "../../../components/ui/tabs";
import { StyledTextarea } from "../../../components/ui/input";
import { StyledSelect } from "../../../components/ui/input";
import { StyledCheckbox } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { X } from "lucide-react";
import CryptoJS from "crypto-js";

interface Result {
  title: string;
  size: string;

  md5: string;
  sha1: string;

  sha224: string;
  sha256: string;
  sha384: string;
  sha512: string;

  sha3_224: string;
  sha3_256: string;
  sha3_384: string;
  sha3_512: string;

  RIPEMD160: string;
}

const hashEntries: { key: keyof Omit<Result, "title" | "size">; label: string }[] = [
  { key: "md5", label: "MD5" },
  { key: "sha1", label: "SHA-1" },
  { key: "sha224", label: "SHA-224" },
  { key: "sha256", label: "SHA-256" },
  { key: "sha384", label: "SHA-384" },
  { key: "sha512", label: "SHA-512" },
  { key: "sha3_224", label: "SHA3-224" },
  { key: "sha3_256", label: "SHA3-256" },
  { key: "sha3_384", label: "SHA3-384" },
  { key: "sha3_512", label: "SHA3-512" },
  { key: "RIPEMD160", label: "RIPEMD-160" },
];

function HashResultRow({
  label,
  value,
  isMatch,
  delay,
}: {
  label: string;
  value: string;
  isMatch: boolean;
  delay: number;
}) {
  return (
    <tr
      className={`border-b border-border-default transition-all duration-200 ${
        isMatch ? "bg-accent-cyan-dim/60 text-accent-cyan" : "hover:bg-bg-elevated/60"
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <th className="py-2.5 px-4 text-fg-secondary text-xs font-mono font-medium text-left whitespace-nowrap uppercase tracking-wider">
        {label}
      </th>
      <td className={`py-2.5 font-mono text-sm break-all ${isMatch ? "font-semibold" : ""}`}>
        <span className="text-fg-muted mr-0 select-none">{isMatch ? "✓ " : "  "}</span>
        {value}
        <CopyButton
          getContent={() => value}
          className="ms-1.5 opacity-60 hover:opacity-100 transition-opacity"
        />
      </td>
    </tr>
  );
}

function Display({ data }: { data: Result }) {
  const t = useTranslations("hashing");
  const tc = useTranslations("common");
  const [testChecksum, setTestChecksum] = useState<string>("");

  return (
    <>
      <div className="relative mt-1">
        <StyledTextarea
          placeholder={t("pasteToCompare")}
          rows={2}
          value={testChecksum}
          onChange={(e) => {
            setTestChecksum(e.target.value);
          }}
          className="font-mono text-xs"
        />
        {testChecksum && (
          <button
            type="button"
            className="px-2.5 py-0.5 text-xs text-danger hover:text-danger/80 font-medium absolute end-2 top-2 transition-colors cursor-pointer"
            title={tc("clear")}
            onClick={() => {
              setTestChecksum("");
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>
      <div className="mt-3 rounded-lg border border-border-default overflow-hidden">
        <table className="w-full">
          <tbody>
            <tr className="border-b border-border-default bg-bg-elevated/40">
              <th className="py-2 px-4 text-fg-muted text-xs font-mono font-medium text-left whitespace-nowrap uppercase tracking-wider">
                {tc("size")}
              </th>
              <td className="py-2 text-sm text-fg-secondary font-mono">{data.size}</td>
            </tr>
            {hashEntries.map((entry, i) => {
              const value = data[entry.key];
              if (!value) return null;
              return (
                <HashResultRow
                  key={entry.key}
                  label={entry.label}
                  value={value}
                  isMatch={value === testChecksum}
                  delay={i * 30}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function TextHashing() {
  const t = useTranslations("hashing");
  const tc = useTranslations("common");
  const [types, setTypes] = useState<string[]>(["md5", "sha1", "sha256", "sha512"]);
  const [storageUnit, setStorageUnit] = useState<1000 | 1024>(1000);
  const [content, setContent] = useState<string>("");
  const [isTrim, setIsTrim] = useState<boolean>(true);

  const raw = isTrim ? content.trim() : content;
  const hashRes: Result | undefined = raw
    ? (() => {
        const length = Buffer.byteLength(raw, "utf-8");
        const size = formatBytes(length, storageUnit);
        return {
          title: "Hashing Result",
          size: size,
          md5: types.includes("md5") ? CryptoJS.MD5(raw).toString() : "",
          sha1: types.includes("sha1") ? CryptoJS.SHA1(raw).toString() : "",
          sha224: types.includes("sha224") ? CryptoJS.SHA224(raw).toString() : "",
          sha256: types.includes("sha256") ? CryptoJS.SHA256(raw).toString() : "",
          sha384: types.includes("sha384") ? CryptoJS.SHA384(raw).toString() : "",
          sha512: types.includes("sha512") ? CryptoJS.SHA512(raw).toString() : "",
          sha3_224: types.includes("sha3-224")
            ? CryptoJS.SHA3(raw, { outputLength: 224 }).toString()
            : "",
          sha3_256: types.includes("sha3-256")
            ? CryptoJS.SHA3(raw, { outputLength: 256 }).toString()
            : "",
          sha3_384: types.includes("sha3-384")
            ? CryptoJS.SHA3(raw, { outputLength: 384 }).toString()
            : "",
          sha3_512: types.includes("sha3-512")
            ? CryptoJS.SHA3(raw, { outputLength: 512 }).toString()
            : "",
          RIPEMD160: types.includes("RIPEMD160") ? CryptoJS.RIPEMD160(raw).toString() : "",
        };
      })()
    : undefined;

  const [passphrase, setPassphrase] = useState<string>("");
  const hmacRes: Result | undefined = (() => {
    if (!raw) return undefined;
    const phrase = passphrase.trim();
    if (!phrase) return undefined;
    const length = Buffer.byteLength(raw, "utf-8");
    const size = formatBytes(length, storageUnit);
    return {
      title: "HMAC Result",
      size: size,
      md5: types.includes("md5") ? CryptoJS.HmacMD5(raw, phrase).toString() : "",
      sha1: types.includes("sha1") ? CryptoJS.HmacSHA1(raw, phrase).toString() : "",
      sha224: types.includes("sha224") ? CryptoJS.HmacSHA224(raw, phrase).toString() : "",
      sha256: types.includes("sha256") ? CryptoJS.HmacSHA256(raw, phrase).toString() : "",
      sha384: types.includes("sha384") ? CryptoJS.HmacSHA384(raw, phrase).toString() : "",
      sha512: types.includes("sha512") ? CryptoJS.HmacSHA512(raw, phrase).toString() : "",
      sha3_224: "",
      sha3_256: "",
      sha3_384: "",
      sha3_512:
        types.includes("sha3-224") ||
        types.includes("sha3-256") ||
        types.includes("sha3-384") ||
        types.includes("sha3-512")
          ? CryptoJS.HmacSHA3(raw, phrase).toString()
          : "",
      RIPEMD160: types.includes("RIPEMD160") ? CryptoJS.HmacRIPEMD160(raw, phrase).toString() : "",
    };
  })();

  function onToggleCheck(event: ChangeEvent<HTMLInputElement>) {
    const checked = event.target.checked;
    const value = event.target.value;
    if (checked) {
      setTypes([...types, value]);
    } else {
      setTypes(types.filter((it) => it != value));
    }
  }

  const hashTypeOptions = [
    { value: "md5", label: "MD5", id: "md5Check" },
    { value: "sha1", label: "SHA-1", id: "sha1Check" },
    { value: "sha224", label: "SHA-224", id: "sha224Check" },
    { value: "sha256", label: "SHA-256", id: "sha256Check" },
    { value: "sha384", label: "SHA-384", id: "sha384Check" },
    { value: "sha512", label: "SHA-512", id: "sha512Check" },
    { value: "sha3-224", label: "SHA3-224", id: "sha3-224Check" },
    { value: "sha3-256", label: "SHA3-256", id: "sha3-256Check" },
    { value: "sha3-384", label: "SHA3-384", id: "sha3-384Check" },
    { value: "sha3-512", label: "SHA3-512", id: "sha3-512Check" },
    { value: "RIPEMD160", label: "RIPEMD-160", id: "RIPEMD160Check" },
  ];

  return (
    <section id="calculator">
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
              checked={isTrim}
              onChange={(e) => {
                setIsTrim(e.target.checked);
              }}
            />
            <button
              type="button"
              className="text-danger text-xs hover:text-danger/80 transition-colors cursor-pointer"
              onClick={() => {
                setContent("");
                showToast(tc("cleared"), "danger", 2000);
              }}
            >
              {tc("clear")}
            </button>
          </div>
        </div>
        <div className="relative mt-1">
          <StyledTextarea
            id="contentTextarea"
            placeholder="Paste or type the plain text here"
            rows={5}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
            }}
            className="font-mono text-sm"
          />
          <CopyButton
            getContent={() => (isTrim ? content.trim() : content)}
            className="absolute end-2 top-2"
          />
        </div>
      </div>

      <div className="mt-4">
        <div className="flex flex-wrap justify-between items-center">
          <span className="font-mono text-sm font-semibold text-accent-purple">
            {t("secretPassphrase")}
          </span>
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
            rows={2}
            value={passphrase}
            onChange={(e) => {
              setPassphrase(e.target.value);
            }}
            className="font-mono text-sm"
          />
          <CopyButton getContent={() => passphrase.trim()} className="absolute end-2 top-2" />
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3 mt-4">
        <div className="flex items-center gap-2 sm:w-1/2">
          <label className="font-mono text-xs font-medium text-fg-muted uppercase tracking-wider whitespace-nowrap">
            {tc("storageUnit")}
          </label>
          <div className="flex-1">
            <StyledSelect
              aria-label="Storage Unit"
              value={storageUnit}
              onChange={(e) => {
                setStorageUnit(parseInt(e.target.value) as 1000 | 1024);
              }}
              className="appearance-none rounded-full font-bold text-center w-full"
            >
              <option value="1000">{t("storageUnit1000")}</option>
              <option value="1024">{t("storageUnit1024")}</option>
            </StyledSelect>
          </div>
        </div>
        <div className="w-full sm:w-1/2 sm:flex sm:justify-end">
          <Button
            variant="danger"
            size="sm"
            disabled={!content && !passphrase}
            onClick={() => {
              setContent("");
              setPassphrase("");
              showToast(tc("allCleared"), "danger", 2000);
            }}
            className="rounded-full uppercase font-bold w-full sm:w-auto"
          >
            {tc("clearAll")}
            <X size={14} className="ms-1" />
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-4 rounded-full bg-accent-cyan" />
          <span className="font-mono text-xs font-semibold text-fg-muted uppercase tracking-wider">
            Algorithms
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2">
          {hashTypeOptions.map((opt) => (
            <StyledCheckbox
              key={opt.id}
              label={opt.label}
              value={opt.value}
              id={opt.id}
              checked={types.includes(opt.value)}
              onChange={onToggleCheck}
            />
          ))}
        </div>
      </div>

      {hashRes && (
        <div className="mt-4">
          <NeonTabs
            tabs={[
              {
                label: <span className="font-mono text-sm font-bold">{tc("hashing")}</span>,
                content: <Display data={hashRes} />,
              },
              ...(hmacRes
                ? [
                    {
                      label: <span className="font-mono text-sm font-bold">{tc("hmac")}</span>,
                      content: <Display data={hmacRes} />,
                    },
                  ]
                : []),
            ]}
          />
        </div>
      )}
    </section>
  );
}

function Description() {
  const t = useTranslations("hashing");
  return (
    <section id="description" className="mt-8">
      <div className="mb-4">
        <h5 className="font-semibold text-fg-primary text-base">{t("descriptions.md5Title")}</h5>
        <p className="text-fg-secondary text-sm mt-1">{t("descriptions.md5")}</p>
      </div>
      <div className="mb-4">
        <h5 className="font-semibold text-fg-primary text-base">{t("descriptions.sha1Title")}</h5>
        <p className="text-fg-secondary text-sm mt-1">{t("descriptions.sha1")}</p>
      </div>
      <div className="mb-4">
        <h5 className="font-semibold text-fg-primary text-base">{t("descriptions.sha2Title")}</h5>
        <p className="text-fg-secondary text-sm mt-1">{t("descriptions.sha2")}</p>
        <p className="text-fg-secondary text-sm mt-1">{t("descriptions.sha2extra")}</p>
      </div>
      <div className="mb-4">
        <h5 className="font-semibold text-fg-primary text-base">{t("descriptions.sha3Title")}</h5>
        <p className="text-fg-secondary text-sm mt-1">{t("descriptions.sha3")}</p>
      </div>
      <div className="mb-4">
        <h5 className="font-semibold text-fg-primary text-base">{t("descriptions.hmacTitle")}</h5>
        <p className="text-fg-secondary text-sm mt-1">{t("descriptions.hmac")}</p>
      </div>
    </section>
  );
}

export default function HashingPage() {
  const tc = useTranslations("common");
  const t = useTranslations("tools");
  const title = t("hashing.shortTitle");

  return (
    <Layout title={title}>
      <div className="container mx-auto px-4 pt-3 pb-6">
        <div className="flex items-start gap-2 border-l-2 border-accent-cyan bg-accent-cyan-dim/30 rounded-r-lg p-3 my-4">
          <span className="text-sm text-fg-secondary leading-relaxed">
            {tc("alert.notTransferred")}
          </span>
        </div>
        <TextHashing />
        <Description />
      </div>
    </Layout>
  );
}

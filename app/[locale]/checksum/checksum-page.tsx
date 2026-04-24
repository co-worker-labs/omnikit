"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Layout from "../../../components/layout";
import { showToast } from "../../../libs/toast";
import { fromEvent } from "file-selector";
import { formatBytes } from "../../../utils/storage";
import { CopyButton } from "../../../components/ui/copy-btn";
import { StyledTextarea } from "../../../components/ui/input";
import { StyledSelect } from "../../../components/ui/input";
import { StyledCheckbox } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { Accordion } from "../../../components/ui/accordion";
import { Plus, X, Play } from "lucide-react";
import CryptoJS from "crypto-js";

interface HashResult {
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

const hashEntries: { key: keyof Omit<HashResult, "title" | "size">; label: string }[] = [
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

function createHasher(type: string) {
  switch (type) {
    case "md5":
      return CryptoJS.algo.MD5.create();
    case "sha1":
      return CryptoJS.algo.SHA1.create();
    case "sha224":
      return CryptoJS.algo.SHA224.create();
    case "sha256":
      return CryptoJS.algo.SHA256.create();
    case "sha384":
      return CryptoJS.algo.SHA384.create();
    case "sha512":
      return CryptoJS.algo.SHA512.create();
    case "sha3-224":
      return CryptoJS.algo.SHA3.create({ outputLength: 224 });
    case "sha3-256":
      return CryptoJS.algo.SHA3.create({ outputLength: 256 });
    case "sha3-384":
      return CryptoJS.algo.SHA3.create({ outputLength: 384 });
    case "sha3-512":
      return CryptoJS.algo.SHA3.create({ outputLength: 512 });
    case "RIPEMD160":
      return CryptoJS.algo.RIPEMD160.create();
    default:
      return null;
  }
}

async function computeFileHashes(
  file: File,
  activeTypes: string[],
  storageUnit: 1000 | 1024,
  signal?: AbortSignal
): Promise<HashResult> {
  const hashers = new Map<string, ReturnType<typeof createHasher>>();
  for (const type of activeTypes) {
    const hasher = createHasher(type);
    if (hasher) hashers.set(type, hasher);
  }

  const reader = file.stream().getReader();
  let processedBytes = 0;
  const YIELD_INTERVAL = 1024 * 1024;
  let nextYieldAt = YIELD_INTERVAL;

  try {
    while (true) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      const { done, value } = await reader.read();
      if (done) break;
      const wordArray = CryptoJS.lib.WordArray.create(value);
      for (const h of hashers.values()) {
        h?.update(wordArray);
      }
      processedBytes += value.byteLength;
      if (processedBytes >= nextYieldAt) {
        nextYieldAt += YIELD_INTERVAL;
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  } finally {
    reader.releaseLock();
  }

  const result: HashResult = {
    title: file.name,
    size: `(${file.type}) - ${formatBytes(file.size, storageUnit)}`,
    md5: "",
    sha1: "",
    sha224: "",
    sha256: "",
    sha384: "",
    sha512: "",
    sha3_224: "",
    sha3_256: "",
    sha3_384: "",
    sha3_512: "",
    RIPEMD160: "",
  };

  for (const [type, hasher] of hashers) {
    if (!hasher) continue;
    const key = type.replace("-", "_") as keyof Omit<HashResult, "title" | "size">;
    (result as unknown as Record<string, string>)[key] = hasher.finalize().toString();
  }

  return result;
}

function HashResultRow({
  label,
  value,
  isMatch,
}: {
  label: string;
  value: string;
  isMatch: boolean;
}) {
  return (
    <tr
      className={`border-b border-border-default transition-all duration-200 ${
        isMatch ? "bg-accent-cyan-dim/60 text-accent-cyan" : "hover:bg-bg-elevated/60"
      }`}
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

function ChecksumDisplay({ data, types }: { data: HashResult; types: string[] }) {
  const t = useTranslations("checksum");
  const tc = useTranslations("common");
  const [testChecksum, setTestChecksum] = useState<string>("");

  return (
    <>
      <div className="relative mt-1">
        <StyledTextarea
          placeholder={t("compareToChecksum")}
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
            {hashEntries.map((entry) => {
              const value = data[entry.key];
              if (!value) return null;
              return (
                <HashResultRow
                  key={entry.key}
                  label={entry.label}
                  value={value}
                  isMatch={value === testChecksum}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function FileCalculator() {
  const t = useTranslations("checksum");
  const tc = useTranslations("common");
  const fileRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [hashResList, setHashResList] = useState<HashResult[]>([]);
  const [types, setTypes] = useState<string[]>(["md5"]);
  const [storageUnit, setStorageUnit] = useState<1000 | 1024>(1000);
  const [calculating, setCalculating] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!calculating) return;
    const start = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 200);
    return () => clearInterval(timer);
  }, [calculating]);

  function formatElapsed(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  }

  function onToggleCheck(event: ChangeEvent<HTMLInputElement>) {
    const checked = event.target.checked;
    const value = event.target.value;
    if (checked) {
      const newTypes = [...types];
      newTypes.push(value);
      setTypes(newTypes);
    } else {
      setTypes(types.filter((it) => it != value));
    }
  }

  function filenames(files: File[]): string {
    return files.map((f) => f.name).join(", ");
  }

  const cancelRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  function cancelCalculation() {
    cancelRef.current = true;
    abortRef.current?.abort();
    abortRef.current = null;
    setCalculating(false);
    setElapsed(0);
    setHashResList([]);
  }

  async function handleCalculate() {
    if (selectedFiles.length === 0 || calculating) return;
    setCalculating(true);
    setElapsed(0);
    setHashResList([]);
    cancelRef.current = false;
    const abortController = new AbortController();
    abortRef.current = abortController;

    const results: HashResult[] = [];
    for (const file of selectedFiles) {
      if (cancelRef.current) break;
      try {
        const result = await computeFileHashes(file, types, storageUnit, abortController.signal);
        if (cancelRef.current) break;
        results.push(result);
      } catch (e) {
        if ((e as DOMException).name !== "AbortError") {
          // unexpected error, stop silently
        }
        break;
      }
    }
    abortRef.current = null;
    setCalculating(false);
    if (!cancelRef.current) setHashResList(results);
  }

  useEffect(() => {
    const dropZone = dropZoneRef.current;
    if (!dropZone) return;

    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const onDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const files = await fromEvent(e);
      if (files && files.length > 0) {
        setSelectedFiles(files as File[]);
      }
    };

    dropZone.addEventListener("dragover", onDragOver);
    dropZone.addEventListener("drop", onDrop);
    return () => {
      dropZone.removeEventListener("dragover", onDragOver);
      dropZone.removeEventListener("drop", onDrop);
    };
  }, []);

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
    <section id="calculator" className="mt-4 relative">
      {calculating && (
        <div className="absolute inset-0 z-10 bg-bg-base/75 rounded-xl flex flex-col items-center justify-center gap-4">
          <div className="w-8 h-8 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" />
          <span className="text-fg-secondary text-sm">
            {tc("calculating")} · {formatElapsed(elapsed)}
          </span>
          <Button
            variant="danger"
            size="md"
            onClick={cancelCalculation}
            className="rounded-full uppercase font-bold px-10"
          >
            <X size={14} className="me-1" />
            {tc("cancel")}
          </Button>
        </div>
      )}
      <div
        ref={dropZoneRef}
        className="relative text-xl rounded-lg border-2 border-dashed border-accent-cyan/30 bg-accent-cyan-dim/10 text-accent-cyan"
        style={{ width: "100%", height: "10rem" }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center w-full w-lg-3/4 justify-center px-4 pointer-events-none">
          {selectedFiles && selectedFiles.length > 0 ? (
            <span className="truncate">{filenames(selectedFiles)}</span>
          ) : (
            <>
              <Plus size={20} className="me-1" />
              <span className="font-bold">{t("dropFilesHere")}</span>
            </>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          id="fileSelector"
          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
          onClick={() => {
            if (fileRef.current) {
              fileRef.current.value = "";
            }
          }}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              const files: File[] = [];
              for (var i = 0; i < e.target.files?.length; i++) {
                files.push(e.target.files.item(i)!);
              }
              setSelectedFiles(files);
              showToast(
                t("selectedFiles", {
                  count: files.length,
                  files: files.length > 1 ? " files" : " file",
                }),
                "info",
                3000
              );
            } else {
              setSelectedFiles([]);
            }
          }}
          multiple={true}
        />
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
        <p className="text-xs text-fg-muted/70 mt-2.5 flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full border border-current" />
          {t("algoTip")}
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:w-1/2">
        <Button
          variant="primary"
          size="lg"
          disabled={selectedFiles.length == 0 || calculating || types.length === 0}
          onClick={handleCalculate}
          className="rounded-full uppercase font-bold flex-1"
        >
          <Play size={16} className="me-1" />
          {t("calculate")}
        </Button>
        <Button
          variant="danger"
          size="lg"
          disabled={selectedFiles.length == 0 || calculating}
          onClick={() => {
            cancelRef.current = true;
            setSelectedFiles([]);
            setHashResList([]);
            setCalculating(false);
            if (fileRef.current) {
              fileRef.current.value = "";
            }
            showToast(tc("deselected"), "danger", 2000);
          }}
          className="rounded-full uppercase font-bold flex-1"
        >
          <X size={14} className="me-1" />
          {selectedFiles.length > 0
            ? t("deselect", { count: selectedFiles.length })
            : t("noFileChosen")}
        </Button>
      </div>
      {hashResList.length == 0 ? (
        <div
          className="border border-border-default rounded-xl w-full flex justify-center items-center mt-4 text-lg text-fg-muted font-bold bg-bg-surface"
          style={{ height: "8rem" }}
        >
          {t("checksumOutput")}
        </div>
      ) : (
        <div className="mt-4">
          <Accordion
            items={hashResList.map((data, index) => ({
              title: <span className="text-sm font-mono">{data.title}</span>,
              content: <ChecksumDisplay data={data} types={types} />,
              defaultOpen: index === 0,
            }))}
          />
        </div>
      )}
    </section>
  );
}

function Description() {
  const t = useTranslations("checksum");
  return (
    <section id="description" className="mt-8">
      <div className="mb-4">
        <h5 className="font-semibold text-fg-primary text-base">{t("descriptions.md5Title")}</h5>
        <p className="text-fg-secondary text-sm mt-1 leading-relaxed">{t("descriptions.md5")}</p>
      </div>
      <div className="mb-4">
        <h5 className="font-semibold text-fg-primary text-base">{t("descriptions.sha1Title")}</h5>
        <p className="text-fg-secondary text-sm mt-1 leading-relaxed">{t("descriptions.sha1")}</p>
      </div>
      <div className="mb-4">
        <h5 className="font-semibold text-fg-primary text-base">{t("descriptions.sha2Title")}</h5>
        <p className="text-fg-secondary text-sm mt-1 leading-relaxed">{t("descriptions.sha2")}</p>
        <p className="text-fg-secondary text-sm mt-1 leading-relaxed">
          {t("descriptions.sha2extra")}
        </p>
      </div>
      <div className="mb-4">
        <h5 className="font-semibold text-fg-primary text-base">{t("descriptions.sha3Title")}</h5>
        <p className="text-fg-secondary text-sm mt-1 leading-relaxed">{t("descriptions.sha3")}</p>
      </div>
    </section>
  );
}

export default function ChecksumPage() {
  const tc = useTranslations("common");
  const t = useTranslations("tools");
  return (
    <Layout title={t("checksum.shortTitle")}>
      <div className="container mx-auto px-4 pt-3 pb-6">
        <div className="flex items-start gap-2 border-l-2 border-accent-cyan bg-accent-cyan-dim/30 rounded-r-lg p-3 my-4">
          <span className="text-sm text-fg-secondary leading-relaxed">
            {tc("alert.filesNotTransferred")}
          </span>
        </div>
        <div className="flex items-start gap-2 border-l-2 border-accent-purple bg-accent-purple-dim/30 rounded-r-lg p-3 my-4">
          <span className="text-sm text-fg-secondary leading-relaxed">
            {tc("alert.checksumInfo")}
          </span>
        </div>
        <FileCalculator />
        <Description />
      </div>
    </Layout>
  );
}

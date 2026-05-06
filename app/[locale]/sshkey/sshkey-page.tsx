"use client";

import { useState, useRef } from "react";
import { CircleHelp, Download, Eye, EyeOff, FolderOpen, RefreshCw, Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Layout from "../../../components/layout";
import { Button } from "../../../components/ui/button";
import { CopyButton } from "../../../components/ui/copy-btn";
import { NeonTabs } from "../../../components/ui/tabs";
import { StyledTextarea } from "../../../components/ui/input";
import { Accordion } from "../../../components/ui/accordion";
import { showToast } from "../../../libs/toast";
import { STORAGE_KEYS } from "../../../libs/storage-keys";
import { generateKeyPair, parsePublicKey } from "../../../libs/sshkey/main";
import type { SshKeyResult, PublicKeyInfo } from "../../../libs/sshkey/main";
import { useDropZone } from "../../../hooks/useDropZone";

type KeyType = "rsa" | "ed25519";

const INPUT_CLASS =
  "bg-bg-input border border-border-default rounded-lg px-3 py-2 text-fg-primary placeholder:text-fg-muted focus:outline-none focus:border-accent-cyan focus:shadow-input-focus transition-colors transition-shadow duration-200";

function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function GeneratePanel() {
  const t = useTranslations("sshkey");
  const tc = useTranslations("common");

  const [keyType, setKeyType] = useState<KeyType>("ed25519");
  const [rsaBits, setRsaBits] = useState(4096);
  const [comment, setComment] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<SshKeyResult | null>(null);
  const [deployTarget, setDeployTarget] = useState(() => {
    if (typeof window === "undefined") return "user@host";
    return localStorage.getItem(STORAGE_KEYS.sshkeyDeployTarget) || "user@host";
  });

  const privFilename = keyType === "rsa" ? "id_rsa" : "id_ed25519";
  const pubFilename = keyType === "rsa" ? "id_rsa.pub" : "id_ed25519.pub";

  function handleClear() {
    setResult(null);
    setComment("");
    setPassphrase("");
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const r = await generateKeyPair({
        type: keyType,
        rsaBits: rsaBits as 2048 | 3072 | 4096,
        comment: comment || undefined,
        passphrase: passphrase || undefined,
      });
      setResult(r);
    } catch (e: any) {
      showToast(e.message || "Generation failed", "danger");
    } finally {
      setGenerating(false);
    }
  }

  function handleDeployTargetChange(val: string) {
    setDeployTarget(val);
    localStorage.setItem(STORAGE_KEYS.sshkeyDeployTarget, val);
  }

  const deployCmd = result ? `ssh-copy-id -i ${pubFilename} ${deployTarget}` : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg overflow-hidden border border-border-default">
          <button
            onClick={() => setKeyType("rsa")}
            className={`px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50 ${keyType === "rsa" ? "bg-accent-cyan text-bg-base" : "bg-bg-surface text-fg-primary hover:bg-bg-elevated"}`}
          >
            RSA
          </button>
          <button
            onClick={() => setKeyType("ed25519")}
            className={`px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50 ${keyType === "ed25519" ? "bg-accent-cyan text-bg-base" : "bg-bg-surface text-fg-primary hover:bg-bg-elevated"}`}
          >
            Ed25519
          </button>
        </div>

        {keyType === "rsa" && (
          <select
            aria-label={t("rsaBits")}
            value={rsaBits}
            onChange={(e) => setRsaBits(Number(e.target.value))}
            className={INPUT_CLASS}
          >
            <option value={2048}>2048</option>
            <option value={3072}>3072</option>
            <option value={4096}>4096</option>
          </select>
        )}

        <input
          aria-label={t("comment")}
          placeholder={t("commentPlaceholder")}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className={`${INPUT_CLASS} flex-1 min-w-[150px]`}
          spellCheck={false}
          autoComplete="off"
        />

        <div className="relative flex-1 min-w-[150px]">
          <input
            aria-label={t("passphrase")}
            type={showPass ? "text" : "password"}
            placeholder={t("passphrasePlaceholder")}
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            className={`${INPUT_CLASS} w-full pr-8`}
            spellCheck={false}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            aria-label={showPass ? t("hidePassphrase") : t("showPassphrase")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50 rounded"
          >
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <Button variant="primary" onClick={handleGenerate} disabled={generating}>
          <RefreshCw size={14} className={generating ? "motion-safe:animate-spin" : ""} />
          {generating ? t("generating") : t("generate")}
        </Button>

        <Button
          variant="danger"
          onClick={handleClear}
          disabled={!result && !comment && !passphrase}
        >
          <X size={14} />
          {tc("clear")}
        </Button>
      </div>

      {result && (
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-fg-primary">{t("privateKey")}</span>
              <button
                onClick={() => downloadFile(result.privateKey + "\n", privFilename)}
                className="text-fg-muted hover:text-accent-cyan transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50 rounded"
                aria-label={t("downloadPrivate")}
              >
                <Download size={14} aria-hidden="true" />
              </button>
            </div>
            <div className="relative">
              <StyledTextarea
                value={result.privateKey}
                readOnly
                className="font-mono text-xs h-[30vh] resize-none"
              />
              <CopyButton getContent={() => result.privateKey} className="absolute end-2 top-2" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-fg-primary">{t("publicKey")}</span>
              <button
                onClick={() => downloadFile(result.publicKey + "\n", pubFilename)}
                className="text-fg-muted hover:text-accent-cyan transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50 rounded"
                aria-label={t("downloadPublic")}
              >
                <Download size={14} aria-hidden="true" />
              </button>
            </div>
            <div className="relative">
              <StyledTextarea
                value={result.publicKey}
                readOnly
                className="font-mono text-xs h-[15vh] resize-none"
              />
              <CopyButton getContent={() => result.publicKey} className="absolute end-2 top-2" />
            </div>
          </div>

          <div>
            <span className="text-sm font-medium text-fg-primary">{t("fingerprint")}</span>
            <div className="mt-1 space-y-1">
              <div className="flex items-center gap-2">
                <code className="text-xs text-fg-secondary">{result.fingerprintSha256}</code>
                <CopyButton getContent={() => result.fingerprintSha256} />
              </div>
              <div className="flex items-center gap-2">
                <code className="text-xs text-fg-secondary">{result.fingerprintMd5}</code>
                <CopyButton getContent={() => result.fingerprintMd5} />
              </div>
            </div>
          </div>

          <div>
            <span className="text-sm font-medium text-fg-primary">{t("randomart")}</span>
            <pre className="mt-1 text-xs text-fg-muted leading-tight font-mono">
              {result.randomart}
            </pre>
          </div>

          <div>
            <span className="text-sm font-medium text-fg-primary">{t("quickDeploy")}</span>
            <div className="relative mt-3 bg-bg-input border border-border-default rounded-lg px-3 py-2.5 font-mono text-sm leading-relaxed">
              <span className="text-accent-cyan select-none">$</span>{" "}
              <span className="text-fg-secondary">ssh-copy-id</span>{" "}
              <span className="text-accent-purple">-i</span>{" "}
              <span className="text-accent-cyan">{pubFilename}</span>{" "}
              <span className="text-fg-primary">{deployTarget}</span>
              <CopyButton getContent={() => deployCmd} className="absolute end-2 top-2" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InspectPanel() {
  const t = useTranslations("sshkey");
  const tc = useTranslations("common");
  const [input, setInput] = useState("");
  const [info, setInfo] = useState<PublicKeyInfo | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dropZone = useDropZone(async (file) => {
    const content = await file.text();
    handleInput(content);
    showToast(tc("fileLoaded"), "success", 2000);
  });

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((content) => {
      handleInput(content);
      showToast(tc("fileLoaded"), "success", 2000);
    });
    e.target.value = "";
  }

  function handleClear() {
    setInput("");
    setInfo(null);
    setError("");
  }

  async function handleInput(val: string) {
    setInput(val);
    if (!val.trim()) {
      setInfo(null);
      setError("");
      return;
    }
    const result = await parsePublicKey(val);
    if ("error" in result) {
      setError(result.error);
      setInfo(null);
    } else {
      setError("");
      setInfo(result);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <button
          type="button"
          className="text-fg-secondary text-xs hover:text-fg-primary transition-colors cursor-pointer inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50 rounded"
          onClick={() => fileInputRef.current?.click()}
        >
          <FolderOpen size={12} />
          {tc("loadFile")}
        </button>
        <button
          type="button"
          className="text-danger text-xs hover:text-danger/80 transition-colors cursor-pointer inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50 rounded"
          onClick={handleClear}
          disabled={!input}
        >
          <X size={12} />
          {tc("clear")}
        </button>
      </div>
      <div
        className="relative"
        onDragOver={dropZone.onDragOver}
        onDragEnter={dropZone.onDragEnter}
        onDragLeave={dropZone.onDragLeave}
        onDrop={dropZone.onDrop}
      >
        {dropZone.isDragging && (
          <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl border-2 border-dashed border-accent-cyan bg-accent-cyan/5 backdrop-blur-sm pointer-events-none">
            <div className="text-center">
              <Upload size={40} className="mx-auto mb-3 text-accent-cyan" />
              <p className="text-lg font-semibold text-accent-cyan">{tc("dropActive")}</p>
            </div>
          </div>
        )}
        <StyledTextarea
          value={input}
          onChange={(e) => handleInput(e.target.value)}
          aria-label={t("tabInspect")}
          placeholder={t("inspectPlaceholder")}
          className="font-mono text-sm h-[15vh] resize-none"
          spellCheck={false}
        />
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pub,.txt,.pem,.ssh"
        className="hidden"
        onChange={handleFileUpload}
      />

      {error && <p className="text-sm text-danger">{error}</p>}

      {info && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <span className="text-xs text-fg-muted">{t("inspectKeyType")}</span>
              <p className="text-sm font-medium text-fg-primary">{info.type}</p>
            </div>
            <div>
              <span className="text-xs text-fg-muted">{t("inspectBits")}</span>
              <p className="text-sm font-medium text-fg-primary">{info.bits} bits</p>
            </div>
            <div>
              <span className="text-xs text-fg-muted">{t("inspectComment")}</span>
              <p className="text-sm font-medium text-fg-primary">{info.comment || "—"}</p>
            </div>
          </div>

          <div>
            <span className="text-sm font-medium text-fg-primary">{t("fingerprint")}</span>
            <div className="mt-1 space-y-1">
              <div className="flex items-center gap-2">
                <code className="text-xs text-fg-secondary">{info.fingerprintSha256}</code>
                <CopyButton getContent={() => info.fingerprintSha256} />
              </div>
              <div className="flex items-center gap-2">
                <code className="text-xs text-fg-secondary">{info.fingerprintMd5}</code>
                <CopyButton getContent={() => info.fingerprintMd5} />
              </div>
            </div>
          </div>

          <div>
            <span className="text-sm font-medium text-fg-primary">{t("randomart")}</span>
            <pre className="mt-1 text-xs text-fg-muted leading-tight font-mono">
              {info.randomart}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function Description() {
  const t = useTranslations("sshkey");
  const steps = [1, 2, 3, 4].map((i) => ({
    title: t(`descriptions.step${i}Title`),
    desc: t(`descriptions.step${i}Desc`),
  }));
  const faqItems = [1, 2, 3, 4].map((i) => ({
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

export default function SshKeyPage() {
  const t = useTranslations("sshkey");
  const ts = useTranslations("tools");

  return (
    <Layout title={ts("sshkey.shortTitle")}>
      <div className="container mx-auto px-4 pt-3 pb-6">
        <div className="space-y-4">
          <span className="text-sm text-fg-secondary leading-relaxed">{t("localGenerated")}</span>

          <NeonTabs
            tabs={[
              { label: t("tabGenerate"), content: <GeneratePanel /> },
              { label: t("tabInspect"), content: <InspectPanel /> },
            ]}
          />
          <div className="w-full h-px bg-border-default mt-8" />
          <Description />
        </div>
      </div>
    </Layout>
  );
}

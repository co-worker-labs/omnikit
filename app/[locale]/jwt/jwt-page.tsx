"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Eraser } from "lucide-react";
import JsonView from "@uiw/react-json-view";
import Layout from "../../../components/layout";
import { NeonTabs } from "../../../components/ui/tabs";
import { StyledTextarea, StyledSelect } from "../../../components/ui/input";
import { CopyButton } from "../../../components/ui/copy-btn";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { showToast } from "../../../libs/toast";
import { byteCraftJsonTheme } from "../../../libs/json-view-theme";
import {
  decode as decodeToken,
  verify as verifyToken,
  encode as encodeToken,
  JWT_ALGORITHMS,
  ALL_ALGORITHMS,
  type JwtAlgorithm,
  type VerifyResult,
} from "../../../libs/jwt/main";

const DEFAULT_ALGORITHM: JwtAlgorithm = "HS256";
const DEFAULT_HEADER = '{"alg": "HS256", "typ": "JWT"}';
const DEFAULT_PAYLOAD = '{"sub": "1234567890", "name": "John Doe", "iat": 1516239022}';

function isAsymmetric(alg: JwtAlgorithm): boolean {
  return !alg.startsWith("H");
}

function getKeyPlaceholder(
  alg: JwtAlgorithm,
  tab: "decode" | "encode",
  t: (key: string) => string
): string {
  if (alg.startsWith("H")) return t("secretPlaceholder");
  return tab === "decode" ? t("pemPublicPlaceholder") : t("pemPrivatePlaceholder");
}

function SectionLabel({
  color,
  children,
}: {
  color: "cyan" | "purple";
  children: React.ReactNode;
}) {
  const dotColor = color === "cyan" ? "bg-accent-cyan" : "bg-accent-purple";
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
      <span className="text-sm font-medium text-fg-secondary">{children}</span>
    </div>
  );
}

// --- Decode Tab ---

function DecodeTab({
  token,
  setToken,
  decodedHeader,
  decodedPayload,
  signatureBase64Url,
  decodeError,
}: {
  token: string;
  setToken: (v: string) => void;
  decodedHeader: Record<string, unknown> | null;
  decodedPayload: Record<string, unknown> | null;
  signatureBase64Url: string;
  decodeError: string;
}) {
  const t = useTranslations("jwt");
  const tc = useTranslations("common");
  const [algorithm, setAlgorithm] = useState<JwtAlgorithm>(DEFAULT_ALGORITHM);
  const [signingKey, setSigningKey] = useState("");
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- derived state resets from prop changes */
  useEffect(() => {
    setVerifyResult(null);
  }, [token]);
  useEffect(() => {
    setVerifyResult(null);
  }, [signingKey]);

  useEffect(() => {
    if (decodedHeader) {
      const headerAlg = decodedHeader.alg as string;
      if (ALL_ALGORITHMS.includes(headerAlg as JwtAlgorithm)) {
        setAlgorithm(headerAlg as JwtAlgorithm);
      }
    }
  }, [decodedHeader]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleVerify() {
    const result = await verifyToken(token.trim(), signingKey, algorithm);
    setVerifyResult(result);
  }

  const hasDecoded = decodedHeader !== null;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <SectionLabel color="cyan">{t("encodedPlaceholder").split(" ")[0]}</SectionLabel>
          {token && (
            <button
              type="button"
              onClick={() => {
                setToken("");
                showToast(tc("cleared"), "success", 2000);
              }}
              className="text-fg-muted hover:text-accent-cyan transition-colors duration-200"
              title={tc("clear")}
            >
              <Eraser size={16} />
            </button>
          )}
        </div>
        <StyledTextarea
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder={t("encodedPlaceholder")}
          rows={4}
          className="font-mono text-sm"
        />
        {decodeError && <p className="mt-1 text-sm text-danger">{t(decodeError)}</p>}
      </div>

      {hasDecoded && (
        <>
          <h4 className="text-sm font-semibold text-fg-primary">{t("decodedResult")}</h4>

          <div>
            <div className="flex items-center justify-between mb-2">
              <SectionLabel color="cyan">{t("header")}</SectionLabel>
              <CopyButton
                getContent={() => (decodedHeader ? JSON.stringify(decodedHeader, null, 2) : "")}
              />
            </div>
            <div className="bg-bg-input border border-border-default rounded-lg p-3 overflow-x-auto">
              <JsonView value={decodedHeader!} style={byteCraftJsonTheme} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <SectionLabel color="cyan">{t("payload")}</SectionLabel>
              <CopyButton
                getContent={() => (decodedPayload ? JSON.stringify(decodedPayload, null, 2) : "")}
              />
            </div>
            <div className="bg-bg-input border border-border-default rounded-lg p-3 overflow-x-auto">
              <JsonView value={decodedPayload!} style={byteCraftJsonTheme} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <SectionLabel color="purple">{t("signature")}</SectionLabel>
              <CopyButton getContent={() => signatureBase64Url} />
            </div>
            <StyledTextarea
              value={signatureBase64Url}
              readOnly
              rows={2}
              className="font-mono text-sm"
            />
          </div>
        </>
      )}

      <div className="border-t border-border-default pt-4">
        <h4 className="text-sm font-semibold text-fg-primary mb-3">{t("verifySection")}</h4>

        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <SectionLabel color={isAsymmetric(algorithm) ? "purple" : "cyan"}>
              {t("secretOrPublicKey")}
            </SectionLabel>
            {signingKey && (
              <button
                type="button"
                onClick={() => {
                  setSigningKey("");
                  showToast(tc("cleared"), "success", 2000);
                }}
                className="text-fg-muted hover:text-accent-cyan transition-colors duration-200"
                title={tc("clear")}
              >
                <Eraser size={16} />
              </button>
            )}
          </div>
          <StyledTextarea
            value={signingKey}
            onChange={(e) => setSigningKey(e.target.value)}
            placeholder={getKeyPlaceholder(algorithm, "decode", t)}
            rows={3}
            className="font-mono text-sm"
          />
          {isAsymmetric(algorithm) && <p className="mt-1 text-xs text-fg-muted">{t("pemHint")}</p>}
        </div>

        <Button
          variant="primary"
          onClick={handleVerify}
          disabled={!token.trim() || !signingKey.trim()}
        >
          {t("verify")}
        </Button>

        {verifyResult && (
          <div className="mt-2">
            {verifyResult.valid ? (
              <Badge variant="cyan">{t("verifySuccess")}</Badge>
            ) : (
              <Badge variant="danger">
                {verifyResult.error ? t(verifyResult.error) : t("verifyFailed")}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Encode Tab ---

function EncodeTab() {
  const t = useTranslations("jwt");
  const tc = useTranslations("common");
  const [algorithm, setAlgorithm] = useState<JwtAlgorithm>(DEFAULT_ALGORITHM);
  const [headerText, setHeaderText] = useState(DEFAULT_HEADER);
  const [payloadText, setPayloadText] = useState(DEFAULT_PAYLOAD);
  const [signingKey, setSigningKey] = useState("");
  const [generatedToken, setGeneratedToken] = useState("");
  const [encodeError, setEncodeError] = useState("");

  /* eslint-disable react-hooks/set-state-in-effect -- clear stale result when inputs change */
  useEffect(() => {
    setGeneratedToken("");
    setEncodeError("");
  }, [algorithm, headerText, payloadText, signingKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleGenerate() {
    setEncodeError("");

    let header: Record<string, unknown>;
    try {
      header = JSON.parse(headerText);
    } catch {
      showToast(t("errors.invalidJson", { field: t("headerLabel") }), "danger", 3000);
      return;
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(payloadText);
    } catch {
      showToast(t("errors.invalidJson", { field: t("payloadLabel") }), "danger", 3000);
      return;
    }

    const result = await encodeToken(header, payload, signingKey, algorithm);
    if (result.error) {
      setEncodeError(t(result.error));
      setGeneratedToken("");
    } else {
      setGeneratedToken(result.token);
      setEncodeError("");
      showToast(tc("generated"), "success", 2000);
    }
  }

  function handleAlgorithmChange(newAlg: JwtAlgorithm) {
    setAlgorithm(newAlg);
    try {
      const header = JSON.parse(headerText);
      header.alg = newAlg;
      setHeaderText(JSON.stringify(header));
    } catch {
      // Header is invalid JSON — just update the algorithm dropdown
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-fg-secondary mb-1">{t("algorithm")}</label>
        <StyledSelect
          value={algorithm}
          onChange={(e) => handleAlgorithmChange(e.target.value as JwtAlgorithm)}
        >
          {JWT_ALGORITHMS.map((group) => (
            <optgroup key={group.group} label={group.group}>
              {group.algos.map((alg) => (
                <option key={alg} value={alg}>
                  {alg}
                </option>
              ))}
            </optgroup>
          ))}
        </StyledSelect>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <SectionLabel color="cyan">{t("headerLabel")}</SectionLabel>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setHeaderText(JSON.stringify({ alg: algorithm, typ: "JWT" }));
                showToast(tc("cleared"), "success", 2000);
              }}
              className="text-fg-muted hover:text-accent-cyan transition-colors duration-200"
              title={tc("clear")}
            >
              <Eraser size={16} />
            </button>
            <CopyButton getContent={() => headerText} />
          </div>
        </div>
        <StyledTextarea
          value={headerText}
          onChange={(e) => setHeaderText(e.target.value)}
          rows={3}
          className="font-mono text-sm"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <SectionLabel color="cyan">{t("payloadLabel")}</SectionLabel>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setPayloadText("{}");
                showToast(tc("cleared"), "success", 2000);
              }}
              className="text-fg-muted hover:text-accent-cyan transition-colors duration-200"
              title={tc("clear")}
            >
              <Eraser size={16} />
            </button>
            <CopyButton getContent={() => payloadText} />
          </div>
        </div>
        <StyledTextarea
          value={payloadText}
          onChange={(e) => setPayloadText(e.target.value)}
          rows={4}
          className="font-mono text-sm"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <SectionLabel color="purple">{t("secretOrPrivateKey")}</SectionLabel>
          <div className="flex items-center gap-2">
            {signingKey && (
              <button
                type="button"
                onClick={() => {
                  setSigningKey("");
                  showToast(tc("cleared"), "success", 2000);
                }}
                className="text-fg-muted hover:text-accent-cyan transition-colors duration-200"
                title={tc("clear")}
              >
                <Eraser size={16} />
              </button>
            )}
            <CopyButton getContent={() => signingKey} />
          </div>
        </div>
        <StyledTextarea
          value={signingKey}
          onChange={(e) => setSigningKey(e.target.value)}
          placeholder={getKeyPlaceholder(algorithm, "encode", t)}
          rows={3}
          className="font-mono text-sm"
        />
        {isAsymmetric(algorithm) && <p className="mt-1 text-xs text-fg-muted">{t("pemHint")}</p>}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Button
          variant="primary"
          className="w-full sm:flex-1"
          onClick={handleGenerate}
          disabled={!headerText.trim() || !payloadText.trim() || !signingKey.trim()}
        >
          {t("generate")}
        </Button>
        <Button
          variant="secondary"
          className="w-full sm:flex-1"
          onClick={() => {
            navigator.clipboard.writeText(generatedToken);
            showToast(tc("copied"), "success", 2000);
          }}
          disabled={!generatedToken}
        >
          {tc("copy")}
        </Button>
        <Button
          variant="danger"
          className="w-full sm:flex-1"
          onClick={() => {
            setHeaderText(JSON.stringify({ alg: algorithm, typ: "JWT" }));
            setPayloadText("{}");
            setSigningKey("");
            setGeneratedToken("");
            setEncodeError("");
            showToast(tc("cleared"), "success", 2000);
          }}
        >
          {tc("clear")}
        </Button>
      </div>

      {encodeError && <p className="text-sm text-danger">{encodeError}</p>}

      {generatedToken && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <SectionLabel color="cyan">{t("generatedToken")}</SectionLabel>
          </div>
          <StyledTextarea value={generatedToken} readOnly rows={4} className="font-mono text-sm" />
        </div>
      )}
    </div>
  );
}

// --- Description ---

function Description() {
  const t = useTranslations("jwt");
  return (
    <section className="mt-8 space-y-4">
      <div>
        <h4 className="font-semibold text-fg-primary text-base">{t("descriptions.whatIsTitle")}</h4>
        <p className="mt-1 text-fg-secondary text-sm leading-relaxed">{t("descriptions.whatIs")}</p>
      </div>
      <div>
        <h4 className="font-semibold text-fg-primary text-base">
          {t("descriptions.structureTitle")}
        </h4>
        <p className="mt-1 text-fg-secondary text-sm leading-relaxed">
          {t("descriptions.structure")}
        </p>
      </div>
      <div>
        <h4 className="font-semibold text-fg-primary text-base">
          {t("descriptions.algorithmsTitle")}
        </h4>
        <p className="mt-1 text-fg-secondary text-sm leading-relaxed">
          {t("descriptions.algorithms")}
        </p>
      </div>
      <div>
        <h4 className="font-semibold text-fg-primary text-base">
          {t("descriptions.keyFormatsTitle")}
        </h4>
        <p className="mt-1 text-fg-secondary text-sm leading-relaxed">
          {t("descriptions.keyFormats")}
        </p>
      </div>
    </section>
  );
}

// --- Page ---

export default function JwtPage() {
  const t = useTranslations("jwt");
  const ts = useTranslations("tools");
  const tc = useTranslations("common");

  // Decode state
  const [token, setToken] = useState("");
  const [decodedHeader, setDecodedHeader] = useState<Record<string, unknown> | null>(null);
  const [decodedPayload, setDecodedPayload] = useState<Record<string, unknown> | null>(null);
  const [signatureBase64Url, setSignatureBase64Url] = useState("");
  const [decodeError, setDecodeError] = useState("");

  /* eslint-disable react-hooks/set-state-in-effect -- debounced async decode is a legitimate external sync */
  useEffect(() => {
    const trimmed = token.trim();
    if (!trimmed) {
      setDecodedHeader(null);
      setDecodedPayload(null);
      setSignatureBase64Url("");
      setDecodeError("");
      return;
    }

    const timer = setTimeout(() => {
      const result = decodeToken(trimmed);
      if (!result) {
        setDecodeError("errors.invalidJwt");
        setDecodedHeader(null);
        setDecodedPayload(null);
        setSignatureBase64Url("");
      } else {
        setDecodeError("");
        setDecodedHeader(result.header);
        setDecodedPayload(result.payload);
        setSignatureBase64Url(result.signatureBase64Url);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [token]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <Layout title={ts("jwt.shortTitle")}>
      <div className="container mx-auto px-4 pt-3 pb-6">
        <div className="flex items-start gap-2 border-l-2 border-accent-cyan bg-accent-cyan-dim/30 rounded-r-lg p-3 my-4">
          <span className="text-sm text-fg-secondary leading-relaxed">
            {tc("alert.notTransferred")}
          </span>
        </div>

        <NeonTabs
          tabs={[
            {
              label: t("tabDecode"),
              content: (
                <DecodeTab
                  token={token}
                  setToken={setToken}
                  decodedHeader={decodedHeader}
                  decodedPayload={decodedPayload}
                  signatureBase64Url={signatureBase64Url}
                  decodeError={decodeError}
                />
              ),
            },
            {
              label: t("tabEncode"),
              content: <EncodeTab />,
            },
          ]}
        />

        <Description />
      </div>
    </Layout>
  );
}

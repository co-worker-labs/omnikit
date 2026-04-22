import { GetStaticProps, InferGetStaticPropsType } from "next";
import { ChangeEvent, useMemo, useState } from "react";
import { ToolPageHeadBuilder } from "../components/head_builder";
import Layout from "../components/layout";
import { showToast } from "../libs/toast";
import { formatBytes } from "../utils/storage";
import { CopyButton } from "../components/ui/copy-btn";
import { useTranslation } from "next-i18next/pages";
import { serverSideTranslations } from "next-i18next/pages/serverSideTranslations";
import { NeonTabs } from "../components/ui/tabs";
import { StyledTextarea } from "../components/ui/input";
import { StyledSelect } from "../components/ui/input";
import { StyledCheckbox } from "../components/ui/input";
import { Button } from "../components/ui/button";

const CryptoJS = require("crypto-js");

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

function Display({ data }: { data: Result }) {
  const { t } = useTranslation(["common", "hashing"]);
  const [testChecksum, setTestChecksum] = useState<string>("");

  return (
    <>
      <div className="relative mt-2">
        <StyledTextarea
          placeholder={t("hashing:pasteToCompare")}
          rows={3}
          value={testChecksum}
          onChange={(e) => {
            setTestChecksum(e.target.value);
          }}
        />
        <button
          type="button"
          className="px-3 py-1 text-sm text-red-400 font-bold absolute end-0 top-0 hover:text-red-300 transition-colors"
          title={t("common:common.clear")}
          onClick={() => {
            setTestChecksum("");
          }}
        >
          {t("common:common.clear")}
        </button>
      </div>
      <table className="w-full mt-4">
        <tbody>
          <tr className="border-b border-border-default even:bg-bg-elevated/50">
            <th className="py-2 pr-4 text-fg-secondary text-sm text-left whitespace-nowrap">
              {t("common:common.size")}
            </th>
            <td className="py-2 text-sm">{data.size}</td>
          </tr>
          {data.md5 && (
            <tr
              className={`border-b border-border-default even:bg-bg-elevated/50 ${data.md5 == testChecksum ? "bg-accent-cyan-dim text-accent-cyan font-semibold" : ""}`}
            >
              <th className="py-2 pr-4 text-fg-secondary text-sm text-left whitespace-nowrap">
                MD5
              </th>
              <td className="py-2 font-mono text-sm break-all">
                {data.md5}
                <CopyButton getContent={() => data.md5} className="ms-1" />
              </td>
            </tr>
          )}
          {data.sha1 && (
            <tr
              className={`border-b border-border-default even:bg-bg-elevated/50 ${data.sha1 == testChecksum ? "bg-accent-cyan-dim text-accent-cyan font-semibold" : ""}`}
            >
              <th className="py-2 pr-4 text-fg-secondary text-sm text-left whitespace-nowrap">
                SHA-1
              </th>
              <td className="py-2 font-mono text-sm break-all">
                {data.sha1}
                <CopyButton getContent={() => data.sha1} className="ms-1" />
              </td>
            </tr>
          )}
          {data.sha224 && (
            <tr
              className={`border-b border-border-default even:bg-bg-elevated/50 ${data.sha224 == testChecksum ? "bg-accent-cyan-dim text-accent-cyan font-semibold" : ""}`}
            >
              <th className="py-2 pr-4 text-fg-secondary text-sm text-left whitespace-nowrap">
                SHA-224
              </th>
              <td className="py-2 font-mono text-sm break-all">
                {data.sha224}
                <CopyButton getContent={() => data.sha224} className="ms-1" />
              </td>
            </tr>
          )}
          {data.sha256 && (
            <tr
              className={`border-b border-border-default even:bg-bg-elevated/50 ${data.sha256 == testChecksum ? "bg-accent-cyan-dim text-accent-cyan font-semibold" : ""}`}
            >
              <th className="py-2 pr-4 text-fg-secondary text-sm text-left whitespace-nowrap">
                SHA-256
              </th>
              <td className="py-2 font-mono text-sm break-all">
                {data.sha256}
                <CopyButton getContent={() => data.sha256} className="ms-1" />
              </td>
            </tr>
          )}
          {data.sha384 && (
            <tr
              className={`border-b border-border-default even:bg-bg-elevated/50 ${data.sha384 == testChecksum ? "bg-accent-cyan-dim text-accent-cyan font-semibold" : ""}`}
            >
              <th className="py-2 pr-4 text-fg-secondary text-sm text-left whitespace-nowrap">
                SHA-384
              </th>
              <td className="py-2 font-mono text-sm break-all">
                {data.sha384}
                <CopyButton getContent={() => data.sha384} className="ms-1" />
              </td>
            </tr>
          )}
          {data.sha512 && (
            <tr
              className={`border-b border-border-default even:bg-bg-elevated/50 ${data.sha512 == testChecksum ? "bg-accent-cyan-dim text-accent-cyan font-semibold" : ""}`}
            >
              <th className="py-2 pr-4 text-fg-secondary text-sm text-left whitespace-nowrap">
                SHA-512
              </th>
              <td className="py-2 font-mono text-sm break-all">
                {data.sha512}
                <CopyButton getContent={() => data.sha512} className="ms-1" />
              </td>
            </tr>
          )}
          {data.sha3_224 && (
            <tr
              className={`border-b border-border-default even:bg-bg-elevated/50 ${data.sha3_224 == testChecksum ? "bg-accent-cyan-dim text-accent-cyan font-semibold" : ""}`}
            >
              <th className="py-2 pr-4 text-fg-secondary text-sm text-left whitespace-nowrap">
                SHA3-224
              </th>
              <td className="py-2 font-mono text-sm break-all">
                {data.sha3_224}
                <CopyButton getContent={() => data.sha3_224} className="ms-1" />
              </td>
            </tr>
          )}
          {data.sha3_256 && (
            <tr
              className={`border-b border-border-default even:bg-bg-elevated/50 ${data.sha3_256 == testChecksum ? "bg-accent-cyan-dim text-accent-cyan font-semibold" : ""}`}
            >
              <th className="py-2 pr-4 text-fg-secondary text-sm text-left whitespace-nowrap">
                SHA3-256
              </th>
              <td className="py-2 font-mono text-sm break-all">
                {data.sha3_256}
                <CopyButton getContent={() => data.sha3_256} className="ms-1" />
              </td>
            </tr>
          )}
          {data.sha3_384 && (
            <tr
              className={`border-b border-border-default even:bg-bg-elevated/50 ${data.sha3_384 == testChecksum ? "bg-accent-cyan-dim text-accent-cyan font-semibold" : ""}`}
            >
              <th className="py-2 pr-4 text-fg-secondary text-sm text-left whitespace-nowrap">
                SHA3-384
              </th>
              <td className="py-2 font-mono text-sm break-all">
                {data.sha3_384}
                <CopyButton getContent={() => data.sha3_384} className="ms-1" />
              </td>
            </tr>
          )}
          {data.sha3_512 && (
            <tr
              className={`border-b border-border-default even:bg-bg-elevated/50 ${data.sha3_512 == testChecksum ? "bg-accent-cyan-dim text-accent-cyan font-semibold" : ""}`}
            >
              <th className="py-2 pr-4 text-fg-secondary text-sm text-left whitespace-nowrap">
                SHA3-512
              </th>
              <td className="py-2 font-mono text-sm break-all">
                {data.sha3_512}
                <CopyButton getContent={() => data.sha3_512} className="ms-1" />
              </td>
            </tr>
          )}
          {data.RIPEMD160 && (
            <tr
              className={`border-b border-border-default even:bg-bg-elevated/50 ${data.RIPEMD160 == testChecksum ? "bg-accent-cyan-dim text-accent-cyan font-semibold" : ""}`}
            >
              <th className="py-2 pr-4 text-fg-secondary text-sm text-left whitespace-nowrap">
                RIPEMD-160
              </th>
              <td className="py-2 font-mono text-sm break-all">
                {data.RIPEMD160}
                <CopyButton getContent={() => data.RIPEMD160} className="ms-1" />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}

function TextHashing() {
  const { t } = useTranslation(["common", "hashing"]);
  const [types, setTypes] = useState<string[]>(["md5", "sha1", "sha256", "sha512"]);
  const [storageUnit, setStorageUnit] = useState<1000 | 1024>(1000);
  const [content, setContent] = useState<string>("");
  const [isTrim, setIsTrim] = useState<boolean>(true);

  const hashRes = useMemo<Result | undefined>(() => {
    const raw = isTrim ? content.trim() : content;
    if (!raw) return undefined;
    const length = Buffer.byteLength(content, "utf-8");
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
  }, [content, isTrim, storageUnit, types]);

  const [passphrase, setPassphrase] = useState<string>("");
  const hmacRes = useMemo<Result | undefined>(() => {
    const raw = isTrim ? content.trim() : content;
    if (!raw) return undefined;
    const phrase = passphrase.trim();
    if (!phrase) return undefined;
    const length = Buffer.byteLength(content, "utf-8");
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
  }, [content, isTrim, passphrase, types, storageUnit]);

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
      <div className="mt-4">
        <div className="flex flex-wrap justify-between items-center">
          <label htmlFor="contentTextarea" className="col-auto">
            <span className="font-bold text-accent-cyan">{t("hashing:plainText")}</span>
            <a
              href="#"
              className="text-danger text-xs ms-2"
              onClick={(e) => {
                e.preventDefault();
                setContent("");
                showToast(t("common:common.cleared"), "danger", 2000);
              }}
            >
              {t("common:common.clear")}
            </a>
          </label>
          <StyledCheckbox
            label={t("common:common.trimWhiteSpace")}
            id="isTrimCheck"
            checked={isTrim}
            onChange={(e) => {
              setIsTrim(e.target.checked);
            }}
          />
        </div>
        <div className="relative">
          <StyledTextarea
            id="contentTextarea"
            placeholder="Paster or type the plain text here"
            rows={5}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
            }}
          />
          <CopyButton
            getContent={() => (isTrim ? content.trim() : content)}
            className="absolute end-0 top-0"
          />
        </div>
      </div>
      <div className="mt-3">
        <label htmlFor="passphraseTextarea" className="block mb-1">
          <span className="font-bold text-fg-secondary">{t("hashing:secretPassphrase")}</span>
          <a
            href="#"
            className="text-danger text-xs ms-2"
            onClick={(e) => {
              e.preventDefault();
              setPassphrase("");
              showToast(t("common:common.cleared"), "danger", 2000);
            }}
          >
            {t("common:common.clear")}
          </a>
        </label>
        <div className="relative">
          <StyledTextarea
            id="passphraseTextarea"
            placeholder={t("hashing:passphrasePlaceholder")}
            rows={2}
            value={passphrase}
            onChange={(e) => {
              setPassphrase(e.target.value);
            }}
          />
          <CopyButton getContent={() => passphrase.trim()} className="absolute end-0 top-0" />
        </div>
      </div>
      <div className="mt-3 text-center">
        <Button
          variant="danger"
          size="sm"
          disabled={!content && !passphrase}
          onClick={() => {
            setContent("");
            setPassphrase("");
            showToast(t("common:common.allCleared"), "danger", 2000);
          }}
          className="w-3/4 lg:w-1/4 rounded-full uppercase"
        >
          {t("common:common.clearAll")}
        </Button>
      </div>

      <div className="flex flex-wrap items-center mt-3">
        <label className="font-bold col-auto">{t("common:common.storageUnit")} </label>
        <div className="ms-2">
          <StyledSelect
            aria-label="Storage Unit"
            value={storageUnit}
            onChange={(e) => {
              setStorageUnit(parseInt(e.target.value) as 1000 | 1024);
            }}
          >
            <option value="1000">{t("hashing:storageUnit1000")}</option>
            <option value="1024">{t("hashing:storageUnit1024")}</option>
          </StyledSelect>
        </div>
      </div>
      <div className="flex flex-wrap px-3">
        {hashTypeOptions.map((opt) => (
          <div key={opt.id} className="col-auto mt-3 me-4">
            <StyledCheckbox
              label={opt.label}
              value={opt.value}
              id={opt.id}
              checked={types.includes(opt.value)}
              onChange={onToggleCheck}
            />
          </div>
        ))}
      </div>
      {hashRes && (
        <div className="mt-4">
          <NeonTabs
            tabs={[
              {
                label: <span className="font-bold">{t("common:common.hashing")}</span>,
                content: <Display data={hashRes} />,
              },
              ...(hmacRes
                ? [
                    {
                      label: <span className="font-bold">{t("common:common.hmac")}</span>,
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
  const { t } = useTranslation("hashing");
  return (
    <section id="description" className="mt-5">
      <div className="mb-4">
        <h5 className="font-semibold text-fg-primary">{t("descriptions.md5Title")}</h5>
        <p className="text-fg-secondary mt-1">{t("descriptions.md5")}</p>
      </div>
      <div className="mb-4">
        <h5 className="font-semibold text-fg-primary">{t("descriptions.sha1Title")}</h5>
        <p className="text-fg-secondary mt-1">{t("descriptions.sha1")}</p>
      </div>
      <div className="mb-4">
        <h5 className="font-semibold text-fg-primary">{t("descriptions.sha2Title")}</h5>
        <p className="text-fg-secondary mt-1">{t("descriptions.sha2")}</p>
        <p className="text-fg-secondary mt-1">{t("descriptions.sha2extra")}</p>
      </div>
      <div className="mb-4">
        <h5 className="font-semibold text-fg-primary">{t("descriptions.sha3Title")}</h5>
        <p className="text-fg-secondary mt-1">{t("descriptions.sha3")}</p>
      </div>
      <div className="mb-4">
        <h5 className="font-semibold text-fg-primary">{t("descriptions.hmacTitle")}</h5>
        <p className="text-fg-secondary mt-1">{t("descriptions.hmac")}</p>
      </div>
    </section>
  );
}

function HashingPage() {
  const { t } = useTranslation(["common", "tools"]);
  const title = t("tools:hashing.title");

  return (
    <>
      <ToolPageHeadBuilder toolPath="/hashing" />
      <Layout title={title}>
        <div className="container mx-auto px-4 py-3">
          <div className="bg-accent-cyan-dim/20 border border-accent-cyan/30 rounded-xl p-3 text-fg-secondary text-sm my-4">
            {t("common:alert.notTransferred")}
          </div>
          <TextHashing />
          <Description />
        </div>
      </Layout>
    </>
  );
}

export const getStaticProps: GetStaticProps = async (context) => {
  const locale = context.locale || "en";
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common", "hashing", "tools"])),
    },
  };
};

export default HashingPage;

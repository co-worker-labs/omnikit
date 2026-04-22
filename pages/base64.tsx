import { GetStaticProps, InferGetStaticPropsType } from "next";
import Image from "next/image";
import { useState } from "react";
import { CopyButton } from "../components/copybtn";
import { ToolPageHeadBuilder } from "../components/head_builder";
import Layout from "../components/layout";
import { showToast } from "../libs/toast";
import codingTableImg from "../public/base64/decimal-to-base64-table.png";
import styles from "../styles/Base64.module.css";
import { useTranslation } from "next-i18next/pages";
import { serverSideTranslations } from "next-i18next/pages/serverSideTranslations";

function Conversion() {
  const { t } = useTranslation(["common", "base64"]);
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
    showToast(t("common:common.encoded"), "success", 2000);
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
    showToast(t("common:common.decoded"), "success", 2000);
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

  function toggleCopyIcon(element: HTMLElement, timeout: number) {
    element.classList.remove("bi-clipboard");
    element.classList.add("bi-clipboard-check");
    element.classList.add("text-success");
    setTimeout(() => {
      element.classList.remove("bi-clipboard-check");
      element.classList.remove("text-success");
      element.classList.add("bi-clipboard");
    }, timeout);
  }

  function onCopy(e: React.MouseEvent<HTMLElement>, content: string) {
    const iconEle = e.currentTarget.getElementsByTagName("i")[0];
    toggleCopyIcon(iconEle, 2000);
    navigator.clipboard.writeText(content);
    showToast(t("common:common.copied"), "success", 2000);
  }

  return (
    <section id="conversion">
      <div>
        <div className="row justify-content-between">
          <label htmlFor="rawContentTextarea" className="form-label col-auto">
            <span className="fw-bold text-primary">{t("base64:plainText")}</span>
            <a
              href="#"
              className={`text-danger ms-2 ${styles.clearLink}`}
              onClick={() => {
                updateRawContent("");
                showToast(t("common:common.cleared"), "danger", 2000);
              }}
            >
              {t("common:common.clear")}
            </a>
          </label>
          <div className="form-check col-auto">
            <input
              className="form-check-input"
              type="checkbox"
              aria-label="Removes the leading and trailing white space and line terminator characters from a string."
              id="isTrimCheck"
              checked={isTrimRaw}
              onChange={(e) => {
                setIsTrimRaw(e.target.checked);
              }}
            />
            <label className="form-check-label" htmlFor="isTrimCheck">
              {t("common:common.trimWhiteSpace")}
            </label>
          </div>
        </div>
        <div className="position-relative">
          <textarea
            className="form-control"
            id="rawContentTextarea"
            placeholder={t("base64:plainTextPlaceholder")}
            rows={5}
            value={rawContent}
            onChange={(e) => {
              updateRawContent(e.target.value);
            }}
          ></textarea>
          <CopyButton getContent={() => rawContent} className="position-absolute end-0 top-0" />
        </div>
      </div>
      <div className="mt-2">
        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            value=""
            id="basicAuthFlag"
            checked={basicAuthEnabled}
            onChange={(e) => setBasicAuthEnabled(e.target.checked)}
          />
          <label className="form-check-label" htmlFor="basicAuthFlag">
            {t("base64:basicAuthentication")}
          </label>
        </div>
        <div className="input-group mt-2" hidden={!basicAuthEnabled}>
          <input
            type="text"
            className="form-control"
            placeholder={t("base64:username")}
            aria-label={t("base64:username")}
            value={username}
            onChange={(e) => {
              updateRawContent(buildBasicAuth(e.target.value, password));
            }}
          />
          <span className="input-group-text">:</span>
          <input
            type="text"
            className="form-control"
            placeholder={t("base64:password")}
            aria-label={t("base64:password")}
            value={password}
            onChange={(e) => {
              updateRawContent(buildBasicAuth(username, e.target.value));
            }}
          />
        </div>
      </div>
      <div className="row justify-content-start mb-3">
        <div className="col-auto mt-3 pe-0">
          <select
            className="form-select form-select-sm"
            aria-label="Plain Content Charset"
            value={rawCharset}
            onChange={(e) => {
              setRawCharset(e.target.value as BufferEncoding);
            }}
          >
            <option value="ascii">ASCII</option>
            <option value="utf-8">UTF-8</option>
          </select>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-primary col-auto ms-1 mt-3"
          disabled={isDisabledEncode()}
          onClick={doEncode}
        >
          {t("base64:encode")}
          <i className="bi bi-chevron-double-down ms-1"></i>
        </button>
        <button
          type="button"
          className="btn btn-sm btn-success col-auto ms-1 mt-3"
          disabled={isDiabledDecode()}
          onClick={doDecode}
        >
          {t("base64:decode")}
          <i className="bi bi-chevron-double-up ms-1"></i>
        </button>
        <button
          type="button"
          className="btn btn-sm btn-danger col-auto ms-1 mt-3"
          disabled={isDiabledClear()}
          onClick={() => {
            updateRawContent("");
            updateEncodedContent("");
            showToast(t("common:common.allCleared"), "danger", 2000);
          }}
        >
          {t("common:common.clearAll")}
          <i className="bi bi-x ms-1"></i>
        </button>
      </div>
      <div className="mb-3">
        <label htmlFor="encodedContentTextarea" className="form-label">
          <span className="fw-bold text-success">{t("base64:encodedText")}</span>
          <a
            href="#"
            className={`text-danger ms-2 ${styles.clearLink}`}
            onClick={() => {
              setEncodedContent("");
              showToast(t("common:common.cleared"), "danger", 2000);
            }}
          >
            {t("common:common.clear")}
          </a>
        </label>
        <div className="position-relative">
          <textarea
            className="form-control"
            id="encodedContentTextarea"
            placeholder={t("base64:encodedOutput")}
            rows={5}
            value={encodedContent}
            onChange={(e) => {
              updateEncodedContent(e.target.value);
            }}
          ></textarea>
          <CopyButton getContent={() => encodedContent} className="position-absolute end-0 top-0" />
        </div>
      </div>
    </section>
  );
}

function Description() {
  const { t } = useTranslation("base64");
  return (
    <section id="description" className="mt-4 sentence">
      <div>
        <h3>{t("descriptions.whatIsTitle")}</h3>
        <p>{t("descriptions.whatIsP1")}</p>
        <p>{t("descriptions.whatIsP2")}</p>
        <p>{t("descriptions.whatIsP3")}</p>
      </div>
      <div>
        <h3>{t("descriptions.howTitle")}</h3>
        <p>{t("descriptions.howP1")}</p>
        <ol>
          <li>{t("descriptions.howStep1")}</li>
          <li>{t("descriptions.howStep2")}</li>
          <li>{t("descriptions.howStep3")}</li>
          <li>{t("descriptions.howStep4")}</li>
        </ol>
        <Image src={codingTableImg} alt="" />
      </div>
      <div>
        <h3>{t("descriptions.whyTitle")}</h3>
        <p>{t("descriptions.whyP1")}</p>
        <p>{t("descriptions.whyP2")}</p>
      </div>
      <div>
        <h3>{t("descriptions.useCasesTitle")}</h3>
        <p>{t("descriptions.useCasesP1")}</p>
        <p>{t("descriptions.useCasesP2")}</p>
      </div>
      <div>
        <h3>{t("descriptions.limitationsTitle")}</h3>
        <p>{t("descriptions.limitationsP1")}</p>
        <p>{t("descriptions.limitationsP2")}</p>
      </div>
    </section>
  );
}

function Base64Page() {
  const { t } = useTranslation(["common", "tools"]);
  const title = t("tools:base64.title");

  return (
    <>
      <ToolPageHeadBuilder toolPath="/base64" />
      <Layout title={title}>
        <div className="container pt-3">
          <div className="alert alert-danger py-3 my-lg-4" role="alert">
            {t("common:alert.notTransferred")}
          </div>
          <Conversion />
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
      ...(await serverSideTranslations(locale, ["common", "base64", "tools"])),
    },
  };
};

export default Base64Page;

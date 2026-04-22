import { GetStaticProps, InferGetStaticPropsType } from "next";
import { useState } from "react";
import { useTranslation } from "next-i18next/pages";
import { serverSideTranslations } from "next-i18next/pages/serverSideTranslations";
import { CopyButton } from "../components/copybtn";
import { ToolPageHeadBuilder } from "../components/head_builder";
import Layout from "../components/layout";
import { showToast } from "../libs/toast";
import { findTool, ToolData } from "../libs/tools";
import styles from "../styles/Cipher.module.css";

const CryptoJS = require("crypto-js");

type Algorithms = "AES" | "DES" | "Triple DES" | "Rabbit" | "RC4" | "RC4Drop";
type BlockMode = "CBC" | "CFB" | "CTR" | "OFB" | "ECB";
type PaddingScheme = "Pkcs7" | "Iso97971" | "AnsiX923" | "Iso10126" | "ZeroPadding" | "NoPadding";

function Conversion() {
  const { t } = useTranslation(["cipher", "common"]);
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
      console.log(encrypted);
      setEncryptedContent(encrypted.toString());
      showToast(t("common:common.encrypted"), "success", 3000);
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
      console.log(decrypted);
      try {
        setRawContent(decrypted.toString(CryptoJS.enc.Utf8));
        showToast(t("common:common.decrypted"), "success", 3000);
      } catch (e) {
        console.error(e);
        showToast(t("common:alert.invalidCipher"), "danger", 3000);
      }
    }
  }

  return (
    <section id="conversion">
      <div>
        <div className="row justify-content-between">
          <label htmlFor="rawContentTextarea" className="form-label col-auto">
            <span className="fw-bold text-primary">{t("cipher:plaintext")}</span>
            <a
              href="#"
              className={`text-danger ms-2 ${styles.clearLink}`}
              onClick={() => {
                setRawContent("");
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
            placeholder={t("cipher:plaintextPlaceholder")}
            rows={5}
            value={rawContent}
            onChange={(e) => {
              setRawContent(e.target.value);
            }}
          ></textarea>
          <CopyButton className="position-absolute end-0 top-0" getContent={() => rawContent} />
        </div>
      </div>

      <div className="mt-3">
        <label htmlFor="passphraseTextarea" className="form-label">
          <span className="fw-bold text-primary">{t("cipher:secretPassphrase")}</span>
          <a
            href="#"
            className={`text-danger ms-2 ${styles.clearLink}`}
            onClick={() => {
              setPassphrase("");
              showToast(t("common:common.cleared"), "danger", 2000);
            }}
          >
            {t("common:common.clear")}
          </a>
        </label>
        <div className="position-relative">
          <textarea
            className="form-control"
            id="passphraseTextarea"
            placeholder={t("cipher:passphrasePlaceholder")}
            rows={3}
            value={passphrase}
            onChange={(e) => {
              setPassphrase(e.target.value);
            }}
          ></textarea>
          <CopyButton
            className="position-absolute end-0 top-0"
            getContent={() => passphrase.trim()}
          />
        </div>
      </div>
      <div className="row">
        <div className="col-6 col-lg-4 mt-3">
          <label htmlFor="passphraseTextarea" className="form-label col-auto">
            {t("cipher:algorithms")}
          </label>
          <select
            className="form-select form-select-sm"
            aria-label="Cipher Algorithms"
            value={algorithm}
            onChange={(e) => {
              setAlgorithm(e.target.value as Algorithms);
              if ((e.target.value as Algorithms) == "RC4Drop") {
                setDroppedWords(192);
              }
            }}
          >
            <option value="AES">AES</option>
            <option value="DES">DES</option>
            <option value="Triple DES">Triple DES</option>
            <option value="Rabbit">Rabbit</option>
            <option value="RC4">RC4</option>
            <option value="RC4Drop">RC4Drop</option>
          </select>
        </div>
        <div className="col-6 col-lg-4 mt-3">
          <label htmlFor="passphraseTextarea" className="form-label col-auto">
            {t("cipher:blockMode")}
          </label>
          <select
            className="form-select form-select-sm"
            aria-label="Block Mode"
            value={mode}
            onChange={(e) => {
              setMode(e.target.value as BlockMode);
            }}
          >
            <option value="CBC">CBC</option>
            <option value="CFB">CFB</option>
            <option value="CTR">CTR</option>
            <option value="OFB">OFB</option>
            <option value="ECB">ECB</option>
          </select>
        </div>
        <div className="col-6 col-lg-4 mt-3">
          <label htmlFor="passphraseTextarea" className="form-label col-auto">
            {t("cipher:paddingScheme")}
          </label>
          <select
            className="form-select form-select-sm"
            aria-label="Padding Scheme"
            value={paddingScheme}
            onChange={(e) => {
              setPaddingScheme(e.target.value as PaddingScheme);
            }}
          >
            <option value="Pkcs7">Pkcs7</option>
            <option value="Iso97971">Iso97971</option>
            <option value="AnsiX923">AnsiX923</option>
            <option value="Iso10126">Iso10126</option>
            <option value="ZeroPadding">ZeroPadding</option>
            <option value="NoPadding">NoPadding</option>
          </select>
        </div>
        <div className="col-6 col-lg-4 mt-3" hidden={algorithm != "RC4Drop"}>
          <label htmlFor="droppedWords" className="form-label col-auto">
            {t("cipher:droppedWords")}
          </label>
          <input
            type="number"
            className="form-control"
            id="droppedWords"
            min={1}
            value={droppedWords}
            onChange={(e) => {
              setDroppedWords(parseInt(e.target.value));
            }}
          />
        </div>
      </div>

      <div className="row px-2 mt-3">
        <button
          type="button"
          className="btn btn-sm btn-primary col-auto ms-1"
          disabled={isDisabledEncrypt()}
          onClick={doEncrypt}
        >
          {t("common:common.encrypted")}
          <i className="bi bi-chevron-double-down ms-1"></i>
        </button>
        <button
          type="button"
          className="btn btn-sm btn-success col-auto ms-1"
          disabled={isDisabledDecrypt()}
          onClick={doDecrypt}
        >
          {t("common:common.decrypted")}
          <i className="bi bi-chevron-double-up ms-1"></i>
        </button>
        <button
          type="button"
          className="btn btn-sm btn-danger col-auto ms-1"
          disabled={isDisabledClear()}
          onClick={() => {
            setRawContent("");
            setEncryptedContent("");
            setPassphrase("");
            showToast(t("common:common.allCleared"), "danger", 2000);
          }}
        >
          {t("common:common.clearAll")}
          <i className="bi bi-x ms-1"></i>
        </button>
      </div>
      <div className="mt-3">
        <label htmlFor="encryptedContentTextarea" className="form-label">
          <span className="fw-bold text-success">{t("cipher:ciphertext")}</span>
          <a
            href="#"
            className={`text-danger ms-2 ${styles.clearLink}`}
            onClick={() => {
              setEncryptedContent("");
              showToast(t("common:common.cleared"), "danger", 2000);
            }}
          >
            {t("common:common.clear")}
          </a>
        </label>
        <div className="position-relative">
          <textarea
            className="form-control"
            id="encryptedContentTextarea"
            placeholder={t("cipher:ciphertextOutput")}
            rows={5}
            value={encryptedContent}
            onChange={(e) => {
              setEncryptedContent(e.target.value);
            }}
          ></textarea>
          <CopyButton
            className="position-absolute end-0 top-0"
            getContent={() => encryptedContent.trim()}
          />
        </div>
      </div>
    </section>
  );
}

function Description() {
  const { t } = useTranslation("cipher");
  return (
    <section id="description" className="mt-4 sentence">
      <div>
        <h5>{t("descriptions.aesTitle")}</h5>
        <p>{t("descriptions.aes")}</p>
      </div>
      <div>
        <h5>{t("descriptions.desTitle")}</h5>
        <p>{t("descriptions.des")}</p>
        <p>{t("descriptions.tripleDes")}</p>
      </div>
      <div>
        <h5>{t("descriptions.rabbitTitle")}</h5>
        <p>{t("descriptions.rabbit")}</p>
      </div>
      <div>
        <h5>{t("descriptions.rc4Title")}</h5>
        <p>{t("descriptions.rc4")}</p>
        <p>{t("descriptions.rc4drop")}</p>
        <p>{t("descriptions.rc4dropConfig")}</p>
      </div>
    </section>
  );
}

function CipherPage({ toolData }: InferGetStaticPropsType<typeof getStaticProps>) {
  const { t } = useTranslation("common");
  return (
    <>
      <ToolPageHeadBuilder toolPath="/cipher" />
      <Layout title={toolData.title}>
        <div className="container pt-4">
          <div className="alert alert-danger py-3" role="alert">
            {t("alert.notTransferred")}
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
  const path = "/cipher";
  const toolData: ToolData = findTool(path);
  return {
    props: {
      toolData,
      ...(await serverSideTranslations(locale, ["common", "cipher"])),
    },
  };
};

export default CipherPage;

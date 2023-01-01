import { GetStaticProps, InferGetStaticPropsType } from "next";
import { useState } from "react";
import { CopyButton } from "../components/copybtn";
import { ToolPageHeadBuilder } from "../components/head_builder";
import Layout from "../components/layout";
import { showToast } from "../libs/toast";
import { findTool, listRelatedTools, ToolData } from "../libs/tools";
import styles from '../styles/Cipher.module.css'

const CryptoJS = require("crypto-js");

type Algorithms = 'AES' | 'DES' | 'Triple DES' | 'Rabbit' | 'RC4' | 'RC4Drop'
type BlockMode = 'CBC' | 'CFB' | 'CTR' | 'OFB' | 'ECB'
type PaddingScheme = 'Pkcs7' | 'Iso97971' | 'AnsiX923' | 'Iso10126' | 'ZeroPadding' | 'NoPadding'

function Conversion() {
    const [rawContent, setRawContent] = useState<string>('');
    const [isTrimRaw, setIsTrimRaw] = useState<boolean>(true);
    const [passphrase, setPassphrase] = useState<string>('');
    const [encryptedContent, setEncryptedContent] = useState<string>('');

    const [algorithm, setAlgorithm] = useState<Algorithms>('AES');
    const [mode, setMode] = useState<BlockMode>('CBC')
    const [paddingScheme, setPaddingScheme] = useState<PaddingScheme>('Pkcs7');
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
            case 'CBC':
                return CryptoJS.mode.CBC;
            case 'CFB':
                return CryptoJS.mode.CFB;
            case 'CTR':
                return CryptoJS.mode.CTR;
            case 'ECB':
                return CryptoJS.mode.ECB;
            case 'OFB':
                return CryptoJS.mode.OFB;
        }
    }

    function getPaddingScheme() {
        switch (paddingScheme) {
            case 'AnsiX923':
                return CryptoJS.pad.AnsiX923;
            case 'Iso10126':
                return CryptoJS.pad.Iso10126;
            case 'Iso97971':
                return CryptoJS.pad.Iso97971;
            case 'NoPadding':
                return CryptoJS.pad.NoPadding;
            case 'ZeroPadding':
                return CryptoJS.pad.ZeroPadding;
            case 'Pkcs7':
                return CryptoJS.pad.Pkcs7;
        }
    }

    function doEncrypt() {
        const raw = isTrimRaw ? rawContent.trim() : rawContent;
        const phrase = passphrase.trim();
        if (raw && phrase) {
            let encrypted;
            switch (algorithm) {
                case 'AES':
                    encrypted = CryptoJS.AES.encrypt(raw, phrase, {
                        mode: getMode(),
                        padding: getPaddingScheme(),
                    })
                    break;
                case 'DES':
                    encrypted = CryptoJS.DES.encrypt(raw, phrase, {
                        mode: getMode(),
                        padding: getPaddingScheme(),
                    })
                    break;
                case 'Triple DES':
                    encrypted = CryptoJS.TripleDES.encrypt(raw, phrase, {
                        mode: getMode(),
                        padding: getPaddingScheme(),
                    })
                    break;
                case 'RC4':
                    encrypted = CryptoJS.RC4.encrypt(raw, phrase, {
                        mode: getMode(),
                        padding: getPaddingScheme(),
                    })
                    break;
                case 'RC4Drop':
                    encrypted = CryptoJS.RC4Drop.encrypt(raw, phrase, {
                        mode: getMode(),
                        padding: getPaddingScheme(),
                        drop: droppedWords,
                    })
                    break;
                case 'Rabbit':
                    encrypted = CryptoJS.Rabbit.encrypt(raw, phrase, {
                        mode: getMode(),
                        padding: getPaddingScheme(),
                    })
                    break;
            }
            setPassphrase(phrase);
            setRawContent(raw);
            console.log(encrypted);
            setEncryptedContent(encrypted.toString());
            showToast('Encrypted', 'success', 3000)
        }
    }

    function doDecrypt() {
        const encrypted = encryptedContent.trim();
        const phrase = passphrase.trim();
        if (encrypted && phrase) {
            let decrypted;
            switch (algorithm) {
                case 'AES':
                    decrypted = CryptoJS.AES.decrypt(encrypted, phrase, {
                        mode: getMode(),
                        padding: getPaddingScheme(),
                    })
                    break;
                case 'DES':
                    decrypted = CryptoJS.DES.decrypt(encrypted, phrase, {
                        mode: getMode(),
                        padding: getPaddingScheme(),
                    })
                    break;
                case 'Triple DES':
                    decrypted = CryptoJS.TripleDES.decrypt(encrypted, phrase, {
                        mode: getMode(),
                        padding: getPaddingScheme(),
                    })
                    break;
                case 'RC4':
                    decrypted = CryptoJS.RC4.decrypt(encrypted, phrase, {
                        mode: getMode(),
                        padding: getPaddingScheme(),
                    })
                    break;
                case 'RC4Drop':
                    decrypted = CryptoJS.RC4Drop.decrypt(encrypted, phrase, {
                        mode: getMode(),
                        padding: getPaddingScheme(),
                        drop: droppedWords,
                    })
                    break;
                case 'Rabbit':
                    decrypted = CryptoJS.Rabbit.decrypt(encrypted, phrase, {
                        mode: getMode(),
                        padding: getPaddingScheme(),
                    })
                    break;
            }
            setEncryptedContent(encrypted);
            setPassphrase(phrase);
            console.log(decrypted);
            try {
                setRawContent(decrypted.toString(CryptoJS.enc.Utf8));
                showToast('Decrypted', 'success', 3000)
            } catch (e) {
                console.error(e)
                showToast('Invalid ciphertext, passphrase or settings', 'danger', 3000)
            }
        }
    }

    return (
        <section id="conversion">
            <div>
                <div className="row justify-content-between">
                    <label htmlFor="rawContentTextarea" className="form-label col-auto">
                        <span className="fw-bold text-primary">Plaintext</span>
                        <a href="#" className={`text-danger ms-2 ${styles.clearLink}`} onClick={() => {
                            setRawContent('')
                            showToast('Cleared', 'danger', 2000)
                        }}>Clear</a>
                    </label>
                    <div className="form-check col-auto">
                        <input className="form-check-input" type="checkbox" aria-label="Removes the leading and trailing white space and line terminator characters from a string." id="isTrimCheck" checked={isTrimRaw}
                            onChange={(e) => { setIsTrimRaw(e.target.checked) }} />
                        <label className="form-check-label" htmlFor="isTrimCheck">
                            Trim white space
                        </label>
                    </div>
                </div>
                <div className="position-relative">
                    <textarea className="form-control" id="rawContentTextarea" placeholder="Paste or type the plaintext here" rows={5} value={rawContent} onChange={(e) => {
                        setRawContent(e.target.value)
                    }}></textarea>
                    <CopyButton className="position-absolute end-0 top-0"
                        getContent={() => rawContent}
                    />
                </div>
            </div>

            <div className="mt-3">
                <label htmlFor="passphraseTextarea" className="form-label">
                    <span className="fw-bold text-primary">Secret Passphrase</span>
                    <a href="#" className={`text-danger ms-2 ${styles.clearLink}`} onClick={() => {
                        setPassphrase('')
                        showToast('Cleared', 'danger', 2000)
                    }}>Clear</a>
                </label>
                <div className="position-relative">
                    <textarea className="form-control" id="passphraseTextarea" placeholder="Paste or type the passphrase here" rows={3} value={passphrase} onChange={(e) => {
                        setPassphrase(e.target.value)
                    }}></textarea>
                    <CopyButton className="position-absolute end-0 top-0"
                        getContent={() => passphrase.trim()}
                    />
                </div>
            </div>
            <div className="row">
                <div className="col-6 col-lg-4 mt-3">
                    <label htmlFor="passphraseTextarea" className="form-label col-auto">Algorithms:</label>
                    <select className="form-select form-select-sm" aria-label="Cipher Algorithms" value={algorithm} onChange={(e) => {
                        setAlgorithm(e.target.value as Algorithms);
                        if (e.target.value as Algorithms == 'RC4Drop') {
                            setDroppedWords(192);
                        }
                    }}>
                        <option value="AES">AES</option>
                        <option value="DES">DES</option>
                        <option value="Triple DES">Triple DES</option>
                        <option value="Rabbit">Rabbit</option>
                        <option value="RC4">RC4</option>
                        <option value="RC4Drop">RC4Drop</option>
                    </select>
                </div>
                <div className="col-6 col-lg-4 mt-3">
                    <label htmlFor="passphraseTextarea" className="form-label col-auto">Block Mode:</label>
                    <select className="form-select form-select-sm" aria-label="Block Mode" value={mode} onChange={(e) => {
                        setMode(e.target.value as BlockMode);
                    }}>
                        <option value="CBC">CBC</option>
                        <option value="CFB">CFB</option>
                        <option value="CTR">CTR</option>
                        <option value="OFB">OFB</option>
                        <option value="ECB">ECB</option>
                    </select>
                </div>
                <div className="col-6 col-lg-4 mt-3">
                    <label htmlFor="passphraseTextarea" className="form-label col-auto">Padding Scheme:</label>
                    <select className="form-select form-select-sm" aria-label="Padding Scheme" value={paddingScheme} onChange={(e) => {
                        setPaddingScheme(e.target.value as PaddingScheme);
                    }}>
                        <option value="Pkcs7">Pkcs7</option>
                        <option value="Iso97971">Iso97971</option>
                        <option value="AnsiX923">AnsiX923</option>
                        <option value="Iso10126">Iso10126</option>
                        <option value="ZeroPadding">ZeroPadding</option>
                        <option value="NoPadding">NoPadding</option>
                    </select>
                </div>
                <div className="col-6 col-lg-4 mt-3" hidden={algorithm != 'RC4Drop'}>
                    <label htmlFor="droppedWords" className="form-label col-auto">Dropped words:</label>
                    <input type="number" className="form-control" id="droppedWords" min={1} value={droppedWords} onChange={(e) => {
                        setDroppedWords(parseInt(e.target.value))
                    }} />
                </div>
            </div>

            <div className="row px-2 mt-3">
                <button type="button" className="btn btn-sm btn-primary col-auto ms-1" disabled={isDisabledEncrypt()} onClick={doEncrypt}>
                    Encrypt<i className="bi bi-chevron-double-down ms-1"></i>
                </button>
                <button type="button" className="btn btn-sm btn-success col-auto ms-1" disabled={isDisabledDecrypt()} onClick={doDecrypt}>
                    Decrypt<i className="bi bi-chevron-double-up ms-1"></i>
                </button>
                <button type="button" className="btn btn-sm btn-danger col-auto ms-1" disabled={isDisabledClear()} onClick={() => {
                    setRawContent('')
                    setEncryptedContent('')
                    setPassphrase('')
                    showToast('All Cleared', 'danger', 2000);
                }}>Clear All<i className="bi bi-x ms-1"></i></button>
            </div>
            <div className="mt-3">
                <label htmlFor="encryptedContentTextarea" className="form-label">
                    <span className="fw-bold text-success">Ciphertext</span>
                    <a href="#" className={`text-danger ms-2 ${styles.clearLink}`} onClick={() => {
                        setEncryptedContent('')
                        showToast('Cleared', 'danger', 2000)
                    }}>Clear</a>
                </label>
                <div className="position-relative">
                    <textarea className="form-control" id="encryptedContentTextarea" placeholder="Ciphertext output" rows={5} value={encryptedContent} onChange={(e) => {
                        setEncryptedContent(e.target.value)
                    }}></textarea>
                    <CopyButton className="position-absolute end-0 top-0"
                        getContent={() => encryptedContent.trim()}
                    />
                </div>
            </div>
        </section>
    )
}

function Description() {
    return (
        <section id="description" className="mt-4 sentence">
            <div>
                <h5>AES</h5>
                <p>
                    The Advanced Encryption Standard (AES) is a U.S. Federal Information Processing Standard (FIPS). It was selected after a 5-year process where 15 competing designs were evaluated.
                </p>
            </div>
            <div>
                <h5>
                    DES, Triple DES
                </h5>
                <p>
                    DES is a previously dominant algorithm for encryption, and was published as an official Federal Information Processing Standard (FIPS). DES is now considered to be insecure due to the small key size.
                </p>
                <p>
                    Triple DES applies DES three times to each block to increase the key size. The algorithm is believed to be secure in this form.
                </p>
            </div>
            <div>
                <h5>
                    Rabbit
                </h5>
                <p>
                    Rabbit is a high-performance stream cipher and a finalist in the eSTREAM Portfolio. It is one of the four designs selected after a 3 1/2-year process where 22 designs were evaluated.
                </p>
            </div>
            <div>
                <h5>
                    RC4, RC4Drop
                </h5>
                <p>
                    RC4 is a widely-used stream cipher. It&#39;s used in popular protocols such as SSL and WEP. Although remarkable for its simplicity and speed, the algorithm&#39;s history doesn&#39;t inspire confidence in its security.
                </p>
                <p>
                    It was discovered that the first few bytes of keystream are strongly non-random and leak information about the key. We can defend against this attack by discarding the initial portion of the keystream. This modified algorithm is traditionally called RC4-drop.
                </p>
                <p>
                    By default, 192 words (768 bytes) are dropped, but you can configure the algorithm to drop any number of words.
                </p>
            </div>
        </section>
    )
}

function CipherPage({ toolData, relatedTools }: InferGetStaticPropsType<typeof getStaticProps>) {
    return (
        <>
            <ToolPageHeadBuilder data={toolData} />
            <Layout title={toolData.title} relatedTools={relatedTools}>
                <div className="container pt-4">
                    <div className="alert alert-danger py-3" role="alert">
                        * Your content are not transferred to the server. All calculations are performed directly in the browser
                    </div>
                    <Conversion />
                    <Description />
                </div>
            </Layout>
        </>
    )
}

export const getStaticProps: GetStaticProps = async (context) => {
    const path = '/cipher'
    const toolData: ToolData = findTool(path);
    const relatedTools: ToolData[] = listRelatedTools(path);
    return {
        props: {
            toolData,
            relatedTools,
        }
    }
}


export default CipherPage
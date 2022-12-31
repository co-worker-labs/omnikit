import { GetStaticProps, InferGetStaticPropsType } from "next";
import Image from "next/image";
import { useState } from "react";
import { CopyButton } from "../components/copybtn";
import { ToolPageHeadBuilder } from "../components/head_builder";
import Layout from "../components/layout";
import { showToast } from "../libs/toast";
import { findTool, ToolData } from "../libs/tools";
import codingTableImg from '../public/base64/decimal-to-base64-table.png'
import styles from '../styles/Base64.module.css'

function Conversion() {
    const [rawContent, setRawContent] = useState<string>('');
    const [isTrimRaw, setIsTrimRaw] = useState<boolean>(true);
    const [rawCharset, setRawCharset] = useState<BufferEncoding>('utf-8');
    const [encodedContent, setEncodedContent] = useState<string>('');
    const [basicAuthEnabled, setBasicAuthEnabled] = useState<boolean>(false);
    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');

    function updateRawContent(value: string) {
        setRawContent(value);
        const arr = parse2BasicAuth(value);
        setUsername(arr[0])
        setPassword(arr[1])
    }

    function parse2BasicAuth(value: string): string[] {
        const index = value.indexOf(':');
        if (index > -1) {
            return [value.substring(0, index), value.substring(index + 1)];
        } else {
            return [value, ''];
        }
    }

    function buildBasicAuth(username: string, password: string) {
        return username + ':' + password;
    }

    function updateEncodedContent(value: string) {
        setEncodedContent(value);
    }

    function doEncode() {
        const raw = isTrimRaw ? rawContent.trim() : rawContent;
        const encoded = Buffer.from(raw, rawCharset).toString('base64');
        updateEncodedContent(encoded);
        updateRawContent(raw);
        showToast('Encoded', 'success', 2000);
    }

    function doDecode() {
        let encoded = encodedContent.trim()
        if (basicAuthEnabled) {
            if (encoded.match(/^(basic).*/gi)) {
                encoded = encoded.substring('Basic '.length).trim();
            }
        }
        const raw = Buffer.from(encoded, 'base64').toString(rawCharset);
        updateEncodedContent(encoded);
        updateRawContent(raw);
        showToast('Decoded', 'success', 2000);
    }

    function isDisabledEncode(): boolean {
        const raw = isTrimRaw ? rawContent.trim() : rawContent;
        return !raw;
    }

    function isDiabledDecode(): boolean {
        return !encodedContent.trim()
    }

    function isDiabledClear(): boolean {
        const raw = isTrimRaw ? rawContent.trim() : rawContent;
        const encoded = encodedContent.trim();
        return !raw && !encoded
    }

    function toggleCopyIcon(element: HTMLElement, timeout: number) {
        // bi-clipboard bi-clipboard-check
        element.classList.remove('bi-clipboard');
        element.classList.add('bi-clipboard-check');
        element.classList.add('text-success');
        setTimeout(() => {
            element.classList.remove('bi-clipboard-check');
            element.classList.remove('text-success');
            element.classList.add('bi-clipboard');
        }, timeout);
    }

    function onCopy(e: React.MouseEvent<HTMLElement>, content: string) {
        const iconEle = e.currentTarget.getElementsByTagName('i')[0];
        toggleCopyIcon(iconEle, 2000);
        navigator.clipboard.writeText(content);
        showToast('Copied', 'success', 2000);
    }

    return (
        <section id="conversion">
            <div>
                <div className="row justify-content-between">
                    <label htmlFor="rawContentTextarea" className="form-label col-auto">
                        <span className="fw-bold text-primary">Plain Text</span>
                        <a href="#" className={`text-danger ms-2 ${styles.clearLink}`} onClick={() => {
                            updateRawContent('')
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
                    <textarea className="form-control" id="rawContentTextarea" placeholder="Paster or type the plain text here" rows={5} value={rawContent} onChange={(e) => {
                        updateRawContent(e.target.value)
                    }}></textarea>
                    <CopyButton getContent={() => rawContent} className='position-absolute end-0 top-0' />
                </div>
            </div>
            <div className="mt-2">
                <div className="form-check">
                    <input className="form-check-input" type="checkbox" value="" id="basicAuthFlag" checked={basicAuthEnabled}
                        onChange={(e) => setBasicAuthEnabled(e.target.checked)} />
                    <label className="form-check-label" htmlFor="basicAuthFlag">
                        Basic Authentication
                    </label>
                </div>
                <div className="input-group mt-2" hidden={!basicAuthEnabled}>
                    <input type="text" className="form-control" placeholder="Username" aria-label="Username" value={username} onChange={(e) => {
                        updateRawContent(buildBasicAuth(e.target.value, password));
                    }} />
                    <span className="input-group-text">:</span>
                    <input type="text" className="form-control" placeholder="Password" aria-label="Password" value={password} onChange={(e) => {
                        updateRawContent(buildBasicAuth(username, e.target.value));
                    }} />
                </div>
            </div>
            <div className="row justify-content-start mb-3">
                <div className="col-auto mt-3 pe-0">
                    <select className="form-select form-select-sm" aria-label="Plain Content Charset" value={rawCharset} onChange={(e) => {
                        setRawCharset(e.target.value as BufferEncoding);
                    }}>
                        <option value="ascii">ASCII</option>
                        <option value="utf-8">UTF-8</option>
                    </select>
                </div>
                <button type="button" className="btn btn-sm btn-primary col-auto ms-1 mt-3" disabled={isDisabledEncode()} onClick={doEncode}>Encode<i className="bi bi-chevron-double-down ms-1"></i></button>
                <button type="button" className="btn btn-sm btn-success col-auto ms-1 mt-3" disabled={isDiabledDecode()} onClick={doDecode}>Decode<i className="bi bi-chevron-double-up ms-1"></i></button>
                <button type="button" className="btn btn-sm btn-danger col-auto ms-1 mt-3" disabled={isDiabledClear()} onClick={() => {
                    updateRawContent('')
                    updateEncodedContent('');
                    showToast('All Cleared', 'danger', 2000);
                }}>Clear All<i className="bi bi-x ms-1"></i></button>
            </div>
            <div className="mb-3">
                <label htmlFor="encodedContentTextarea" className="form-label">
                    <span className="fw-bold text-success">Encoded Text</span>
                    <a href="#" className={`text-danger ms-2 ${styles.clearLink}`} onClick={() => {
                        setEncodedContent('')
                        showToast('Cleared', 'danger', 2000);
                    }}>Clear</a>
                </label>
                <div className="position-relative">
                    <textarea className="form-control" id="encodedContentTextarea" placeholder="Encoded Output" rows={5} value={encodedContent} onChange={(e) => {
                        updateEncodedContent(e.target.value)
                    }}></textarea>
                    <CopyButton getContent={() => encodedContent} className='position-absolute end-0 top-0' />
                </div>
            </div>
        </section>
    )
}

function Description() {
    return (
        <section id="description" className="mt-4 sentence">
            <div>
                <h3>What is Base64 Encoding?</h3>
                <p>
                    Base64 encoding is a way to convert data (typically binary) into the ASCII character set. It is important to mention here that Base64 is not an encryption or compression technique, although it can sometimes be confused as encryption due to the way it seems to obscure data. In fact, size of a Base64 encoded piece of information is 1.3333 times the actual size of your original data.
                </p>
                <p>
                    Base64 is the most widely used base encoding technique with Base16 and Base32 being the other two commonly used encoding schemes.
                </p>
                <p>
                    Base64 encoding is one of the most common ways of converting binary data into plain ASCII text. It is a very useful format for communicating between one or more systems that cannot easily handle binary data, like images in HTML markup or web requests
                </p>
            </div>
            <div>
                <h3>How Does Base64 Work?</h3>
                <p>
                    Converting data to base64 is a multistep process. Here is how it works for strings of text:
                </p>
                <ol>
                    <li>Calculate the 8 bit binary version of the input text</li>
                    <li>Re-group the 8 bit version of the data into multiple chunks of 6 bits</li>
                    <li>Find the decimal version of each of the 6 bit binary chunk</li>
                    <li>Find the Base64 symbol for each of the decimal values via a Base64 lookup table</li>
                </ol>
                <Image src={codingTableImg} alt="" />
            </div>
            <div>
                <h3>Why use Base64 Encoding?</h3>
                <p>
                    Sending information in binary format can sometimes be risky since not all applications or network systems can handle raw binary. On the other hand, the ASCII character set is widely known and very simple to handle for most systems.
                </p>
                <p>
                    For instance email servers expect textual data, so ASCII is typically used. Therefore, if you want to send images or any other binary file to an email server you first need to encode it in text-based format, preferably ASCII. This is where Base64 encoding comes extremely handy in converting binary data to the correct formats.
                </p>
            </div>
            <div>
                <h3>Exploring Common Use Cases for Base64</h3>
                <p>
                    You can also use Base64 to represent binary data in a way that is compatible with HTML, JavaScript, and CSS. For example, you can embed an image inline in a CSS or JavaScript file using Base64.
                </p>
                <p>
                    It is possible to use Base64 to convert input, like form data or JSON, to a string with a reduced character set that is URL-safe. However, due to how certain servers may interpret plus (+) and forward-slash (/) characters, it is recommended to use encodeURIComponent instead.
                </p>
            </div>
            <div>
                <h3>Understanding the Limitations of Base64</h3>
                <p>
                    Base64 is in no way meant to be a secure encryption method.
                </p>
                <p>
                    Base64 is also not a compression method. Encoding a string to Base64 typically results in 33% longer output.
                </p>
            </div>
        </section>
    )
}

function Base64Page({ toolData }: InferGetStaticPropsType<typeof getStaticProps>) {
    return (
        <>
            <ToolPageHeadBuilder data={toolData} />
            <Layout title="Base64 Encode/Decode">
                <div className="container pt-3">
                    <div className="alert alert-danger py-3 my-lg-4" role="alert">
                        * Your text is not transferred to the server. All calculations are performed directly in the browser
                    </div>
                    <Conversion />
                    <Description />
                </div>
            </Layout>
        </>
    )
}

export const getStaticProps: GetStaticProps = async (context) => {
    const toolData: ToolData = findTool('/base64');
    return {
        props: {
            toolData,
        }
    }
}


export default Base64Page
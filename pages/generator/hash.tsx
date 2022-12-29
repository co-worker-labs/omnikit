import { GetStaticProps, InferGetStaticPropsType } from "next";
import { useEffect, useRef, useState } from "react";
import { ToolPageHeadBuilder } from "../../components/head_builder";
import Layout from "../../components/layout";
import { showToast } from "../../libs/toast";
import { findTool, ToolData } from "../../libs/tools";
import { fromEvent } from 'file-selector';

const CryptoJS = require("crypto-js");

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

function formatBytes(bytes: number, decimals = 4, k = 1000) {
    if (!+bytes) return '0 Bytes'

    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

interface HashResult {
    title: string;
    size: string;
    md5: string;
    sha1: string;
    sha2_256: string;
    sha2_384: string;
    sha2_512: string;
    sha3_224: string;
    sha3_256: string;
    sha3_384: string;
    sha3_512: string;
}

function HashResultTable({ data }: { data: HashResult }) {
    return (
        <div className="table-resposive">
            <table className="table table-hover table-striped caption-top text-break">
                <tbody>
                    <tr>
                        <th scope="row">Size</th>
                        <td>
                            {data.size}
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">MD5</th>
                        <td>
                            {data.md5}
                            <button type='button' className='btn btn-sm ms-1' data-toggle="tooltip" data-placement="right" title="Copy"
                                onClick={(e) => onCopy(e, data.md5)}
                            >
                                <i className="bi bi-clipboard fs-5"></i>
                            </button>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row" className="text-nowrap">SHA-1</th>
                        <td>{data.sha1}
                            <button type='button' className='btn btn-sm ms-1' data-toggle="tooltip" data-placement="right" title="Copy"
                                onClick={(e) => onCopy(e, data.sha1)}
                            >
                                <i className="bi bi-clipboard fs-5"></i>
                            </button>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row" className="text-nowrap">SHA2-256</th>
                        <td>{data.sha2_256}
                            <button type='button' className='btn btn-sm ms-1' data-toggle="tooltip" data-placement="right" title="Copy"
                                onClick={(e) => onCopy(e, data.sha2_256)}
                            >
                                <i className="bi bi-clipboard fs-5"></i>
                            </button>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row" className="text-nowrap">SHA2-384</th>
                        <td>{data.sha2_384}
                            <button type='button' className='btn btn-sm ms-1' data-toggle="tooltip" data-placement="right" title="Copy"
                                onClick={(e) => onCopy(e, data.sha2_384)}
                            >
                                <i className="bi bi-clipboard fs-5"></i>
                            </button>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row" className="text-nowrap">SHA2-512</th>
                        <td>{data.sha2_512}
                            <button type='button' className='btn btn-sm ms-1' data-toggle="tooltip" data-placement="right" title="Copy"
                                onClick={(e) => onCopy(e, data.sha2_512)}
                            >
                                <i className="bi bi-clipboard fs-5"></i>
                            </button>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row" className="text-nowrap">SHA3-224</th>
                        <td>{data.sha3_224}
                            <button type='button' className='btn btn-sm ms-1' data-toggle="tooltip" data-placement="right" title="Copy"
                                onClick={(e) => onCopy(e, data.sha3_224)}
                            >
                                <i className="bi bi-clipboard fs-5"></i>
                            </button>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row" className="text-nowrap">SHA3-256</th>
                        <td>{data.sha3_256}
                            <button type='button' className='btn btn-sm ms-1' data-toggle="tooltip" data-placement="right" title="Copy"
                                onClick={(e) => onCopy(e, data.sha3_256)}
                            >
                                <i className="bi bi-clipboard fs-5"></i>
                            </button>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row" className="text-nowrap">SHA3-384</th>
                        <td>{data.sha3_384}
                            <button type='button' className='btn btn-sm ms-1' data-toggle="tooltip" data-placement="right" title="Copy"
                                onClick={(e) => onCopy(e, data.sha3_384)}
                            >
                                <i className="bi bi-clipboard fs-5"></i>
                            </button>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row" className="text-nowrap">SHA3-512</th>
                        <td>{data.sha3_512}
                            <button type='button' className='btn btn-sm ms-1' data-toggle="tooltip" data-placement="right" title="Copy"
                                onClick={(e) => onCopy(e, data.sha3_512)}
                            >
                                <i className="bi bi-clipboard fs-5"></i>
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    )
}

function FileCalculator() {
    const fileRef = useRef(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [hashRes, setHashRes] = useState<HashResult[]>([]);
    const [calculating, setCalculating] = useState<boolean>(false);

    useEffect(() => {
        if (selectedFiles && selectedFiles.length > 0) {
            const length = selectedFiles.length;
            const resArr: HashResult[] = [];
            setCalculating(true);
            selectedFiles.forEach(f => {
                const reader = new FileReader()
                reader.onload = (e) => {
                    var bin = e.target?.result;
                    resArr.push({
                        title: f.name,
                        size: '(' + f.type + ') - ' + formatBytes(f.size),
                        md5: CryptoJS.MD5(bin).toString(),
                        sha1: CryptoJS.SHA1(bin).toString(),
                        sha2_256: CryptoJS.SHA256(bin).toString(),
                        sha2_384: CryptoJS.SHA384(bin).toString(),
                        sha2_512: CryptoJS.SHA512(bin).toString(),
                        sha3_224: CryptoJS.SHA3(bin, { outputLength: 224 }).toString(),
                        sha3_256: CryptoJS.SHA3(bin, { outputLength: 256 }).toString(),
                        sha3_384: CryptoJS.SHA3(bin, { outputLength: 384 }).toString(),
                        sha3_512: CryptoJS.SHA3(bin, { outputLength: 512 }).toString(),
                    });
                    if (resArr.length == length) {
                        setCalculating(false);
                        setHashRes(resArr);
                    }
                }
                reader.readAsBinaryString(f);
            })
        }
    }, [selectedFiles])

    function filenames(files: File[]): string {
        return files.map(f => f.name).join(', ');
    }

    useEffect(() => {
        const input = document.getElementById('fileSelector');
        input?.addEventListener('drop', async evt => {
            const files = await fromEvent(evt);
        });

    }, [])
    return (
        <section id="fileGenerator">
            <div className="mt-3">
                <label htmlFor="fileSelectorZone" className="form-label">
                    <span>Selected Files</span>
                    <a href="#" className={`text-danger ms-2 `} onClick={() => {
                        setSelectedFiles([]);
                        setHashRes([]);
                        if (fileRef.current) {
                            const t = fileRef.current as any;
                            t.value = null;
                        }
                        showToast('Deselected', 'danger', 2000);
                    }}>deselect</a>
                </label>
                <div id="fileSelectorZone" className="position-relative"
                    style={{ 'width': '100%', 'height': '10rem', 'border': '1px dashed #d6e9c6', 'borderRadius': '0.5rem', 'backgroundColor': '#dff0d8', 'color': '#468847', 'fontSize': '2rem' }}>
                    <div className="position-absolute top-50 start-50 translate-middle transmit-middle d-flex align-items-center w-75 justify-content-center">
                        {
                            selectedFiles && selectedFiles.length > 0
                                ? <span className="text-truncate">{filenames(selectedFiles)}</span>
                                : <><i className="bi bi-plus me-1"></i><span className="fw-bold">Drop files here or click to select</span></>
                        }
                    </div>
                    <input ref={fileRef} className="form-control" type="file" id="fileSelector"
                        style={{ 'opacity': 0, 'zIndex': -1, 'width': '100%', 'height': '100%' }}
                        onClick={() => {
                            if (fileRef.current) {
                                const t = fileRef.current as any;
                                t.value = null;
                            }
                        }}
                        onChange={(e) => {
                            setHashRes([]);
                            if (e.target.files && e.target.files.length > 0) {
                                const files: File[] = [];
                                for (var i = 0; i < e.target.files?.length; i++) {
                                    files.push(e.target.files.item(i)!);
                                }
                                setSelectedFiles(files);
                                showToast('Selected ' + files.length + (files.length > 1 ? ' files' : ' file'), 'info', 3000);
                            } else {
                                setSelectedFiles([]);
                            }
                        }}
                        multiple={true}
                    />
                </div>
            </div>
            <div className="mt-3">
                {
                    calculating && (
                        <div className="spinner-grow text-primary align-self-center" role="status">
                            <span className="visually-hidden1 ms-5">Calculating...</span>
                        </div>
                    )
                }
                {
                    hashRes && hashRes.length > 0 ? (
                        <div className="accordion" id="hashResultList">
                            {
                                hashRes.map((data, index) => {
                                    return (
                                        <div className="accordion-item" key={index}>
                                            <h2 className="accordion-header" id={'heading_' + index}>
                                                <button className={"accordion-button fw-bolder text-break" + (index != 0 ? ' collapsed' : '')} type="button" data-bs-toggle="collapse" data-bs-target={'#collapse' + index} aria-expanded={index == 0 ? "true" : 'false'} aria-controls={'collapse' + index}>
                                                    {data.title}
                                                </button>
                                            </h2>
                                            <div id={'collapse' + index} className={index == 0 ? "accordion-collapse collapse show" : 'accordion-collapse collapse'} aria-labelledby={'heading_' + index} data-bs-parent="#hashResultList">
                                                <div className="accordion-body p-1 pt-2">
                                                    <HashResultTable key={index} data={data} />
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            }
                        </div>
                    ) : <></>
                }
            </div>
        </section>
    )
}


function TextCalculator() {
    const [content, setContent] = useState<string>('');
    const [isTrim, setIsTrim] = useState<boolean>(true);
    const [hashRes, setHashRes] = useState<HashResult>();

    function countLength(content: string): string {
        const length = Buffer.byteLength(content, 'utf-8');
        return formatBytes(length);
    }

    useEffect(() => {
        const raw = isTrim ? content.trim() : content;
        if (raw) {
            setHashRes({
                title: 'Text Hash Result',
                size: countLength(raw),
                md5: CryptoJS.MD5(raw).toString(),
                sha1: CryptoJS.SHA1(raw).toString(),
                sha2_256: CryptoJS.SHA256(raw).toString(),
                sha2_384: CryptoJS.SHA384(raw).toString(),
                sha2_512: CryptoJS.SHA512(raw).toString(),
                sha3_224: CryptoJS.SHA3(raw, { outputLength: 224 }).toString(),
                sha3_256: CryptoJS.SHA3(raw, { outputLength: 256 }).toString(),
                sha3_384: CryptoJS.SHA3(raw, { outputLength: 384 }).toString(),
                sha3_512: CryptoJS.SHA3(raw, { outputLength: 512 }).toString(),
            })
        } else {
            setHashRes(undefined);
        }
    }, [content, isTrim])
    return (
        <section id="generator">
            <div className="mt-3">
                <label htmlFor="rawContentTextarea" className="form-label">
                    <span>Input Content</span>
                    <a href="#" className={`text-danger ms-2`} onClick={() => {
                        setContent('');
                        showToast('Cleared', 'danger', 2000);
                    }}>clear</a>
                </label>
                <div className="position-relative">
                    <textarea className="form-control form-control-lg" id="rawContentTextarea" rows={5} value={content} onChange={(e) => {
                        setContent(e.target.value);
                    }}></textarea>
                    <button type='button' className='btn btn-sm flex-col position-absolute end-0 top-0' data-toggle="tooltip" data-placement="right" title="Copy"
                        onClick={(e) => {
                            if (content) {
                                onCopy(e, content);
                            }
                        }}
                    >
                        <i className="bi bi-clipboard fs-5"></i>
                    </button>
                </div>
            </div>
            <div className="form-check mt-3">
                <input className="form-check-input" type="checkbox" aria-label="Removes the leading and trailing white space and line terminator characters from a string." id="basicAuthFlag" checked={isTrim}
                    onChange={(e) => { setIsTrim(e.target.checked) }} />
                <label className="form-check-label" htmlFor="basicAuthFlag">
                    Trim white space
                </label>
            </div>
            <div className="mt-3">
                {
                    hashRes && <HashResultTable data={hashRes} />
                }
            </div>
        </section>
    )
}

function Description() {
    return (
        <section id="description" className="mt-5 paragraph">
            <div>
                <h5>MD5</h5>
                <p>
                    MD5 is a widely used hash function. It&#39;s been used in a variety of security applications and is also commonly used to check the integrity of files. Though, MD5 is not collision resistant, and it isn&#39;t suitable for applications like SSL certificates or digital signatures that rely on this property.
                </p>
            </div>
            <div>
                <h5>
                    SHA-1
                </h5>
                <p>
                    The SHA hash functions were designed by the National Security Agency (NSA). SHA-1 is the most established of the existing SHA hash functions, and it&#39;s used in a variety of security applications and protocols. Though, SHA-1&#39;s collision resistance has been weakening as new attacks are discovered or improved.
                </p>
            </div>
            <div>
                <h5>
                    SHA-2
                </h5>
                <p>
                    SHA-256 is one of the four variants in the SHA-2 set. It isn&#39;t as widely used as SHA-1, though it appears to provide much better security.
                </p>
                <p>
                    SHA-512 is largely identical to SHA-256 but operates on 64-bit words rather than 32.
                </p>
            </div>
            <div>
                <h5>
                    SHA-3
                </h5>
                <p>
                    SHA-3 is the winner of a five-year competition to select a new cryptographic hash algorithm where 64 competing designs were evaluated.
                </p>
            </div>
        </section>
    )
}

function HashCalculatorPage({ toolData }: InferGetStaticPropsType<typeof getStaticProps>) {
    return (
        <>
            <ToolPageHeadBuilder data={toolData} />
            <Layout title={toolData.title}>
                <div className="container py-3">
                    <div className="alert alert-danger py-4" role="alert">
                        Your input content or selected files are not transferred to the server. All calculations are performed directly in the browser
                    </div>
                    <ul className="nav nav-tabs" id="myTab" role="tablist">
                        <li className="nav-item" role="presentation">
                            <button className="nav-link active" id="text-tab" data-bs-toggle="tab" data-bs-target="#text-tab-pane" type="button" role="tab" aria-controls="text-tab-pane" aria-selected="true">Text Content</button>
                        </li>
                        <li className="nav-item" role="presentation">
                            <button className="nav-link" id="file-tab" data-bs-toggle="tab" data-bs-target="#file-tab-pane" type="button" role="tab" aria-controls="file-tab-pane" aria-selected="false">File Content</button>
                        </li>
                    </ul>
                    <div className="tab-content" id="myTabContent">
                        <div className="tab-pane fade show active" id="text-tab-pane" role="tabpanel" aria-labelledby="text-tab" tabIndex={0}>
                            <TextCalculator />
                        </div>
                        <div className="tab-pane fade" id="file-tab-pane" role="tabpanel" aria-labelledby="file-tab" tabIndex={1}>
                            <FileCalculator />
                        </div>
                    </div>
                    <Description />
                </div>
            </Layout>
        </>
    )
}

export const getStaticProps: GetStaticProps = async (context) => {
    const toolData: ToolData = findTool('/generator/hash');
    return {
        props: {
            toolData,
        }
    }
}

export default HashCalculatorPage
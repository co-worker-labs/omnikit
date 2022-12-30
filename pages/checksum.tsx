import { GetStaticProps, InferGetStaticPropsType } from "next";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { ToolPageHeadBuilder } from "../components/head_builder";
import Layout from "../components/layout";
import { showToast } from "../libs/toast";
import { findTool, ToolData } from "../libs/tools";
import { fromEvent } from 'file-selector';
import { formatBytes } from "../utils/storage";
import { CopyButton } from "../components/copybtn";

const CryptoJS = require("crypto-js");

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

function ChecksumDisplay({ data, types }: { data: HashResult, types: string[] }) {
    const [testChecksum, setTestChecksum] = useState<string>('');

    return (
        <>
            <div className="position-relative">
                <textarea className="form-control" placeholder="Compare to checksum" rows={3} value={testChecksum} onChange={(e) => {
                    setTestChecksum(e.target.value);
                }}></textarea>
                <button type='button' className='btn btn-sm text-danger flex-col position-absolute end-0 top-0 fw-bold' data-toggle="tooltip" data-placement="right" title="Clear"
                    onClick={(e) => {
                        setTestChecksum('');
                    }}
                >
                    Clear
                </button>
            </div>
            <table className="table table-hover table-striped caption-top text-break mt-2">
                <tbody>

                    <tr>
                        <th scope="row">Size</th>
                        <td>
                            {data.size}
                        </td>
                    </tr>
                    <tr hidden={!types.includes('md5')}>
                        <th scope="row">MD5</th>
                        <td className={data.md5 == testChecksum ? 'text-success fw-bold' : ''}>
                            {data.md5}
                            <CopyButton getContent={() => data.md5} className='ms-1' />
                        </td>
                    </tr>
                    <tr hidden={!types.includes('sha1')}>
                        <th scope="row" className="text-nowrap">SHA-1</th>
                        <td className={data.sha1 == testChecksum ? 'text-success fw-bold' : ''}>{data.sha1}
                            <CopyButton getContent={() => data.sha1} className='ms-1' />
                        </td>
                    </tr>
                    <tr hidden={!types.includes('sha224')}>
                        <th scope="row" className="text-nowrap">SHA-224</th>
                        <td className={data.sha224 == testChecksum ? 'text-success fw-bold' : ''}>{data.sha224}
                            <CopyButton getContent={() => data.sha224} className='ms-1' />
                        </td>
                    </tr>
                    <tr hidden={!types.includes('sha256')}>
                        <th scope="row" className="text-nowrap">SHA-256</th>
                        <td className={data.sha256 == testChecksum ? 'text-success fw-bold' : ''}>{data.sha256}
                            <CopyButton getContent={() => data.sha256} className='ms-1' />
                        </td>
                    </tr>
                    <tr hidden={!types.includes('sha384')}>
                        <th scope="row" className="text-nowrap">SHA-384</th>
                        <td className={data.sha384 == testChecksum ? 'text-success fw-bold' : ''}>{data.sha384}
                            <CopyButton getContent={() => data.sha384} className='ms-1' />
                        </td>
                    </tr>
                    <tr hidden={!types.includes('sha512')}>
                        <th scope="row" className="text-nowrap">SHA-512</th>
                        <td className={data.sha512 == testChecksum ? 'text-success fw-bold' : ''}>{data.sha512}

                            <CopyButton getContent={() => data.sha512} className='ms-1' />
                        </td>
                    </tr>
                    <tr hidden={!types.includes('sha3-224')}>
                        <th scope="row" className="text-nowrap">SHA3-224</th>
                        <td className={data.sha3_224 == testChecksum ? 'text-success fw-bold' : ''}>{data.sha3_224}
                            <CopyButton getContent={() => data.sha3_224} className='ms-1' />
                        </td>
                    </tr>
                    <tr hidden={!types.includes('sha3-256')}>
                        <th scope="row" className="text-nowrap">SHA3-256</th>
                        <td className={data.sha3_256 == testChecksum ? 'text-success fw-bold' : ''}>{data.sha3_256}
                            <CopyButton getContent={() => data.sha3_256} className='ms-1' />
                        </td>
                    </tr>
                    <tr hidden={!types.includes('sha3-384')}>
                        <th scope="row" className="text-nowrap">SHA3-384</th>
                        <td className={data.sha3_384 == testChecksum ? 'text-success fw-bold' : ''}>{data.sha3_384}
                            <CopyButton getContent={() => data.sha3_384} className='ms-1' />
                        </td>
                    </tr>
                    <tr hidden={!types.includes('sha3-512')}>
                        <th scope="row" className="text-nowrap">SHA3-512</th>
                        <td className={data.sha3_512 == testChecksum ? 'text-success fw-bold' : ''}>{data.sha3_512}
                            <CopyButton getContent={() => data.sha3_512} className='ms-1' />
                        </td>
                    </tr>
                    <tr hidden={!types.includes('RIPEMD160')}>
                        <th scope="row" className="text-nowrap">RIPEMD-160</th>
                        <td className={data.RIPEMD160 == testChecksum ? 'text-success fw-bold' : ''}>{data.RIPEMD160}
                            <CopyButton getContent={() => data.RIPEMD160} className='ms-1' />
                        </td>
                    </tr>
                </tbody>
            </table>
        </>
    )
}

function FileCalculator() {
    const fileRef = useRef(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [hashResList, setHashResList] = useState<HashResult[]>([]);
    const [calculating, setCalculating] = useState<boolean>(false);
    const [types, setTypes] = useState<string[]>(['md5', 'sha1', 'sha256', 'sha512']);
    const [storageUnit, setStorageUnit] = useState<1000 | 1024>(1000);

    function onToggleCheck(event: ChangeEvent<HTMLInputElement>) {
        const checked = event.target.checked;
        const value = event.target.value;
        if (checked) {
            const t = [...types];
            t.push(value);
            setTypes(t);
        } else {
            setTypes(types.filter(t => t != value));
        }
    }

    function filenames(files: File[]): string {
        return files.map(f => f.name).join(', ');
    }

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
                        size: '(' + f.type + ') - ' + formatBytes(f.size, storageUnit),
                        md5: CryptoJS.MD5(bin).toString(),
                        sha1: CryptoJS.SHA1(bin).toString(),
                        sha224: CryptoJS.SHA224(bin).toString(),
                        sha256: CryptoJS.SHA256(bin).toString(),
                        sha384: CryptoJS.SHA384(bin).toString(),
                        sha512: CryptoJS.SHA512(bin).toString(),
                        sha3_224: CryptoJS.SHA3(bin, { outputLength: 224 }).toString(),
                        sha3_256: CryptoJS.SHA3(bin, { outputLength: 256 }).toString(),
                        sha3_384: CryptoJS.SHA3(bin, { outputLength: 384 }).toString(),
                        sha3_512: CryptoJS.SHA3(bin, { outputLength: 512 }).toString(),
                        RIPEMD160: CryptoJS.RIPEMD160(bin).toString(),
                    });
                    if (resArr.length == length) {
                        setCalculating(false);
                        setHashResList(resArr);
                    }
                }
                reader.readAsBinaryString(f);
            })
        }
    }, [selectedFiles, storageUnit])

    useEffect(() => {
        const input = document.getElementById('fileSelector');
        input?.addEventListener('drop', async evt => {
            const files = await fromEvent(evt);
        });
    }, [])

    return (
        <section id="calculator" className="mt-4">
            <div className="position-relative fs-4"
                style={{ 'width': '100%', 'height': '10rem', 'border': '1px dashed #d6e9c6', 'borderRadius': '0.5rem', 'backgroundColor': '#dff0d8', 'color': '#468847' }}>
                <div className="position-absolute top-50 start-50 translate-middle transmit-middle d-flex align-items-center w-100 w-lg-75 justify-content-center">
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
                        setHashResList([]);
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
            <div className="mt-3 text-center">
                <button type="button" disabled={selectedFiles.length == 0} className={`btn btn-sm btn-danger col-8 col-lg-3 rounded-pill text-uppercase`} onClick={() => {
                    setSelectedFiles([]);
                    setHashResList([]);
                    if (fileRef.current) {
                        const t = fileRef.current as any;
                        t.value = null;
                    }
                    showToast('Deselected', 'danger', 2000);
                }}>{selectedFiles.length > 0 ? `Deselect(${selectedFiles.length})` : 'No file chosen'}</button>
            </div>
            <div className="row justify-content-start mt-3">
                <div className="col-auto">
                    <select className="form-select form-select-sm" aria-label="Storage Unit" value={storageUnit} onChange={(e) => {
                        setStorageUnit(parseInt(e.target.value) as (1000 | 1024));
                    }}>
                        <option value="1000">1K = 1000 Bytes</option>
                        <option value="1024">1K = 1024 Bytes</option>
                    </select>
                </div>
            </div>
            <div className="row mt-3 px-3">
                <div className="form-check form-check-lg col-auto">
                    <input className="form-check-input" type="checkbox" value="md5" id={"md5Check"} checked={types.includes('md5')} onChange={onToggleCheck} />
                    <label className="form-check-label" htmlFor={"md5Check"}> MD5</label>
                </div>
                <div className="form-check form-check-lg col-auto">
                    <input className="form-check-input" type="checkbox" value="sha1" id={"sha1Check"} checked={types.includes('sha1')} onChange={onToggleCheck} />
                    <label className="form-check-label" htmlFor={"sha1Check"}> SHA-1</label>
                </div>
                <div className="form-check form-check-lg col-auto">
                    <input className="form-check-input" type="checkbox" value="sha224" id={"sha224Check"} checked={types.includes('sha224')} onChange={onToggleCheck} />
                    <label className="form-check-label" htmlFor={"sha224Check"}> SHA-224</label>
                </div>
                <div className="form-check form-check-lg col-auto">
                    <input className="form-check-input" type="checkbox" value="sha256" id={"sha256Check"} checked={types.includes('sha256')} onChange={onToggleCheck} />
                    <label className="form-check-label" htmlFor={"sha256Check"}> SHA-256</label>
                </div>
                <div className="form-check form-check-lg col-auto">
                    <input className="form-check-input" type="checkbox" value="sha384" id={"sha384Check"} checked={types.includes('sha384')} onChange={onToggleCheck} />
                    <label className="form-check-label" htmlFor={"sha384Check"}> SHA-384</label>
                </div>
                <div className="form-check form-check-lg col-auto">
                    <input className="form-check-input" type="checkbox" value="sha512" id={"sha512Check"} checked={types.includes('sha512')} onChange={onToggleCheck} />
                    <label className="form-check-label" htmlFor={"sha512Check"}> SHA-512</label>
                </div>
                <div className="form-check form-check-lg col-auto">
                    <input className="form-check-input" type="checkbox" value="sha3-224" id={"sha3-224Check"} checked={types.includes('sha3-224')} onChange={onToggleCheck} />
                    <label className="form-check-label" htmlFor={"sha3-224Check"}> SHA3-224</label>
                </div>
                <div className="form-check form-check-lg col-auto">
                    <input className="form-check-input" type="checkbox" value="sha3-256" id={"sha3-256Check"} checked={types.includes('sha3-256')} onChange={onToggleCheck} />
                    <label className="form-check-label" htmlFor={"sha3-256Check"}> SHA3-256</label>
                </div>
                <div className="form-check form-check-lg col-auto">
                    <input className="form-check-input" type="checkbox" value="sha3-384" id={"sha3-384Check"} checked={types.includes('sha3-384')} onChange={onToggleCheck} />
                    <label className="form-check-label" htmlFor={"sha3-384Check"}> SHA3-384</label>
                </div>
                <div className="form-check form-check-lg col-auto">
                    <input className="form-check-input" type="checkbox" value="sha3-512" id={"sha3-512Check"} checked={types.includes('sha3-512')} onChange={onToggleCheck} />
                    <label className="form-check-label" htmlFor={"sha3-512Check"}> SHA3-512</label>
                </div>
                <div className="form-check form-check-lg col-auto">
                    <input className="form-check-input" type="checkbox" value="RIPEMD160" id={"RIPEMD160Check"} checked={types.includes('RIPEMD160')} onChange={onToggleCheck} />
                    <label className="form-check-label" htmlFor={"RIPEMD160Check"}> RIPEMD-160</label>
                </div>
            </div>
            {
                calculating && (
                    <div className="spinner-grow text-primary align-self-center mt-4" role="status">
                        <span className="visually-hidden1 ms-5">Calculating...</span>
                    </div>
                )
            }
            {
                hashResList.length == 0 ? (
                    <div className="border rounded w-100 d-flex justify-content-center align-items-center mt-4 fs-4 text-muted fw-bold bg-light" style={{ 'height': '8rem' }}>
                        Checksum Output
                    </div>
                ) : (
                    <div className="accordion mt-4" id={`hashResultList`}>
                        {
                            hashResList.map((data, index) => {
                                return (
                                    <div className="accordion-item" key={index}>
                                        <h2 className="accordion-header" id={'heading_' + index}>
                                            <button className={"accordion-button fw-bolder text-break" + (index != 0 ? ' collapsed' : '')} type="button" data-bs-toggle="collapse" data-bs-target={'#collapse_' + index} aria-expanded={index == 0 ? "true" : 'false'} aria-controls={'collapse_' + index}>
                                                {data.title}
                                            </button>
                                        </h2>
                                        <div id={'collapse_' + index} className={index == 0 ? "accordion-collapse collapse show" : 'accordion-collapse collapse'} aria-labelledby={'heading_' + index} data-bs-parent={'#hashResultList'}>
                                            <div className="accordion-body p-1 pt-2">
                                                <ChecksumDisplay data={data} types={types} />
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        }
                    </div>
                )
            }
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
                    <div className="alert alert-danger py-3 my-lg-4" role="alert">
                        * Your selected files are not transferred to the server. All calculations are performed directly in the browser
                    </div>
                    <div className="alert alert-info py-3" role="alert">
                        This is html5 file online checksum, which supports an unlimited number of files and unlimited file size.
                    </div>
                    <FileCalculator />
                    <Description />
                </div>
            </Layout>
        </>
    )
}

export const getStaticProps: GetStaticProps = async (context) => {
    const toolData: ToolData = findTool('/checksum');
    return {
        props: {
            toolData,
        }
    }
}

export default HashCalculatorPage
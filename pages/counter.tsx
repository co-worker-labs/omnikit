import { GetStaticProps, InferGetStaticPropsType } from "next";
import { useState } from "react";
import { ToolPageHeadBuilder } from "../components/head_builder";
import Layout from "../components/layout";
import { showToast } from "../libs/toast";
import { findTool, listRelatedTools, ToolData } from "../libs/tools";
import styles from '../styles/Counter.module.css'
import { formatBytes } from "../utils/storage";

function TextCounterPage({ toolData, relatedTools }: InferGetStaticPropsType<typeof getStaticProps>) {
    const [content, setContent] = useState<string>('');
    const [delimiter, setDelimiter] = useState<string>('');
    const [delimiterCustomFlag, setDelimiterCustomFlag] = useState<boolean>(false);
    const [kilobytesConversion, setKilobytesConversion] = useState<1000 | 1024>(1024);

    function getLines(content: string): string[] {
        return content.split(/\r|\r\n|\n/);
    }

    function getWords(line: string): string[] {
        line = line.trim();
        if (line.length == 0) {
            return [];
        }
        if (delimiterCustomFlag) {
            let myDelimiter = delimiter.trim();
            return line.split(myDelimiter);
        } else {
            return line.split(/\s/);
        }
    }

    function removeEmptyWords(words: string[]): string[] {
        return words.filter(v => v.length != 0);
    }

    function countWords(content: string): number {
        const lines = getLines(content);
        let sum = 0;
        for (var i = 0; i < lines.length; i++) {
            let words = getWords(lines[i]);
            words = removeEmptyWords(words);
            sum += words.length;
        }
        return sum;
    }

    function countLines(content: string, removeEmpty: boolean): number {
        let lines = getLines(content);
        if (removeEmpty) {
            lines = lines.filter(v => v.trim().length > 0);
        }
        return lines.length;
    }

    function countCharacters(content: string): number {
        return content.length;
    }
    function countWordCharacters(content: string): number {
        let sum = 0;
        for (var i = 0; i < content.length; i++) {
            const char = content.charAt(i);
            if (char != ' ' && char != '\r' && char != '\n') {
                sum++;
            }
        }
        return sum;
    }
    function countAlphabets(content: string): number {
        let sum = 0;
        for (var i = 0; i < content.length; i++) {
            const char = content.charAt(i);
            if ((char >= 'A' && char <= 'Z') || (char >= 'a' && char <= 'z')) {
                sum++;
            }
        }
        return sum;
    }

    function countLength(content: string): string {
        const length = Buffer.byteLength(content, 'utf-8');
        return formatBytes(length, kilobytesConversion);
    }

    return (
        <>
            <ToolPageHeadBuilder data={toolData} />
            <Layout title={toolData.title} relatedTools={relatedTools}>
                <div className="container py-3">
                    <div className="alert alert-danger py-4 my-lg-4" role="alert">
                        * Your content are not transferred to the server. All calculations are performed directly in the browser
                    </div>
                    <textarea className="form-control mt-4" rows={8} value={content}
                        placeholder='Paste or type the text here'
                        onChange={(e) => {
                            setContent(e.target.value);
                        }}>
                    </textarea>
                    <div className="mt-3 text-center">
                        <button type="button" disabled={!content} className={`btn btn-sm btn-danger col-8 col-lg-3 rounded-pill text-uppercase`} onClick={() => {
                            setContent('')
                            showToast('Cleared', 'danger', 2000);
                        }}>{'Clear'}</button>
                    </div>
                    <section id="settings" className="card mt-3">
                        <div className="card-body">
                            <span className='fs-4 fw-bold mt-2'>Customize your counter</span>
                            <div className='w-100 pt-1 mt-1 bg-light'></div>
                            <div className="mt-3 d-flex align-items-center justify-content-start">
                                <label className="col-auto fw-bolder">Delimiter: </label>
                                <div className="form-check col-auto ms-2">
                                    <input className="form-check-input" type="radio" name="delimiter" id="delimiterSpace" checked={!delimiterCustomFlag} onChange={(e) => {
                                        setDelimiterCustomFlag(!e.target.checked);
                                        setDelimiter('');
                                    }} />
                                    <label className="form-check-label" htmlFor="delimiterSpace">
                                        Space
                                    </label>
                                </div>
                                <div className="form-check col d-flex align-items-center ms-2">
                                    <input className="form-check-input" type="radio" name="delimiter" id="delimiterCustom" checked={delimiterCustomFlag} onChange={(e) => {
                                        setDelimiterCustomFlag(e.target.checked);

                                    }} />
                                    <label className="form-check-label ms-1" htmlFor="delimiterCustom">
                                        Custom
                                    </label>
                                    <input type="text" className="form-control ms-1" id="delimiterCustom" readOnly={!delimiterCustomFlag} value={delimiter} onChange={(e) => {
                                        setDelimiter(e.target.value);
                                    }} />
                                </div>
                            </div>
                            <div className="mt-3 d-flex align-items-center justify-content-start">
                                <label className="col-auto fw-bolder">Storage Unit: </label>
                                <select className="form-select col ms-2" value={kilobytesConversion} onChange={(e) => {
                                    setKilobytesConversion(parseInt(e.target.value) as (1000 | 1024));
                                }}>
                                    <option value="1024">1 K = 1024 Bytes</option>
                                    <option value="1000">1 K = 1000 Bytes</option>
                                </select>
                            </div>
                        </div>
                    </section>
                    <section id="statistic" className="card mt-3">
                        <div className="card-body">
                            <div className='row align-items-center justify-content-between mb-2'>
                                <span className='fs-4 fw-bold col-auto mt-2'>Counter Insight</span>
                                <button type="button" disabled={countCharacters(content) == 0} className="col-auto btn btn-sm me-3 btn-outline-success mt-2" data-bs-toggle="modal" data-bs-target="#colorInsightModal">
                                    <i className="bi bi-kanban"></i>
                                </button>
                            </div>
                            <span className='fs-4 fw-bold mt-2'></span>
                            <div className='w-100 pt-1 mt-1 bg-light'></div>
                            <div className="row">
                                <div className="mt-3 col-12 col-lg-6">
                                    <label htmlFor="contentSize" className="form-label">Content Size</label>
                                    <input type="text" className="form-control" readOnly id="contentSize" value={countLength(content)} />
                                </div>
                                <div className="mt-3 col-12 col-lg-6">
                                    <label htmlFor="characterCount" className="form-label">Number of characters</label>
                                    <input type="number" className="form-control" readOnly id="characterCount" value={countCharacters(content)} />
                                </div>
                                <div className="mt-3 col-12 col-lg-6">
                                    <label htmlFor="wordCharacterCount" className="form-label">Number of word characters</label>
                                    <input type="number" className="form-control" readOnly id="wordCharacterCount" value={countWordCharacters(content)} />
                                </div>
                                <div className="mt-3 col-12 col-lg-6">
                                    <label htmlFor="alphabetCount" className="form-label">Number of alphabet</label>
                                    <input type="number" className="form-control" readOnly id="alphabetCount" value={countAlphabets(content)} />
                                </div>
                                <div className="mt-3 col-12 col-lg-6">
                                    <label htmlFor="lineCount" className="form-label">Number of lines</label>
                                    <input type="number" className="form-control" readOnly id="lineCount" value={countLines(content, false)} />
                                </div>
                                <div className="mt-3 col-12 col-lg-6">
                                    <label htmlFor="contentLineCount" className="form-label">Number of content lines<span className="text-primary"> (without empty)</span></label>
                                    <input type="number" className="form-control" readOnly id="contentLineCount" value={countLines(content, true)} />
                                </div>
                                <div className="mt-3 col-12 col-lg-6">
                                    <label htmlFor="wordsCount" className="form-label">Number of words</label>
                                    <input type="number" className="form-control" readOnly id="wordsCount" value={countWords(content)} />
                                </div>
                            </div>
                        </div>
                    </section>
                    <div>
                        <div className="modal fade" id="colorInsightModal" tabIndex={-1} aria-labelledby="colorInsightModalLabel" aria-hidden="true">
                            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-xl">
                                <div className="modal-content">
                                    <div className="modal-header">
                                        <h1 className="modal-title fs-5 text-success" id="colorInsightModalLabel">Colorful Insight</h1>
                                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                    </div>
                                    <div className={`modal-body text-break ${styles.colorInsight}`}>
                                        {
                                            getLines(content).map((line, index) => {
                                                const words = getWords(line);
                                                let tmpDelimiter: string = ' ';
                                                if (delimiterCustomFlag) {
                                                    tmpDelimiter = delimiter.trim();
                                                }
                                                if (tmpDelimiter.length == 0) {
                                                    tmpDelimiter = ' ';
                                                }
                                                return (
                                                    <p key={index} className={`rounded ${styles.colorInsightParagraph}`}>
                                                        {
                                                            words.map((word, wi) => {
                                                                return (
                                                                    <span key={index + '_span_' + wi}>
                                                                        {
                                                                            wi != 0 && <span key={index + '_delimiter_' + wi} className={styles.colorInsightDelimiter}>{tmpDelimiter}</span>
                                                                        }
                                                                        {
                                                                            word.length != 0 && (
                                                                                <span key={index + '_word_' + wi} className={`btn ${styles.colorInsightWord}`} onClick={() => {
                                                                                    showToast('Paragraph: <span class="text-danger fw-bold">'
                                                                                        + (index + 1)
                                                                                        + '</span>, Word: <span class="text-danger fw-bold">'
                                                                                        + (wi + 1) + '</span><br/>'
                                                                                        + '<span class="text-break ' + styles.colorInsightWord + '">' + word + '</span>',
                                                                                        'info', 2000, 'wordInsightInfo');
                                                                                }}>{word}</span>
                                                                            )
                                                                        }
                                                                    </span>
                                                                )
                                                            })
                                                        }
                                                    </p>
                                                )
                                            })
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Layout>
        </>
    )
}

export const getStaticProps: GetStaticProps = async (context) => {
    const path = '/counter'
    const toolData: ToolData = findTool(path);
    const relatedTools: ToolData[] = listRelatedTools(path);
    return {
        props: {
            toolData,
            relatedTools,
        }
    }
}

export default TextCounterPage 
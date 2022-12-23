import { GetStaticProps, InferGetStaticPropsType } from "next";
import { ToolPageHeadBuilder } from "../components/head_builder";
import Layout from "../components/layout"
import { ControlCode, getControlCodes, getPrintableCharacters } from "../libs/ascii";
import { findTool, ToolData } from "../libs/tools";
import styles from '../styles/Ascii.module.css'

function beautyPrint(code: number, radix: number, perLen: number, minLen: number, fillChar: string) {
    let str = code.toString(radix);
    const fillCount = str.length % perLen;
    if (fillCount > 0) {
        let prefix = '';
        for (var i = 0; i < perLen - fillCount; i++) {
            prefix += fillChar;
        }
        str = prefix + str;
    }
    if (str.length < minLen) {
        for (var i = 0; i < minLen - str.length; i++) {
            str = fillChar + str;
        }
    }
    const divided = str.length / perLen;
    if (divided == 1) {
        return str;
    } else {
        const result: string[] = [];
        for (var i = 0; i < divided; i++) {
            const start = i * divided;
            result.push(str.substring(start, start + perLen));
        }
        return <>
            {result.map((data, index) => {
                if (index == result.length - 1) {
                    return <span key={code + "_" + radix + "_" + index} className='text-success'>{data}</span>
                } else {
                    return <span key={code + "_" + radix + "_" + index}>{data}&nbsp;&nbsp;</span>
                }
            })}
        </>
    }
}

function ControlCodeChart({ list }: { list: ControlCode[] }) {
    return (
        <table className="table text-center table-striped table-hover table-bordered">
            <thead className="table-dark sticky-top" style={{ 'top': '3rem' }}>
                <tr className="text-uppercase">
                    <th scope="col">Decimal</th>
                    <th scope="col">Binary</th>
                    <th scope="col">Oct</th>
                    <th scope="col">Hex</th>
                    <th scope="col">Abbr</th>
                    <th scope="col">Desc</th>
                </tr>
            </thead>
            <tbody className="table-group-divider">
                {
                    list.map((data, index) => {
                        return (
                            <tr key={data.code}>
                                <td>{data.code}</td>
                                <td>{beautyPrint(data.code, 2, 4, 8, '0')}</td>
                                <td>{beautyPrint(data.code, 8, 3, 3, '0')}</td>
                                <td className="text-uppercase">{beautyPrint(data.code, 16, 2, 2, '0')}</td>
                                <td className="text-uppercase">{data.popular ? <span className="text-danger">{data.abbr}</span> : data.abbr}</td>
                                <td>{data.popular ? <span className="text-danger">{data.desc}</span> : data.desc}</td>
                            </tr>
                        )
                    })
                }
            </tbody>
        </table>
    )
}

function PrintableCharacters({ list }: { list: number[] }) {

    function printGlyph(code: number) {
        let char = String.fromCharCode(code);

        if (char >= '0' && char <= '9') {
            return <span className="text-primary">{char}</span>
        } else if ((char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z')) {
            return char
        } else {
            if (char == ' ') {
                char = 'space'
            }
            return <span className="text-danger">{char}</span>;
        }
    }

    return (
        <table className="table text-center table-striped table-hover table-bordered">
            <thead className="table-dark sticky-top" style={{ 'top': '3rem' }}>
                <tr className="text-uppercase">
                    <th scope="col">Decimal</th>
                    <th scope="col">Binary</th>
                    <th scope="col">Oct</th>
                    <th scope="col">Hex</th>
                    <th scope="col">Html</th>
                    <th scope="col">Glyph</th>
                </tr>
            </thead>
            <tbody className="table-group-divider">
                {
                    list.map((data, index) => {
                        return (
                            <tr key={data} className={[48, 65, 97].includes(data) ? 'bg-warning' : ''}>
                                <td>{data}</td>
                                <td>{beautyPrint(data, 2, 4, 8, '0')}</td>
                                <td>{beautyPrint(data, 8, 3, 3, '0')}</td>
                                <td>{data.toString(16).toUpperCase()}</td>
                                <td><code>{'&#' + data + ';'}</code></td>
                                <td>{printGlyph(data)}</td>
                            </tr>
                        )
                    })
                }
            </tbody>
        </table>
    )
}

function AsciiPage({ toolData, printableCharacters, controlCodes }: InferGetStaticPropsType<typeof getStaticProps>) {
    return (
        <>
            <ToolPageHeadBuilder data={toolData} />
            <Layout title="ASCII Table">
                <div className="container py-4">
                    <div className="row justify-content-center">
                        <div className="col-12 col-lg-10">
                            <section id="description" className="py-3">
                                <p className={`${styles.description}`}>
                                    ASCII stands for American Standard Code for Information Interchange.
                                    Computers can only understand numbers, so an ASCII code is the numerical representation of a character such as &lsquo;a&lsquo; or &lsquo;@&lsquo; or an action of some sort.
                                    ASCII was developed a long time ago and now the non-printing characters are rarely used for their original purpose.
                                    Below is the ASCII character table and this includes descriptions of the first 32 non-printing characters.
                                    ASCII was actually designed for use with teletypes and so the descriptions are somewhat obscure.
                                    If someone says they want your CV however in ASCII format, all this means is they want &lsquo;plain&lsquo; text with no formatting such as tabs, bold or underscoring - the raw format that any computer can understand.
                                    This is usually so they can easily import the file into their own applications without issues.
                                    Notepad.exe creates ASCII text, or in MS Word you can save a file as &lsquo;text only&lsquo;
                                </p>
                            </section>
                            <section>
                                <ul className="nav nav-tabs" id="myTab" role="tablist">
                                    <li className="nav-item" role="presentation">
                                        <button className="nav-link active fw-bold" id="home-tab" data-bs-toggle="tab"
                                            data-bs-target="#home-tab-pane" type="button" role="tab" aria-controls="home-tab-pane" aria-selected="true">Printable Characters</button>
                                    </li>
                                    <li className="nav-item" role="presentation">
                                        <button className="nav-link fw-bold" id="profile-tab" data-bs-toggle="tab"
                                            data-bs-target="#profile-tab-pane" type="button" role="tab" aria-controls="profile-tab-pane" aria-selected="false">Control Code Charts</button>
                                    </li>
                                </ul>
                                <div className="tab-content mt-2" id="myTabContent">
                                    <div className="tab-pane fade show active" id="home-tab-pane" role="tabpanel" aria-labelledby="home-tab" tabIndex={0}>
                                        <PrintableCharacters list={printableCharacters} />
                                    </div>
                                    <div className="tab-pane fade" id="profile-tab-pane" role="tabpanel" aria-labelledby="profile-tab" tabIndex={1}>
                                        <ControlCodeChart list={controlCodes} />
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </Layout>
        </>
    )
}

export const getStaticProps: GetStaticProps = async (context) => {
    const toolData: ToolData = findTool('/ascii');
    const printableCharacters: number[] = getPrintableCharacters();
    const controlCodes: ControlCode[] = getControlCodes();

    return {
        props: {
            toolData: toolData,
            printableCharacters: printableCharacters,
            controlCodes: controlCodes,
        }
    }
}

export default AsciiPage
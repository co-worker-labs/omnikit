import { GetStaticProps, InferGetStaticPropsType } from "next";
import { ToolPageHeadBuilder } from "../components/head_builder";
import Layout from "../components/layout";
import { getLetters, CharacterData, getPunctuations, getCurrencies, getMathematical, getDiacritics, getAscii, getIcons, getPronunciations, PronunciationCharacterData } from "../libs/htmlcode";
import { findTool, ToolData } from "../libs/tools";
import styles from '../styles/HtmlCode.module.css'

function printEntityName(code: string | undefined) {
    if (code && code.startsWith('&')) {
        return <code>{code}</code>
    } else {
        return code;
    }
}

function PronunciationPrinter({ desc, list }: { list: PronunciationCharacterData[], desc: string }) {
    return (
        <div className={`${styles.character}`} style={{'top': '3rem'}}>
            <p>
                {desc}
            </p>
            <table className="table text-center table-striped table-hover table-bordered">
                <thead className="table-dark sticky-top">
                    <tr className="text-uppercase">
                        <th scope="col">Character</th>
                        <th scope="col">Entity name</th>
                        <th scope="col">Entity code</th>
                        <th scope="col">IPA</th>
                        <th scope="col">IPA Entity name</th>
                        <th scope="col">IPA Entity code</th>
                        <th scope="col">Example</th>
                    </tr>
                </thead>
                <tbody className="table-group-divider">
                    {
                        list.map((data, index) => {
                            return (
                                <tr key={index}>
                                    <td><span dangerouslySetInnerHTML={{ __html: data.code }}></span></td>
                                    <td>{printEntityName(data.entityName)}</td>
                                    <td>{data.code}</td>
                                    <td>{data.ipaCode ? <span dangerouslySetInnerHTML={{ __html: data.ipaCode }}></span> : <></>}</td>
                                    <td>{printEntityName(data.ipaEntityName)}</td>
                                    <td>{data.ipaCode || ''}</td>
                                    <td><span dangerouslySetInnerHTML={{ __html: data.example }}></span></td>
                                </tr>
                            )
                        })
                    }
                </tbody>
            </table>
        </div>
    )
}

function CharacterPrinter({ desc, list }: { list: CharacterData[], desc: string }) {
    return (
        <div className={`${styles.character}`}>
            <p>
                {desc}
            </p>
            <table className="table text-center table-striped table-hover table-bordered">
                <thead className="table-dark sticky-top" style={{'top': '3rem'}}>
                    <tr className="text-uppercase">
                        <th scope="col">Character</th>
                        <th scope="col">Entity name</th>
                        <th scope="col">Entity number</th>
                        <th scope="col">Hex Code</th>
                        <th scope="col">Description</th>
                    </tr>
                </thead>
                <tbody className="table-group-divider">
                    {
                        list.map((data, index) => {
                            return (
                                <tr key={index}>
                                    <td><span dangerouslySetInnerHTML={{ __html: '&#' + data.entityNumber + ';' }}></span></td>
                                    <td>{printEntityName(data.entityName)}</td>
                                    <td>{'&#' + data.entityNumber + ';'}</td>
                                    <td>{'&#x' + data.entityNumber.toString(16).toUpperCase() + ';'}</td>
                                    <td>{data.description}</td>
                                </tr>
                            )
                        })
                    }
                </tbody>
            </table>
        </div>
    )
}

function PrintLetters({ list }: { list: CharacterData[] }) {
    const letters = [];
    for (var i = 'A'.charCodeAt(0); i <= 'Z'.charCodeAt(0); i++) {
        letters.push(i);
    }

    return (
        <>
            <div className="card my-2">
                <div className="row card-body">
                    {
                        letters.map((code) => {
                            const chr = String.fromCharCode(code);
                            return (
                                <a key={'letters-goto-' + chr} className='btn btn-light col-auto m-1' href={'#letters-' + chr} >{chr}</a>
                            )
                        })
                    }
                </div>
            </div>
            <table className="table text-center table-striped table-hover table-bordered">
                <thead className="table-dark sticky-top" style={{'top': '3rem'}}>
                    <tr className="text-uppercase">
                        <th scope="col">Character</th>
                        <th scope="col">Entity name</th>
                        <th scope="col">Entity number</th>
                        <th scope="col">Hex Code</th>
                        <th scope="col">Description</th>
                    </tr>
                </thead>
                <tbody className="table-group-divider">
                    {
                        list.map((data, index) => {
                            const chr = String.fromCharCode(data.entityNumber);
                            return (
                                <tr key={index} id={chr >= 'A' && chr <= 'Z' ? 'letters-' + chr : undefined}>
                                    <td>{chr}</td>
                                    <td>{printEntityName(data.entityName)}</td>
                                    <td>{'&#' + data.entityNumber + ';'}</td>
                                    <td>{'&#x' + data.entityNumber.toString(16).toUpperCase() + ';'}</td>
                                    <td>{data.description}</td>
                                </tr>
                            )
                        })
                    }
                </tbody>
            </table>
        </>
    )
}

function Description() {
    return (
        <section id='description' className={`mt-3 ${styles.description}`}>
            <p>
                There are a lot of different letters, characters, special characters, symbols and icons which you may want to use in your website content but when you do, they don’t display as they should. To make sure they do display correctly, you need to use HTML codes. Every single letter, character, symbol and icon has its own HTML code which you just need to place in your HTML. We’ve created a complete list of all HTML codes for the various characters, special characters, letters, symbols and icons. You can easily copy these HTML codes and past them into your HTML so they show up correctly within the contents on your website. Where available, we’ve added the friendly HTML code (entity name), the numerical HTML code (entity number) and the HEX code so you&lsquo;ll always find the right code you need.
            </p>
            <p>
                Before you use one of the below codes on your website, make sure your HTML document uses the correct encoding so you are sure that the HTML codes and HTML special codes are displayed properly. To make sure your HTML uses the correct encoding, you should make sure that you use the Unicode character set. This Unicode character set must be set in the head section of your HTML document. This is done by using a meta with the charset attribute and the value UTF-8. Just copy and paste the following meta into your head section and all the below HTML characters will be displayed perfectly so you’re good to go.
            </p>
            <div className="row justify-content-start">
                <pre className="border col-auto rounded py-2 px-5 ms-md-4">
                    &lt;meta charset=&quot;utf-8&quot; &gt;
                </pre>
            </div>
        </section>
    )
}

function HtmlCodePage({ toolData, letters, punctuations, currencies, mathematical, diacritics, ascii, icons, pronunciations }
    : InferGetStaticPropsType<typeof getStaticProps>) {

    return (
        <>
            <ToolPageHeadBuilder data={toolData} />
            <Layout title="HTML codes and special characters">
                <div className="container py-4">
                    <div className="row justify-content-center">
                        <div className="col-12 col-lg-10">
                            <Description />
                            <section>
                                <ul className="nav nav-tabs" id="myTab" role="tablist">
                                    <li className="nav-item" role="presentation">
                                        <button className="nav-link active fw-bold" id="letters-tab" data-bs-toggle="tab"
                                            data-bs-target="#letters-tab-pane" type="button" role="tab" aria-controls="letters-tab-pane" aria-selected="true">Letters</button>
                                    </li>
                                    <li className="nav-item" role="presentation">
                                        <button className="nav-link fw-bold" id="Punctuation-tab" data-bs-toggle="tab"
                                            data-bs-target="#Punctuation-tab-pane" type="button" role="tab" aria-controls="Punctuation-tab-pane" aria-selected="false">Punctuation</button>
                                    </li>
                                    <li className="nav-item" role="presentation">
                                        <button className="nav-link fw-bold" id="currencies-tab" data-bs-toggle="tab"
                                            data-bs-target="#currencies-tab-pane" type="button" role="tab" aria-controls="currencies-tab-pane" aria-selected="false">Currencies</button>
                                    </li>
                                    <li className="nav-item" role="presentation">
                                        <button className="nav-link fw-bold" id="mathematical-tab" data-bs-toggle="tab"
                                            data-bs-target="#mathematical-tab-pane" type="button" role="tab" aria-controls="mathematical-tab-pane" aria-selected="false">Mathematical</button>
                                    </li>
                                    <li className="nav-item" role="presentation">
                                        <button className="nav-link fw-bold" id="pronunciations-tab" data-bs-toggle="tab"
                                            data-bs-target="#pronunciations-tab-pane" type="button" role="tab" aria-controls="pronunciations-tab-pane" aria-selected="false">Pronunciations</button>
                                    </li>
                                    <li className="nav-item" role="presentation">
                                        <button className="nav-link fw-bold" id="diacritics-tab" data-bs-toggle="tab"
                                            data-bs-target="#diacritics-tab-pane" type="button" role="tab" aria-controls="diacritics-tab-pane" aria-selected="false">Diacritics</button>
                                    </li>
                                    <li className="nav-item" role="presentation">
                                        <button className="nav-link fw-bold" id="ascii-tab" data-bs-toggle="tab"
                                            data-bs-target="#ascii-tab-pane" type="button" role="tab" aria-controls="ascii-tab-pane" aria-selected="false">ASCII</button>
                                    </li>
                                    <li className="nav-item" role="presentation">
                                        <button className="nav-link fw-bold" id="icons-tab" data-bs-toggle="tab"
                                            data-bs-target="#icons-tab-pane" type="button" role="tab" aria-controls="icons-tab-pane" aria-selected="false">Icons</button>
                                    </li>
                                </ul>
                                <div className="tab-content mt-2" id="myTabContent">
                                    <div className="tab-pane fade show active" id="letters-tab-pane" role="tabpanel" aria-labelledby="letters-tab" tabIndex={0}>
                                        <PrintLetters list={letters} />
                                    </div>
                                    <div className="tab-pane fade" id="Punctuation-tab-pane" role="tabpanel" aria-labelledby="Punctuation-tab" tabIndex={1}>
                                        <CharacterPrinter desc={
                                            "Punctuations are characters that are used in texts so the readability of texts become better. Punctuation sometimes also indicates how a sentence should be pronounced, or what a word or sentence means."
                                        } list={punctuations} />
                                    </div>
                                    <div className="tab-pane fade" id="currencies-tab-pane" role="tabpanel" aria-labelledby="currencies-tab" tabIndex={2}>
                                        <CharacterPrinter desc={
                                            "Several currencies have their own HTML character which you can use on your website. Find the HTML character from the HTML currency code list below."
                                        } list={currencies} />
                                    </div>
                                    <div className="tab-pane fade" id="mathematical-tab-pane" role="tabpanel" aria-labelledby="mathematical-tab" tabIndex={3}>
                                        <CharacterPrinter desc={
                                            "There are quite a few mathematical HTML characters which you can use on your website. This list of HTML mathematical characters will help you find the right mathematical character to display in your HTML."
                                        } list={mathematical} />
                                    </div>
                                    <div className="tab-pane fade" id="pronunciations-tab-pane" role="tabpanel" aria-labelledby="pronunciations-tab" tabIndex={4}>
                                        <PronunciationPrinter desc={
                                            "Pronunciation characters will help the readers of a text understand how a word should be spoken. Below you'll find all HTML pronunciation characters which you can use in your HTML."
                                        } list={pronunciations} />
                                    </div>
                                    <div className="tab-pane fade" id="diacritics-tab-pane" role="tabpanel" aria-labelledby="diacritics-tab" tabIndex={5}>
                                        <CharacterPrinter desc={
                                            "There are a lot of letters and characters that have a glyph or accent added to the letter or character. These diacritics can make the pronunciation or meaning of a word different. This HTML diacritics list will allow you to display the right diacritic on your website."
                                        } list={diacritics} />
                                    </div>
                                    <div className="tab-pane fade" id="ascii-tab-pane" role="tabpanel" aria-labelledby="ascii-tab" tabIndex={6}>
                                        <CharacterPrinter desc={
                                            "The ASCII (American Standard Code for Information Interchange) subset of Unicode includes the numbers, letters and characters which are basically the most-known characters. The ASCII subset includes the numbers 0 to 9, the lower case letters a to z, upper case letters A to Z and some basic punctuation and control codes. The following ASCII HTML list includes all ASCII subset Unicode HTML codes."
                                        } list={ascii} />
                                    </div>
                                    <div className="tab-pane fade" id="icons-tab-pane" role="tabpanel" aria-labelledby="icons-tab" tabIndex={7}>
                                        <CharacterPrinter desc={
                                            "HTML also offers special characters which you can use in your HTML. For example, a heart, a gender icon, musical notes or arrows. Use the special characters and icons from the below HTML icon list and special characters freely on your website."
                                        } list={icons} />
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
    const toolData: ToolData = findTool('/htmlcode');
    const letters = getLetters();
    const punctuations = getPunctuations();
    const currencies = getCurrencies();
    const mathematical = getMathematical();
    const diacritics = getDiacritics();
    const ascii = getAscii();
    const icons = getIcons();
    const pronunciations = getPronunciations();
    return {
        props: {
            toolData,
            letters,
            punctuations,
            currencies,
            mathematical,
            diacritics,
            ascii,
            icons,
            pronunciations,
        }
    }
}

export default HtmlCodePage
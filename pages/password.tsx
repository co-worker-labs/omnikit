import styles from '../styles/Password.module.css'
import 'rc-slider/assets/index.css'
import Slider from 'rc-slider';
import { ChangeEvent, useEffect, useState } from 'react';
import {
    memorable_capitalize_checked, memorable_full_words_checked,
    random_uppercase_checked, random_lowercase_checked, random_numbers_checked, random_symbols_checked, random_avoid_amibugous_checked,
    printPassword, copyPassword, generate, defaultCharacters, defaultLength,
    ComparisonData, PasswordLength, PasswordType,
} from '../libs/password/main'

import { GetStaticProps, InferGetStaticPropsType } from "next";
import { showToast } from "../libs/toast";
import Layout from '../components/layout';
import { findTool, listRelatedTools, ToolData } from '../libs/tools';
import { ToolPageHeadBuilder } from '../components/head_builder';
import Link from 'next/link';

const default_type = 'Random'

const alert_copy_timeout = 2000;
const alert_del_timeout = 2000;
const alert_gen_timeout = 1000;
const alert_comparison_timeout = 1000;

function getPasswordLevelStyle(type: PasswordType, password: string[]) {
    let width = undefined;
    let backgroundColor = undefined;
    let len = 0;
    switch (type) {
        case 'Random':
            len = password[0].length;
            if (len >= 12) {
                width = '100%';
                backgroundColor = 'green';
            } else if (len >= 10) {
                width = '75%';
                backgroundColor = 'green';
            } else if (len >= 8) {
                width = '50%';
                backgroundColor = 'orange';
            } else if (len >= 6) {
                width = '25%';
                backgroundColor = 'red';
            } else {
                width = '0%';
            }
            break;
        case 'Memorable':
            len = password.length;
            if (len >= 6) {
                width = '100%';
                backgroundColor = 'green';
            } else if (len >= 5) {
                width = '75%';
                backgroundColor = 'green';
            } else if (len >= 4) {
                width = '50%';
                backgroundColor = 'orange';
            } else if (len >= 3) {
                width = '25%';
                backgroundColor = 'red';
            } else {
                width = '0%';
            }
            break;
    }

    return {
        width: width,
        backgroundColor: backgroundColor,
    }
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

function ComparisonList({ list, delCallback, clearAll }: { list: Array<ComparisonData>, delCallback: (index: number) => void, clearAll: () => void }) {
    function onCopy(e: React.MouseEvent<HTMLElement>, index: number) {
        const iconEle = e.currentTarget.getElementsByTagName('i')[0];
        toggleCopyIcon(iconEle, alert_copy_timeout);
        navigator.clipboard.writeText(copyPassword(list[index].type, list[index].password));
        showToast('Copied', 'success', alert_copy_timeout);
    }

    function onDel(index: number) {
        delCallback(index);
        showToast('Deleted', 'danger', alert_del_timeout);
    }

    function onClearAll() {
        clearAll();
        showToast('Cleared', 'danger', alert_del_timeout);
    }

    function listenComparisonCollapse() {
        const comparisionCollapse = document.getElementById('comparisionCollapse');
        const comparisionCollapseIndict = document.getElementById('comparisionCollapseIndict');
        if (comparisionCollapse && comparisionCollapseIndict) {
            comparisionCollapse.addEventListener('hidden.bs.collapse', event => {
                comparisionCollapseIndict.classList.remove('bi-chevron-double-up');
                comparisionCollapseIndict.classList.add('bi-chevron-double-down');
            })
            comparisionCollapse.addEventListener('shown.bs.collapse', event => {
                comparisionCollapseIndict.classList.remove('bi-chevron-double-down');
                comparisionCollapseIndict.classList.add('bi-chevron-double-up');
            })
        }
    }

    useEffect(() => {
        listenComparisonCollapse();
    }, []);

    return (
        <div id='comparision' className={`row mt-3 justify-content-center`} hidden={list.length == 0}>
            <Link id='comparisionGotoBtn' href={'#comparision'} hidden />
            <a className="col-auto text-primary fw-bold" style={{ 'textDecoration': 'none' }} data-bs-toggle="collapse" href="#comparisionCollapse" role="button" aria-expanded="true" aria-controls="comparisionCollapse">
                Comparison<i id='comparisionCollapseIndict' className="ms-2 bi bi-chevron-double-up"></i>
            </a>
            <div className={`collapse show ${styles.comparisonBody}`} id="comparisionCollapse" >
                <div className='text-end me-1'>
                    <a className="col-auto text-danger btn btn-sm" style={{ 'textDecoration': 'none' }} onClick={onClearAll} >
                        Clear All<span className='text-dark ms-1'>({list.length})</span>
                    </a>
                </div>
                <>
                    {
                        list.map((record, index) => {
                            const { width, backgroundColor } = getPasswordLevelStyle(record.type, record.password);
                            const datetime = new Date(record.timestamp).toLocaleString();
                            return (
                                <div className='mt-2 card position-relative' key={index}>
                                    <div className={`row gx-0 ${styles.comparisonPassword}`}>
                                        <div className='col text-center text-break' dangerouslySetInnerHTML={{ __html: printPassword(record.type, record.password) }}>
                                        </div>
                                        <div className='col-auto d-none d-md-flex d-flex justify-content-around align-items-center '>
                                            <button type='button' className='btn btn-sm flex-col' data-toggle="tooltip" data-placement="right" title="Copy"
                                                onClick={(e) => {
                                                    onCopy(e, index);
                                                }}
                                            >
                                                <i className="bi bi-clipboard fs-5"></i>
                                            </button>
                                            <button type='button' className='btn btn-sm flex-col' data-toggle="tooltip" data-placement="right" title="Generate"
                                                onClick={() => {
                                                    onDel(index);
                                                }}
                                            >
                                                <i className="bi bi-trash3 fs-5" ></i>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="progress w-100 rounded-bottom rounded-0" style={{ 'height': '0.2rem' }}>
                                        <div className="progress-bar" role="progressbar" style={{ width: width, 'backgroundColor': backgroundColor }}></div>
                                    </div>
                                    <div className='row d-flex justify-content-around align-items-center d-md-none'>
                                        <button type='button' className='btn col-3 btn-sm'
                                            onClick={(e) => {
                                                onCopy(e, index);
                                            }}
                                        ><i className="bi bi-clipboard fs-5"></i></button>
                                        <button type='button' className='btn col-3 btn-sm'
                                            onClick={() => {
                                                onDel(index);
                                            }}><i className="bi bi-trash3 fs-5"></i></button>
                                    </div>
                                    <div className='position-absolute top-0 start-0 translate-middle-y badge rounded bg-secondary'>
                                        {datetime}
                                    </div>
                                </div>
                            )
                        })
                    }
                </>
            </div>
        </div>
    )
}

function Generator() {
    const [passwordType, setPasswordType] = useState<PasswordType>(default_type);
    const [characters, setCharacters] = useState<number>(defaultCharacters(default_type));
    const [passwordLength, setPasswordLength] = useState<PasswordLength>(defaultLength(default_type));

    const [password, setPassword] = useState<string[]>(['']);
    const [comparisons, setComparisons] = useState<ComparisonData[]>([]);
    const [firstSave, setFirstSave] = useState<boolean>(true);

    function onTypeChange(event: ChangeEvent<HTMLInputElement>) {
        let type: PasswordType = event.target.checked ? 'Memorable' : 'Random';

        setPasswordType(type);
        setCharacters(defaultCharacters(type));
        setPasswordLength(defaultLength(type));
    }

    function bitOperate(currentValue: number, checked: boolean, checkedValue: number) {
        if (checked) {
            return currentValue | checkedValue;
        } else {
            return currentValue & (~checkedValue);
        }
    }

    function onCheckBoxChange(event: ChangeEvent<HTMLInputElement>) {
        const name = event.target.name;
        const checked = event.target.checked;

        let chars = characters;
        switch (name) {
            case "uppercase":
                chars = bitOperate(chars, checked, random_uppercase_checked);
                break;
            case "lowercase":
                chars = bitOperate(chars, checked, random_lowercase_checked);
                break;
            case "symbols":
                chars = bitOperate(chars, checked, random_symbols_checked);
                break;
            case "numbers":
                chars = bitOperate(chars, checked, random_numbers_checked);
                break;
            case "avoidAmibugous":
                chars = bitOperate(chars, checked, random_avoid_amibugous_checked);
                break;
            case "capitalize":
                chars = bitOperate(chars, checked, memorable_capitalize_checked);
                break;
            case "fullwords":
                chars = bitOperate(chars, checked, memorable_full_words_checked);
                break;
            default:
                console.error("Invalid checkbox name: " + name);
                return;
        }
        if (passwordType == 'Memorable' || (chars != 0 && chars != random_avoid_amibugous_checked)) {
            setCharacters(chars);
        }
    }

    function copyAction() {
        navigator.clipboard.writeText(copyPassword(passwordType, password));
        const icons = document.getElementsByClassName('copyIcon');
        if (icons) {
            for (var i = 0; i < icons.length; i++) {
                toggleCopyIcon(icons.item(i) as HTMLElement, alert_copy_timeout);
            }
        }
        showToast('Copied', 'success', alert_copy_timeout);
    }

    function generateAction() {
        const password = generate(passwordType, characters, passwordLength.current);
        setPassword(password);
        showToast('Generated', 'info', alert_gen_timeout, 'generatedAlert');
    }

    function setLength(length: number) {
        setPasswordLength({
            current: length,
            min: passwordLength.min,
            max: passwordLength.max,
        })
    }

    useEffect(() => {
        // generate password
        const newPassword = generate(passwordType, characters, passwordLength.current);
        setPassword(newPassword);

        // update level indict
        const el = document.getElementById('passLevelIndict');
        if (el) {
            const { width, backgroundColor } = getPasswordLevelStyle(passwordType, newPassword);
            if (width) {
                el.style.width = width;
            }
            if (backgroundColor) {
                el.style.backgroundColor = backgroundColor;
            }
        }

    }, [passwordType, characters, passwordLength])

    function addComparisionAction() {
        if (comparisons.length == 0 || comparisons[0].password != password) {
            const comparisonsTemp = [{
                type: passwordType,
                password: password,
                characters: characters,
                timestamp: new Date().getTime(),
            }];
            comparisonsTemp.push(...comparisons);
            setComparisons(comparisonsTemp);

            const bagIcons = document.getElementsByClassName('bagIcon');
            if (bagIcons) {
                for (var i = 0; i < bagIcons.length; i++) {
                    let bagIcon = bagIcons.item(i) as HTMLElement;
                    bagIcon.classList.add('text-success');
                    setTimeout(() => {
                        bagIcon.classList.remove('text-success');
                    }, alert_comparison_timeout);
                }
            }
            showToast('Saved to comparision', 'success', alert_comparison_timeout);

            if (firstSave) {
                document.getElementById('comparisionGotoBtn')?.click()
                setFirstSave(false);
            }
        }
    }

    return (
        <section id="generator" >
            <div className="alert alert-danger py-3" role="alert">
                * All generated passwords are not transferred or saved to the server. All generations are performed directly in the browser
            </div>
            <div className='row justify-content-center text-center text-dark'>
                <div className='col-11'>
                    <p className='fw-bold fs-2'>Need a random password? Try it.</p>
                    <p className='fs-4 fw-light fst-italic' >Generate secure, random, memorable passwords to stay safe online.</p>
                </div>
            </div>
            <div className='row fw-bold fs-4 mt-3 px-3 mb-2 text-secondary'>
                Generated password:
            </div>
            <div className='bg-white1 text-dark card' style={{ 'backgroundColor': '#caedf7' }}>
                <div className={`row gx-0 ${styles.passDisplay} position-relative`}>
                    <div className='col text-center text-break' dangerouslySetInnerHTML={{ __html: printPassword(passwordType, password) }}>
                    </div>
                    <div className='col-auto d-none d-md-flex d-flex justify-content-around align-items-center '>
                        <button type='button' className='btn btn-sm flex-col' onClick={copyAction} data-toggle="tooltip" data-placement="right" title="Copy">
                            <i className="copyIcon bi bi-clipboard fs-3"></i>
                        </button>
                        <button type='button' className='btn btn-sm flex-col' onClick={generateAction} data-toggle="tooltip" data-placement="right" title="Generate">
                            <i className="bi bi-arrow-clockwise fs-3"></i>
                        </button>
                    </div>
                    <button style={{ 'fontSize': '1.3rem' }} type='button' className='py-0 btn btn-sm col-auto position-absolute bottom-0 end-0' onClick={addComparisionAction} data-toggle="tooltip" data-placement="right" title="Compare">
                        <i className="bagIcon bi bi-save"></i>
                    </button>
                </div>
                <div className="progress w-100 rounded-bottom rounded-0" style={{ 'height': '0.6rem' }}>
                    <div className="progress-bar" role="progressbar" id='passLevelIndict' aria-valuemin={0} aria-valuemax={100}></div>
                </div>
            </div>
            <div className='row mt-4 d-flex justify-content-around align-items-center d-md-none'>
                <button type='button' className='btn btn-lg  col-10  btn-primary rounded-pill fw-bold' onClick={generateAction}>Generate Password</button>
                <button type='button' className='btn btn-lg  col-10  btn-danger rounded-pill fw-bold mt-3' onClick={copyAction}> Copy Password</button>
            </div>
            <div className='mt-4 bg-white text-dark card p-md-4  p-3'>
                <div className='row align-items-center justify-content-end justify-content-md-between mb-2'>
                    <span className='fs-4 fw-bold col-12 col-md-auto mt-2'>Customize your password</span>
                    <div className="form-check form-switch col-auto mt-2">
                        <input className="form-check-input" type="checkbox" role="switch" id="memorableSwitch"
                            checked={passwordType == 'Memorable'} onChange={onTypeChange} />
                        <label className="form-check-label fw-bold text-danger" htmlFor="memorableSwitch">Memorable</label>
                    </div>
                </div>
                <div className='w-100 pt-1 bg-light'></div>
                <div className='row px-3'>
                    <div className='col-lg-6 col-12 mt-3 gx-0'>
                        <label className='fs-5'>Password Length</label>
                        <div className='row justify-content-start align-items-center mt-2'>
                            <div className='col-4'>
                                <input type="number" className="form-control form-control-lg" step={1} min={passwordLength.min} max={passwordLength.max} value={passwordLength.current} onChange={(e) => {
                                    setLength(parseInt(e.target.value))
                                }} />
                            </div>
                            <div className='col-7'>
                                <Slider min={passwordLength.min} max={passwordLength.max} step={1} value={passwordLength.current}
                                    railStyle={{ 'backgroundColor': 'light', 'height': '6px' }}
                                    trackStyle={{ 'backgroundColor': '#dd2222', 'height': '6px' }}
                                    handleStyle={{
                                        'backgroundColor': '#dd2222',
                                        'height': '30px',
                                        'width': '30px',
                                        'marginTop': '-12px',
                                        'marginLeft': '-12px',
                                        'border': '0',
                                        'transform': 'none',
                                        'opacity': '100'
                                    }}
                                    onChange={(value) => {
                                        setLength(value as number);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                    <div className={`col-lg-6 col-12 mt-3 ${styles.checkbox}`}>
                        <div className='row justify-content-start' hidden={passwordType != 'Random'}>
                            <div className="form-check form-control-lg col-6 d-flex align-items-center">
                                <input className='form-check-input' type="checkbox" checked={(characters & random_uppercase_checked) != 0} id="uppercaseCheck" name='uppercase' onChange={onCheckBoxChange} />
                                <label className="form-check-label" htmlFor="uppercaseCheck">Uppercase</label>
                            </div>
                            <div className="form-check form-control-lg col-6 d-flex align-items-center">
                                <input className='form-check-input' type="checkbox" checked={(characters & random_lowercase_checked) != 0} id="lowercaseCheck" name='lowercase' onChange={onCheckBoxChange} />
                                <label className="form-check-label" htmlFor="lowercaseCheck">Lowercase</label>
                            </div>
                            <div className="form-check form-control-lg col-6 d-flex align-items-center">
                                <input className='form-check-input' type="checkbox" checked={(characters & random_numbers_checked) != 0} id="numbersCheck" name='numbers' onChange={onCheckBoxChange} />
                                <label className="form-check-label" htmlFor="numbersCheck">Numbers</label>
                            </div>
                            <div className="form-check form-control-lg col-6 d-flex align-items-center">
                                <input className='form-check-input' type="checkbox" checked={(characters & random_symbols_checked) != 0} id="symoblsCheck" name='symbols' onChange={onCheckBoxChange} />
                                <label className="form-check-label" htmlFor="symoblsCheck">Symobls</label>
                            </div>
                            <div className="form-check form-control-lg col-auto d-flex align-items-center">
                                <input className='form-check-input' type="checkbox" checked={(characters & random_avoid_amibugous_checked) != 0} id="avoidAmibugousCheck" name='avoidAmibugous' onChange={onCheckBoxChange} />
                                <label className="form-check-label" htmlFor="avoidAmibugousCheck">Avoid Amibugous</label>
                            </div>
                        </div>
                        <div className='row justify-content-start' hidden={passwordType != 'Memorable'}>
                            <div className="form-check form-control-lg col-auto d-flex align-items-center">
                                <input className='form-check-input' type="checkbox" checked={(characters & memorable_capitalize_checked) != 0} id="capitalizeCheck" name='capitalize' onChange={onCheckBoxChange} />
                                <label className="form-check-label" htmlFor="capitalizeCheck">Capitalize</label>
                            </div>
                            <div className="form-check form-control-lg col-auto d-flex align-items-center">
                                <input className='form-check-input' type="checkbox" checked={(characters & memorable_full_words_checked) != 0} id="fullwordsCheck" name='fullwords' onChange={onCheckBoxChange} />
                                <label className="form-check-label" htmlFor="fullwordsCheck">Full Words</label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className='row mt-4 justify-content-center d-none d-md-flex'>
                <button type='button' className='btn btn-lg col-md-7 col-lg-4 col-10  btn-danger rounded-pill fw-bold' onClick={copyAction}>Copy Password</button>
            </div>
            <div className='row mt-4 justify-content-center'>
                <button type='button' className='btn btn-lg col-md-7 col-lg-4 col-10  btn-dark rounded-pill fw-bold' onClick={(e) => {
                    navigator.clipboard.writeText('');
                    showToast('Cleared clipboard', 'danger', 1000);
                }}>Clear Clipboard</button>
            </div>

            <ComparisonList list={comparisons}
                delCallback={(index) => {
                    const temp = comparisons.slice(0, index);
                    temp.push(...comparisons.slice(index + 1));
                    setComparisons(temp);
                }}
                clearAll={() => {
                    setComparisons([]);
                }}
            />
        </section>
    )
}

interface QuestionData {
    title: string;
    body: string;
}

function Question({ data }: { data: QuestionData[] }) {
    return (
        <section className='my-5 text-center'>
            <p className='fw-bold fs-1'>
                What makes a password strong?
            </p>
            <div className="accordion mt-5" id="questionCollapse">
                <>
                    {
                        data.map((v, index) => {
                            const headerId = 'collapse-' + index + '-header';
                            const collapseId = 'collapse-' + index;
                            return (
                                <div className="accordion-item text-start" key={index}>
                                    <h2 className="accordion-header" id={headerId}>
                                        <button className={'accordion-button fw-bold' + (index == 0 ? '' : ' collapsed')} type="button" data-bs-toggle="collapse" data-bs-target={'#' + collapseId} aria-expanded={index === 0 ? 'true' : 'false'} aria-controls={collapseId}>
                                            {v.title}
                                        </button>
                                    </h2>
                                    <div id={collapseId} className={'accordion-collapse collapse' + (index == 0 ? ' show' : '')} aria-labelledby={headerId} data-bs-parent="#questionCollapse">
                                        <div className="accordion-body">
                                            <p style={{ 'textIndent': '2rem', 'lineHeight': '1.8rem' }}>{v.body}</p>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    }
                </>
            </div>
        </section>
    )
}

function PasswordPage({ questions, toolData, relatedTools }: InferGetStaticPropsType<typeof getStaticProps>) {
    return (
        <>
            <ToolPageHeadBuilder data={toolData} />
            <Layout title={toolData.title} relatedTools={relatedTools}>
                <div className='container pt-4'>
                    <Generator />
                    <Question data={questions} />
                </div>
            </Layout>
        </>
    )
}

export const getStaticProps: GetStaticProps = async (context) => {
    const path = '/password'
    const toolData: ToolData = findTool(path);
    const relatedTools: ToolData[] = listRelatedTools(path);

    const questions: QuestionData[] = [
        {
            'title': 'Strong passwords are unique and random.',
            'body': 'Humans aren\'t very good at coming up with passwords that are either of those things, let alone both. So we created the Strong Password Generator to create secure passwords for you. 81% of data breaches are caused by reused or weak passwords, so random, unique passwords are your best defense against online threats.',
        },
        {
            'title': 'Why should my password be unique?',
            'body': "If you use the same password for both your email account and your bank account login, an attacker only needs to steal one password to get access to both accounts, doubling your exposure. If you've used that same password for 14 different accounts, you're making the attacker's job very, very easy. You can protect yourself by using a generator to create unique passwords that are easy to remember.",
        },
        {
            'title': 'Why should my password be random?',
            'body': "Random passwords are hard to guess and harder for computer programs to crack. If there's a discernible pattern, the odds of an attacker using a brute force attack and gaining access to your account goes up exponentially. Random passwords might contain a jumble of unrelated characters, but combining unrelated words also works. That's how the Strong Password Generator creates passwords that are easy to remember but still cryptographically strong.",
        },
    ];

    return {
        props: {
            questions,
            toolData,
            relatedTools,
        }
    }
}

export default PasswordPage;
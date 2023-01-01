import { CSSProperties, ReactNode, useEffect } from "react";
import Footer, { FooterPosition } from "./footer";
import Header, { HeaderPosition } from "./header";
import { Context, createContext, useContext, useState } from "react";
import styles from './Layout.module.css'
import { ToolData } from "../libs/tools";
import { useRouter } from "next/router";
import { listRecents, logAccess } from "../libs/recent";
import { pathTrim } from "../utils/path";
import Link from "next/link";

interface LayoutSettings {
    reset: () => void;
    isHidden: boolean;
    hidden: (hidden: boolean) => void;
    headerPosition: HeaderPosition;
    toggleHeader: (position: HeaderPosition) => void;
    footerPosition: FooterPosition;
    toggleFooter: (position: FooterPosition) => void;
}

const LayoutContext: Context<LayoutSettings> = createContext<LayoutSettings>({
    reset: () => { },
    isHidden: false,
    hidden: () => { },
    headerPosition: 'sticky',
    toggleHeader: () => { },
    footerPosition: 'none',
    toggleFooter: () => { },
});

export default function Layout({
    children, title, headerPosition, footerPosition, hidden, asideAds = true, className, style, bodyClassName, bodyStyle
}: {
    children: ReactNode, title?: string, headerPosition?: HeaderPosition, footerPosition?: FooterPosition, hidden?: boolean, asideAds?: boolean, className?: string, style?: CSSProperties, bodyClassName?: string, bodyStyle?: CSSProperties
}) {

    const [isHidden, setIsHidden] = useState<boolean>(hidden || false);
    const [headerPos, setHeaderPos] = useState<HeaderPosition>(headerPosition || 'sticky');
    const [footerPos, setFooterPos] = useState<FooterPosition>(footerPosition || 'none');
    const [recent, setRecent] = useState<ToolData[]>([]);

    const router = useRouter();
    const path = pathTrim(router.asPath);


    const config = {
        reset: () => {
            setIsHidden(hidden || false);
            setHeaderPos(headerPosition || 'sticky');
            setFooterPos(footerPosition || 'none');
        },
        isHidden: isHidden,
        hidden: (hidden: boolean) => {
            setIsHidden(hidden)
        },
        headerPosition: headerPos,
        toggleHeader: (position: HeaderPosition) => {
            setHeaderPos(position);
        },
        footerPosition: footerPos,
        toggleFooter: (position: FooterPosition) => {
            setFooterPos(position);
        },
    }

    useEffect(() => {
        window.addEventListener('scroll', (e) => {
            const el = document.getElementById('backtopbtn');
            if (el) {
                if (document.body.scrollTop > 400 || document.documentElement.scrollTop > 400) {
                    if (el.hasAttribute('hidden')) {
                        el.removeAttribute('hidden');
                    }
                } else {
                    if (!el.hasAttribute('hidden')) {
                        el.setAttribute('hidden', 'true');
                    }
                }
            }
        })
        logAccess(path);
        setRecent(listRecents(path));
    }, [path]);

    return (
        <LayoutContext.Provider value={config}>
            <div hidden={isHidden} className={` ${footerPos == 'fixed' ? 'pb-5' : ''} ${bodyClassName ? bodyClassName : ''}`} style={bodyStyle} >
                <Header position={headerPos} title={title} />
                <a href="#" className={`btn rounded-circle ${styles.backUpBtn} btn-dark`} id="backtopbtn" hidden ><i className="bi bi-arrow-bar-up fs-4"></i></a>
                <main className={`${className ? className : ''}`} style={style} >
                    {
                        asideAds ? (
                            <div className="row justify-content-center px-0 gx-0">
                                <div className="col d-none d-lg-block">
                                    <div className="w-100 d-flex justify-content-center ps-2 mt-2">
                                        {
                                            recent.length > 0 && (
                                                <div className={`${styles.asideRecent} mt-3 px-2`}>
                                                    <div className="h5 fw-bolder text-danger text-uppercase">Recent</div>
                                                    <hr />
                                                    {
                                                        recent.map((data, index) => {
                                                            return (
                                                                <div className="card mt-3 text-center" key={index}>
                                                                    <div className="card-body" >
                                                                        <Link href={data.path}>
                                                                            <h5 className="card-title text-primary fw-bold">{data.title}</h5>
                                                                            <p className="card-text text-truncate text-wrap text-muted" style={{ 'maxHeight': '2.8rem' }}>{data.description}</p>
                                                                        </Link>
                                                                    </div>
                                                                </div>
                                                            )
                                                        })
                                                    }
                                                </div>
                                            )
                                        }
                                    </div>
                                </div>
                                <div className={`col col-lg-7`} >
                                    {children}
                                </div>
                                <div className="col d-none d-lg-block">
                                </div>
                            </div>
                        ) : <>{children}</>
                    }
                </main>
                <Footer position={footerPos} />
            </div>
        </LayoutContext.Provider>
    )
}

export const useLayout = () => useContext(LayoutContext);
import { CSSProperties, ReactNode } from "react";
import Footer, { FooterPosition } from "./footer";
import Header, { HeaderPosition } from "./header";
import { Context, createContext, useContext, useState } from "react";

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

    return (
        <LayoutContext.Provider value={config}>
            <div hidden={isHidden} className={`${footerPos == 'fixed' ? 'pb-5' : ''} ${bodyClassName ? bodyClassName : ''}`} style={bodyStyle} >
                <Header position={headerPos} title={title} />
                <main className={`${className ? className : ''}`} style={style} >
                    {
                        asideAds ? (
                            <div className="row justify-content-center px-0 gx-0">
                                <div className="col d-none d-lg-block">
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
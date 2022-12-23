import { ReactNode } from "react";
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
    children, title, headerPosition, footerPosition, hidden, asideAds,
}: {
    children: ReactNode, title?: string, headerPosition?: HeaderPosition, footerPosition?: FooterPosition, hidden?: boolean, asideAds?: boolean;
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
            <div hidden={isHidden}>
                <Header position={headerPos} title={title} />
                <main className={`contain-fluid ${footerPos == 'fixed' ? 'pb-5' : ''}`} >
                    {
                        asideAds ? (
                            <div className="row gx-0">
                                <aside className="col-2 d-none d-lg-block py-5">
                                </aside>
                                <div className="col-12 col-lg-8">
                                    {children}
                                </div>
                                <aside className="col-2 d-none d-lg-block">
                                </aside>
                            </div>
                        ) : (children)
                    }
                </main>
                <Footer position={footerPos} />
            </div>
        </LayoutContext.Provider>
    )
}

export const useLayout = () => useContext(LayoutContext);
import { CSSProperties, ReactNode, useCallback, useEffect } from "react";
import Footer, { FooterPosition } from "./footer";
import Header, { HeaderPosition } from "./header";
import { Context, createContext, useContext, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useRouter } from "next/router";
import { pathTrim } from "../utils/path";

interface LayoutSettings {
  reset: () => void;
  isHidden: boolean;
  hidden: (hidden: boolean) => void;
}

const LayoutContext: Context<LayoutSettings> = createContext<LayoutSettings>({
  reset: () => {},
  isHidden: false,
  hidden: () => {},
});

export default function Layout({
  children,
  title,
  headerPosition,
  footerPosition,
  hidden,
  aside = true,
  className,
  style,
  bodyClassName,
  bodyStyle,
}: {
  children: ReactNode;
  title?: string;
  headerPosition?: HeaderPosition;
  footerPosition?: FooterPosition;
  hidden?: boolean;
  aside?: boolean;
  className?: string;
  style?: CSSProperties;
  bodyClassName?: string;
  bodyStyle?: CSSProperties;
}) {
  const [isHidden, setIsHidden] = useState<boolean>(hidden || false);
  const [showBackTop, setShowBackTop] = useState(false);

  const footerPos = footerPosition || "none";
  const headerPos = headerPosition || "sticky";

  const router = useRouter();
  const path = pathTrim(router.asPath);

  const config = {
    reset: () => {
      setIsHidden(hidden || false);
    },
    isHidden: isHidden,
    hidden: (hidden: boolean) => {
      setIsHidden(hidden);
    },
  };

  const handleScroll = useCallback(() => {
    setShowBackTop(window.scrollY > 400);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll, path]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <LayoutContext.Provider value={config}>
      <div
        hidden={isHidden}
        className={`${footerPos === "fixed" ? "pb-5" : ""} ${bodyClassName || ""}`}
        style={bodyStyle}
      >
        <Header position={headerPos} title={title} />

        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Back to top"
          className={`fixed bottom-16 right-8 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-border-default bg-bg-surface text-fg-secondary shadow-card hover:text-accent-cyan hover:border-accent-cyan/40 transition-all duration-300 sm:right-8 sm:bottom-16 max-sm:right-4 max-sm:bottom-12 ${
            showBackTop
              ? "translate-y-0 opacity-100 pointer-events-auto"
              : "translate-y-4 opacity-0 pointer-events-none"
          }`}
        >
          <ArrowUp size={18} />
        </button>

        <main className={className} style={style}>
          {aside ? <div className="mx-auto max-w-3xl px-4">{children}</div> : <>{children}</>}
        </main>

        <Footer position={footerPos} />
      </div>
    </LayoutContext.Provider>
  );
}

export const useLayout = () => useContext(LayoutContext);

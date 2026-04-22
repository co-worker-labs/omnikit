import { CSSProperties, ReactNode, useEffect, useMemo } from "react";
import Footer, { FooterPosition } from "./footer";
import Header, { HeaderPosition } from "./header";
import { Context, createContext, useContext, useState } from "react";
import styles from "./Layout.module.css";
import { useRouter } from "next/router";
import { listRecents, logAccess } from "../libs/recent";
import { pathTrim } from "../utils/path";
import Link from "next/link";
import { useTranslation } from "next-i18next/pages";

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

  const footerPos = footerPosition || "none";
  const headerPos = headerPosition || "sticky";

  const router = useRouter();
  const path = pathTrim(router.asPath);
  const { t } = useTranslation(["common", "tools"]);

  const recent = useMemo(() => {
    if (typeof window === "undefined") return [];
    return listRecents([path]);
  }, [path]);

  const config = {
    reset: () => {
      setIsHidden(hidden || false);
    },
    isHidden: isHidden,
    hidden: (hidden: boolean) => {
      setIsHidden(hidden);
    },
  };

  useEffect(() => {
    window.addEventListener("scroll", (e) => {
      const el = document.getElementById("backtopbtn");
      if (el) {
        if (document.body.scrollTop > 400 || document.documentElement.scrollTop > 400) {
          if (el.hasAttribute("hidden")) {
            el.removeAttribute("hidden");
          }
        } else {
          if (!el.hasAttribute("hidden")) {
            el.setAttribute("hidden", "true");
          }
        }
      }
    });
    logAccess(path);
  }, [path]);

  return (
    <LayoutContext.Provider value={config}>
      <div
        hidden={isHidden}
        className={` ${footerPos == "fixed" ? "pb-5" : ""} ${bodyClassName ? bodyClassName : ""}`}
        style={bodyStyle}
      >
        <Header position={headerPos} title={title} />
        <a
          href="#"
          className={`btn rounded-circle ${styles.backUpBtn} btn-dark`}
          id="backtopbtn"
          hidden
        >
          <i className="bi bi-arrow-bar-up fs-4"></i>
        </a>
        <main className={`${className ? className : ""}`} style={style}>
          {aside ? (
            <div className="row justify-content-center px-0 gx-0">
              <div className="col d-none d-lg-block">
                <div className="w-100 row justify-content-center ps-2 mt-2">
                  {recent.length > 0 && (
                    <div className={`${styles.asideContent} mt-3 px-2 mb-2`}>
                      <div className="h5 fw-bolder text-danger text-uppercase">
                        {t("common:layout.recent")}
                      </div>
                      <hr />
                      {recent.map((data, index) => {
                        return (
                          <div className="card mt-3 text-center" key={index}>
                            <div className="card-body py-2">
                              <Link href={data.path} className={`${styles.asideItem}`}>
                                <h5 className="card-title fw-bold">{data.title}</h5>
                                <p
                                  className="card-text text-truncate text-wrap text-muted"
                                  style={{ maxHeight: "2.8rem" }}
                                >
                                  {data.description}
                                </p>
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className={`col col-lg-7`}>{children}</div>
              <div className="col d-none d-lg-block">
                <div className="w-100 row justify-content-center ps-2 mt-2"></div>
              </div>
            </div>
          ) : (
            <>{children}</>
          )}
        </main>
        <Footer position={footerPos} />
      </div>
    </LayoutContext.Provider>
  );
}

export const useLayout = () => useContext(LayoutContext);

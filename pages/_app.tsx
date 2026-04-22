import "bootstrap-icons/font/bootstrap-icons.css";
import "../styles/globals.scss";
import type { AppProps } from "next/app";
import { useEffect } from "react";
import { ThemeProvider } from "../libs/theme";
import { appWithTranslation } from "next-i18next/pages";

function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    require("bootstrap/dist/js/bootstrap.bundle.min.js");
  }, []);

  return (
    <ThemeProvider>
      <Component {...pageProps} />
    </ThemeProvider>
  );
}

export default appWithTranslation(App);

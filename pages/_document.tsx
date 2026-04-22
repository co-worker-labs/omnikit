import { Html, Head, Main, NextScript } from "next/document";
import { ToastContainer } from "../components/toast";

export default function Document() {
  return (
    <Html>
      <Head>
        <link rel="icon" href="/favicon.ico" />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6128301546730956"
          crossOrigin="anonymous"
        ></script>
      </Head>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('bytecraft-theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-bs-theme',t)}else if(window.matchMedia('(prefers-color-scheme:dark)').matches){document.documentElement.setAttribute('data-bs-theme','dark')}}catch(e){}})()`,
          }}
        />
        <Main />
        <NextScript />
        <ToastContainer />
      </body>
    </Html>
  );
}

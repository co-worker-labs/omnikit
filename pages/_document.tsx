import { Html, Head, Main, NextScript } from 'next/document'
import { ToastContainer } from '../components/toast'

export default function Document() {
  return (
    <Html lang="en">
      <Head >
        <link rel="icon" href="/favicon.ico" />
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6128301546730956"
          crossOrigin="anonymous"></script>
      </Head>
      <body>
        <Main />
        <NextScript />
        <ToastContainer />
      </body>
    </Html>
  )
}

import { Html, Head, Main, NextScript } from 'next/document';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" href="/images/axiom-token-fallback.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/images/axiom-token-fallback.svg" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0f172a" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Cinzel:wght@400;600;700;900&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
        {GA_ID && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${GA_ID}', {
                    page_path: window.location.pathname,
                  });
                `,
              }}
            />
          </>
        )}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

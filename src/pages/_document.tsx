import { Html, Head, Main, NextScript } from 'next/document';
import React from 'react';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="description" content="AI Chat Application" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
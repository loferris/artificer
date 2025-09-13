// src/pages/_app.tsx
import React, { Component } from 'react';
import type { AppProps } from 'next/app';
import { trpc } from '../lib/trpc/client';
import '../styles/index.css';
import '../styles/themes/purple-rich.css';
import '../styles/themes/amber-forest.css';
import '../styles/themes/cyan-light.css';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <Component {...pageProps} />
    </ErrorBoundary>
  );
}

// Simple error boundary component
class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong. Please refresh the page.</h1>;
    }

    return this.props.children;
  }
}

export default trpc.withTRPC(MyApp);

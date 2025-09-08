import React from 'react';
import { Chat } from '../components/chat/Chat';
import { ErrorBoundary } from '../components/ErrorBoundary';

export default function HomePage() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Page-level error:', error, errorInfo);
      }}
    >
      <Chat />
    </ErrorBoundary>
  );
}

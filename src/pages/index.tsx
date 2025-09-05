import React from 'react';
import { Chat } from '../components/chat/Chat';
import { ErrorBoundary } from '../components/ErrorBoundary';

export default function HomePage() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log errors to console for debugging
        console.error('Page-level error:', error, errorInfo);
        
        // You can add additional error reporting here
        // For example, sending to an error reporting service
      }}
    >
      <Chat />
    </ErrorBoundary>
  );
}

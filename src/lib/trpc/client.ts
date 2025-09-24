import { httpBatchLink, wsLink, splitLink, createWSClient } from '@trpc/client';
import { createTRPCNext } from '@trpc/next';
import type { AppRouter } from '../../server/root';
import superjson from 'superjson';

function getBaseUrl() {
  if (typeof window !== 'undefined') return '';
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

function getWsUrl() {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/api/trpc-ws`;
  }
  return 'ws://localhost:3000/api/trpc-ws';
}

function getSessionId() {
  if (typeof window === 'undefined') return '';
  
  let sessionId = localStorage.getItem('session-id') || '';
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('session-id', sessionId);
  }
  return sessionId;
}

export const trpc = createTRPCNext<AppRouter>({
  config() {
    return {
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
          fetch(url, options) {
            // Create a longer timeout for AI requests (2 minutes)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 120000);

            return fetch(url, {
              ...options,
              signal: controller.signal,
            }).finally(() => clearTimeout(timeoutId));
          },
          headers() {
            return {
              'x-session-id': getSessionId(),
            };
          },
        }),
      ],
    };
  },
  ssr: false,
  transformer: superjson,
});

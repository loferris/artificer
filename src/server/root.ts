// src/server/root.ts
import { router } from './trpc';
import { chatRouterRefactored as chatRouter } from './routers/chat-refactored';
import { conversationsRouterRefactored as conversationsRouter } from './routers/conversations-refactored';
import { messagesRouter } from './routers/messages';
import { usageRouter } from './routers/usage';
import { exportRouter } from './routers/export';
import { subscriptionsRouter } from './routers/subscriptions';
import { projectsRouter } from './routers/projects';

export const appRouter = router({
  chat: chatRouter,
  conversations: conversationsRouter,
  messages: messagesRouter,
  usage: usageRouter,
  export: exportRouter,
  subscriptions: subscriptionsRouter,
  projects: projectsRouter,
});

export type AppRouter = typeof appRouter;

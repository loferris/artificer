// src/server/root.ts
import { router } from './trpc';
import { chatRouter } from './routers/chat';
import { conversationsRouter } from './routers/conversations';
import { messagesRouter } from './routers/messages';
import { usageRouter } from './routers/usage';
import { exportRouter } from './routers/export';
import { subscriptionsRouter } from './routers/subscriptions';
import { projectsRouter } from './routers/projects';
import { monitoringRouter } from './routers/monitoring';

export const appRouter = router({
  chat: chatRouter,
  conversations: conversationsRouter,
  messages: messagesRouter,
  usage: usageRouter,
  export: exportRouter,
  subscriptions: subscriptionsRouter,
  projects: projectsRouter,
  monitoring: monitoringRouter,
});

export type AppRouter = typeof appRouter;

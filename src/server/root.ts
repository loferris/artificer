// src/server/root.ts
import { router } from './trpc';
import { chatRouter } from './routers/chat';
import { conversationsRouter } from './routers/conversations';
import { messagesRouter } from './routers/messages';
import { usageRouter } from './routers/usage';
import { exportRouter } from './routers/export';
import { projectsRouter } from './routers/projects';
import { monitoringRouter } from './routers/monitoring';
import { authRouter } from './routers/auth';
import { searchRouter } from './routers/search';
import { orchestrationRouter } from './routers/orchestration';

export const appRouter = router({
  chat: chatRouter,
  conversations: conversationsRouter,
  messages: messagesRouter,
  usage: usageRouter,
  export: exportRouter,
  projects: projectsRouter,
  monitoring: monitoringRouter,
  auth: authRouter,
  search: searchRouter,
  orchestration: orchestrationRouter,
});

export type AppRouter = typeof appRouter;

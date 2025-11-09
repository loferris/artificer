import { router, publicProcedure, protectedProcedure } from '../../server/trpc';
import { createServicesFromContext } from '../services/ServiceFactory';

export const usageRouter = router({
  getSessionStats: protectedProcedure.query(async ({ ctx }) => {
    const { conversationService, messageService } = createServicesFromContext(ctx);

    const conversations = await conversationService.listConversations();

    // Get all messages from all conversations
    const allMessages = await Promise.all(
      conversations.map((conv) => messageService.getMessagesByConversation(conv.id)),
    );
    const messages = allMessages.flat();

    const totalTokens = messages.reduce((sum, msg) => sum + (msg.tokens || 0), 0);
    const totalCost = messages.reduce((sum, msg) => sum + (msg.cost || 0), 0);

    return {
      conversationCount: conversations.length,
      messageCount: messages.length,
      totalTokens,
      totalCost,
    };
  }),

  getModelUsage: protectedProcedure.query(async ({ ctx }) => {
    const { conversationService, messageService } = createServicesFromContext(ctx);

    const conversations = await conversationService.listConversations();

    // Get all messages from all conversations
    const allMessages = await Promise.all(
      conversations.map((conv) => messageService.getMessagesByConversation(conv.id)),
    );
    const messages = allMessages.flat();

    const roleStats = messages.reduce(
      (acc, msg) => {
        acc[msg.role] = (acc[msg.role] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const totalMessages = messages.length;

    return {
      totalMessages,
      byRole: Object.entries(roleStats).map(([role, count]) => ({
        role,
        count,
        percentage: totalMessages > 0 ? (count / totalMessages) * 100 : 0,
      })),
    };
  }),
});

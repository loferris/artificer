import { trpc } from './client';

export const useChat = () => {
  const utils = trpc.useUtils();

  const sendMessage = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      utils.messages.getByConversation.invalidate();
    },
  });

  const getMessages = trpc.messages.getByConversation.useQuery;

  return {
    sendMessage,
    getMessages,
  };
};

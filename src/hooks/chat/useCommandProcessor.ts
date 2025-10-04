import { useCallback } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { useTerminalTheme } from '../../contexts/TerminalThemeContext';
import { useExportManager } from '../../components/ExportManager';
import { trpc } from '../../lib/trpc/client';

const getManualContent = () => {
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
                     (typeof window !== 'undefined' && 
                      (window.location.hostname.includes('vercel.app') || 
                       window.location.hostname.includes('demo')));

  const demoHint = isDemoMode ? `

🎯 DEMO MODE TIPS:
- Try /list to see showcase conversations
- Type a number (1, 2, 3) to explore different conversations
- Switch between /view chat and /view terminal 
- Try /theme amber or /theme light for different looks
- Use /export-current to download conversations` : '';

  return `Available commands:
- /man: Show this manual.
- /clear: Clear conversation history.
- /new: Create a new conversation.
- /list: Show conversations (try this to see demo examples!)
- /list-all: Show all conversations.
- /export-current [format]: Export current conversation (formats: markdown, json; default: markdown)
- /export-all [format]: Export all conversations (formats: markdown, json; default: markdown)
- /theme [dark|amber|light]: Switch terminal theme (default: dark)
- /view [chat|terminal]: Switch view mode (default: terminal)
- /streaming [yes|no]: Toggle streaming mode (default: yes)
- /reset: Reset the session.${demoHint}`;
};

const formatList = (conversations: any[], limited: boolean) => {
  if (conversations.length === 0) {
    return 'No conversations found.';
  }

  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ||
                     (typeof window !== 'undefined' && 
                      (window.location.hostname.includes('vercel.app') || 
                       window.location.hostname.includes('demo')));

  const header = limited ? 'Available conversations (last 10):' : 'All available conversations:';
  
  const list = conversations
    .map((conv, index) => {
      const title = conv.title || 'Untitled';
      const messageCount = conv.messageCount || 0;
      const preview = conv.lastMessagePreview ? ` - ${conv.lastMessagePreview.substring(0, 60)}...` : '';
      
      if (isDemoMode && title.includes('Demo')) {
        return `${index + 1}. ✨ ${title} (${messageCount} messages)${preview}`;
      } else {
        const date = conv.createdAt ? new Date(conv.createdAt).toLocaleDateString() : 'Unknown date';
        return `${index + 1}. ${title} (${date}, ${messageCount} messages)${preview}`;
      }
    })
    .join('\n');

  const footer = isDemoMode 
    ? '\n💡 Type a number (1, 2, 3) to explore that conversation!\n🎨 Try /theme or /view to switch interfaces!'
    : '\nType a number to load a conversation.';

  return `${header}\n${list}${footer}`;
};

export function useCommandProcessor() {
  // Selectively subscribe to store values and methods
  const currentConversationId = useChatStore((state) => state.currentConversationId);
  const viewMode = useChatStore((state) => state.viewMode);
  const streamingMode = useChatStore((state) => state.streamingMode);

  const addMessage = useChatStore((state) => state.addMessage);
  const addLocalMessage = useChatStore((state) => state.addLocalMessage);
  const setCurrentConversation = useChatStore((state) => state.setCurrentConversation);
  const setSelectableConversations = useChatStore((state) => state.setSelectableConversations);
  const clearMessages = useChatStore((state) => state.clearMessages);
  const resetConversation = useChatStore((state) => state.resetConversation);
  const setViewMode = useChatStore((state) => state.setViewMode);
  const setStreamingMode = useChatStore((state) => state.setStreamingMode);

  const { setTheme, getThemeDisplayName, theme } = useTerminalTheme();
  const conversationsQuery = trpc.conversations.list.useQuery();
  const createConversationMutation = trpc.conversations.create.useMutation();

  const displayUserCommand = useCallback(
    (command: string) => {
      const userMessage = {
        id: `user-cmd-${Date.now()}`,
        role: 'user' as const,
        content: command,
        timestamp: new Date(),
      };

      if (!currentConversationId) {
        addLocalMessage(userMessage);
      } else {
        addMessage(userMessage);
      }
    },
    [currentConversationId, addLocalMessage, addMessage],
  );

  const displayMessage = useCallback(
    (content: string) => {
      const localMessage = {
        id: `local-cmd-${Date.now()}`,
        role: 'assistant' as const,
        content: content.trim(),
        timestamp: new Date(),
      };

      if (!currentConversationId) {
        addLocalMessage(localMessage);
      } else {
        addMessage(localMessage);
      }
    },
    [currentConversationId, addLocalMessage, addMessage],
  );

  const exportManager = useExportManager({
    currentConversationId: currentConversationId,
    onStatusMessage: displayMessage,
  });

  const handleNewConversation = async () => {
    const newConversation = await createConversationMutation.mutateAsync({});
    if (newConversation?.id) {
      setCurrentConversation(newConversation.id);
      conversationsQuery.refetch();
    }
  };

  const handleThemeCommand = (arg?: string) => {
    const themeMap: Record<string, 'purple-rich' | 'amber-forest' | 'cyan-light'> = {
      dark: 'purple-rich',
      amber: 'amber-forest',
      light: 'cyan-light',
    };

    if (!arg) {
      displayMessage(
        `Current theme: ${getThemeDisplayName(theme)} (${theme})\nAvailable themes: dark, amber, light`,
      );
      return;
    }

    const newTheme = themeMap[arg.toLowerCase()];
    if (!newTheme) {
      displayMessage(`Invalid theme '${arg}'. Available themes: dark, amber, light`);
      return;
    }

    setTheme(newTheme);
    displayMessage(`Theme changed to: ${getThemeDisplayName(newTheme)}`);
  };

  const handleViewCommand = (arg?: string) => {
    if (!arg) {
      displayMessage(`Current view: ${viewMode}\nAvailable views: chat, terminal`);
      return;
    }

    const newView = arg.toLowerCase() as 'terminal' | 'chat';
    if (newView !== 'chat' && newView !== 'terminal') {
      displayMessage(`Invalid view '${arg}'. Available views: chat, terminal`);
      return;
    }

    setViewMode(newView);
    displayMessage(`View changed to: ${newView}`);
  };

  const handleStreamingCommand = (arg?: string) => {
    if (!arg) {
      displayMessage(`Streaming mode: ${streamingMode ? 'yes' : 'no'}\nUsage: /streaming [yes|no]`);
      return;
    }

    const streamingArg = arg.toLowerCase();
    if (streamingArg === 'yes' || streamingArg === 'on' || streamingArg === 'true') {
      setStreamingMode(true);
      displayMessage('Streaming mode enabled');
    } else if (streamingArg === 'no' || streamingArg === 'off' || streamingArg === 'false') {
      setStreamingMode(false);
      displayMessage('Streaming mode disabled');
    } else {
      displayMessage(`Invalid streaming option '${arg}'. Use: yes, no, on, off, true, or false`);
    }
  };

  const handleListCommand = (cmd: 'list' | 'list-all') => {
    const convos = conversationsQuery.data || [];
    const toList = cmd === 'list' ? convos.slice(0, 10) : convos;
    setSelectableConversations(toList);
    const output = formatList(toList, cmd === 'list');
    displayMessage(output + '\n\nType a number to load a conversation.');
  };

  const processCommand = (command: string): boolean => {
    if (!command.startsWith('/')) {
      return false;
    }

    // Display the user's command in the terminal
    displayUserCommand(command);

    const [cmd, arg1] = command.substring(1).split(' ');
    const format = (arg1 || 'markdown') as 'markdown' | 'json';

    const validFormats = ['markdown', 'json'];
    if (
      (cmd === 'export-current' || cmd === 'export-all') &&
      arg1 &&
      !validFormats.includes(arg1)
    ) {
      displayMessage(`Error: Invalid format '${arg1}'. Valid formats: ${validFormats.join(', ')}`);
      return true;
    }

    if (cmd === 'theme') {
      handleThemeCommand(arg1);
      return true;
    }

    if (cmd === 'view') {
      handleViewCommand(arg1);
      return true;
    }

    if (cmd === 'streaming') {
      handleStreamingCommand(arg1);
      return true;
    }

    switch (cmd) {
      case 'man':
        displayMessage(`\n${getManualContent()}`);
        break;

      case 'new':
        handleNewConversation();
        break;

      case 'clear':
        clearMessages();
        displayMessage('Conversation history cleared.');
        break;

      case 'reset':
        resetConversation();
        break;

      case 'list':
      case 'list-all':
        handleListCommand(cmd);
        break;

      case 'export-current':
        exportManager.exportCurrent(format);
        break;

      case 'export-all':
        exportManager.exportAll(format);
        break;

      default:
        displayMessage(`Unknown command: /${cmd}\nType /man for help.`);
        break;
    }

    return true;
  };

  return { processCommand };
}

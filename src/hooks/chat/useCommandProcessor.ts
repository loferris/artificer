import { useCallback } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { useTerminalTheme } from '../../contexts/TerminalThemeContext';
import { useExportManager } from '../../components/ExportManager';
import { trpc } from '../../lib/trpc/client';

const getManualContent = () => {
  return `Available commands:
- /man: Show this manual.
- /clear: Clear conversation history.
- /new: Create a new conversation.
- /list: Show 10 most recent conversations.
- /list-all: Show all conversations.
- /export-current [format]: Export current conversation (formats: markdown, json; default: markdown)
- /export-all [format]: Export all conversations (formats: markdown, json; default: markdown)
- /theme [dark|amber|light]: Switch terminal theme (default: dark)
- /view [chat|terminal]: Switch view mode (default: terminal)
- /streaming [yes|no]: Toggle streaming mode (default: yes)
- /reset: Reset the session.`;
};

const formatList = (conversations: any[], limited: boolean) => {
  if (conversations.length === 0) {
    return 'No conversations found.';
  }

  const header = limited ? 'Last 10 conversations:' : 'All conversations:';
  const list = conversations
    .map((conv, index) => {
      const title = conv.title || 'Untitled';
      const date = conv.createdAt ? new Date(conv.createdAt).toLocaleDateString() : 'Unknown date';
      return `${index + 1}. ${title} (${date})`;
    })
    .join('\n');

  return `${header}\n${list}`;
};

export function useCommandProcessor() {
  const store = useChatStore();
  const { setTheme, getThemeDisplayName, theme } = useTerminalTheme();
  const conversationsQuery = trpc.conversations.list.useQuery();
  const createConversationMutation = trpc.conversations.create.useMutation();

  const displayUserCommand = useCallback((command: string) => {
    const userMessage = {
      id: `user-cmd-${Date.now()}`,
      role: 'user' as const,
      content: command,
      timestamp: new Date(),
    };

    if (!store.currentConversationId) {
      store.addLocalMessage(userMessage);
    } else {
      store.addMessage(userMessage);
    }
  }, [store.currentConversationId, store.addLocalMessage, store.addMessage]);

  const displayMessage = useCallback((content: string) => {
    const localMessage = {
      id: `local-cmd-${Date.now()}`,
      role: 'assistant' as const,
      content: content.trim(),
      timestamp: new Date(),
    };

    if (!store.currentConversationId) {
      store.addLocalMessage(localMessage);
    } else {
      store.addMessage(localMessage);
    }
  }, [store.currentConversationId, store.addLocalMessage, store.addMessage]);

  const exportManager = useExportManager({
    currentConversationId: store.currentConversationId,
    onStatusMessage: displayMessage,
  });

  const handleNewConversation = async () => {
    const newConversation = await createConversationMutation.mutateAsync({});
    if (newConversation?.id) {
        store.setCurrentConversation(newConversation.id);
        conversationsQuery.refetch();
    }
  };

  const handleThemeCommand = (arg?: string) => {
    const themeMap: Record<string, 'purple-rich' | 'amber-forest' | 'cyan-light'> = {
      'dark': 'purple-rich',
      'amber': 'amber-forest', 
      'light': 'cyan-light'
    };

    if (!arg) {
      displayMessage(`Current theme: ${getThemeDisplayName(theme)} (${theme})\nAvailable themes: dark, amber, light`);
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
      displayMessage(`Current view: ${store.viewMode}\nAvailable views: chat, terminal`);
      return;
    }

    const newView = arg.toLowerCase() as 'terminal' | 'chat';
    if (newView !== 'chat' && newView !== 'terminal') {
      displayMessage(`Invalid view '${arg}'. Available views: chat, terminal`);
      return;
    }

    store.setViewMode(newView);
    displayMessage(`View changed to: ${newView}`);
  };

  const handleStreamingCommand = (arg?: string) => {
    if (!arg) {
      displayMessage(`Streaming mode: ${store.streamingMode ? 'yes' : 'no'}\nUsage: /streaming [yes|no]`);
      return;
    }

    const streamingArg = arg.toLowerCase();
    if (streamingArg === 'yes' || streamingArg === 'on' || streamingArg === 'true') {
      store.setStreamingMode(true);
      displayMessage('Streaming mode enabled');
    } else if (streamingArg === 'no' || streamingArg === 'off' || streamingArg === 'false') {
      store.setStreamingMode(false);
      displayMessage('Streaming mode disabled');
    } else {
      displayMessage(`Invalid streaming option '${arg}'. Use: yes, no, on, off, true, or false`);
    }
  };

  const handleListCommand = (cmd: 'list' | 'list-all') => {
    const convos = conversationsQuery.data || [];
    const toList = cmd === 'list' ? convos.slice(0, 10) : convos;
    store.setSelectableConversations(toList);
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
    if ((cmd === 'export-current' || cmd === 'export-all') && arg1 && !validFormats.includes(arg1)) {
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
        store.clearMessages();
        displayMessage('Conversation history cleared.');
        break;
        
      case 'reset':
        store.resetConversation();
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

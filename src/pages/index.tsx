import React, { useState, useEffect } from 'react';
import { trpc } from '../lib/trpc/client';
import { TerminalView } from '../components/terminal/TerminalView';
import { ChatView } from '../components/chat/ChatView';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { CostTracker } from '../components/CostTracker';
import { useConversationManager } from '../hooks/chat/useConversationManager';
import { useChatState } from '../hooks/chat/useChatState';
import { useChatOperations } from '../hooks/chat/useChatOperations';
import type { Message } from '../types';

type ViewMode = 'terminal' | 'chat';

const getManualContent = () => {
  return `Available commands:\n- /man: Show this manual.\n- /new: Create a new conversation.\n- /list: Show 10 most recent conversations.\n- /list-all: Show all conversations.\n- /export-current [format]: Export current conversation (formats: markdown, json; default: markdown)\n- /export-all [format]: Export all conversations (formats: markdown, json; default: markdown)\n- /reset: Reset the session.`;
};

const WELCOME_MESSAGE: Message = {
  id: 'local-welcome',
  role: 'assistant',
  content: `Welcome to the AI Terminal.\n\n${getManualContent()}\n\nType a message to begin.`,
  timestamp: new Date(),
};

export default function HomePage() {
  const [viewMode, setViewMode] = useState<ViewMode>('terminal');
  const [localMessages, setLocalMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [selectableConversations, setSelectableConversations] = useState<any[]>([]);
  const [invalidAttempts, setInvalidAttempts] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const conversationManager = useConversationManager();
  const chatState = useChatState();
  const chatOperations = useChatOperations();

  const {
    currentConversationId,
    input,
    updateInput,
    setCurrentConversation,
  } = chatState;

  const { handleNewConversation, createConversationMutation } = conversationManager;
  const { handleSendMessage, addLocalAssistantMessage } = chatOperations;

  // Export queries - manually triggered
  const exportAllQuery = trpc.export.exportAll.useQuery({ format: 'markdown' }, { enabled: false });
  const trpcUtils = trpc.useUtils();

  useEffect(() => {
    if (currentConversationId) {
      setLocalMessages([]);
      setSelectableConversations([]);
    } else {
      setLocalMessages([WELCOME_MESSAGE]);
    }
  }, [currentConversationId]);

  const triggerDownload = (data: any, format: string, exportType: 'all' | 'current') => {
    const blob = new Blob([
      typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    ], {
      type: format === 'json' ? 'application/json' : 'text/plain',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5); // YYYY-MM-DDTHH-MM-SS
    const fileExtension = format === 'json' ? 'json' : 'md';
    a.download = `ai-export-${exportType}-${timestamp}.${fileExtension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatList = (convos: any[], twoColumns: boolean): string => {
    if (convos.length === 0) return 'No conversations found.';
    if (twoColumns) {
      let output = '\n';
      const mid = Math.ceil(convos.length / 2);
      const col1 = convos.slice(0, mid);
      const col2 = convos.slice(mid);
      for (let i = 0; i < mid; i++) {
        const c1 = col1[i];
        const c2 = col2[i];
        const num1 = i + 1;
        const num2 = i + 1 + mid;
        const title1 = `${num1}: ${c1.title || 'Untitled'}`.padEnd(35);
        const title2 = c2 ? `${num2}: ${c2.title || 'Untitled'}` : '';
        output += `${title1}${title2}\n`;
      }
      return output;
    } else {
      return '\n' + convos.map((c, i) => `${i + 1}: ${c.title || 'Untitled'}`).join('\n');
    }
  };

  const displayMessage = (content: string) => {
    const localMessage: Message = {
      id: `local-cmd-${Date.now()}`,
      role: 'assistant',
      content: content.trim(),
      timestamp: new Date(),
    };
    if (!currentConversationId) {
      setLocalMessages(prev => [...prev, localMessage]);
    } else {
      addLocalAssistantMessage(content);
    }
  };

  const handleCommand = (command: string) => {
    const [cmd, arg1] = command.substring(1).split(' ');
    const format = (arg1 || 'markdown') as any;
    
    // Validate format for export commands
    const validFormats = ['markdown', 'json'];
    if ((cmd === 'export-current' || cmd === 'export-all') && arg1 && !validFormats.includes(arg1)) {
      displayMessage(`Error: Invalid format '${arg1}'. Valid formats: ${validFormats.join(', ')}`);
      return;
    }

    if (cmd === 'man') {
      displayMessage(`\n${getManualContent()}`);
    } else if (cmd === 'new') {
      handleNewConversation();
    } else if (cmd === 'reset') {
      setCurrentConversation(null);
    } else if (cmd === 'list' || cmd === 'list-all') {
      const convos = conversationManager.conversations;
      const toList = cmd === 'list' ? convos.slice(0, 10) : convos;
      setSelectableConversations(toList);
      const output = formatList(toList, cmd === 'list');
      displayMessage(output + '\n\nType a number to load a conversation.');
    } else if (cmd === 'export-all') {
      displayMessage(`Exporting all conversations as ${format}...`);
      exportAllQuery.refetch({ format }).then(result => {
        if (result.data) {
          triggerDownload(result.data.data, format, 'all');
          displayMessage('Export complete.');
        } else {
          displayMessage('Export failed: No data received.');
        }
      }).catch(err => displayMessage(`Export failed: ${err.message}`));
    } else if (cmd === 'export-current') {
      if (!currentConversationId || currentConversationId.trim() === '') {
        displayMessage('Error: No conversation selected. Start a conversation first.');
        return;
      }
      displayMessage(`Exporting current conversation as ${format}...`);
      trpcUtils.export.exportConversation.fetch({ conversationId: currentConversationId, format }).then(result => {
        if (result && result.data) {
          triggerDownload(result.data, format, 'current');
          displayMessage('Export complete.');
        } else {
          displayMessage('Export failed: No data received.');
        }
      }).catch(err => displayMessage(`Export failed: ${err.message}`));
    } else {
      displayMessage(`Command not found: ${cmd}`);
    }
  };

  const processInput = () => {
    const capturedInput = input.trim();
    if (!capturedInput) return;

    updateInput('');

    if (selectableConversations.length > 0 && /^\d+$/.test(capturedInput)) {
      const index = parseInt(capturedInput, 10) - 1;
      if (index >= 0 && index < selectableConversations.length) {
        setCurrentConversation(selectableConversations[index].id);
        setSelectableConversations([]);
        setInvalidAttempts(0);
      } else {
        const newAttemptCount = invalidAttempts + 1;
        setInvalidAttempts(newAttemptCount);
        if (newAttemptCount >= 3) {
          displayMessage("Too many invalid attempts. Exiting selection mode.");
          setSelectableConversations([]);
          setInvalidAttempts(0);
        } else {
          displayMessage(`Invalid selection. Type a number from 1 to ${selectableConversations.length}.`);
        }
      }
      return;
    }

    if (selectableConversations.length > 0) {
      setSelectableConversations([]);
    }
    setInvalidAttempts(0);

    if (capturedInput.startsWith('/')) {
      handleCommand(capturedInput);
      return;
    }

    if (!currentConversationId) {
      createConversationMutation.mutate({ firstMessage: capturedInput });
    } else {
      handleSendMessage(capturedInput);
    }
  };

  const { data: serverMessages = [], isLoading: messagesLoading, error: messagesError } = trpc.messages.getByConversation.useQuery(
    { conversationId: currentConversationId || '' },
    { enabled: !!currentConversationId },
  );

  const messages = currentConversationId ? serverMessages : localMessages;

  const viewProps = {
    messages: messages,
    input: input,
    isCreatingConversation: conversationManager.isCreating,
    messagesLoading: messagesLoading,
    isLoading: chatState.isLoading,
    messagesError: messagesError,
    isConversationReady: true,
    canSendMessage: !!input.trim(),
    onInputChange: updateInput,
    onSendMessage: processInput,
  };

  // Export handlers for chat view
  const handleExportCurrent = async (format: 'markdown' | 'json' = 'markdown') => {
    if (!currentConversationId || currentConversationId.trim() === '') {
      alert('No conversation selected. Start a conversation first.');
      return;
    }
    try {
      const result = await trpcUtils.export.exportConversation.fetch({ conversationId: currentConversationId, format });
      if (result && result.data) {
        triggerDownload(result.data, format, 'current');
      } else {
        alert('Export failed: No data received.');
      }
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    }
  };

  const handleExportAll = async (format: 'markdown' | 'json' = 'markdown') => {
    try {
      const result = await exportAllQuery.refetch({ format });
      if (result.data) {
        triggerDownload(result.data.data, format, 'all');
      } else {
        alert('Export failed: No data received.');
      }
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    }
  };

  const chatViewProps = {
    ...viewProps,
    conversations: conversationManager.conversations,
    currentConversationId: currentConversationId,
    conversationsLoading: conversationManager.conversationsLoading,
    conversationsError: conversationManager.conversationsError,
    onSelectConversation: setCurrentConversation,
    onNewConversation: handleNewConversation,
    onDeleteConversation: () => {},
    onRefreshConversations: () => {},
    onToggleSidebar: () => setSidebarOpen(!sidebarOpen),
    onExportCurrent: handleExportCurrent,
    onExportAll: handleExportAll,
    sidebarOpen,
  };

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Page-level error:', error, errorInfo);
      }}
    >
      <div className="absolute top-2 right-2 z-10">
        <button 
          onClick={() => setViewMode(viewMode === 'terminal' ? 'chat' : 'terminal')}
          className="px-4 py-2 bg-gray-700 text-white rounded-md shadow-lg hover:bg-gray-800 transition-colors"
        >
          Switch to {viewMode === 'terminal' ? 'Classic' : 'Terminal'} View
        </button>
      </div>
      {viewMode === 'terminal' ? <TerminalView {...viewProps} /> : <ChatView {...chatViewProps} />}
      <CostTracker />
    </ErrorBoundary>
  );
}
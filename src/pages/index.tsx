import React from 'react';
import { SimplifiedChatView } from '../components/modern/SimplifiedChatView';
import { useChat } from '../hooks/chat/useChat';

function HomePage() {
  const chat = useChat();

  const handleExport = (format: 'markdown' | 'json', scope: 'current' | 'all') => {
    if (scope === 'current') {
      chat.onExportCurrent(format);
    } else {
      chat.onExportAll(format);
    }
  };

  return (
    <SimplifiedChatView
      currentProjectId={chat.currentProjectId}
      onProjectSelect={chat.setCurrentProject}
      currentConversationId={chat.currentConversationId}
      onConversationSelect={chat.setCurrentConversation}
      onNewConversation={chat.handleNewConversation}
      onDeleteConversation={(id) => chat.handleDeleteConversation(id, { stopPropagation: () => {} } as React.MouseEvent)}
      messages={chat.combinedMessages}
      input={chat.input}
      onInputChange={chat.setInput}
      onSendMessage={() => chat.handleMessageSubmit(chat.input)}
      isLoading={chat.isLoading}
      isCreatingConversation={chat.isCreatingConversation}
      orchestrationState={chat.orchestrationState}
      onExport={handleExport}
    />
  );
}

export default HomePage;

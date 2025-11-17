import React from 'react';
import { SimplifiedChatView } from '../components/modern/SimplifiedChatView';
import { useChat } from '../hooks/chat/useChat';
import { useDocumentUpdate } from '../hooks/useDocumentUpdate';
import { trpc } from '../lib/trpc/client';

function HomePage() {
  const chat = useChat();
  const documentUpdate = useDocumentUpdate();

  // Fetch documents for the current project
  const { data: projectDocuments } = trpc.projects.getDocuments.useQuery(
    { projectId: chat.currentProjectId || '' },
    { enabled: !!chat.currentProjectId }
  );

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
      documentUpdate={documentUpdate}
      projectDocuments={projectDocuments?.documents}
    />
  );
}

export default HomePage;

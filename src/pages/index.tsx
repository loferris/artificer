import React, { useEffect } from 'react';
import { SimplifiedChatView } from '../components/modern/SimplifiedChatView';
import { useChat } from '../hooks/chat/useChat';
import { useDocumentUpdate } from '../hooks/useDocumentUpdate';
import { useArtifacts } from '../hooks/useArtifacts';
import { trpc } from '../lib/trpc/client';

function HomePage() {
  const chat = useChat();
  const documentUpdate = useDocumentUpdate();
  const artifacts = useArtifacts(chat.currentConversationId || undefined);

  // Fetch documents for the current project
  const { data: projectDocuments } = trpc.projects.getDocuments.useQuery(
    { projectId: chat.currentProjectId || '' },
    { enabled: !!chat.currentProjectId }
  );

  // Auto-extract artifacts from assistant messages
  useEffect(() => {
    if (!chat.currentConversationId) return;

    const lastMessage = chat.combinedMessages[chat.combinedMessages.length - 1];
    if (!lastMessage || lastMessage.role !== 'assistant') return;

    // Check if we've already processed this message
    const alreadyExtracted = artifacts.artifacts.some(
      (a) => a.messageId === lastMessage.id
    );

    if (!alreadyExtracted && lastMessage.content) {
      // Extract artifacts from the message
      artifacts.extractArtifacts(lastMessage.content, lastMessage.id);
    }
  }, [chat.combinedMessages, chat.currentConversationId]);

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
      artifacts={artifacts.artifacts}
      onUpdateArtifact={artifacts.updateArtifact}
      onDeleteArtifact={artifacts.deleteArtifact}
      onPromoteToProject={(artifactId) => {
        if (chat.currentProjectId) {
          artifacts.promoteToProject(artifactId, chat.currentProjectId);
        }
      }}
    />
  );
}

export default HomePage;

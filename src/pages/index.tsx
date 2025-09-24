import React from 'react';
import { UnifiedTerminalView } from '../components/terminal/UnifiedTerminalView';
import { ChatView } from '../components/chat/ChatView';
import { AppShell, InterfaceSwitcher } from '../components/AppShell';
import { useChat } from '../hooks/chat/useChat';

function HomePage() {
  const chat = useChat();

  const renderTerminalInterface = () => (
    <UnifiedTerminalView
      messages={chat.combinedMessages}
      input={chat.input}
      onInputChange={chat.setInput}
      onMessageSend={chat.handleMessageSubmit}
      sidebarOpen={chat.sidebarOpen}
      onSidebarToggle={chat.toggleSidebar}
      isStreaming={chat.streamingMode}
      isLoading={chat.isLoading}
      isCreatingConversation={chat.isCreatingConversation}
      messagesLoading={chat.messagesLoading}
      messagesError={chat.messagesError}
      isConversationReady={true}
      canSendMessage={!!chat.input.trim() && !chat.isLoading && !chat.isCreatingConversation}
    />
  );

  const renderChatInterface = () => (
    <ChatView
      conversations={chat.conversations}
      currentConversationId={chat.currentConversationId}
      messages={chat.combinedMessages}
      input={chat.input}
      sidebarOpen={chat.sidebarOpen}
      conversationsLoading={chat.conversationsLoading}
      isCreatingConversation={chat.isCreatingConversation}
      messagesLoading={chat.messagesLoading}
      isLoading={chat.isLoading}
      conversationsError={chat.conversationsError}
      messagesError={chat.messagesError}
      isConversationReady={true}
      canSendMessage={!!chat.input.trim() && !chat.isLoading && !chat.isCreatingConversation}
      onSelectConversation={chat.setCurrentConversation}
      onNewConversation={chat.handleNewConversation}
      onDeleteConversation={chat.handleDeleteConversation}
      onRefreshConversations={chat.refreshConversations}
      onToggleSidebar={chat.toggleSidebar}
      onExportCurrent={chat.onExportCurrent}
      onExportAll={chat.onExportAll}
      onInputChange={chat.setInput}
      onSendMessage={() => chat.handleMessageSubmit(chat.input)}
    />
  );

  return (
    <AppShell viewMode={chat.viewMode} onViewModeChange={chat.setViewMode}>
      <InterfaceSwitcher
        viewMode={chat.viewMode}
        terminalInterface={renderTerminalInterface()}
        chatInterface={renderChatInterface()}
        onViewModeChange={chat.setViewMode}
      />
    </AppShell>
  );
}

export default HomePage;
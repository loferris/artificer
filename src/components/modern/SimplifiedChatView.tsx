import React, { useState, useEffect } from 'react';
import { ProjectSidebar } from './ProjectSidebar';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ProjectPanel } from './ProjectPanel';
import { DocumentUpdateProposalBanner } from './DocumentUpdateProposalBanner';
import type { Message } from './MessageList';
import type { DocumentUpdateProposal } from '../../hooks/useDocumentUpdate';

interface OrchestrationState {
  stage: 'analyzing' | 'routing' | 'executing' | 'validating' | 'retrying' | 'complete' | 'idle';
  message: string;
  progress: number;
  metadata?: {
    complexity?: number;
    category?: string;
    model?: string;
    cacheHit?: boolean;
    retryCount?: number;
    estimatedCost?: number;
  };
}

interface SimplifiedChatViewProps {
  // Project state
  currentProjectId: string | null;
  onProjectSelect: (projectId: string | null) => void;

  // Conversation state
  currentConversationId: string | null;
  onConversationSelect: (conversationId: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;

  // Message state
  messages: Message[];
  input: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;

  // Loading states
  isLoading?: boolean;
  isCreatingConversation?: boolean;
  orchestrationState?: OrchestrationState | null;

  // Export
  onExport?: (format: 'markdown' | 'json', scope: 'current' | 'all') => void;

  // Document Update
  documentUpdate?: {
    currentProposal: DocumentUpdateProposal | null;
    isGenerating: boolean;
    isApplying: boolean;
    proposeUpdate: (documentId: string, conversationContext: string, userRequest: string) => Promise<DocumentUpdateProposal | null>;
    applyProposal: () => Promise<boolean>;
    rejectProposal: () => void;
    shouldSuggestUpdate: (message: string) => boolean;
  };
  projectDocuments?: Array<{ id: string; filename: string }>;
}

export const SimplifiedChatView: React.FC<SimplifiedChatViewProps> = ({
  currentProjectId,
  onProjectSelect,
  currentConversationId,
  onConversationSelect,
  onNewConversation,
  onDeleteConversation,
  messages,
  input,
  onInputChange,
  onSendMessage,
  isLoading = false,
  isCreatingConversation = false,
  orchestrationState = null,
  onExport,
  documentUpdate,
  projectDocuments,
}) => {
  const [selectedProjectForPanel, setSelectedProjectForPanel] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [lastMessageContent, setLastMessageContent] = useState<string>('');

  const handleProjectManage = (projectId: string) => {
    setSelectedProjectForPanel(projectId);
  };

  const handleExport = (format: 'markdown' | 'json', scope: 'current' | 'all') => {
    onExport?.(format, scope);
    setShowExportMenu(false);
  };

  // Smart document selection: find the most relevant document based on message content
  const findRelevantDocument = (message: string, docs: Array<{ id: string; filename: string }>) => {
    const lowerMessage = message.toLowerCase();

    // Try to find explicit file references
    for (const doc of docs) {
      const filename = doc.filename.toLowerCase();
      if (lowerMessage.includes(filename) || lowerMessage.includes(filename.replace(/\.[^/.]+$/, ''))) {
        return doc;
      }
    }

    // Look for document type keywords
    if (lowerMessage.includes('readme')) {
      const readme = docs.find(d => d.filename.toLowerCase().includes('readme'));
      if (readme) return readme;
    }

    // Default to first document if available
    return docs[0];
  };

  // Check for document update opportunities after messages
  useEffect(() => {
    if (!documentUpdate || !projectDocuments || projectDocuments.length === 0) {
      return;
    }

    // Get the last user message
    const lastUserMessage = messages.filter(m => m.role === 'user').slice(-1)[0];
    if (!lastUserMessage || lastUserMessage.content === lastMessageContent) {
      return; // No new user message
    }

    // Update tracking
    setLastMessageContent(lastUserMessage.content);

    // Check if this message suggests updating a document
    if (documentUpdate.shouldSuggestUpdate(lastUserMessage.content)) {
      const targetDoc = findRelevantDocument(lastUserMessage.content, projectDocuments);

      if (targetDoc) {
        // Get recent conversation context (last 5 messages)
        const recentMessages = messages.slice(-5);
        const conversationContext = recentMessages
          .map(m => `${m.role}: ${m.content}`)
          .join('\n\n');

        // Propose the update
        documentUpdate.proposeUpdate(
          targetDoc.id,
          conversationContext,
          lastUserMessage.content
        );
      }
    }
  }, [messages, documentUpdate, projectDocuments, lastMessageContent]);

  // Get current conversation title
  const currentConversationTitle = currentConversationId
    ? messages.length > 0
      ? messages[0]?.content?.substring(0, 50) || 'New Conversation'
      : 'New Conversation'
    : 'No conversation selected';

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Left Sidebar */}
      <ProjectSidebar
        currentProjectId={currentProjectId}
        currentConversationId={currentConversationId}
        onProjectSelect={onProjectSelect}
        onConversationSelect={onConversationSelect}
        onNewConversation={onNewConversation}
        onDeleteConversation={onDeleteConversation}
        onProjectManage={handleProjectManage}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3">
                <h1 className="text-xl font-bold text-gray-900">AI Workflow Engine</h1>
                {currentProjectId && (
                  <>
                    <span className="text-gray-400">/</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-600">📁</span>
                      <span className="text-gray-700 font-medium">
                        {/* Project name will be shown in sidebar */}
                      </span>
                    </div>
                  </>
                )}
              </div>
              {currentConversationId && (
                <p className="text-sm text-gray-500 mt-1 truncate">
                  {currentConversationTitle}
                </p>
              )}
            </div>

            {/* Header Actions */}
            <div className="flex items-center space-x-3">
              {/* Export Dropdown */}
              {onExport && (
                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Export</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showExportMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowExportMenu(false)}
                      ></div>
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                          Current Conversation
                        </div>
                        <button
                          onClick={() => handleExport('markdown', 'current')}
                          disabled={!currentConversationId}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                        >
                          <span>📝</span>
                          <span>Markdown (.md)</span>
                        </button>
                        <button
                          onClick={() => handleExport('json', 'current')}
                          disabled={!currentConversationId}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                        >
                          <span>📄</span>
                          <span>JSON (.json)</span>
                        </button>

                        <div className="border-t border-gray-200 my-2"></div>

                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                          All Conversations
                        </div>
                        <button
                          onClick={() => handleExport('markdown', 'all')}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-2"
                        >
                          <span>📚</span>
                          <span>All as Markdown</span>
                        </button>
                        <button
                          onClick={() => handleExport('json', 'all')}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-2"
                        >
                          <span>📦</span>
                          <span>All as JSON</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Settings Button */}
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden bg-white flex flex-col">
          {isCreatingConversation ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-6xl mb-4">✨</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  Creating your conversation...
                </h3>
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
              </div>
            </div>
          ) : (
            <>
              {/* Document Update Proposal Banner */}
              {documentUpdate?.currentProposal && (
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <DocumentUpdateProposalBanner
                    proposal={documentUpdate.currentProposal}
                    onApply={async () => {
                      const success = await documentUpdate.applyProposal();
                      if (success) {
                        // Success feedback is handled by the hook
                      }
                    }}
                    onReject={documentUpdate.rejectProposal}
                    isApplying={documentUpdate.isApplying}
                  />
                </div>
              )}

              {/* Loading State for Document Update Generation */}
              {documentUpdate?.isGenerating && (
                <div className="p-4 bg-blue-50 border-b border-blue-200">
                  <div className="flex items-center space-x-3">
                    <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    <span className="text-blue-800">
                      Analyzing conversation and generating document update...
                    </span>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-hidden">
                <MessageList
                  messages={messages}
                  isLoading={isLoading}
                  orchestrationState={orchestrationState}
                />
              </div>
            </>
          )}
        </div>

        {/* Input Area */}
        <MessageInput
          value={input}
          onChange={onInputChange}
          onSend={onSendMessage}
          disabled={isCreatingConversation}
          isLoading={isLoading}
          placeholder={
            currentConversationId
              ? 'Type your message...'
              : 'Start a new conversation...'
          }
        />
      </div>

      {/* Project Panel */}
      {selectedProjectForPanel && (
        <ProjectPanel
          projectId={selectedProjectForPanel}
          isOpen={!!selectedProjectForPanel}
          onClose={() => setSelectedProjectForPanel(null)}
        />
      )}
    </div>
  );
};

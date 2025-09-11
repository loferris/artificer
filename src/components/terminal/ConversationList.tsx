
import React from 'react';
import { format } from 'date-fns';

// Minimalist ExportButton for terminal view
const ExportButton = () => (
  <button className="text-xs text-gray-400 hover:text-white">/export-all</button>
);

interface Conversation {
  id: string;
  title: string;
  updatedAt: string | Date;
}

interface ConversationListProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string, e: React.MouseEvent) => void;
  onRefreshConversations: () => void;
  isLoading: boolean;
  isCreating: boolean;
  error: Error | null;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  isCreating,
}) => {
  return (
    <div className="bg-gray-900/70 h-full flex flex-col p-2 font-mono text-sm">
      <h2 className="text-gray-400 text-xs mb-2">Sessions</h2>
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conv) => (
          <div 
            key={conv.id} 
            onClick={() => onSelectConversation(conv.id)}
            className={`cursor-pointer px-2 py-1 rounded ${conv.id === currentConversationId ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'}`}
          >
            {conv.title || 'new-session'}
          </div>
        ))}
      </div>
      <div className="pt-2 border-t border-gray-700">
        <button onClick={onNewConversation} disabled={isCreating} className="text-xs text-gray-400 hover:text-white disabled:opacity-50">
          {isCreating ? 'creating...' : '/new'}
        </button>
        <ExportButton />
      </div>
    </div>
  );
};

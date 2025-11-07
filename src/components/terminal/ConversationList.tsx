import React from 'react';
import { format } from 'date-fns';
import { useTerminalThemeClasses } from '../../contexts/TerminalThemeContext';

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
  onExportAll?: () => void;
  isLoading: boolean;
  isCreating: boolean;
  error: Error | null;
  className?: string;
  style?: React.CSSProperties;
  showExportButton?: boolean;
}

// Terminal-style ExportButton component
const TerminalExportButton: React.FC<{ onClick?: () => void; className?: string }> = ({
  onClick,
  className = '',
}) => {
  const themeClasses = useTerminalThemeClasses();

  return (
    <button
      onClick={onClick}
      className={`
        ${themeClasses.textTertiary}
        ${themeClasses.hoverBg}
        ${themeClasses.focusOutline}
        ${themeClasses.textXs}
        ${themeClasses.fontMono}
        ${themeClasses.transitionFast}
        ${themeClasses.radiusSm}
        ${themeClasses.pXs}
        cursor-pointer
        ${className}
      `}
      title='Export all conversations'
    >
      /export-all
    </button>
  );
};

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRefreshConversations,
  onExportAll,
  isLoading,
  isCreating,
  error,
  className = '',
  style,
  showExportButton = true,
}) => {
  const themeClasses = useTerminalThemeClasses();

  const formatConversationTime = (date: string | Date): string => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return '';
      return format(dateObj, 'MMM d');
    } catch {
      return '';
    }
  };

  return (
    <div
      className={`
        ${themeClasses.bgConversationList}
        ${themeClasses.textSecondary}
        ${themeClasses.fontMono}
        ${themeClasses.textSm}
        ${themeClasses.transitionFast}
        h-full
        flex
        flex-col
        ${themeClasses.pSm}
        ${className}
      `}
      style={style}
    >
      {/* Header */}
      <div className='flex items-center justify-between mb-3'>
        <h2 className={`${themeClasses.textTertiary} ${themeClasses.textXs} font-bold`}>
          SESSIONS ({conversations.length})
        </h2>

        {/* Refresh Button */}
        <button
          onClick={onRefreshConversations}
          disabled={isLoading}
          className={`
            ${themeClasses.textMuted}
            ${themeClasses.hoverBg}
            ${themeClasses.focusOutline}
            ${themeClasses.textXs}
            ${themeClasses.radiusSm}
            ${themeClasses.pXs}
            ${themeClasses.disabledOpacity}
            ${themeClasses.transitionFast}
            cursor-pointer
            ${isLoading ? 'animate-spin' : ''}
          `}
          title='Refresh conversations'
        >
          ⟲
        </button>
      </div>

      {/* Conversations List */}
      <div className='flex-1 overflow-y-auto space-y-1'>
        {error ? (
          <div className={`${themeClasses.accentError} ${themeClasses.textXs} p-2`}>
            <div className='flex items-center'>
              <span className='mr-1'>!</span>
              <span>failed-to-load</span>
            </div>
            <button
              onClick={onRefreshConversations}
              className={`${themeClasses.textMuted} mt-1 underline hover:no-underline`}
            >
              retry
            </button>
          </div>
        ) : isLoading && conversations.length === 0 ? (
          <div className={`${themeClasses.textMuted} ${themeClasses.textXs} p-2`}>
            <div className='flex items-center'>
              <div className={`animate-spin mr-2 ${themeClasses.accentPrompt}`}>⟲</div>
              <span>loading-sessions...</span>
            </div>
          </div>
        ) : conversations.length === 0 ? (
          <div className={`${themeClasses.textMuted} ${themeClasses.textXs} p-2`}>
            <div>no-sessions-found</div>
            <div className='mt-1'>{/* create one with /new */}</div>
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => onSelectConversation(conv.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                onDeleteConversation(conv.id, e);
              }}
              className={`
                cursor-pointer 
                ${themeClasses.pSm}
                ${themeClasses.radiusSm}
                ${themeClasses.transitionFast}
                group
                relative
                ${
                  conv.id === currentConversationId
                    ? `${themeClasses.bgConversationActive} ${themeClasses.textPrimary}`
                    : `${themeClasses.hoverBg} ${themeClasses.textSecondary}`
                }
              `}
              title={`${conv.title || 'untitled-session'} - ${formatConversationTime(conv.updatedAt)}`}
            >
              <div className='flex items-center justify-between'>
                <div className='flex-1 min-w-0'>
                  <div className={`truncate ${themeClasses.textXs}`}>
                    {conv.title || 'untitled-session'}
                  </div>
                  <div className={`${themeClasses.textMuted} text-xs mt-1`}>
                    {formatConversationTime(conv.updatedAt)}
                  </div>
                </div>

                {/* Delete button on hover */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(conv.id, e);
                  }}
                  className={`
                    opacity-0
                    group-hover:opacity-100
                    ${themeClasses.accentError}
                    ${themeClasses.hoverBg}
                    ${themeClasses.radiusSm}
                    ${themeClasses.transitionFast}
                    w-4
                    h-4
                    flex
                    items-center
                    justify-center
                    text-xs
                    ml-2
                  `}
                  title='Delete session'
                >
                  ×
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Action Bar */}
      <div className={`pt-2 mt-2 ${themeClasses.borderMuted} border-t space-y-2`}>
        <div className='flex items-center justify-between'>
          <button
            onClick={onNewConversation}
            disabled={isCreating}
            className={`
              ${themeClasses.textTertiary}
              ${themeClasses.hoverBg}
              ${themeClasses.focusOutline}
              ${themeClasses.textXs}
              ${themeClasses.fontMono}
              ${themeClasses.radiusSm}
              ${themeClasses.pXs}
              ${themeClasses.disabledOpacity}
              ${themeClasses.transitionFast}
              cursor-pointer
              flex
              items-center
            `}
            title={isCreating ? 'Creating session...' : 'Create new session'}
          >
            {isCreating ? (
              <>
                <div className={`animate-spin mr-2 ${themeClasses.accentWarning}`}>⟲</div>
                <span>/creating...</span>
              </>
            ) : (
              '/new'
            )}
          </button>

          {showExportButton && <TerminalExportButton onClick={onExportAll} />}
        </div>

        {/* Status line */}
        <div className={`${themeClasses.textMuted} ${themeClasses.textXs} flex justify-between`}>
          <span>
            {conversations.length > 0
              ? `${conversations.length} session${conversations.length !== 1 ? 's' : ''}`
              : 'no-sessions'}
          </span>
          {currentConversationId && <span className={`${themeClasses.accentPrompt}`}>ACTIVE</span>}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { format } from 'date-fns';
import { trpc } from '../../lib/trpc/client';
import type { ProjectWithStats } from '../../server/services/project/ProjectService';

interface Conversation {
  id: string;
  title: string;
  projectId?: string | null;
  updatedAt: string | Date;
}

interface ProjectSidebarProps {
  currentProjectId: string | null;
  currentConversationId: string | null;
  onProjectSelect: (projectId: string | null) => void;
  onConversationSelect: (conversationId: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
  onProjectManage: (projectId: string) => void;
  className?: string;
}

export const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  currentProjectId,
  currentConversationId,
  onProjectSelect,
  onConversationSelect,
  onNewConversation,
  onDeleteConversation,
  onProjectManage,
  className = '',
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { data: projectsData, isLoading: projectsLoading } = trpc.projects.list.useQuery();
  const { data: conversations, isLoading: conversationsLoading } = trpc.conversations.list.useQuery();

  const projects = projectsData?.projects || [];

  // Filter conversations by current project
  const filteredConversations = currentProjectId
    ? (conversations || []).filter((c: Conversation) => c.projectId === currentProjectId)
    : (conversations || []).filter((c: Conversation) => !c.projectId); // Show unassigned when no project selected

  const formatDate = (date: Date | string) => {
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return format(d, 'MMM d');
    } catch {
      return 'Unknown';
    }
  };

  if (isCollapsed) {
    return (
      <div className={`w-12 bg-gray-50 border-r border-gray-200 flex flex-col items-center py-4 ${className}`}>
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          title="Expand sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className={`w-80 bg-gray-50 border-r border-gray-200 flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Projects</h2>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
          title="Collapse sidebar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto">
        {/* No Project Option */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onProjectSelect(null)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onProjectSelect(null)
            }
          }}
          className={`px-4 py-3 cursor-pointer transition-colors border-l-4 ${
            currentProjectId === null
              ? 'bg-blue-50 border-blue-500'
              : 'border-transparent hover:bg-gray-100'
          }`}
          aria-label="Select general conversations"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-gray-600">📝</span>
              <span className="font-medium text-gray-900">General</span>
            </div>
            {currentProjectId === null && (
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1 ml-6">
            Unassigned conversations
          </div>
        </div>

        {/* Projects */}
        {projectsLoading ? (
          <div className="px-4 py-8 text-center text-gray-500">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            Loading projects...
          </div>
        ) : projects.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            <div className="text-3xl mb-2">📁</div>
            <p className="text-sm">No projects yet</p>
          </div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className={`px-4 py-3 cursor-pointer transition-colors border-l-4 group ${
                currentProjectId === project.id
                  ? 'bg-blue-50 border-blue-500'
                  : 'border-transparent hover:bg-gray-100'
              }`}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => onProjectSelect(project.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onProjectSelect(project.id)
                  }
                }}
                aria-label={`Select project ${project.name}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <span className="text-gray-600">📁</span>
                    <span className="font-medium text-gray-900 truncate">{project.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onProjectManage(project.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-all"
                      title="Manage project"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                    {currentProjectId === project.id && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                </div>
                {project.description && (
                  <div className="text-xs text-gray-500 mt-1 ml-6 truncate">
                    {project.description}
                  </div>
                )}
                <div className="flex items-center space-x-3 text-xs text-gray-400 mt-1 ml-6">
                  <span>📄 {project.stats.documentCount || 0}</span>
                  <span>💬 {project.stats.conversationCount || 0}</span>
                  <span>{formatDate(project.updatedAt)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Conversations Section */}
      <div className="border-t border-gray-200">
        <div className="px-4 py-3 bg-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">
              {currentProjectId ? 'Project Conversations' : 'Recent Conversations'}
            </h3>
            <button
              onClick={onNewConversation}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              + New
            </button>
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto">
          {conversationsLoading ? (
            <div className="px-4 py-6 text-center text-gray-500">
              <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              Loading...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="px-4 py-6 text-center text-gray-500">
              <div className="text-2xl mb-1">💬</div>
              <p className="text-xs">No conversations yet</p>
            </div>
          ) : (
            filteredConversations.map((conversation: Conversation) => (
              <div
                key={conversation.id}
                role="button"
                tabIndex={0}
                onClick={() => onConversationSelect(conversation.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onConversationSelect(conversation.id)
                  }
                }}
                className={`px-4 py-2 cursor-pointer transition-colors group ${
                  currentConversationId === conversation.id
                    ? 'bg-blue-100'
                    : 'hover:bg-gray-100'
                }`}
                aria-label={`Select conversation ${conversation.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {conversation.title || 'New Conversation'}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {formatDate(conversation.updatedAt)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(conversation.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 ml-2 p-1 hover:bg-red-100 rounded text-red-500 transition-all"
                    title="Delete conversation"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

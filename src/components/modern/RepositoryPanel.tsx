/**
 * Panel for managing GitHub/GitLab repository connections
 */

import React, { useState } from 'react';
import { trpc } from '../../utils/trpc';
import { format } from 'date-fns';
import { ConnectRepositoryModal } from './ConnectRepositoryModal';

interface RepositoryPanelProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const RepositoryPanel: React.FC<RepositoryPanelProps> = ({
  projectId,
  isOpen,
  onClose,
}) => {
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);

  const { data: repositories, refetch: refetchRepositories } =
    trpc.repositories.list.useQuery(
      { projectId },
      { enabled: isOpen && !!projectId }
    );

  const { data: selectedRepo } = trpc.repositories.get.useQuery(
    { repositoryId: selectedRepoId! },
    { enabled: !!selectedRepoId }
  );

  const syncMutation = trpc.repositories.sync.useMutation({
    onSuccess: () => {
      refetchRepositories();
    },
  });

  const deleteMutation = trpc.repositories.delete.useMutation({
    onSuccess: () => {
      refetchRepositories();
      setSelectedRepoId(null);
    },
  });

  const handleSync = async (repositoryId: string) => {
    try {
      await syncMutation.mutateAsync({ repositoryId });
    } catch (error) {
      alert('Failed to sync repository. Please check your access token and try again.');
    }
  };

  const handleDelete = async (repositoryId: string, repoName: string) => {
    if (!confirm(`Are you sure you want to disconnect ${repoName}?`)) return;

    try {
      await deleteMutation.mutateAsync({ repositoryId });
    } catch (error) {
      alert('Failed to delete repository connection. Please try again.');
    }
  };

  const formatSyncStatus = (status: string) => {
    switch (status) {
      case 'pending':
        return { text: 'Pending', color: 'text-yellow-600', bg: 'bg-yellow-100' };
      case 'syncing':
        return { text: 'Syncing...', color: 'text-blue-600', bg: 'bg-blue-100' };
      case 'synced':
        return { text: 'Synced', color: 'text-green-600', bg: 'bg-green-100' };
      case 'failed':
        return { text: 'Failed', color: 'text-red-600', bg: 'bg-red-100' };
      default:
        return { text: 'Unknown', color: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };

  const getProviderIcon = (provider: string) => {
    if (provider === 'github') {
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.546 10.93L13.067.452c-.604-.603-1.582-.603-2.188 0L.397 10.93c-.531.529-.531 1.387 0 1.916l10.48 10.478c.604.604 1.582.604 2.188 0l10.48-10.478c.53-.529.53-1.387 0-1.916z"/>
      </svg>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-3xl bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-gray-900">
                Repository Connections
              </h2>
              <p className="text-gray-600 mt-1">
                Manage GitHub and GitLab repositories linked to this project
              </p>
            </div>
            <button
              onClick={onClose}
              className="ml-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Stats */}
          <div className="flex items-center space-x-6 mt-4 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span>{repositories?.length || 0} repositories</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Add Repository Button */}
          <div className="mb-6">
            <button
              onClick={() => setShowConnectModal(true)}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Connect Repository</span>
            </button>
          </div>

          {/* Repositories List */}
          {!repositories || repositories.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔗</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                No repositories connected
              </h3>
              <p className="text-gray-500 mb-4">
                Connect a GitHub or GitLab repository to sync code files with this project
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {repositories.map((repo: any) => {
                const status = formatSyncStatus(repo.syncStatus);
                const isSyncing = syncMutation.isLoading;

                return (
                  <div
                    key={repo.id}
                    className="bg-gray-50 border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors"
                  >
                    {/* Repository Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-3 flex-1 min-w-0">
                        <div className="mt-1 text-gray-600">
                          {getProviderIcon(repo.provider)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 truncate">
                            {repo.repoOwner}/{repo.repoName}
                          </h4>
                          <div className="flex items-center space-x-3 mt-1 text-sm text-gray-500">
                            <span className="flex items-center space-x-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                              </svg>
                              <span>{repo.branch}</span>
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${status.bg} ${status.color}`}>
                              {status.text}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleSync(repo.id)}
                          disabled={isSyncing}
                          className="p-2 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                          title="Sync repository"
                        >
                          <svg
                            className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(repo.id, `${repo.repoOwner}/${repo.repoName}`)}
                          className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-500"
                          title="Disconnect repository"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Repository Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="bg-white p-3 rounded-lg">
                        <div className="text-xs text-gray-500 mb-1">Files Synced</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {repo.filesSynced || 0}
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded-lg">
                        <div className="text-xs text-gray-500 mb-1">Last Sync</div>
                        <div className="text-sm font-medium text-gray-900">
                          {repo.lastSyncedAt
                            ? format(new Date(repo.lastSyncedAt), 'MMM d, HH:mm')
                            : 'Never'}
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded-lg">
                        <div className="text-xs text-gray-500 mb-1">Auto Sync</div>
                        <div className="text-sm font-medium text-gray-900">
                          {repo.autoSync ? (
                            <span className="text-green-600">Enabled</span>
                          ) : (
                            <span className="text-gray-400">Disabled</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Repository Details (expandable) */}
                    {selectedRepoId === repo.id && selectedRepo && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="mb-3">
                          <h5 className="text-sm font-semibold text-gray-700 mb-2">
                            Recent Files
                          </h5>
                          {selectedRepo.documents && selectedRepo.documents.length > 0 ? (
                            <div className="space-y-2">
                              {selectedRepo.documents.map((doc: any) => (
                                <div
                                  key={doc.id}
                                  className="flex items-center justify-between text-sm bg-white p-2 rounded"
                                >
                                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                                    <span className="text-gray-400">
                                      {doc.document.type === 'code' ? '📝' : '📄'}
                                    </span>
                                    <span className="truncate text-gray-700">
                                      {doc.document.filename}
                                    </span>
                                  </div>
                                  <span className="text-xs text-gray-500 ml-2">
                                    {doc.document.language || 'text'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">No files synced yet</p>
                          )}
                        </div>

                        {/* Filters */}
                        {(repo.pathFilters?.length > 0 || repo.ignorePatterns?.length > 0) && (
                          <div className="mt-3 space-y-2">
                            {repo.pathFilters?.length > 0 && (
                              <div>
                                <h5 className="text-xs font-semibold text-gray-700 mb-1">
                                  Path Filters
                                </h5>
                                <div className="flex flex-wrap gap-1">
                                  {repo.pathFilters.map((filter: string, idx: number) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-mono"
                                    >
                                      {filter}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {repo.ignorePatterns?.length > 0 && (
                              <div>
                                <h5 className="text-xs font-semibold text-gray-700 mb-1">
                                  Ignore Patterns
                                </h5>
                                <div className="flex flex-wrap gap-1">
                                  {repo.ignorePatterns.slice(0, 5).map((pattern: string, idx: number) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-xs font-mono"
                                    >
                                      {pattern}
                                    </span>
                                  ))}
                                  {repo.ignorePatterns.length > 5 && (
                                    <span className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-xs">
                                      +{repo.ignorePatterns.length - 5} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <button
                          onClick={() => setSelectedRepoId(null)}
                          className="mt-3 text-sm text-gray-500 hover:text-gray-700"
                        >
                          Hide details
                        </button>
                      </div>
                    )}

                    {/* Show Details Button */}
                    {selectedRepoId !== repo.id && (
                      <button
                        onClick={() => setSelectedRepoId(repo.id)}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                      >
                        <span>Show details</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Files from connected repositories are automatically indexed for RAG
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Connect Repository Modal */}
      <ConnectRepositoryModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        projectId={projectId}
        onSuccess={() => {
          refetchRepositories();
          setShowConnectModal(false);
        }}
      />
    </>
  );
};

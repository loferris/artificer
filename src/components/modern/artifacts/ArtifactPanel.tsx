/**
 * Artifact panel - shows all artifacts in a conversation
 */

import React, { useState } from 'react';
import type { Artifact } from '../../../../lib/llm-artifacts/src/core/types';
import { ArtifactViewer } from './ArtifactViewer';

interface ArtifactPanelProps {
  artifacts: Artifact[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateArtifact?: (artifactId: string, content: string) => void;
  onDeleteArtifact?: (artifactId: string) => void;
  onPromoteToProject?: (artifactId: string) => void;
  hasProject?: boolean;
}

export const ArtifactPanel: React.FC<ArtifactPanelProps> = ({
  artifacts,
  isOpen,
  onClose,
  onUpdateArtifact,
  onDeleteArtifact,
  onPromoteToProject,
  hasProject = false,
}) => {
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedArtifact = artifacts.find((a) => a.id === selectedArtifactId) || null;

  // Filter artifacts by search query
  const filteredArtifacts = artifacts.filter((artifact) => {
    const query = searchQuery.toLowerCase();
    return (
      artifact.title?.toLowerCase().includes(query) ||
      artifact.description?.toLowerCase().includes(query) ||
      artifact.filename?.toLowerCase().includes(query) ||
      artifact.type.toLowerCase().includes(query)
    );
  });

  // Group artifacts by type
  const artifactsByType = filteredArtifacts.reduce((acc, artifact) => {
    const type = artifact.type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(artifact);
    return acc;
  }, {} as Record<string, Artifact[]>);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'code':
        return '💻';
      case 'markdown':
        return '📝';
      case 'mermaid':
        return '📊';
      case 'html':
        return '🌐';
      case 'svg':
        return '🎨';
      case 'json':
        return '📋';
      case 'yaml':
        return '⚙️';
      case 'csv':
        return '📊';
      default:
        return '📄';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'code':
        return 'bg-blue-100 text-blue-800';
      case 'markdown':
        return 'bg-green-100 text-green-800';
      case 'mermaid':
        return 'bg-purple-100 text-purple-800';
      case 'html':
        return 'bg-orange-100 text-orange-800';
      case 'svg':
        return 'bg-pink-100 text-pink-800';
      case 'json':
        return 'bg-yellow-100 text-yellow-800';
      case 'yaml':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[600px] bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold">Artifacts</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-blue-100">
            {artifacts.length} artifact{artifacts.length !== 1 ? 's' : ''} in this conversation
          </p>

          {/* Search */}
          <div className="mt-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search artifacts..."
              className="w-full px-4 py-2 rounded bg-white/20 text-white placeholder-white/60 focus:outline-none focus:bg-white/30"
            />
          </div>
        </div>

        {/* Content */}
        {selectedArtifact ? (
          /* Artifact Viewer */
          <div className="flex-1 overflow-hidden">
            <ArtifactViewer
              artifact={selectedArtifact}
              onEdit={
                onUpdateArtifact
                  ? (content) => onUpdateArtifact(selectedArtifact.id, content)
                  : undefined
              }
              onClose={() => setSelectedArtifactId(null)}
              onPromoteToProject={
                onPromoteToProject
                  ? () => onPromoteToProject(selectedArtifact.id)
                  : undefined
              }
              hasProject={hasProject}
            />
          </div>
        ) : (
          /* Artifact List */
          <div className="flex-1 overflow-y-auto">
            {artifacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  No artifacts yet
                </h3>
                <p className="text-sm text-gray-500 max-w-sm">
                  Artifacts like code files, documents, and diagrams will appear here as they're created during the conversation.
                </p>
              </div>
            ) : filteredArtifacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  No matches found
                </h3>
                <p className="text-sm text-gray-500">
                  Try a different search query
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-6">
                {Object.entries(artifactsByType).map(([type, typeArtifacts]) => (
                  <div key={type}>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3 flex items-center">
                      <span className="mr-2">{getTypeIcon(type)}</span>
                      {type} ({typeArtifacts.length})
                    </h3>
                    <div className="space-y-2">
                      {typeArtifacts.map((artifact) => (
                        <div
                          key={artifact.id}
                          onClick={() => setSelectedArtifactId(artifact.id)}
                          className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md cursor-pointer transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className="font-medium text-gray-900 truncate">
                                  {artifact.title || 'Untitled'}
                                </h4>
                                <span className={`px-2 py-0.5 text-xs rounded ${getTypeColor(artifact.type)}`}>
                                  {artifact.type}
                                </span>
                              </div>
                              {artifact.description && (
                                <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                                  {artifact.description}
                                </p>
                              )}
                              <div className="flex items-center space-x-3 text-xs text-gray-500">
                                {artifact.filename && (
                                  <span className="flex items-center">
                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    {artifact.filename}
                                  </span>
                                )}
                                {artifact.language && (
                                  <span className="flex items-center">
                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                    </svg>
                                    {artifact.language}
                                  </span>
                                )}
                                <span>v{artifact.version}</span>
                                <span>{new Date(artifact.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                            {onDeleteArtifact && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Delete this artifact?')) {
                                    onDeleteArtifact(artifact.id);
                                  }
                                }}
                                className="ml-2 p-1 text-gray-400 hover:text-red-600 transition-colors"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

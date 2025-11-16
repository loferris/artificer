/**
 * Generic artifact viewer that switches between different viewers based on type
 */

import React from 'react';
import type { Artifact } from '../../../../lib/llm-artifacts/src/core/types';
import { ArtifactCodeViewer } from './ArtifactCodeViewer';
import { ArtifactMarkdownViewer } from './ArtifactMarkdownViewer';

interface ArtifactViewerProps {
  artifact: Artifact;
  onEdit?: (content: string) => void;
  onClose?: () => void;
  onPromoteToProject?: () => void;
  hasProject?: boolean;
  readOnly?: boolean;
}

export const ArtifactViewer: React.FC<ArtifactViewerProps> = ({
  artifact,
  onEdit,
  onClose,
  onPromoteToProject,
  hasProject = false,
  readOnly = false,
}) => {
  const renderViewer = () => {
    switch (artifact.type) {
      case 'code':
        return <ArtifactCodeViewer artifact={artifact} onEdit={onEdit} readOnly={readOnly} />;

      case 'markdown':
        return <ArtifactMarkdownViewer artifact={artifact} onEdit={onEdit} readOnly={readOnly} />;

      case 'json':
      case 'yaml':
      case 'csv':
      case 'text':
        // Use code viewer for structured data
        return <ArtifactCodeViewer artifact={artifact} onEdit={onEdit} readOnly={readOnly} />;

      case 'html':
        // HTML preview
        return (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-600">HTML Preview</span>
              {onClose && (
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <div className="flex-1 overflow-auto p-4">
              <iframe
                srcDoc={artifact.content}
                className="w-full h-full border border-gray-300 rounded"
                sandbox="allow-scripts"
                title="HTML Preview"
              />
            </div>
          </div>
        );

      case 'svg':
        // SVG preview
        return (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-600">SVG Graphics</span>
              {onClose && (
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <div className="flex-1 overflow-auto p-8 flex items-center justify-center bg-gray-50">
              <div dangerouslySetInnerHTML={{ __html: artifact.content }} />
            </div>
          </div>
        );

      case 'mermaid':
        // Mermaid diagram (show as code for now, would need mermaid library for rendering)
        return (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-600">Mermaid Diagram</span>
              {onClose && (
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800">
                  💡 Mermaid diagram rendering coming soon. For now, copy the code and paste it into a Mermaid viewer.
                </p>
              </div>
              <pre className="p-4 bg-gray-900 text-gray-100 rounded overflow-auto">
                <code className="text-sm font-mono whitespace-pre">{artifact.content}</code>
              </pre>
            </div>
          </div>
        );

      default:
        // Fallback to code viewer
        return <ArtifactCodeViewer artifact={artifact} onEdit={onEdit} readOnly={readOnly} />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold truncate">
            {artifact.title || 'Untitled Artifact'}
          </h3>
          {artifact.description && (
            <p className="text-sm text-blue-100 truncate mt-0.5">
              {artifact.description}
            </p>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-4 p-1 hover:bg-white/20 rounded transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Viewer Content */}
      <div className="flex-1 overflow-hidden">
        {renderViewer()}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-gray-500">
            <span>Type: {artifact.type}</span>
            <span>Version: {artifact.version}</span>
            <span>Created: {new Date(artifact.createdAt).toLocaleDateString()}</span>
            {artifact.metadata && Object.keys(artifact.metadata).length > 0 && (
              <span className="text-gray-400">Has metadata</span>
            )}
          </div>
          {hasProject && onPromoteToProject && (
            <button
              onClick={onPromoteToProject}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Add to Project Knowledge</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

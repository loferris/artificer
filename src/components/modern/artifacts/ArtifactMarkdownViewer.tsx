/**
 * Markdown artifact viewer with rendered preview
 */

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Artifact } from '../../../../lib/llm-artifacts/src/core/types';
import { highlightCode } from '../../../utils/shiki';

interface ArtifactMarkdownViewerProps {
  artifact: Artifact;
  onEdit?: (content: string) => void;
  readOnly?: boolean;
}

export const ArtifactMarkdownViewer: React.FC<ArtifactMarkdownViewerProps> = ({
  artifact,
  onEdit,
  readOnly = false,
}) => {
  const [viewMode, setViewMode] = useState<'preview' | 'source'>('preview');
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(artifact.content);

  const handleSave = () => {
    if (onEdit && editedContent !== artifact.content) {
      onEdit(editedContent);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedContent(artifact.content);
    setIsEditing(false);
  };

  const handleDownload = () => {
    const blob = new Blob([artifact.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = artifact.filename || `${artifact.title || 'document'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Custom code block component with Shiki highlighting
  const CodeBlock: Components['code'] = (props) => {
    const { children, className, node, ...rest } = props;
    const [html, setHtml] = useState('');
    const match = /language-(\w+)/.exec(className || '');
    const lang = match ? match[1] : 'text';
    const code = String(children).replace(/\n$/, '');
    const isInline = !match;

    useEffect(() => {
      if (!isInline && lang) {
        highlightCode(code, lang)
          .then(setHtml)
          .catch(err => {
            console.error('Error highlighting code in markdown:', err);
          });
      }
    }, [code, lang, isInline]);

    if (isInline) {
      return (
        <code
          className="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-sm font-mono"
          {...rest}
        >
          {children}
        </code>
      );
    }

    if (!html) {
      return (
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-4">
          <code className="font-mono text-sm">{code}</code>
        </pre>
      );
    }

    return (
      <div
        className="my-4 rounded-lg overflow-hidden [&>pre]:!m-0 [&>pre]:!rounded-lg"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-600">Markdown</span>
          {artifact.filename && (
            <>
              <span className="text-gray-400">•</span>
              <span className="text-sm text-gray-700">{artifact.filename}</span>
            </>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {!isEditing && (
            <div className="flex bg-gray-200 rounded p-0.5">
              <button
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  viewMode === 'preview'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => setViewMode('source')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  viewMode === 'source'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Source
              </button>
            </div>
          )}
          {!readOnly && !isEditing && onEdit && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-200 rounded transition-colors"
            >
              Edit
            </button>
          )}
          {isEditing && (
            <>
              <button
                onClick={handleCancel}
                className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-200 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
              >
                Save
              </button>
            </>
          )}
          <button
            onClick={handleDownload}
            className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-200 rounded transition-colors"
          >
            Download
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 bg-white">
        {isEditing ? (
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full h-full p-4 font-mono text-sm border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            spellCheck={false}
          />
        ) : viewMode === 'preview' ? (
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code: CodeBlock,
              }}
            >
              {artifact.content}
            </ReactMarkdown>
          </div>
        ) : (
          <pre className="p-4 bg-gray-50 rounded overflow-auto">
            <code className="text-sm font-mono whitespace-pre">{artifact.content}</code>
          </pre>
        )}
      </div>
    </div>
  );
};

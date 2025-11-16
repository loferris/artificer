/**
 * Mermaid diagram artifact viewer with live rendering
 */

import React, { useState, useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import type { Artifact } from '../../../../lib/llm-artifacts/src/core/types';
import { highlightCode } from '../../../utils/shiki';

interface ArtifactMermaidViewerProps {
  artifact: Artifact;
  onEdit?: (content: string) => void;
  readOnly?: boolean;
}

// Initialize mermaid with secure config
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'strict',
  fontFamily: 'system-ui, -apple-system, sans-serif',
});

export const ArtifactMermaidViewer: React.FC<ArtifactMermaidViewerProps> = ({
  artifact,
  onEdit,
  readOnly = false,
}) => {
  const [viewMode, setViewMode] = useState<'diagram' | 'source'>('diagram');
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(artifact.content);
  const [highlightedHtml, setHighlightedHtml] = useState('');
  const [diagramSvg, setDiagramSvg] = useState<string>('');
  const [renderError, setRenderError] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const diagramRef = useRef<HTMLDivElement>(null);

  // Render mermaid diagram
  useEffect(() => {
    const renderDiagram = async () => {
      if (viewMode !== 'diagram' || isEditing) return;

      try {
        setRenderError('');
        // Generate unique ID for this diagram
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Render the diagram
        const { svg } = await mermaid.render(id, artifact.content);
        setDiagramSvg(svg);
      } catch (error) {
        console.error('Mermaid rendering error:', error);
        setRenderError(error instanceof Error ? error.message : 'Failed to render diagram');
        setDiagramSvg('');
      }
    };

    renderDiagram();
  }, [artifact.content, viewMode, isEditing]);

  // Highlight code when in source view
  useEffect(() => {
    if (viewMode === 'source' && !isEditing) {
      highlightCode(artifact.content, 'mermaid')
        .then(setHighlightedHtml)
        .catch(err => {
          console.error('Error highlighting Mermaid code:', err);
        });
    }
  }, [artifact.content, viewMode, isEditing]);

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

  const handleCopy = async () => {
    await navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([artifact.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = artifact.filename || `${artifact.title || 'diagram'}.mmd`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadSvg = () => {
    if (!diagramSvg) return;
    const blob = new Blob([diagramSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.filename?.replace(/\.\w+$/, '') || artifact.title || 'diagram'}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPng = async () => {
    if (!diagramSvg) return;

    try {
      // Create a canvas and draw the SVG
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      const svgBlob = new Blob([diagramSvg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        canvas.width = img.width * 2; // 2x for better quality
        canvas.height = img.height * 2;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          if (blob) {
            const pngUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = pngUrl;
            a.download = `${artifact.filename?.replace(/\.\w+$/, '') || artifact.title || 'diagram'}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(pngUrl);
          }
          URL.revokeObjectURL(url);
        });
      };

      img.src = url;
    } catch (error) {
      console.error('Error converting to PNG:', error);
      alert('Failed to export as PNG. Please try SVG download instead.');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-600">Mermaid Diagram</span>
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
                onClick={() => setViewMode('diagram')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  viewMode === 'diagram'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Diagram
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
          {viewMode === 'diagram' && diagramSvg && (
            <div className="flex items-center space-x-1 border-l border-gray-300 pl-2">
              <button
                onClick={handleDownloadSvg}
                className="px-2 py-1 text-xs text-gray-700 hover:bg-gray-200 rounded transition-colors"
                title="Download as SVG"
              >
                SVG
              </button>
              <button
                onClick={handleDownloadPng}
                className="px-2 py-1 text-xs text-gray-700 hover:bg-gray-200 rounded transition-colors"
                title="Download as PNG"
              >
                PNG
              </button>
            </div>
          )}
          <button
            onClick={handleCopy}
            className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-200 rounded transition-colors flex items-center space-x-1"
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Copied!</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Copy</span>
              </>
            )}
          </button>
          <button
            onClick={handleDownload}
            className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-200 rounded transition-colors flex items-center space-x-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-white">
        {isEditing ? (
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full h-full p-4 font-mono text-sm bg-gray-900 text-gray-100 resize-none focus:outline-none"
            spellCheck={false}
            placeholder="graph TD&#10;    A[Start] --> B{Is it working?}&#10;    B -->|Yes| C[Great!]&#10;    B -->|No| D[Debug]&#10;    D --> B"
          />
        ) : viewMode === 'diagram' ? (
          <div className="h-full flex flex-col">
            {/* Info banner */}
            <div className="p-3 bg-blue-50 border-b border-blue-200">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">Live Diagram:</span> Mermaid diagrams are rendered in real-time.
                Export as SVG or PNG for use in other applications.
              </p>
            </div>

            {/* Diagram or error */}
            <div className="flex-1 p-8 overflow-auto flex items-center justify-center">
              {renderError ? (
                <div className="max-w-2xl">
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-red-800 mb-1">Diagram Rendering Error</h3>
                        <p className="text-sm text-red-700 font-mono whitespace-pre-wrap">{renderError}</p>
                        <button
                          onClick={() => setViewMode('source')}
                          className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
                        >
                          View source code
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : diagramSvg ? (
                <div
                  ref={diagramRef}
                  className="mermaid-diagram"
                  dangerouslySetInnerHTML={{ __html: diagramSvg }}
                />
              ) : (
                <div className="flex items-center space-x-3 text-gray-500">
                  <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Rendering diagram...</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Source view with syntax highlighting
          <div className="h-full overflow-auto">
            {highlightedHtml ? (
              <div
                className="h-full [&>pre]:h-full [&>pre]:m-0"
                dangerouslySetInnerHTML={{ __html: highlightedHtml }}
              />
            ) : (
              // Loading fallback
              <pre className="p-4 bg-gray-900 text-gray-100 overflow-auto h-full m-0">
                <code className="text-sm font-mono whitespace-pre">{artifact.content}</code>
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

import React from 'react';

interface ExportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  format: 'markdown' | 'html' | 'json';
  content: string;
  filename: string;
  onDownload: () => void;
}

export const ExportPreviewModal: React.FC<ExportPreviewModalProps> = ({
  isOpen,
  onClose,
  format,
  content,
  filename,
  onDownload,
}) => {
  if (!isOpen) return null;

  const renderPreview = () => {
    switch (format) {
      case 'html':
        return (
          <div className="border rounded-lg overflow-hidden bg-white">
            <iframe
              srcDoc={content}
              className="w-full h-96 border-0"
              title="HTML Preview"
              sandbox="allow-same-origin"
            />
          </div>
        );

      case 'markdown':
        return (
          <div className="border rounded-lg p-4 bg-gray-50 overflow-auto max-h-96">
            <pre className="text-sm whitespace-pre-wrap font-mono">{content}</pre>
          </div>
        );

      case 'json':
        return (
          <div className="border rounded-lg p-4 bg-gray-50 overflow-auto max-h-96">
            <pre className="text-sm whitespace-pre-wrap font-mono">
              {JSON.stringify(JSON.parse(content), null, 2)}
            </pre>
          </div>
        );

      default:
        return (
          <div className="border rounded-lg p-4 bg-gray-50 overflow-auto max-h-96">
            <pre className="text-sm whitespace-pre-wrap">{content}</pre>
          </div>
        );
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Export Preview</h2>
              <p className="text-sm text-gray-500 mt-1">{filename}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Preview Content */}
          <div className="flex-1 overflow-auto p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {format.toUpperCase()}
                </span>
                <span className="text-sm text-gray-500">
                  {content.length.toLocaleString()} characters
                </span>
              </div>
            </div>

            {renderPreview()}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            <button
              onClick={onDownload}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Download</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

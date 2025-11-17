import React, { useState } from 'react';
import { trpc } from '../../lib/trpc/client';
import { format } from 'date-fns';
import { clientLogger } from '../../utils/clientLogger';

interface ProjectPanelProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectPanel: React.FC<ProjectPanelProps> = ({ projectId, isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  const { data: projectData, refetch: refetchProject } = trpc.projects.getById.useQuery(
    { id: projectId },
    { enabled: isOpen && !!projectId }
  );

  const { data: documentsData, refetch: refetchDocuments } = trpc.projects.getDocuments.useQuery(
    { projectId },
    { enabled: isOpen && !!projectId }
  );

  const uploadDocumentMutation = trpc.projects.uploadDocument.useMutation();
  const deleteDocumentMutation = trpc.projects.deleteDocument.useMutation();

  const project = projectData?.project;
  const documents = documentsData?.documents || [];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const content = await file.text();
      await uploadDocumentMutation.mutateAsync({
        projectId,
        filename: file.name,
        content,
        contentType: file.type || 'text/plain',
      });
      refetchDocuments();
      e.target.value = ''; // Reset file input
    } catch (error) {
      clientLogger.error('Failed to upload document', error as Error, { projectId }, 'ProjectPanel');
      alert('Failed to upload document. Please try again.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await deleteDocumentMutation.mutateAsync({ documentId });
      refetchDocuments();
    } catch (error) {
      clientLogger.error('Failed to delete document', error as Error, { documentId }, 'ProjectPanel');
      alert('Failed to delete document. Please try again.');
    }
  };

  const filteredDocuments = documents.filter(
    (doc: any) =>
      doc.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.content && doc.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      ></div>

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-gray-900 truncate">
                📁 {project?.name || 'Project'}
              </h2>
              {project?.description && (
                <p className="text-gray-600 mt-1">{project.description}</p>
              )}
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
              <span>📄</span>
              <span>{documents.length} documents</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>💬</span>
              <span>{project?._count?.conversations || 0} conversations</span>
            </div>
            {project?.updatedAt && (
              <div className="flex items-center space-x-2">
                <span>🕒</span>
                <span>Updated {format(new Date(project.updatedAt), 'MMM d, yyyy')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="px-6 flex space-x-6">
            <button className="py-3 border-b-2 border-blue-600 text-blue-600 font-medium">
              Documents
            </button>
            <button className="py-3 text-gray-600 hover:text-gray-900">
              RAG Settings
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Documents Section */}
          <div className="space-y-4">
            {/* Upload + Search */}
            <div className="flex items-center space-x-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search documents..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>{uploadingFile ? 'Uploading...' : 'Upload'}</span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploadingFile}
                  className="hidden"
                  accept=".txt,.md,.json,.csv"
                />
              </label>
            </div>

            {/* Documents List */}
            {filteredDocuments.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📄</div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  {searchQuery ? 'No documents found' : 'No documents yet'}
                </h3>
                <p className="text-gray-500">
                  {searchQuery
                    ? 'Try a different search term'
                    : 'Upload documents to enable RAG for this project'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDocuments.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-xl">📄</span>
                          <h4 className="font-medium text-gray-900 truncate">{doc.filename}</h4>
                        </div>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          {doc.size && <span>{formatBytes(doc.size)}</span>}
                          {doc.uploadedAt && (
                            <span>{format(new Date(doc.uploadedAt), 'MMM d, yyyy')}</span>
                          )}
                          {doc.contentType && <span className="px-2 py-1 bg-gray-200 rounded">{doc.contentType}</span>}
                        </div>
                        {doc.content && (
                          <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                            {doc.content.substring(0, 150)}...
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="ml-4 opacity-0 group-hover:opacity-100 p-2 hover:bg-red-100 rounded text-red-500 transition-all"
                        title="Delete document"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              RAG is {process.env.NEXT_PUBLIC_ENABLE_RAG === 'true' || process.env.ENABLE_RAG === 'true' ? (
                <span className="text-green-600 font-medium">enabled</span>
              ) : (
                <span className="text-gray-400 font-medium">disabled</span>
              )}
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
    </>
  );
};

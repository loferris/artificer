import React, { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { trpc } from '../../lib/trpc/client';
import Head from 'next/head';
import { clientLogger } from '../../utils/clientLogger';

interface DocumentCardProps {
  document: {
    id: string;
    filename: string;
    originalName: string;
    contentType: string;
    size: number;
    uploadedAt: Date;
  };
  onDelete: (id: string) => void;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ document, onDelete }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (contentType: string) => {
    if (contentType.includes('pdf')) return '📄';
    if (contentType.includes('text')) return '📝';
    if (contentType.includes('json')) return '🔧';
    if (contentType.includes('csv')) return '📊';
    return '📎';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{getFileIcon(document.contentType)}</span>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100">
              {document.originalName}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatFileSize(document.size)} • {new Date(document.uploadedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
        >
          ✕
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Delete Document
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete &quot;{document.originalName}&quot;? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDelete(document.id);
                  setShowDeleteConfirm(false);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
              >
                Delete Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ProjectDetailPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  const projectId = typeof id === 'string' ? id : '';

  const { data: projectData, isLoading: projectLoading, error: projectError } =
    trpc.projects.getById.useQuery(
      { id: projectId },
      { enabled: !!projectId }
    );

  const { data: documentsData, refetch: refetchDocuments } = 
    trpc.projects.getDocuments.useQuery(
      { projectId },
      { enabled: !!projectId }
    );

  const { data: conversationsData } = 
    trpc.projects.getConversations.useQuery(
      { projectId },
      { enabled: !!projectId }
    );

  const uploadDocumentMutation = trpc.projects.uploadDocument.useMutation();
  const deleteDocumentMutation = trpc.projects.deleteDocument.useMutation();

  const project = projectData?.project;
  const documents = documentsData?.documents || [];
  const conversations = conversationsData?.conversations || [];

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !projectId) return;

    setIsUploading(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Content = reader.result?.toString().split(',')[1];
          if (!base64Content) throw new Error('Failed to read file');

          const result = await uploadDocumentMutation.mutateAsync({
            projectId,
            filename: file.name,
            content: base64Content,
            contentType: file.type || 'application/octet-stream',
          });

          if (result.success) {
            refetchDocuments();
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }
        } catch (error) {
          clientLogger.error('Failed to upload document', error as Error, { filename: file.name }, 'ProjectDetailPage');
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      clientLogger.error('Failed to process file', error as Error, {}, 'ProjectDetailPage');
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const result = await deleteDocumentMutation.mutateAsync({ documentId });
      if (result.success) {
        refetchDocuments();
      }
    } catch (error) {
      clientLogger.error('Failed to delete document', error as Error, { documentId }, 'ProjectDetailPage');
    }
  };

  const isDemoModeActive = projectData?.demoMode === true || isDemoMode;

  if (projectLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-gray-600 dark:text-gray-400">
              Loading project...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isDemoModeActive) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Head>
          <title>Projects - AI Workflow Engine</title>
        </Head>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center space-x-4 mb-8">
            <button
              onClick={() => router.push('/')}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              ← Back to Home
            </button>
          </div>

          <div className="bg-blue-100 dark:bg-blue-900 border border-blue-400 text-blue-700 dark:text-blue-100 px-6 py-4 rounded-lg">
            <h3 className="font-bold text-lg mb-2">📁 Demo Mode</h3>
            <p className="mb-2">
              Project features require a database and are not available in demo mode.
            </p>
            <p className="text-sm">
              The project infrastructure allows you to organize conversations, upload documents, and build knowledge bases.
              Deploy with a PostgreSQL database to use these features.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-100 px-4 py-3 rounded">
            <p className="font-bold">Project not found</p>
            <p>The project you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Head>
        <title>{project.name} - AI Workflow Engine</title>
      </Head>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={() => router.push('/projects')}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              ← Back to Projects
            </button>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {project.name}
          </h1>
          {project.description && (
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {project.description}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Conversations
            </h3>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {project._count?.conversations || 0}
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Documents
            </h3>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {project._count?.documents || 0}
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Knowledge Entities
            </h3>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {project._count?.knowledgeEntities || 0}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Documents Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Documents
              </h2>
              
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".txt,.md,.json,.csv,.pdf"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                >
                  {isUploading ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 dark:text-gray-500 text-4xl mb-4">📄</div>
                <p className="text-gray-600 dark:text-gray-400">
                  No documents uploaded yet. Start by uploading some reference materials.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {documents.map((document) => (
                  <DocumentCard
                    key={document.id}
                    document={document}
                    onDelete={handleDeleteDocument}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Conversations Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Recent Conversations
            </h2>

            {conversations.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 dark:text-gray-500 text-4xl mb-4">💬</div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  No conversations in this project yet.
                </p>
                <button
                  onClick={() => router.push(`/?project=${projectId}`)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  Start a Conversation
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {conversations.slice(0, 5).map((conversation) => (
                  <div
                    key={conversation.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => router.push(`/?conversation=${conversation.id}`)}
                  >
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      {conversation.title || 'Untitled Conversation'}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {conversation.messageCount} messages • {new Date(conversation.updatedAt).toLocaleDateString()}
                    </p>
                    {conversation.lastMessagePreview && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 truncate">
                        {conversation.lastMessagePreview}
                      </p>
                    )}
                  </div>
                ))}
                
                {conversations.length > 5 && (
                  <button
                    onClick={() => router.push(`/?project=${projectId}`)}
                    className="w-full text-center py-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    View all {conversations.length} conversations
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailPage;
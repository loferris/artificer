import React, { useState } from 'react';
import { trpc } from '../lib/trpc/client';
import Head from 'next/head';
import { clientLogger } from '../utils/clientLogger';

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    stats: {
      conversationCount: number;
      documentCount: number;
      knowledgeEntityCount: number;
      lastActivity: Date | null;
    };
  };
  onDelete: (id: string) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onDelete }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString();
  };

  const handleDelete = () => {
    onDelete(project.id);
    setShowDeleteConfirm(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {project.description}
            </p>
          )}
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => window.location.href = `/projects/${project.id}`}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
          >
            Open
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <span className="text-gray-500 dark:text-gray-400">Conversations</span>
          <div className="font-semibold text-gray-900 dark:text-gray-100">
            {project.stats.conversationCount}
          </div>
        </div>
        
        <div>
          <span className="text-gray-500 dark:text-gray-400">Documents</span>
          <div className="font-semibold text-gray-900 dark:text-gray-100">
            {project.stats.documentCount}
          </div>
        </div>
        
        <div>
          <span className="text-gray-500 dark:text-gray-400">Knowledge</span>
          <div className="font-semibold text-gray-900 dark:text-gray-100">
            {project.stats.knowledgeEntityCount}
          </div>
        </div>
        
        <div>
          <span className="text-gray-500 dark:text-gray-400">Last Activity</span>
          <div className="font-semibold text-gray-900 dark:text-gray-100">
            {formatDate(project.stats.lastActivity)}
          </div>
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Created: {formatDate(project.createdAt)}
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Delete Project
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete &quot;{project.name}&quot;? This will also delete all associated conversations, documents, and knowledge entities. This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
              >
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ProjectsPage: React.FC = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');

  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  const { data: projectsData, isLoading, error, refetch } = trpc.projects.list.useQuery();
  const createProjectMutation = trpc.projects.create.useMutation();
  const deleteProjectMutation = trpc.projects.delete.useMutation();

  const projects = projectsData?.projects || [];

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newProjectName.trim()) return;

    try {
      const result = await createProjectMutation.mutateAsync({
        name: newProjectName.trim(),
        description: newProjectDescription.trim() || undefined,
      });

      if (result.success) {
        setNewProjectName('');
        setNewProjectDescription('');
        setShowCreateForm(false);
        refetch();
      }
    } catch (error) {
      clientLogger.error('Failed to create project', error as Error, {}, 'ProjectsPage');
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const result = await deleteProjectMutation.mutateAsync({ id: projectId });
      if (result.success) {
        refetch();
      }
    } catch (error) {
      clientLogger.error('Failed to delete project', error as Error, { projectId }, 'ProjectsPage');
    }
  };

  // Check if we're in demo mode based on API response
  const isDemoModeActive = projectsData?.demoMode === true || isDemoMode;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Head>
          <title>Projects - AI Workflow Engine</title>
        </Head>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-gray-600 dark:text-gray-400">
              Loading projects...
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Projects
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Organize your AI workflows with project-based knowledge management
            </p>
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Head>
          <title>Projects - AI Workflow Engine</title>
        </Head>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-100 px-4 py-3 rounded">
            <p className="font-bold">Error loading projects</p>
            <p>{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Head>
        <title>Projects - AI Workflow Engine</title>
      </Head>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Projects
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Organize your AI workflows with project-based knowledge management
            </p>
          </div>

          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Create Project
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 dark:text-gray-500 text-6xl mb-4">📁</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No projects yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Create your first project to start organizing your AI conversations and knowledge.
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Create Your First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={handleDeleteProject}
              />
            ))}
          </div>
        )}

        {/* Create Project Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                Create New Project
              </h3>
              
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                    placeholder="My Fantasy Novel"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                    placeholder="A fantasy adventure about..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewProjectName('');
                      setNewProjectDescription('');
                    }}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newProjectName.trim() || createProjectMutation.isPending}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
                  >
                    {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectsPage;
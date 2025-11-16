/**
 * Modal for connecting GitHub/GitLab repositories to projects
 */

import React, { useState } from 'react';
import { trpc } from '../../utils/trpc';

interface ConnectRepositoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onSuccess?: () => void;
}

type Provider = 'github' | 'gitlab';

export const ConnectRepositoryModal: React.FC<ConnectRepositoryModalProps> = ({
  isOpen,
  onClose,
  projectId,
  onSuccess,
}) => {
  const [provider, setProvider] = useState<Provider>('github');
  const [repoUrl, setRepoUrl] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [branch, setBranch] = useState('main');
  const [pathFilters, setPathFilters] = useState<string>('');
  const [ignorePatterns, setIgnorePatterns] = useState<string>(
    'node_modules/**\n.git/**\n**/*.lock\ndist/**\nbuild/**\n.next/**\ncoverage/**'
  );
  const [autoSync, setAutoSync] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string>('');
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

  const connectMutation = trpc.repositories.connect.useMutation({
    onSuccess: () => {
      onSuccess?.();
      handleClose();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const testConnectionMutation = trpc.repositories.testConnection.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        setTestResult({
          success: true,
          message: result.details?.message || 'Connection successful!',
          details: result.details,
        });
        setError('');
      } else {
        setTestResult({
          success: false,
          message: result.error || 'Connection failed',
        });
      }
    },
    onError: (err) => {
      setTestResult({
        success: false,
        message: err.message,
      });
    },
  });

  const handleClose = () => {
    // Reset form
    setProvider('github');
    setRepoUrl('');
    setAccessToken('');
    setBranch('main');
    setPathFilters('');
    setIgnorePatterns(
      'node_modules/**\n.git/**\n**/*.lock\ndist/**\nbuild/**\n.next/**\ncoverage/**'
    );
    setAutoSync(false);
    setShowAdvanced(false);
    setError('');
    setTestResult(null);
    onClose();
  };

  const handleTestConnection = async () => {
    setError('');
    setTestResult(null);

    if (!repoUrl || !accessToken) {
      setError('Repository URL and access token are required to test connection');
      return;
    }

    await testConnectionMutation.mutateAsync({
      provider,
      repoUrl,
      accessToken,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!repoUrl || !accessToken) {
      setError('Repository URL and access token are required');
      return;
    }

    try {
      await connectMutation.mutateAsync({
        projectId,
        provider,
        repoUrl,
        accessToken,
        branch,
        pathFilters: pathFilters
          ? pathFilters.split('\n').filter((p) => p.trim())
          : [],
        ignorePatterns: ignorePatterns
          .split('\n')
          .filter((p) => p.trim()),
        autoSync,
      });
    } catch (err) {
      // Error handled by onError callback
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Connect Repository</h2>
              <p className="text-sm text-gray-500 mt-1">
                Link a GitHub or GitLab repository to this project
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-6">
            <div className="space-y-6">
              {/* Provider Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Provider
                </label>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setProvider('github')}
                    className={`flex-1 px-4 py-3 border-2 rounded-lg transition-colors ${
                      provider === 'github'
                        ? 'border-blue-600 bg-blue-50 text-blue-900'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                      <span className="font-medium">GitHub</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProvider('gitlab')}
                    className={`flex-1 px-4 py-3 border-2 rounded-lg transition-colors ${
                      provider === 'gitlab'
                        ? 'border-orange-600 bg-orange-50 text-orange-900'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.546 10.93L13.067.452c-.604-.603-1.582-.603-2.188 0L.397 10.93c-.531.529-.531 1.387 0 1.916l10.48 10.478c.604.604 1.582.604 2.188 0l10.48-10.478c.53-.529.53-1.387 0-1.916z"/>
                      </svg>
                      <span className="font-medium">GitLab</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Repository URL */}
              <div>
                <label htmlFor="repoUrl" className="block text-sm font-medium text-gray-700 mb-2">
                  Repository URL *
                </label>
                <input
                  type="url"
                  id="repoUrl"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder={
                    provider === 'github'
                      ? 'https://github.com/owner/repo'
                      : 'https://gitlab.com/owner/repo'
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Access Token */}
              <div>
                <label htmlFor="accessToken" className="block text-sm font-medium text-gray-700 mb-2">
                  Personal Access Token *
                </label>
                <input
                  type="password"
                  id="accessToken"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder={
                    provider === 'github'
                      ? 'ghp_...'
                      : 'glpat-...'
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  {provider === 'github' ? (
                    <>
                      Create a token at{' '}
                      <a
                        href="https://github.com/settings/tokens"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        GitHub Settings
                      </a>
                      {' '}with <code className="px-1 py-0.5 bg-gray-100 rounded">repo</code> scope
                    </>
                  ) : (
                    <>
                      Create a token at GitLab Settings with{' '}
                      <code className="px-1 py-0.5 bg-gray-100 rounded">read_repository</code> scope
                    </>
                  )}
                </p>
                {/* Test Connection Button */}
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testConnectionMutation.isLoading || !repoUrl || !accessToken}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {testConnectionMutation.isLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Testing...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Test Connection</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Test Result Display */}
              {testResult && (
                <div className={`p-4 rounded-lg border ${
                  testResult.success
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-start space-x-3">
                    {testResult.success ? (
                      <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                    <div className="flex-1">
                      <h3 className={`text-sm font-semibold ${
                        testResult.success ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                      </h3>
                      <p className={`text-sm mt-1 ${
                        testResult.success ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {testResult.message}
                      </p>
                      {testResult.success && testResult.details && (
                        <div className="mt-2 text-xs text-green-600 space-y-1">
                          {testResult.details.isPrivate !== undefined && (
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold">Visibility:</span>
                              <span className={`px-2 py-0.5 rounded ${
                                testResult.details.isPrivate
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {testResult.details.isPrivate ? 'Private' : 'Public'}
                              </span>
                            </div>
                          )}
                          {testResult.details.permissions && (
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold">Permissions:</span>
                              <div className="flex space-x-1">
                                {testResult.details.permissions.pull && (
                                  <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">Read</span>
                                )}
                                {testResult.details.permissions.push && (
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">Write</span>
                                )}
                                {testResult.details.permissions.admin && (
                                  <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs">Admin</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Branch */}
              <div>
                <label htmlFor="branch" className="block text-sm font-medium text-gray-700 mb-2">
                  Branch
                </label>
                <input
                  type="text"
                  id="branch"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Advanced Settings Toggle */}
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg
                  className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span>Advanced Settings</span>
              </button>

              {/* Advanced Settings */}
              {showAdvanced && (
                <div className="space-y-4 pl-6 border-l-2 border-gray-200">
                  {/* Path Filters */}
                  <div>
                    <label htmlFor="pathFilters" className="block text-sm font-medium text-gray-700 mb-2">
                      Path Filters (optional)
                    </label>
                    <textarea
                      id="pathFilters"
                      value={pathFilters}
                      onChange={(e) => setPathFilters(e.target.value)}
                      placeholder="src/**&#10;lib/**&#10;Leave empty to sync all files"
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      One pattern per line. Only files matching these patterns will be synced.
                    </p>
                  </div>

                  {/* Ignore Patterns */}
                  <div>
                    <label htmlFor="ignorePatterns" className="block text-sm font-medium text-gray-700 mb-2">
                      Ignore Patterns
                    </label>
                    <textarea
                      id="ignorePatterns"
                      value={ignorePatterns}
                      onChange={(e) => setIgnorePatterns(e.target.value)}
                      rows={5}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      One pattern per line. Files matching these patterns will be excluded.
                    </p>
                  </div>

                  {/* Auto Sync */}
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="autoSync"
                      checked={autoSync}
                      onChange={(e) => setAutoSync(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="autoSync" className="text-sm text-gray-700">
                      Enable auto-sync (sync on every conversation)
                    </label>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-red-800">Connection Failed</h3>
                      <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={connectMutation.isLoading}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={connectMutation.isLoading || !repoUrl || !accessToken}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {connectMutation.isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Connect Repository</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

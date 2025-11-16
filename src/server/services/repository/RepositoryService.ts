/**
 * Repository Service
 *
 * Handles GitHub and GitLab repository connections, file syncing,
 * and integration with the RAG system.
 */

import { Octokit } from '@octokit/rest';
import { Gitlab } from '@gitbeaker/rest';
import { minimatch } from 'minimatch';
import type { PrismaClient } from '@prisma/client';
import { encryptToken, decryptToken } from '../../../utils/encryption';
import { createHash } from 'crypto';

export type RepositoryProvider = 'github' | 'gitlab';

export interface ConnectRepositoryParams {
  projectId: string;
  provider: RepositoryProvider;
  repoUrl: string;
  accessToken: string;
  branch?: string;
  pathFilters?: string[];
  ignorePatterns?: string[];
  autoSync?: boolean;
}

export interface SyncResult {
  filesProcessed: number;
  filesAdded: number;
  filesUpdated: number;
  filesSkipped: number;
  errors: string[];
  duration: number;
}

export interface FileContent {
  path: string;
  content: string;
  sha: string;
  url: string;
  size: number;
}

export class RepositoryService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Parse repository URL to extract owner and name
   */
  private parseRepoUrl(url: string): { owner: string; repo: string } | null {
    // Support various formats:
    // - https://github.com/owner/repo
    // - https://github.com/owner/repo.git
    // - https://gitlab.com/owner/repo
    // - git@github.com:owner/repo.git

    const patterns = [
      // HTTPS URLs
      /^https?:\/\/(?:github\.com|gitlab\.com)\/([^\/]+)\/([^\/\.]+)(?:\.git)?$/,
      // SSH URLs
      /^git@(?:github\.com|gitlab\.com):([^\/]+)\/([^\/\.]+)(?:\.git)?$/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return { owner: match[1], repo: match[2] };
      }
    }

    return null;
  }

  /**
   * Validate access token and repository permissions
   */
  private async validateGitHubAccess(
    token: string,
    owner: string,
    repo: string
  ): Promise<{
    valid: boolean;
    error?: string;
    scopes?: string[];
    isPrivate?: boolean;
    permissions?: {
      pull: boolean;
      push: boolean;
      admin: boolean;
    };
  }> {
    try {
      const octokit = new Octokit({ auth: token });

      // Check token scopes by making an authenticated request
      const { headers } = await octokit.request('GET /user');
      const scopes = headers['x-oauth-scopes']?.split(',').map((s: string) => s.trim()) || [];

      // Try to get repository info
      const { data: repoData } = await octokit.rest.repos.get({ owner, repo });

      // Check if we have read permissions (minimum required)
      const hasReadAccess = scopes.includes('repo') || scopes.includes('public_repo') || scopes.length === 0; // PATs might not expose scopes

      if (!hasReadAccess && repoData.private) {
        return {
          valid: false,
          error: 'Token does not have required "repo" scope for private repositories. Please create a new token with "repo" scope.'
        };
      }

      return {
        valid: true,
        scopes,
        isPrivate: repoData.private,
        permissions: {
          pull: repoData.permissions?.pull || false,
          push: repoData.permissions?.push || false,
          admin: repoData.permissions?.admin || false,
        }
      };
    } catch (error: any) {
      if (error.status === 401) {
        return {
          valid: false,
          error: 'Invalid access token. Please check that your token is correct and has not expired.'
        };
      } else if (error.status === 404) {
        return {
          valid: false,
          error: 'Repository not found or access denied. Please verify the repository URL and ensure your token has access to this repository.'
        };
      } else if (error.status === 403) {
        return {
          valid: false,
          error: 'Access forbidden. This might be due to: 1) Repository requires additional permissions, 2) Your IP is blocked, or 3) Rate limit exceeded.'
        };
      } else {
        return { valid: false, error: `Connection failed: ${error.message || 'Unknown error'}` };
      }
    }
  }

  private async validateGitLabAccess(
    token: string,
    owner: string,
    repo: string
  ): Promise<{
    valid: boolean;
    error?: string;
    scopes?: string[];
    isPrivate?: boolean;
    permissions?: {
      pull: boolean;
      push: boolean;
      admin: boolean;
    };
  }> {
    try {
      const gitlab = new Gitlab({ token });

      // Check current user and token scopes
      const currentUser = await gitlab.Users.showCurrentUser();
      const tokenInfo = await gitlab.PersonalAccessTokens.show(currentUser.id);

      // Get project (GitLab uses "namespace/repo" format)
      const project = await gitlab.Projects.show(`${owner}/${repo}`);

      // Check permissions
      const hasReadAccess = project.permissions?.project_access?.access_level >= 10 || // Guest level minimum
                           project.permissions?.group_access?.access_level >= 10;

      if (!hasReadAccess) {
        return {
          valid: false,
          error: 'Token does not have read access to this repository. Please ensure you have at least Guest level access.'
        };
      }

      // Map GitLab access levels (10=Guest, 20=Reporter, 30=Developer, 40=Maintainer, 50=Owner)
      const accessLevel = Math.max(
        project.permissions?.project_access?.access_level || 0,
        project.permissions?.group_access?.access_level || 0
      );

      return {
        valid: true,
        scopes: tokenInfo.scopes || [],
        isPrivate: project.visibility !== 'public',
        permissions: {
          pull: accessLevel >= 10, // Guest can pull
          push: accessLevel >= 30, // Developer can push
          admin: accessLevel >= 40, // Maintainer is admin
        }
      };
    } catch (error: any) {
      const status = error.response?.status || error.status;

      if (status === 401) {
        return {
          valid: false,
          error: 'Invalid access token. Please check that your token is correct and has not expired.'
        };
      } else if (status === 404) {
        return {
          valid: false,
          error: 'Repository not found or access denied. Please verify the repository URL and ensure your token has access to this repository.'
        };
      } else if (status === 403) {
        return {
          valid: false,
          error: 'Access forbidden. Your token may not have the required "read_repository" scope.'
        };
      } else {
        return { valid: false, error: `Connection failed: ${error.message || 'Unknown error'}` };
      }
    }
  }

  /**
   * Test repository connection without saving
   * Returns detailed validation info for UI feedback
   */
  async testConnection(params: {
    provider: RepositoryProvider;
    repoUrl: string;
    accessToken: string;
  }) {
    const { provider, repoUrl, accessToken } = params;

    // Parse repository URL
    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) {
      return {
        success: false,
        error: 'Invalid repository URL format. Expected format: https://github.com/owner/repo',
        details: null,
      };
    }

    const { owner, repo } = parsed;

    // Validate access
    const validation =
      provider === 'github'
        ? await this.validateGitHubAccess(accessToken, owner, repo)
        : await this.validateGitLabAccess(accessToken, owner, repo);

    if (!validation.valid) {
      return {
        success: false,
        error: validation.error || 'Repository validation failed',
        details: null,
      };
    }

    return {
      success: true,
      error: null,
      details: {
        owner,
        repo,
        isPrivate: validation.isPrivate,
        scopes: validation.scopes,
        permissions: validation.permissions,
        message: validation.isPrivate
          ? `Successfully connected to private repository ${owner}/${repo}`
          : `Successfully connected to public repository ${owner}/${repo}`,
      },
    };
  }

  /**
   * Connect a new repository to a project
   */
  async connectRepository(params: ConnectRepositoryParams) {
    const { projectId, provider, repoUrl, accessToken, branch = 'main', pathFilters = [], ignorePatterns = [], autoSync = false } = params;

    // Parse repository URL
    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) {
      throw new Error('Invalid repository URL format');
    }

    const { owner, repo } = parsed;

    // Validate access
    const validation =
      provider === 'github'
        ? await this.validateGitHubAccess(accessToken, owner, repo)
        : await this.validateGitLabAccess(accessToken, owner, repo);

    if (!validation.valid) {
      throw new Error(validation.error || 'Repository validation failed');
    }

    // Encrypt token
    const encrypted = encryptToken(accessToken);

    // Create repository connection
    const connection = await this.prisma.repositoryConnection.create({
      data: {
        projectId,
        provider,
        repoUrl,
        repoOwner: owner,
        repoName: repo,
        branch,
        accessToken: encrypted.encrypted,
        tokenIv: encrypted.iv,
        tokenTag: encrypted.tag,
        pathFilters,
        ignorePatterns,
        autoSync,
        syncStatus: 'pending',
      },
    });

    // Trigger initial sync
    await this.syncRepository(connection.id);

    return connection;
  }

  /**
   * Get decrypted access token for a repository
   */
  private async getRepositoryToken(repositoryId: string): Promise<string> {
    const repo = await this.prisma.repositoryConnection.findUnique({
      where: { id: repositoryId },
      select: { accessToken: true, tokenIv: true, tokenTag: true },
    });

    if (!repo) {
      throw new Error('Repository not found');
    }

    return decryptToken(repo.accessToken, repo.tokenIv, repo.tokenTag);
  }

  /**
   * Fetch file tree from GitHub
   */
  private async fetchGitHubFileTree(
    token: string,
    owner: string,
    repo: string,
    branch: string
  ): Promise<Array<{ path: string; type: string; sha: string; url: string }>> {
    const octokit = new Octokit({ auth: token });

    const { data } = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: branch,
      recursive: 'true',
    });

    return data.tree.filter(item => item.type === 'blob').map(item => ({
      path: item.path!,
      type: item.type!,
      sha: item.sha!,
      url: item.url!,
    }));
  }

  /**
   * Fetch file content from GitHub
   */
  private async fetchGitHubFile(
    token: string,
    owner: string,
    repo: string,
    path: string
  ): Promise<FileContent | null> {
    try {
      const octokit = new Octokit({ auth: token });

      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      });

      if ('content' in data && data.type === 'file') {
        const content = Buffer.from(data.content, 'base64').toString('utf8');

        return {
          path: data.path,
          content,
          sha: data.sha,
          url: data.html_url || data.url,
          size: data.size,
        };
      }

      return null;
    } catch (error) {
      console.error(`Error fetching file ${path}:`, error);
      return null;
    }
  }

  /**
   * Check if file matches path filters and doesn't match ignore patterns
   */
  private shouldSyncFile(path: string, pathFilters: string[], ignorePatterns: string[]): boolean {
    // Check ignore patterns first
    for (const pattern of ignorePatterns) {
      if (minimatch(path, pattern)) {
        return false;
      }
    }

    // If no path filters, sync all (non-ignored) files
    if (pathFilters.length === 0) {
      return true;
    }

    // Check if matches any path filter
    for (const pattern of pathFilters) {
      if (minimatch(path, pattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detect programming language from file extension
   */
  private detectLanguage(filename: string): string | null {
    const ext = filename.split('.').pop()?.toLowerCase();

    const languageMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'tsx',
      js: 'javascript',
      jsx: 'jsx',
      py: 'python',
      rs: 'rust',
      go: 'go',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      cs: 'csharp',
      rb: 'ruby',
      php: 'php',
      swift: 'swift',
      kt: 'kotlin',
      sql: 'sql',
      sh: 'bash',
      bash: 'bash',
      yml: 'yaml',
      yaml: 'yaml',
      json: 'json',
      md: 'markdown',
      html: 'html',
      css: 'css',
      scss: 'scss',
      vue: 'vue',
      svelte: 'svelte',
    };

    return ext ? languageMap[ext] || null : null;
  }

  /**
   * Calculate SHA256 hash of content for change detection
   */
  private hashContent(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Sync repository files to database
   */
  async syncRepository(repositoryId: string): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      filesProcessed: 0,
      filesAdded: 0,
      filesUpdated: 0,
      filesSkipped: 0,
      errors: [],
      duration: 0,
    };

    try {
      // Get repository details
      const repository = await this.prisma.repositoryConnection.findUnique({
        where: { id: repositoryId },
      });

      if (!repository) {
        throw new Error('Repository not found');
      }

      // Update status to syncing
      await this.prisma.repositoryConnection.update({
        where: { id: repositoryId },
        data: { syncStatus: 'syncing' },
      });

      const token = await this.getRepositoryToken(repositoryId);

      // Fetch file tree (currently only GitHub implemented)
      if (repository.provider !== 'github') {
        throw new Error('Only GitHub is currently supported');
      }

      const fileTree = await this.fetchGitHubFileTree(
        token,
        repository.repoOwner,
        repository.repoName,
        repository.branch
      );

      // Filter files based on path filters and ignore patterns
      const filesToSync = fileTree.filter(file =>
        this.shouldSyncFile(file.path, repository.pathFilters, repository.ignorePatterns)
      );

      // Process files in batches
      const BATCH_SIZE = 10;
      for (let i = 0; i < filesToSync.length; i += BATCH_SIZE) {
        const batch = filesToSync.slice(i, i + BATCH_SIZE);

        await Promise.all(
          batch.map(async file => {
            try {
              result.filesProcessed++;

              const fileContent = await this.fetchGitHubFile(
                token,
                repository.repoOwner,
                repository.repoName,
                file.path
              );

              if (!fileContent) {
                result.filesSkipped++;
                return;
              }

              const fileHash = this.hashContent(fileContent.content);

              // Check if document already exists for this file
              const existingRepo = await this.prisma.repositoryDocument.findFirst({
                where: {
                  repositoryId,
                  gitPath: file.path,
                },
                include: { document: true },
              });

              if (existingRepo) {
                // Check if content changed
                if (existingRepo.fileHash === fileHash) {
                  result.filesSkipped++;
                  return;
                }

                // Update existing document
                await this.prisma.document.update({
                  where: { id: existingRepo.documentId },
                  data: {
                    content: fileContent.content,
                    size: fileContent.size,
                    updatedAt: new Date(),
                  },
                });

                await this.prisma.repositoryDocument.update({
                  where: { id: existingRepo.id },
                  data: {
                    gitCommitSha: fileContent.sha,
                    fileHash,
                    lastSyncedAt: new Date(),
                  },
                });

                result.filesUpdated++;
              } else {
                // Create new document
                const language = this.detectLanguage(file.path);

                const document = await this.prisma.document.create({
                  data: {
                    type: language ? 'code' : 'text',
                    content: fileContent.content,
                    filename: file.path.split('/').pop()!,
                    title: file.path,
                    language,
                    fileExtension: file.path.split('.').pop(),
                    originalName: file.path,
                    contentType: 'text/plain',
                    size: fileContent.size,
                    source: 'uploaded', // From repository
                    projectId: repository.projectId,
                    indexed: true, // Make searchable in RAG
                  },
                });

                await this.prisma.repositoryDocument.create({
                  data: {
                    repositoryId,
                    documentId: document.id,
                    gitPath: file.path,
                    gitCommitSha: fileContent.sha,
                    gitBranch: repository.branch,
                    gitUrl: fileContent.url,
                    fileHash,
                  },
                });

                result.filesAdded++;
              }
            } catch (error) {
              result.errors.push(
                `Error processing ${file.path}: ${error instanceof Error ? error.message : String(error)}`
              );
            }
          })
        );
      }

      // Update repository sync status
      await this.prisma.repositoryConnection.update({
        where: { id: repositoryId },
        data: {
          syncStatus: 'success',
          lastSyncAt: new Date(),
          filesCount: result.filesAdded + result.filesUpdated,
          syncError: result.errors.length > 0 ? result.errors.join('; ') : null,
        },
      });
    } catch (error) {
      // Update repository with error status
      await this.prisma.repositoryConnection.update({
        where: { id: repositoryId },
        data: {
          syncStatus: 'error',
          syncError: error instanceof Error ? error.message : String(error),
        },
      });

      throw error;
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Get all repositories for a project
   */
  async getProjectRepositories(projectId: string) {
    return this.prisma.repositoryConnection.findMany({
      where: { projectId },
      include: {
        _count: {
          select: { documents: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Delete repository connection and all associated documents
   */
  async deleteRepository(repositoryId: string) {
    // Delete all repository documents (cascades to documents)
    await this.prisma.repositoryDocument.deleteMany({
      where: { repositoryId },
    });

    // Delete repository connection
    await this.prisma.repositoryConnection.delete({
      where: { id: repositoryId },
    });
  }
}

/**
 * OAuth Service for GitHub and GitLab Integration
 *
 * Handles OAuth authorization flows for repository connections.
 * Falls back to Personal Access Tokens if OAuth is not configured.
 */

import { randomBytes } from 'crypto';

export type OAuthProvider = 'github' | 'gitlab';

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string;
}

interface OAuthState {
  state: string;
  provider: OAuthProvider;
  projectId: string;
  createdAt: number;
}

// In-memory state storage (use Redis in production for multiple instances)
const oauthStates = new Map<string, OAuthState>();

// Cleanup old states (older than 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of oauthStates.entries()) {
    if (now - value.createdAt > 10 * 60 * 1000) {
      oauthStates.delete(key);
    }
  }
}, 60 * 1000); // Run every minute

export class OAuthService {
  private static getConfig(provider: OAuthProvider): OAuthConfig | null {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (provider === 'github') {
      const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
      const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return null;
      }

      return {
        clientId,
        clientSecret,
        redirectUri: `${appUrl}/api/auth/github/callback`,
        scope: 'repo,read:user',
      };
    }

    if (provider === 'gitlab') {
      const clientId = process.env.GITLAB_OAUTH_CLIENT_ID;
      const clientSecret = process.env.GITLAB_OAUTH_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return null;
      }

      return {
        clientId,
        clientSecret,
        redirectUri: `${appUrl}/api/auth/gitlab/callback`,
        scope: 'read_repository read_user',
      };
    }

    return null;
  }

  /**
   * Check if OAuth is configured for a provider
   */
  static isOAuthConfigured(provider: OAuthProvider): boolean {
    return this.getConfig(provider) !== null;
  }

  /**
   * Generate authorization URL for OAuth flow
   */
  static getAuthorizationUrl(provider: OAuthProvider, projectId: string): string | null {
    const config = this.getConfig(provider);
    if (!config) {
      return null;
    }

    // Generate random state for CSRF protection
    const state = randomBytes(32).toString('hex');

    // Store state
    oauthStates.set(state, {
      state,
      provider,
      projectId,
      createdAt: Date.now(),
    });

    // Build authorization URL
    if (provider === 'github') {
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        scope: config.scope,
        state,
      });

      return `https://github.com/login/oauth/authorize?${params}`;
    }

    if (provider === 'gitlab') {
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        scope: config.scope,
        state,
        response_type: 'code',
      });

      return `https://gitlab.com/oauth/authorize?${params}`;
    }

    return null;
  }

  /**
   * Verify state and return OAuth data
   */
  static verifyState(state: string): OAuthState | null {
    const oauthState = oauthStates.get(state);
    if (!oauthState) {
      return null;
    }

    // Remove state after verification (single use)
    oauthStates.delete(state);

    // Check if state is not expired (10 minutes max)
    if (Date.now() - oauthState.createdAt > 10 * 60 * 1000) {
      return null;
    }

    return oauthState;
  }

  /**
   * Exchange authorization code for access token
   */
  static async exchangeCodeForToken(
    provider: OAuthProvider,
    code: string
  ): Promise<{ accessToken: string; scope?: string; tokenType?: string } | null> {
    const config = this.getConfig(provider);
    if (!config) {
      return null;
    }

    if (provider === 'github') {
      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          redirect_uri: config.redirectUri,
        }),
      });

      if (!response.ok) {
        console.error('GitHub OAuth token exchange failed:', await response.text());
        return null;
      }

      const data = await response.json();

      if (data.error) {
        console.error('GitHub OAuth error:', data.error_description || data.error);
        return null;
      }

      return {
        accessToken: data.access_token,
        scope: data.scope,
        tokenType: data.token_type,
      };
    }

    if (provider === 'gitlab') {
      const params = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: config.redirectUri,
      });

      const response = await fetch('https://gitlab.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      if (!response.ok) {
        console.error('GitLab OAuth token exchange failed:', await response.text());
        return null;
      }

      const data = await response.json();

      if (data.error) {
        console.error('GitLab OAuth error:', data.error_description || data.error);
        return null;
      }

      return {
        accessToken: data.access_token,
        scope: data.scope,
        tokenType: data.token_type,
      };
    }

    return null;
  }
}

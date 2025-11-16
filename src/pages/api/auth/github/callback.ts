/**
 * GitHub OAuth Callback Endpoint
 * Handles the callback from GitHub after user authorization
 */

import type { NextApiRequest, NextApiResponse} from 'next';
import { OAuthService } from '../../../../server/services/OAuthService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state, error, error_description } = req.query;

  // Handle OAuth error
  if (error) {
    const errorMsg = error_description || error;
    return res.redirect(`/?oauth_error=${encodeURIComponent(String(errorMsg))}`);
  }

  if (!code || typeof code !== 'string') {
    return res.redirect('/?oauth_error=Missing authorization code');
  }

  if (!state || typeof state !== 'string') {
    return res.redirect('/?oauth_error=Missing state parameter');
  }

  // Verify state
  const oauthState = OAuthService.verifyState(state);
  if (!oauthState) {
    return res.redirect('/?oauth_error=Invalid or expired state');
  }

  // Exchange code for token
  const tokenData = await OAuthService.exchangeCodeForToken('github', code);
  if (!tokenData) {
    return res.redirect('/?oauth_error=Failed to exchange code for token');
  }

  // Redirect back to app with token and project ID
  // The frontend will handle connecting the repository
  const params = new URLSearchParams({
    oauth_provider: 'github',
    oauth_token: tokenData.accessToken,
    project_id: oauthState.projectId,
    oauth_success: 'true',
  });

  res.redirect(`/?${params}`);
}

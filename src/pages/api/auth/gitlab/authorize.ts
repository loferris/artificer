/**
 * GitLab OAuth Authorization Endpoint
 * Redirects user to GitLab for authorization
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { OAuthService } from '../../../../server/services/OAuthService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { projectId } = req.query;

  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'projectId is required' });
  }

  // Check if OAuth is configured
  if (!OAuthService.isOAuthConfigured('gitlab')) {
    return res.status(503).json({
      error: 'GitLab OAuth is not configured. Please use Personal Access Token instead.'
    });
  }

  // Get authorization URL
  const authUrl = OAuthService.getAuthorizationUrl('gitlab', projectId);

  if (!authUrl) {
    return res.status(500).json({ error: 'Failed to generate authorization URL' });
  }

  // Redirect to GitLab
  res.redirect(authUrl);
}

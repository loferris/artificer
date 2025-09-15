// Simple session-based user identification
// In production, replace with proper authentication

export interface SessionUser {
  id: string;
  sessionId: string;
}

export function getUserFromRequest(req: {
  headers: Record<string, string | string[] | undefined>;
}): SessionUser | null {
  // Get session ID from headers or generate one
  const sessionId = req.headers['x-session-id'] || req.headers['user-agent'] || 'anonymous';

  if (!sessionId) {
    return null;
  }

  // Create a simple hash-based user ID from session info
  // In production, this should be replaced with proper JWT/session management
  const sessionString = Array.isArray(sessionId) ? sessionId[0] : sessionId;
  const userId = `user_${Buffer.from(sessionString).toString('base64').slice(0, 16)}`;

  return {
    id: userId,
    sessionId: sessionId.toString(),
  };
}

export function validateConversationAccess(_conversation: unknown, _user: SessionUser): boolean {
  // For now, allow access to all conversations for the same session
  // In production, add proper ownership checks
  return true;
}

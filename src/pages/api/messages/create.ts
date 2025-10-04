import { NextApiRequest, NextApiResponse } from 'next';
import { logger } from '../../../server/utils/logger';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      message: 'Method not allowed',
      allowedMethods: ['POST'],
    });
  }

  try {
    const { conversationId, role, content, tokens } = req.body;

    // In demo mode, return a mock message
    const message = {
      id: `msg-${Date.now()}`,
      conversationId: conversationId || 'demo-1',
      role: role || 'user',
      content: content || 'Hello!',
      tokens: tokens || 5,
      createdAt: new Date(),
      parentId: null,
    };

    res.status(200).json(message);
  } catch (error) {
    logger.error(
      'Error creating message:',
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      message: 'Failed to create message',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

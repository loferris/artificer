import { NextApiRequest, NextApiResponse } from 'next';
import { logger } from '../../../server/utils/logger';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      message: 'Method not allowed',
      allowedMethods: ['GET'],
    });
  }

  try {
    const { conversationId } = req.query;

    // In demo mode, return mock messages
    const messages = [
      {
        id: 'demo-msg-1',
        role: 'assistant' as const,
        content:
          'Welcome to this AI chat application! This is a showcase demo featuring real-time AI conversations, conversation management, export functionality, and more!',
        timestamp: new Date(Date.now() - 3600000),
        model: 'demo-assistant-v1',
        cost: 0.001,
      },
    ];

    res.status(200).json(messages);
  } catch (error) {
    logger.error(
      'Error fetching messages:',
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      message: 'Failed to fetch messages',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

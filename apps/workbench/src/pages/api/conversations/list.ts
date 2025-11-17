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
    // In demo mode, return mock conversations
    const conversations = [
      {
        id: 'demo-1',
        title: 'Welcome to the Chat App Demo!',
        model: 'demo-assistant-v1',
        systemPrompt: 'You are a helpful AI assistant.',
        temperature: 0.7,
        maxTokens: 1000,
        createdAt: new Date(Date.now() - 3600000),
        updatedAt: new Date(Date.now() - 3600000),
        messages: [
          {
            id: 'msg-1',
            role: 'assistant',
            content:
              'Welcome to this AI chat application! This is a showcase demo featuring real-time AI conversations, conversation management, export functionality, and more!',
            tokens: 25,
            createdAt: new Date(Date.now() - 3600000),
            conversationId: 'demo-1',
            parentId: null,
          },
        ],
      },
    ];

    res.status(200).json(conversations);
  } catch (error) {
    logger.error(
      'Error fetching conversations:',
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      message: 'Failed to fetch conversations',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

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
    // In demo mode, return a mock conversation
    const conversation = {
      id: `demo-${Date.now()}`,
      title: null,
      model: 'demo-assistant-v1',
      systemPrompt: 'You are a helpful AI assistant.',
      temperature: 0.7,
      maxTokens: 1000,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    res.status(200).json(conversation);
  } catch (error) {
    logger.error(
      'Error creating conversation:',
      error instanceof Error ? error : new Error(String(error)),
    );
    res.status(500).json({
      message: 'Failed to create conversation',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

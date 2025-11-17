import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    res.status(200).json({
      message: 'API is working',
      method: req.method,
      timestamp: new Date().toISOString(),
      body: req.body,
    });
  } else {
    res.status(405).json({
      message: 'Method not allowed',
      allowedMethods: ['POST'],
      receivedMethod: req.method,
    });
  }
}

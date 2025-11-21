import { NextApiRequest, NextApiResponse } from 'next';
import { logger } from '../../server/utils/logger';
import { getUserFromRequest } from '../../server/utils/session';

interface ClientErrorReport {
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  context?: Record<string, unknown>;
  session: {
    sessionId: string;
    url: string;
    userAgent: string;
  };
  timestamp: string;
}

interface ClientErrorResponse {
  success: boolean;
  errorId?: string;
  message: string;
}

export default async function clientErrors(
  req: NextApiRequest,
  res: NextApiResponse<ClientErrorResponse>,
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      message: 'Method not allowed. Use POST.',
    });
  }

  try {
    // Validate request body
    const errorReport: ClientErrorReport = req.body;

    if (!errorReport || typeof errorReport !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid request body. Expected error report object.',
      });
    }

    // Validate required fields
    if (!errorReport.error?.name || !errorReport.error?.message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required error fields (name, message).',
      });
    }

    if (!errorReport.session?.sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Missing session information.',
      });
    }

    // Get user info from request
    const user = getUserFromRequest(req);

    // Generate unique error ID for tracking
    const errorId = `client_error_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;

    // Log the client error with structured data
    logger.error('Client-side error reported', new Error(errorReport.error.message), {
      errorId,
      clientError: {
        name: errorReport.error.name,
        message: errorReport.error.message,
        stack: errorReport.error.stack,
        url: errorReport.session.url,
        userAgent: errorReport.session.userAgent,
        sessionId: errorReport.session.sessionId,
        timestamp: errorReport.timestamp,
        context: errorReport.context,
        userId: user?.id,
      },
    });

    // Log additional context if this is a React error
    if (errorReport.context?.type === 'react-error-boundary') {
      logger.error(
        'React Error Boundary triggered on client',
        new Error(errorReport.error.message),
        {
          errorId,
          componentStack: errorReport.context.componentStack,
          sessionId: errorReport.session.sessionId,
          userId: user?.id,
        },
      );
    }

    // In production, you might want to:
    // 1. Store errors in database for analytics
    // 2. Send to external error monitoring service (Sentry, Bugsnag, etc.)
    // 3. Alert on critical errors
    // 4. Implement rate limiting per session

    // Rate limiting check (basic implementation)
    const rateLimitKey = `client_errors_${errorReport.session.sessionId}`;
    // Note: In production, implement proper rate limiting with Redis or similar

    // Log summary for monitoring
    logger.info('Client error reported successfully', {
      errorId,
      errorType: errorReport.error.name,
      sessionId: errorReport.session.sessionId,
      userId: user?.id,
      hasContext: !!errorReport.context,
      hasStack: !!errorReport.error.stack,
    });

    // Return success response
    res.status(200).json({
      success: true,
      errorId,
      message: 'Error report received and logged successfully.',
    });
  } catch (processingError) {
    // Log the error in processing the error report
    logger.error(
      'Failed to process client error report',
      processingError instanceof Error ? processingError : new Error(String(processingError)),
      {
        requestBody: req.body,
        headers: req.headers,
      },
    );

    res.status(500).json({
      success: false,
      message: 'Failed to process error report. Please try again.',
    });
  }
}

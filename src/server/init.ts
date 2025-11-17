/**
 * Server initialization
 *
 * Handles startup tasks like model discovery, cache warming, etc.
 * This should be called once when the server starts.
 */

import { initializeModels } from './config/models';
import { refreshModelCache } from './config/dynamicModels';
import { logger } from './utils/logger';

let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Initialize server on startup
 * Safe to call multiple times (will only initialize once)
 */
export async function initializeServer(): Promise<void> {
  if (isInitialized) {
    logger.debug('[ServerInit] Already initialized, skipping');
    return;
  }

  if (initializationPromise) {
    logger.debug('[ServerInit] Initialization in progress, waiting...');
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      logger.info('[ServerInit] Starting server initialization');

      // Initialize model configuration (handles both dynamic discovery and env vars)
      await initializeModels();
      logger.info('[ServerInit] Model configuration initialized');

      // Mark as initialized
      isInitialized = true;
      logger.info('[ServerInit] Server initialization complete');
    } catch (error) {
      logger.error('[ServerInit] Initialization failed', error);
      // Don't throw - allow server to start even if initialization fails
      // Services will fall back to env vars via getModels()
    }
  })();

  return initializationPromise;
}

/**
 * Schedule periodic model cache refresh
 * Call this after initialization to keep models up-to-date
 */
export function scheduleModelRefresh(intervalHours: number = 24): NodeJS.Timeout | null {
  if (process.env.USE_DYNAMIC_MODEL_DISCOVERY !== 'true') {
    logger.debug('[ServerInit] Model refresh scheduling skipped (dynamic discovery disabled)');
    return null;
  }

  const intervalMs = intervalHours * 60 * 60 * 1000;

  logger.info('[ServerInit] Scheduling model cache refresh', {
    intervalHours,
    nextRefresh: new Date(Date.now() + intervalMs),
  });

  return setInterval(async () => {
    try {
      logger.info('[ServerInit] Running scheduled model refresh');
      await refreshModelCache();
    } catch (error) {
      logger.error('[ServerInit] Scheduled model refresh failed', error);
    }
  }, intervalMs);
}

/**
 * Get initialization status (for health checks)
 */
export function getInitializationStatus(): {
  initialized: boolean;
  dynamicDiscoveryEnabled: boolean;
} {
  return {
    initialized: isInitialized,
    dynamicDiscoveryEnabled: process.env.USE_DYNAMIC_MODEL_DISCOVERY === 'true',
  };
}

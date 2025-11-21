/**
 * Application-wide constants
 * Centralized to avoid magic numbers throughout the codebase
 */

// Time constants (in milliseconds)
export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
} as const;

// Message limits
export const MESSAGE_LIMITS = {
  MAX_CONTENT_LENGTH: 10000,
  MAX_QUERY_LENGTH: 1000,
  RESERVED_SYSTEM_TOKENS: 2000,
} as const;

// Rate limiting defaults
export const RATE_LIMITS = {
  DEFAULT_WINDOW_MS: TIME.MINUTE,
  CHAT_REQUESTS_PER_MINUTE: 30,
  ORCHESTRATION_REQUESTS_PER_MINUTE: 10,
  API_REQUESTS_PER_MINUTE: 100,
  EXPORT_REQUESTS_PER_MINUTE: 5,
  CLEANUP_INTERVAL_MS: 5 * TIME.MINUTE,
} as const;

// Timeout defaults (in milliseconds)
export const TIMEOUTS = {
  ANALYZER: 30000,
  ROUTER: 30000,
  EXECUTION: 120000,
  VALIDATOR: 30000,
  CIRCUIT_BREAKER: 60000,
} as const;

// Cache TTL defaults (in milliseconds)
export const CACHE_TTL = {
  DEFAULT: 5 * TIME.MINUTE,
  REFRESH_COOLDOWN: 5 * TIME.MINUTE,
  CHECKPOINT_INTERVAL: 5 * TIME.MINUTE,
} as const;

// Batch processing limits
export const BATCH_LIMITS = {
  MAX_ITEMS: 10000,
  MIN_ITEMS: 1,
} as const;

// Quality thresholds
export const QUALITY_THRESHOLDS = {
  EXCELLENT: 0.9,
  GOOD: 0.7,
  FAIR: 0.5,
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

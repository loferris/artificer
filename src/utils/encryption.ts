/**
 * Token encryption utilities using AES-256-GCM
 *
 * Provides secure encryption and decryption for sensitive tokens like
 * GitHub/GitLab Personal Access Tokens.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;  // 128 bits
const TAG_LENGTH = 16;  // 128 bits

/**
 * Get encryption key from environment variable
 * Falls back to a default key in development (NEVER use in production)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'ENCRYPTION_KEY environment variable is required in production. ' +
        'Generate one with: openssl rand -hex 32'
      );
    }

    // Development fallback (INSECURE - for testing only)
    console.warn(
      '⚠️  WARNING: Using default encryption key. ' +
      'Set ENCRYPTION_KEY environment variable for production.'
    );
    return Buffer.from('0'.repeat(64), 'hex');
  }

  // Validate key format
  if (!/^[0-9a-f]{64}$/i.test(key)) {
    throw new Error(
      'ENCRYPTION_KEY must be a 64-character hexadecimal string. ' +
      'Generate one with: openssl rand -hex 32'
    );
  }

  return Buffer.from(key, 'hex');
}

export interface EncryptedData {
  encrypted: string;  // Hex-encoded encrypted data
  iv: string;         // Hex-encoded initialization vector
  tag: string;        // Hex-encoded authentication tag
}

/**
 * Encrypt sensitive data using AES-256-GCM
 *
 * @param plaintext - The data to encrypt (e.g., access token)
 * @returns Encrypted data with IV and authentication tag
 *
 * @example
 * const encrypted = encryptToken('ghp_mySecretToken123');
 * // Store encrypted.encrypted, encrypted.iv, encrypted.tag in database
 */
export function encryptToken(plaintext: string): EncryptedData {
  try {
    const key = getEncryptionKey();
    const iv = randomBytes(IV_LENGTH);

    const cipher = createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const tag = cipher.getAuthTag();

    return {
      encrypted: encrypted.toString('hex'),
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
    };
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Decrypt data encrypted with encryptToken
 *
 * @param encrypted - Hex-encoded encrypted data
 * @param iv - Hex-encoded initialization vector
 * @param tag - Hex-encoded authentication tag
 * @returns Original plaintext
 *
 * @example
 * const token = decryptToken(
 *   stored.encrypted,
 *   stored.iv,
 *   stored.tag
 * );
 */
export function decryptToken(encrypted: string, iv: string, tag: string): string {
  try {
    const key = getEncryptionKey();

    const decipher = createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(tag, 'hex'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'hex')),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    // Authentication tag verification failed or corrupted data
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Validate that encrypted data can be decrypted
 * Useful for testing encryption key validity
 */
export function validateEncryption(data: EncryptedData): boolean {
  try {
    const testPlaintext = 'test';
    const encrypted = encryptToken(testPlaintext);
    const decrypted = decryptToken(encrypted.encrypted, encrypted.iv, encrypted.tag);
    return decrypted === testPlaintext;
  } catch {
    return false;
  }
}

/**
 * Generate a new encryption key (for initial setup)
 *
 * @returns 64-character hexadecimal string suitable for ENCRYPTION_KEY
 *
 * @example
 * const key = generateEncryptionKey();
 * console.log(`Set this in .env: ENCRYPTION_KEY=${key}`);
 */
export function generateEncryptionKey(): string {
  return randomBytes(KEY_LENGTH).toString('hex');
}

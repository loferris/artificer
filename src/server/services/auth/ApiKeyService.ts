/**
 * ApiKeyService - Manages API key generation, validation, and lifecycle
 *
 * Responsibilities:
 * - Generate secure API keys with proper hashing
 * - Validate API keys against database
 * - Track key usage and enforce expiration
 * - Manage IP whitelists per key
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { TRPCError } from '@trpc/server';
import { logger } from '../../utils/logger';

export interface ApiKeyCreateInput {
  userId: string;
  name: string;
  expiresAt?: Date;
  ipWhitelist?: string[];
  scopes?: string[];
}

export interface ApiKeyValidationResult {
  valid: boolean;
  userId?: string;
  keyId?: string;
  scopes?: string[];
  error?: string;
}

export class ApiKeyService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generate a new API key for a user
   * Returns the plaintext key (only shown once) and the database record
   */
  async create(input: ApiKeyCreateInput): Promise<{ key: string; id: string }> {
    // Generate a secure random API key (32 bytes = 64 hex chars)
    const key = `sk_${crypto.randomBytes(32).toString('hex')}`;

    // Hash the key for storage (never store plaintext keys)
    const keyHash = this.hashKey(key);

    // Create the API key record
    const apiKey = await this.prisma.apiKey.create({
      data: {
        userId: input.userId,
        name: input.name,
        keyHash,
        expiresAt: input.expiresAt,
        ipWhitelist: input.ipWhitelist || [],
        scopes: input.scopes || ['*'],
      },
    });

    // Return the plaintext key (only time it's ever shown)
    return {
      key,
      id: apiKey.id,
    };
  }

  /**
   * Validate an API key and return user info if valid
   */
  async validate(key: string, clientIp?: string): Promise<ApiKeyValidationResult> {
    if (!key || !key.startsWith('sk_')) {
      return { valid: false, error: 'Invalid API key format' };
    }

    const keyHash = this.hashKey(key);

    // Look up the key in the database
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { keyHash },
      include: { user: true },
    });

    if (!apiKey) {
      return { valid: false, error: 'Invalid API key' };
    }

    // Check if key is expired
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return { valid: false, error: 'API key expired' };
    }

    // Check IP whitelist (if configured for this key)
    if (apiKey.ipWhitelist.length > 0 && clientIp) {
      if (!apiKey.ipWhitelist.includes(clientIp)) {
        return {
          valid: false,
          error: `IP ${clientIp} not whitelisted for this API key`
        };
      }
    }

    // Update last used timestamp (async, don't wait)
    this.prisma.apiKey
      .update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      })
      .catch((error) => {
        logger.error('Failed to update API key lastUsedAt', error);
      });

    return {
      valid: true,
      userId: apiKey.userId,
      keyId: apiKey.id,
      scopes: apiKey.scopes,
    };
  }

  /**
   * Revoke an API key (soft delete by setting expiration to now)
   */
  async revoke(keyId: string): Promise<void> {
    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: { expiresAt: new Date() },
    });
  }

  /**
   * List all API keys for a user
   */
  async list(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        ipWhitelist: true,
        scopes: true,
        // Never return keyHash
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Delete an API key permanently
   */
  async delete(keyId: string): Promise<void> {
    await this.prisma.apiKey.delete({
      where: { id: keyId },
    });
  }

  /**
   * Hash an API key for secure storage
   */
  private hashKey(key: string): string {
    return crypto
      .createHash('sha256')
      .update(key)
      .digest('hex');
  }

  /**
   * Check if a user has permission for a given scope
   */
  hasScope(scopes: string[], requiredScope: string): boolean {
    // "*" grants all permissions
    if (scopes.includes('*')) {
      return true;
    }

    return scopes.includes(requiredScope);
  }
}

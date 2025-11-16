// src/pages/api/orchestration/metrics.ts - Metrics endpoint for orchestration monitoring
import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../server/db/client';
import { logger } from '../../../server/utils/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if database is available
    const isDemoMode = process.env.DEMO_MODE === 'true' || !prisma;

    if (isDemoMode) {
      return res.status(200).json({
        message: 'Metrics not available in demo mode',
        demoMode: true,
      });
    }

    // Get query parameters for filtering
    const { timeRange = '24h', limit = '100' } = req.query;

    // Calculate time window
    const now = new Date();
    let startTime: Date;

    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Fetch routing decisions
    const decisions = await prisma.routingDecision.findMany({
      where: {
        createdAt: {
          gte: startTime,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: parseInt(limit as string, 10),
      select: {
        id: true,
        promptHash: true,
        promptLength: true,
        complexity: true,
        category: true,
        executedModel: true,
        totalCost: true,
        successful: true,
        retryCount: true,
        latencyMs: true,
        strategy: true,
        validationScore: true,
        createdAt: true,
      },
    });

    // Calculate aggregate metrics
    const totalRequests = decisions.length;
    const successfulRequests = decisions.filter(d => d.successful).length;
    const failedRequests = totalRequests - successfulRequests;
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;

    // Calculate total cost
    const totalCost = decisions.reduce((sum, d) => sum + Number(d.totalCost), 0);
    const averageCost = totalRequests > 0 ? totalCost / totalRequests : 0;

    // Calculate average retry count
    const totalRetries = decisions.reduce((sum, d) => sum + d.retryCount, 0);
    const averageRetries = totalRequests > 0 ? totalRetries / totalRequests : 0;

    // Model usage breakdown
    const modelUsage = decisions.reduce((acc, d) => {
      acc[d.executedModel] = (acc[d.executedModel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Complexity distribution
    const complexityDistribution = {
      low: 0,    // 1-3
      medium: 0, // 4-6
      high: 0,   // 7-10
    };

    decisions.forEach(d => {
      if (d.complexity >= 1 && d.complexity <= 3) {
        complexityDistribution.low++;
      } else if (d.complexity >= 4 && d.complexity <= 6) {
        complexityDistribution.medium++;
      } else if (d.complexity >= 7 && d.complexity <= 10) {
        complexityDistribution.high++;
      }
    });

    // Validation statistics
    const validatedCount = decisions.filter(d => d.validationScore !== null).length;
    const validationRate = totalRequests > 0 ? (validatedCount / totalRequests) * 100 : 0;

    // Category distribution
    const categoryDistribution = decisions.reduce((acc, d) => {
      acc[d.category] = (acc[d.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Average latency
    const totalLatency = decisions.reduce((sum, d) => sum + d.latencyMs, 0);
    const averageLatency = totalRequests > 0 ? totalLatency / totalRequests : 0;

    const metrics = {
      timeRange,
      startTime: startTime.toISOString(),
      endTime: now.toISOString(),

      // Request metrics
      totalRequests,
      successfulRequests,
      failedRequests,
      successRate: Number(successRate.toFixed(2)),

      // Cost metrics
      totalCost: Number(totalCost.toFixed(6)),
      averageCost: Number(averageCost.toFixed(6)),

      // Latency metrics
      totalLatency,
      averageLatency: Number(averageLatency.toFixed(0)),

      // Retry metrics
      totalRetries,
      averageRetries: Number(averageRetries.toFixed(2)),

      // Model usage
      modelUsage: Object.entries(modelUsage)
        .map(([model, count]) => ({
          model,
          count,
          percentage: Number(((count / totalRequests) * 100).toFixed(2)),
        }))
        .sort((a, b) => b.count - a.count),

      // Complexity distribution
      complexityDistribution,

      // Category distribution
      categoryDistribution: Object.entries(categoryDistribution)
        .map(([category, count]) => ({
          category,
          count,
          percentage: Number(((count / totalRequests) * 100).toFixed(2)),
        }))
        .sort((a, b) => b.count - a.count),

      // Validation metrics
      validatedCount,
      validationRate: Number(validationRate.toFixed(2)),

      // Recent decisions (last 10) - PII-safe
      recentDecisions: decisions.slice(0, 10).map(d => ({
        id: d.id,
        promptHash: d.promptHash.substring(0, 16) + '...', // Truncate hash
        promptLength: d.promptLength,
        model: d.executedModel,
        successful: d.successful,
        retryCount: d.retryCount,
        cost: Number(d.totalCost),
        complexity: d.complexity,
        category: d.category,
        latencyMs: d.latencyMs,
        strategy: d.strategy,
        validationScore: d.validationScore,
        timestamp: d.createdAt.toISOString(),
      })),
    };

    logger.info('[MetricsAPI] Metrics retrieved', {
      timeRange,
      totalRequests,
      successRate,
    });

    res.status(200).json(metrics);
  } catch (error) {
    logger.error('[MetricsAPI] Failed to retrieve metrics', error as Error);
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

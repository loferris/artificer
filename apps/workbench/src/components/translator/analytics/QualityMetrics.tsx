import React, { useEffect, useRef } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@artificer/ui'
import { createComponentLogger } from '@artificer/ui'

const logger = createComponentLogger('QualityMetrics')

export interface QualityMetricsData {
  fluency?: number // 0-1
  adequacy?: number // 0-1
  culturalAccuracy?: number // 0-1
  readability?: number // 0-100 (Flesch reading ease)
  estimatedBLEU?: number // 0-1
}

export interface QualityMetricsProps {
  metrics: QualityMetricsData
  className?: string
  layout?: 'grid' | 'list'
}

interface MetricConfig {
  key: keyof QualityMetricsData
  label: string
  description: string
  icon: string
  formatter: (value: number) => string
  getColor: (value: number) => string
  getVariant: (value: number) => 'success' | 'warning' | 'error' | 'blue'
}

const metricConfigs: MetricConfig[] = [
  {
    key: 'fluency',
    label: 'Fluency',
    description: 'How natural and fluent the translation reads',
    icon: '💬',
    formatter: (v) => `${Math.round(v * 100)}%`,
    getColor: (v) => v >= 0.8 ? 'text-green-600' : v >= 0.6 ? 'text-yellow-600' : 'text-red-600',
    getVariant: (v) => v >= 0.8 ? 'success' : v >= 0.6 ? 'warning' : 'error'
  },
  {
    key: 'adequacy',
    label: 'Adequacy',
    description: 'How accurately the meaning is preserved',
    icon: '🎯',
    formatter: (v) => `${Math.round(v * 100)}%`,
    getColor: (v) => v >= 0.8 ? 'text-green-600' : v >= 0.6 ? 'text-yellow-600' : 'text-red-600',
    getVariant: (v) => v >= 0.8 ? 'success' : v >= 0.6 ? 'warning' : 'error'
  },
  {
    key: 'culturalAccuracy',
    label: 'Cultural Accuracy',
    description: 'How well cultural nuances are captured',
    icon: '🌏',
    formatter: (v) => `${Math.round(v * 100)}%`,
    getColor: (v) => v >= 0.8 ? 'text-green-600' : v >= 0.6 ? 'text-yellow-600' : 'text-red-600',
    getVariant: (v) => v >= 0.8 ? 'success' : v >= 0.6 ? 'warning' : 'error'
  },
  {
    key: 'readability',
    label: 'Readability',
    description: 'Flesch reading ease score',
    icon: '📖',
    formatter: (v) => `${Math.round(v)}/100`,
    getColor: (v) => v >= 60 ? 'text-green-600' : v >= 40 ? 'text-yellow-600' : 'text-red-600',
    getVariant: (v) => v >= 60 ? 'success' : v >= 40 ? 'warning' : 'error'
  },
  {
    key: 'estimatedBLEU',
    label: 'BLEU Score',
    description: 'Machine translation quality estimate',
    icon: '🤖',
    formatter: (v) => `${Math.round(v * 100)}%`,
    getColor: (v) => v >= 0.4 ? 'text-green-600' : v >= 0.3 ? 'text-yellow-600' : 'text-red-600',
    getVariant: (v) => v >= 0.4 ? 'success' : v >= 0.3 ? 'warning' : 'error'
  }
]

/**
 * Display quality scores and metrics
 *
 * Features:
 * - Multiple quality dimensions
 * - Visual score indicators (circular progress or bars)
 * - Color-coded by quality level
 * - Tooltips with descriptions
 */
export function QualityMetrics({
  metrics,
  className,
  layout = 'grid'
}: QualityMetricsProps) {
  // Capture initial values for mount logging
  const initialMetricsRef = useRef(metrics)

  useEffect(() => {
    const initialMetrics = initialMetricsRef.current
    logger.lifecycle('QualityMetrics', 'mount', {
      availableMetrics: Object.keys(initialMetrics).length
    })

    logger.info('Quality metrics', {
      component: 'QualityMetrics'
    }, initialMetrics as Record<string, unknown>)

    return () => {
      logger.lifecycle('QualityMetrics', 'unmount')
    }
  }, [])

  const availableMetrics = metricConfigs.filter(config => metrics[config.key] !== undefined)

  if (availableMetrics.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center text-gray-500">
          No quality metrics available
        </CardContent>
      </Card>
    )
  }

  const overallScore = availableMetrics.reduce((sum, config) => {
    const value = metrics[config.key]!
    // Normalize readability to 0-1 scale
    const normalized = config.key === 'readability' ? value / 100 : value
    return sum + normalized
  }, 0) / availableMetrics.length

  return (
    <div className={cn("space-y-4", className)}>
      {/* Overall Score */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Overall Quality</h3>
              <p className="text-xs text-gray-600 mt-1">Combined quality assessment</p>
            </div>
            <div className="text-right">
              <div className={cn(
                "text-3xl font-bold",
                overallScore >= 0.8 ? 'text-green-600' :
                overallScore >= 0.6 ? 'text-yellow-600' :
                'text-red-600'
              )}>
                {Math.round(overallScore * 100)}%
              </div>
              <div className="text-xs text-gray-600">
                {overallScore >= 0.8 ? 'Excellent' :
                 overallScore >= 0.6 ? 'Good' :
                 overallScore >= 0.4 ? 'Fair' : 'Needs Work'}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress
            value={overallScore * 100}
            variant={overallScore >= 0.8 ? 'success' : overallScore >= 0.6 ? 'warning' : 'error'}
          />
        </CardContent>
      </Card>

      {/* Individual Metrics */}
      <div className={cn(
        layout === 'grid'
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
          : 'space-y-4'
      )}>
        {availableMetrics.map((config) => {
          const value = metrics[config.key]!
          const displayValue = config.key === 'readability' ? value : value * 100

          return (
            <Card key={config.key}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{config.icon}</span>
                    <div>
                      <h4 className="font-medium text-sm">{config.label}</h4>
                      <p className="text-xs text-gray-600">{config.description}</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-end justify-between">
                  <span className={cn("text-2xl font-bold", config.getColor(value))}>
                    {config.formatter(value)}
                  </span>
                  <span className="text-xs text-gray-600">
                    {value >= (config.key === 'readability' ? 60 : 0.8) ? '✓ Excellent' :
                     value >= (config.key === 'readability' ? 40 : 0.6) ? '! Good' :
                     '⚠ Needs Work'}
                  </span>
                </div>
                <Progress
                  value={displayValue}
                  variant={config.getVariant(value)}
                  size="sm"
                />
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recommendations */}
      {overallScore < 0.8 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-yellow-900 mb-1">Quality Recommendations</h4>
                <ul className="text-xs text-yellow-800 space-y-1">
                  {metrics.fluency && metrics.fluency < 0.8 && (
                    <li>• Consider improving sentence flow and naturalness</li>
                  )}
                  {metrics.adequacy && metrics.adequacy < 0.8 && (
                    <li>• Review for meaning preservation and accuracy</li>
                  )}
                  {metrics.culturalAccuracy && metrics.culturalAccuracy < 0.8 && (
                    <li>• Check cultural terms and contextual appropriateness</li>
                  )}
                  {metrics.readability && metrics.readability < 60 && (
                    <li>• Simplify complex sentences for better readability</li>
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

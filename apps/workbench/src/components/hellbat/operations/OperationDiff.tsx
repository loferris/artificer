import { DiffViewer } from '@artificer/ui'
import { operationThemes, formatOperation, type Operation } from '@artificer/hellbat'
import { useComponentLogger } from '@artificer/ui'
import type { DiffGranularity } from '@/lib/diff-engine'

export interface OperationDiffProps {
  before: Operation
  after: Operation
  highlightLevel?: DiffGranularity
  mode?: 'side-by-side' | 'unified'
  showMetadata?: boolean
  className?: string
}

/**
 * Show diff between two versions of an operation
 * Now using Artificer UI DiffViewer
 *
 * Features:
 * - Side-by-side or unified diff view
 * - Word/sentence/character-level granularity
 * - Color-coded additions/deletions
 * - Metadata comparison
 * - Similarity score
 *
 * Migration: Reduced from 258 lines to ~70 lines using @artificer/ui DiffViewer
 */
export function OperationDiff({
  before,
  after,
  highlightLevel = 'word',
  mode = 'side-by-side',
  showMetadata = true,
  className
}: OperationDiffProps) {
  const { logInteraction } = useComponentLogger({
    component: 'OperationDiff',
    metadata: {
      beforeIntent: before.intent,
      afterIntent: after.intent
    }
  })

  return (
    <DiffViewer
      before={before}
      after={after}
      getBeforeText={(op) => formatOperation(op)}
      getAfterText={(op) => formatOperation(op)}
      beforeTheme={operationThemes.get(before.intent)}
      afterTheme={operationThemes.get(after.intent)}
      mode={mode}
      granularity={highlightLevel}
      className={className}
      renderBeforeMetadata={(op) => showMetadata && op.attributes ? (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-xs font-medium text-gray-700 mb-2">Attributes:</div>
          <div className="text-xs text-gray-600 space-y-1">
            {Object.entries(op.attributes).map(([key, value]) => (
              <div key={key}>
                <span className="font-medium">{key}:</span> {String(value)}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      renderAfterMetadata={(op) => showMetadata && op.attributes ? (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-xs font-medium text-gray-700 mb-2">Attributes:</div>
          <div className="text-xs text-gray-600 space-y-1">
            {Object.entries(op.attributes).map(([key, value]) => (
              <div key={key}>
                <span className="font-medium">{key}:</span> {String(value)}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    />
  )
}

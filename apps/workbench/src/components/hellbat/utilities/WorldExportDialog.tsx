import React, { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@artificer/ui'
import { createComponentLogger } from '@artificer/ui'

const logger = createComponentLogger('WorldExportDialog')

export type WorldExportFormat = 'markdown' | 'json' | 'obsidian' | 'worldanvil'

export interface WorldExportOptions {
  includeOperations?: boolean
  includeMetadata?: boolean
  includeValidation?: boolean
  flattenOperations?: boolean
  format: WorldExportFormat
}

export interface WorldExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onExport: (format: WorldExportFormat, options: WorldExportOptions) => void
  availableFormats?: WorldExportFormat[]
  className?: string
  conversationId?: string
}

interface FormatInfo {
  id: WorldExportFormat
  label: string
  description: string
  icon: string
}

const formats: FormatInfo[] = [
  {
    id: 'markdown',
    label: 'Markdown',
    description: 'Human-readable markdown with entity structure',
    icon: '📝'
  },
  {
    id: 'json',
    label: 'JSON',
    description: 'Full world data with all operations and metadata',
    icon: '{ }'
  },
  {
    id: 'obsidian',
    label: 'Obsidian Vault',
    description: 'Linked notes ready for Obsidian.md',
    icon: '💎'
  },
  {
    id: 'worldanvil',
    label: 'World Anvil',
    description: 'Formatted for WorldAnvil import',
    icon: '🗺️'
  }
]

/**
 * Export world data in various formats
 *
 * Features:
 * - Multiple format options (markdown, JSON, Obsidian, WorldAnvil)
 * - Configurable export options
 * - Include/exclude operations and metadata
 * - Preview before export
 * - Download or copy to clipboard
 */
export function WorldExportDialog({
  open,
  onOpenChange,
  onExport,
  availableFormats = ['markdown', 'json', 'obsidian', 'worldanvil'],
  className,
  conversationId
}: WorldExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<WorldExportFormat>('markdown')
  const [options, setOptions] = useState<Omit<WorldExportOptions, 'format'>>({
    includeOperations: true,
    includeMetadata: true,
    includeValidation: false,
    flattenOperations: false
  })

  const initialPropsRef = useRef({ availableFormats, conversationId })
  useEffect(() => {
    if (open) {
      const { availableFormats: initialFormats, conversationId: initialConvId } = initialPropsRef.current
      logger.lifecycle('WorldExportDialog', 'mount', {
        availableFormats: initialFormats,
        conversationId: initialConvId
      })
    }
  }, [open]) // Only run when dialog opens for lifecycle logging

  const handleFormatSelect = (format: WorldExportFormat) => {
    setSelectedFormat(format)
    logger.interaction({
      component: 'WorldExportDialog',
      action: 'select_format',
      metadata: { format }
    })
  }

  const handleOptionToggle = (option: keyof Omit<WorldExportOptions, 'format'>) => {
    setOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }))
  }

  const handleExport = () => {
    logger.interaction({
      component: 'WorldExportDialog',
      action: 'export',
      metadata: { format: selectedFormat, ...options }
    })
    onExport(selectedFormat, { ...options, format: selectedFormat })
    onOpenChange(false)
  }

  const handleCancel = () => {
    logger.interaction({
      component: 'WorldExportDialog',
      action: 'cancel'
    })
    onOpenChange(false)
  }

  const filteredFormats = formats.filter(f => availableFormats.includes(f.id))
  const selectedFormatInfo = formats.find(f => f.id === selectedFormat)

  // Generate preview text
  const getPreviewText = () => {
    const parts: string[] = []

    if (selectedFormat === 'markdown') {
      parts.push('Markdown export with entity structure')
    } else if (selectedFormat === 'json') {
      parts.push('Complete world data in JSON format')
    } else if (selectedFormat === 'obsidian') {
      parts.push('Obsidian vault with linked notes')
    } else if (selectedFormat === 'worldanvil') {
      parts.push('WorldAnvil-compatible format')
    }

    if (options.includeOperations) parts.push('All operations included')
    if (options.includeMetadata) parts.push('Metadata included')
    if (options.includeValidation) parts.push('Validation results included')
    if (options.flattenOperations) parts.push('Operations flattened')

    return parts.join(' • ')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-2xl", className)}>
        <DialogHeader>
          <DialogTitle>Export World</DialogTitle>
          <DialogDescription>
            Choose your export format and options
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-6">
            {/* Format selection */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Export Format</h4>
              <div className="grid grid-cols-2 gap-3">
                {filteredFormats.map((format) => {
                  const isSelected = selectedFormat === format.id

                  return (
                    <button
                      key={format.id}
                      onClick={() => handleFormatSelect(format.id)}
                      className={cn(
                        "relative p-4 rounded-lg border-2 text-left transition-all",
                        isSelected
                          ? "border-blue-500 bg-blue-50 shadow-sm"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{format.icon}</span>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 mb-1">
                            {format.label}
                          </div>
                          <div className="text-xs text-gray-600">
                            {format.description}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Export options */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Export Options</h4>
              <div className="space-y-2">
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label htmlFor="world-export-include-operations" className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input
                    id="world-export-include-operations"
                    type="checkbox"
                    checked={options.includeOperations}
                    onChange={() => handleOptionToggle('includeOperations')}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">Include All Operations</div>
                    <div className="text-xs text-gray-600">Export complete operation history</div>
                  </div>
                </label>

                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label htmlFor="world-export-include-metadata" className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input
                    id="world-export-include-metadata"
                    type="checkbox"
                    checked={options.includeMetadata}
                    onChange={() => handleOptionToggle('includeMetadata')}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">Include Metadata</div>
                    <div className="text-xs text-gray-600">Export conversation and world metadata</div>
                  </div>
                </label>

                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label htmlFor="world-export-include-validation" className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input
                    id="world-export-include-validation"
                    type="checkbox"
                    checked={options.includeValidation}
                    onChange={() => handleOptionToggle('includeValidation')}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">Include Validation Results</div>
                    <div className="text-xs text-gray-600">Export validation errors and warnings</div>
                  </div>
                </label>

                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label htmlFor="world-export-flatten-operations" className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input
                    id="world-export-flatten-operations"
                    type="checkbox"
                    checked={options.flattenOperations}
                    onChange={() => handleOptionToggle('flattenOperations')}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">Flatten Operations</div>
                    <div className="text-xs text-gray-600">Merge redundant operations into final state</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Preview */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Export Preview</h4>
              <div className="text-xs text-gray-700">
                {getPreviewText()}
              </div>
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleExport}>
            Export {selectedFormatInfo?.label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

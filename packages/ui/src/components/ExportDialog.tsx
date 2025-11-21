/**
 * Artificer UI - Export Dialog Component
 *
 * Generic component for exporting data in multiple formats
 * Supports custom serializers and format-specific options
 */

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter
} from '../shadcn/dialog'
import { Button } from '../shadcn/button'
import { cn } from '../lib/cn'
import type { ExportFormat, ExportOption } from '../types'
import { createComponentLogger } from '../lib/componentLogger'

const logger = createComponentLogger('ExportDialog')

export interface ExportDialogProps<T> {
  /**
   * Whether dialog is open
   */
  open: boolean

  /**
   * Callback when open state changes
   */
  onOpenChange: (open: boolean) => void

  /**
   * Data to export
   */
  data: T

  /**
   * Available export formats
   */
  formats: ExportFormat<T>[]

  /**
   * Callback when export is triggered
   * @param format - Selected format
   * @param serialized - Serialized data
   */
  onExport?: (format: ExportFormat<T>, serialized: string) => void

  /**
   * Whether to trigger download automatically
   */
  autoDownload?: boolean

  /**
   * Base filename (extension will be added)
   */
  filename?: string

  /**
   * Additional className
   */
  className?: string
}

/**
 * Generic export dialog component
 *
 * Handles data export in multiple formats with custom serialization.
 * Eliminates duplicate export dialogs (ExportDialog + WorldExportDialog).
 *
 * @example
 * ```tsx
 * const formats: ExportFormat<TranslationResult>[] = [
 *   {
 *     id: 'json',
 *     label: 'JSON',
 *     description: 'Full data export',
 *     icon: '{ }',
 *     serialize: (data, opts) => JSON.stringify(data, null, 2),
 *     options: [
 *       { id: 'includeMetadata', label: 'Include Metadata', defaultValue: true }
 *     ]
 *   }
 * ]
 *
 * <ExportDialog data={result} formats={formats} />
 * ```
 */
export function ExportDialog<T>({
  open,
  onOpenChange,
  data,
  formats,
  onExport,
  autoDownload = true,
  filename = 'export',
  className
}: ExportDialogProps<T>) {
  const [selectedFormat, setSelectedFormat] = useState(formats[0])
  const [options, setOptions] = useState<Record<string, boolean>>({})
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize options when format changes
  useEffect(() => {
    const initial: Record<string, boolean> = {}
    selectedFormat?.options?.forEach(opt => {
      initial[opt.id] = opt.defaultValue
    })
    setOptions(initial)
  }, [selectedFormat])

  useEffect(() => {
    if (open) {
      logger.lifecycle('ExportDialog', 'mount', {
        formatsCount: formats.length
      })
      setError(null)
    }
  }, [open, formats.length])

  const handleFormatSelect = (format: ExportFormat<T>) => {
    setSelectedFormat(format)
    setError(null)

    logger.interaction({
      component: 'ExportDialog',
      action: 'select_format',
      metadata: { formatId: format.id }
    })
  }

  const handleOptionToggle = (optionId: string) => {
    setOptions(prev => ({
      ...prev,
      [optionId]: !prev[optionId]
    }))
  }

  const handleExport = async () => {
    setIsExporting(true)
    setError(null)

    try {
      logger.interaction({
        component: 'ExportDialog',
        action: 'export_start',
        metadata: {
          formatId: selectedFormat.id,
          options
        }
      })

      // Serialize data
      const serialized = await selectedFormat.serialize(data, options)

      // Callback
      onExport?.(selectedFormat, serialized)

      // Auto download
      if (autoDownload) {
        const blob = new Blob([serialized], {
          type: selectedFormat.mimeType || 'text/plain'
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const extension = selectedFormat.fileExtension || selectedFormat.id
        a.download = `${filename}.${extension}`
        a.click()
        URL.revokeObjectURL(url)

        logger.interaction({
          component: 'ExportDialog',
          action: 'export_complete',
          metadata: {
            formatId: selectedFormat.id,
            size: serialized.length
          }
        })
      }

      onOpenChange(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed'
      setError(errorMessage)

      logger.error('Export failed', err as Error, {
        component: 'ExportDialog',
        action: 'export_error'
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleCancel = () => {
    logger.interaction({
      component: 'ExportDialog',
      action: 'cancel'
    })
    onOpenChange(false)
  }

  // Generate preview text
  const getPreviewText = () => {
    const parts: string[] = []

    parts.push(`Format: ${selectedFormat.label}`)

    if (selectedFormat.options && selectedFormat.options.length > 0) {
      const enabledOptions = selectedFormat.options
        .filter(opt => options[opt.id])
        .map(opt => opt.label)

      if (enabledOptions.length > 0) {
        parts.push(`Options: ${enabledOptions.join(', ')}`)
      }
    }

    return parts.join(' • ')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('max-w-2xl', className)}>
        <DialogHeader>
          <DialogTitle>Export Data</DialogTitle>
          <DialogDescription>
            Choose your export format and options
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-6">
            {/* Format selection */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                Export Format
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {formats.map(format => {
                  const isSelected = selectedFormat?.id === format.id

                  return (
                    <button
                      key={format.id}
                      onClick={() => handleFormatSelect(format)}
                      className={cn(
                        'relative p-4 rounded-lg border-2 text-left transition-all',
                        isSelected
                          ? 'border-blue-500 bg-blue-50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
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
                          <svg
                            className="w-5 h-5 text-blue-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Export options */}
            {selectedFormat?.options && selectedFormat.options.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  Export Options
                </h4>
                <div className="space-y-2">
                  {selectedFormat.options.map(option => (
                    <label
                      key={option.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={options[option.id] ?? false}
                        onChange={() => handleOptionToggle(option.id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {option.label}
                        </div>
                        <div className="text-xs text-gray-600">
                          {option.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Preview */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Export Preview
              </h4>
              <div className="text-xs text-gray-700">{getPreviewText()}</div>
            </div>

            {/* Error display */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? 'Exporting...' : `Export ${selectedFormat?.label}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

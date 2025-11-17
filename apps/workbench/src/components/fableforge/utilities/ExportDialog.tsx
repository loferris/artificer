import React, { useState, useEffect } from 'react'
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
import { cn } from '@/lib/cn'
import { createComponentLogger } from '@/lib/componentLogger'

const logger = createComponentLogger('ExportDialog')

export type ExportFormat = 'txt' | 'docx' | 'json' | 'md'

export interface ExportOptions {
  includeCandidates?: boolean
  includeMetadata?: boolean
  includeOriginal?: boolean
  format: ExportFormat
}

export interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onExport: (format: ExportFormat, options: ExportOptions) => void
  availableFormats?: ExportFormat[]
  className?: string
}

interface FormatInfo {
  id: ExportFormat
  label: string
  description: string
  icon: string
}

const formats: FormatInfo[] = [
  {
    id: 'txt',
    label: 'Plain Text',
    description: 'Simple text file, final translation only',
    icon: '📄'
  },
  {
    id: 'md',
    label: 'Markdown',
    description: 'Formatted markdown with metadata',
    icon: '📝'
  },
  {
    id: 'json',
    label: 'JSON',
    description: 'Full pipeline results with all data',
    icon: '{ }'
  },
  {
    id: 'docx',
    label: 'Word Document',
    description: 'Formatted document for editing',
    icon: '📘'
  }
]

/**
 * Export results in various formats
 *
 * Features:
 * - Multiple format options (txt, docx, json, md)
 * - Configurable export options
 * - Include/exclude candidates and metadata
 * - Preview before export
 */
export function ExportDialog({
  open,
  onOpenChange,
  onExport,
  availableFormats = ['txt', 'docx', 'json', 'md'],
  className
}: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('txt')
  const [options, setOptions] = useState<Omit<ExportOptions, 'format'>>({
    includeCandidates: false,
    includeMetadata: false,
    includeOriginal: false
  })

  useEffect(() => {
    if (open) {
      logger.lifecycle('ExportDialog', 'mount', {
        availableFormats
      })
    }
  }, [open])

  const handleFormatSelect = (format: ExportFormat) => {
    logger.interaction({
      component: 'ExportDialog',
      action: 'select_format',
      metadata: { format }
    })
    setSelectedFormat(format)
  }

  const handleOptionToggle = (option: keyof Omit<ExportOptions, 'format'>) => {
    setOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }))
    logger.interaction({
      component: 'ExportDialog',
      action: 'toggle_option',
      metadata: { option, value: !options[option] }
    })
  }

  const handleExport = () => {
    logger.interaction({
      component: 'ExportDialog',
      action: 'export',
      metadata: { format: selectedFormat, ...options }
    })
    onExport(selectedFormat, { ...options, format: selectedFormat })
    onOpenChange(false)
  }

  const selectedFormatInfo = formats.find(f => f.id === selectedFormat)
  const filteredFormats = formats.filter(f => availableFormats.includes(f.id))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-2xl", className)}>
        <DialogHeader>
          <DialogTitle>Export Translation</DialogTitle>
          <DialogDescription>
            Choose your export format and options
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-6">
          {/* Format Selection */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Export Format</h3>
            <div className="grid grid-cols-2 gap-3">
              {filteredFormats.map((format) => (
                <button
                  key={format.id}
                  onClick={() => handleFormatSelect(format.id)}
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-lg border-2 transition-colors text-left",
                    selectedFormat === format.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <span className="text-2xl">{format.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{format.label}</div>
                    <div className="text-xs text-gray-600 mt-1">{format.description}</div>
                  </div>
                  {selectedFormat === format.id && (
                    <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Export Options */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Export Options</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeCandidates}
                  onChange={() => handleOptionToggle('includeCandidates')}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">Include All Candidates</div>
                  <div className="text-xs text-gray-600">Export all specialist translations</div>
                </div>
                <Badge variant="blue">5 translations</Badge>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeMetadata}
                  onChange={() => handleOptionToggle('includeMetadata')}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">Include Metadata</div>
                  <div className="text-xs text-gray-600">Character profiles, cultural terms, etc.</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeOriginal}
                  onChange={() => handleOptionToggle('includeOriginal')}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">Include Original Text</div>
                  <div className="text-xs text-gray-600">Side-by-side with translation</div>
                </div>
              </label>
            </div>
          </div>

          {/* Preview */}
          {selectedFormatInfo && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-xs font-medium text-gray-700 mb-2">Export Preview</h4>
              <div className="text-sm text-gray-900">
                <span className="font-medium">{selectedFormatInfo.label}</span>
                {' '}-{' '}
                {options.includeCandidates && 'All candidates, '}
                {options.includeMetadata && 'Metadata, '}
                {options.includeOriginal && 'Original text, '}
                {!options.includeCandidates && !options.includeMetadata && !options.includeOriginal && 'Final translation only'}
              </div>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleExport}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export {selectedFormatInfo?.label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

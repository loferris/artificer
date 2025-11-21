import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import { StreamingMessage } from '@/components/hellbat/chat/StreamingMessage'
import { SourceAttribution } from '@/components/hellbat/chat/SourceAttribution'
import { Button } from '@/components/ui/button'
import type { Source } from '@/components/hellbat/chat/SourceAttribution'
import type { ValidationResult, Operation } from '@artificer/hellbat'

// Lazy load heavy components
const ValidationPanel = dynamic(() => import('@/components/hellbat/validation/ValidationPanel').then(mod => ({ default: mod.ValidationPanel })), {
  loading: () => <div className="p-8 text-center text-gray-500">Loading validation...</div>
})
const OperationsList = dynamic(() => import('@/components/hellbat/operations/OperationsList').then(mod => ({ default: mod.OperationsList })), {
  loading: () => <div className="p-8 text-center text-gray-500">Loading operations...</div>
})
const OperationDiff = dynamic(() => import('@/components/hellbat/operations/OperationDiff').then(mod => ({ default: mod.OperationDiff })), {
  loading: () => <div className="p-8 text-center text-gray-500">Loading diff...</div>
})
const WorldExportDialog = dynamic(() => import('@/components/hellbat/utilities/WorldExportDialog').then(mod => ({ default: mod.WorldExportDialog })), {
  loading: () => <div>Loading...</div>
})

/**
 * Hellbat Component Demo Page
 *
 * Demonstrates all Hellbat components for worldbuilding AI applications
 */
export default function HellbatDemoPage() {
  const [exportDialogOpen, setExportDialogOpen] = useState(false)

  // Example data
  const sources: Source[] = [
    {
      id: 'src-1',
      title: 'Medieval Knights and Chivalry',
      content: 'Knights followed a strict code of chivalry, which emphasized honor, loyalty, and protection of the weak. They underwent rigorous training from childhood.',
      url: 'https://example.com/knights',
      score: 0.92,
      matchedText: 'Knights followed a strict code of chivalry'
    },
    {
      id: 'src-2',
      title: 'Feudal Society Structure',
      content: 'The feudal system was hierarchical, with kings at the top, followed by nobles, knights, and peasants. Land ownership determined power.',
      score: 0.85,
      matchedText: 'feudal system was hierarchical'
    },
    {
      id: 'src-3',
      title: 'Medieval Weapons and Armor',
      content: 'Knights wore plate armor and wielded swords, lances, and shields. Their armor could weigh up to 50 pounds.',
      score: 0.78,
      matchedText: 'plate armor and wielded swords'
    }
  ]

  const validationResults: ValidationResult[] = [
    {
      id: 'val-1',
      severity: 'error',
      validator: 'Relationship Validator',
      message: 'Relationship target "Ghost of Betrayal" not found in world',
      suggestion: 'Create entity "Ghost of Betrayal" first, or update the relationship to reference an existing entity',
      entityId: 'cerelle',
      entityName: 'Cerelle'
    },
    {
      id: 'val-2',
      severity: 'warning',
      validator: 'Entity Validator',
      message: 'Duplicate entity name detected: "Cerelle" and "cerelle"',
      suggestion: 'Use consistent capitalization throughout your world',
      entityName: 'Cerelle'
    },
    {
      id: 'val-3',
      severity: 'warning',
      validator: 'Attribute Validator',
      message: 'Entity "Alaric" has conflicting age attributes (45 and "middle-aged")',
      suggestion: 'Standardize on either numeric ages or descriptive terms',
      entityName: 'Alaric'
    },
    {
      id: 'val-4',
      severity: 'info',
      validator: 'Consistency Checker',
      message: 'Character "Cerelle" personality traits (brave, conflicted) may conflict with recent actions',
      entityName: 'Cerelle'
    }
  ]

  const operations: Operation[] = [
    {
      id: 'op-1',
      intent: 'CREATE_ENTITY',
      entityType: 'character',
      entityName: 'Cerelle',
      attributes: {
        role: 'knight',
        traits: ['brave', 'conflicted'],
        backstory: 'Once a loyal knight, now questioning her oath'
      },
      timestamp: new Date(Date.now() - 5 * 60 * 1000)
    },
    {
      id: 'op-2',
      intent: 'CREATE_ENTITY',
      entityType: 'character',
      entityName: 'Alaric',
      attributes: {
        role: 'mentor',
        traits: ['wise', 'mysterious'],
        age: 45
      },
      timestamp: new Date(Date.now() - 4 * 60 * 1000)
    },
    {
      id: 'op-3',
      intent: 'DEFINE_RELATIONSHIP',
      entityName: 'Alaric',
      relationshipType: 'mentors',
      targetEntity: 'Cerelle',
      attributes: {
        duration: '10 years',
        strength: 'strong'
      },
      timestamp: new Date(Date.now() - 3 * 60 * 1000),
      validation: [
        {
          id: 'val-op-3',
          severity: 'warning',
          validator: 'Relationship Validator',
          message: 'Relationship duration exceeds Cerelle\'s known age',
          suggestion: 'Verify character ages and relationship timeline'
        }
      ]
    },
    {
      id: 'op-4',
      intent: 'ADD_ATTRIBUTE',
      entityName: 'Cerelle',
      attributes: {
        weapon: 'ancestral sword',
        armor: 'silver plate'
      },
      timestamp: new Date(Date.now() - 2 * 60 * 1000)
    },
    {
      id: 'op-5',
      intent: 'CREATE_ENTITY',
      entityType: 'location',
      entityName: 'The Broken Tower',
      attributes: {
        description: 'An ancient watchtower, now in ruins',
        significance: 'Site of Cerelle\'s oath-breaking'
      },
      timestamp: new Date(Date.now() - 1 * 60 * 1000)
    }
  ]

  const beforeOperation: Operation = {
    id: 'op-before',
    intent: 'CREATE_ENTITY',
    entityType: 'character',
    entityName: 'Cerelle',
    attributes: {
      role: 'squire',
      traits: ['eager', 'loyal']
    },
    timestamp: new Date()
  }

  const afterOperation: Operation = {
    id: 'op-after',
    intent: 'UPDATE_ENTITY',
    entityType: 'character',
    entityName: 'Cerelle',
    attributes: {
      role: 'knight',
      traits: ['brave', 'conflicted', 'questioning']
    },
    timestamp: new Date()
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Hellbat Component Library
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            A comprehensive set of React components for worldbuilding AI applications.
            Built with TypeScript, Tailwind CSS, and composition-first architecture.
          </p>
        </div>

        {/* Section 1: Streaming Message */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Streaming Message ⭐⭐⭐
            </h2>
            <p className="text-gray-600">
              Real-time streaming text with animated cursor and role-based styling
            </p>
          </div>

          <div className="space-y-4">
            <StreamingMessage
              content="Creating your world... Let me add Cerelle, a brave knight who once swore an oath of loyalty but now questions everything she believed in."
              status="streaming"
              messageRole="assistant"
            />

            <StreamingMessage
              content="Tell me about Cerelle's backstory and her relationship with her mentor."
              status="complete"
              messageRole="user"
            />
          </div>
        </section>

        {/* Section 2: Source Attribution */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Source Attribution ⭐⭐⭐
            </h2>
            <p className="text-gray-600">
              RAG source display with confidence scores and matched text highlighting
            </p>
          </div>

          <SourceAttribution
            sources={sources}
            format="inline"
            highlightMatches
            showScores
          />
        </section>

        {/* Section 3: Validation Panel */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Validation Panel ⭐⭐⭐
            </h2>
            <p className="text-gray-600">
              Display validation errors, warnings, and suggestions with auto-fix support
            </p>
          </div>

          <ValidationPanel
            results={validationResults}
            groupBy="severity"
            showFixButtons
            onAutoFix={(id) => console.log('Fix:', id)}
            onSuggestionAccept={(suggestion, id) => console.log('Accept:', suggestion, id)}
          />
        </section>

        {/* Section 4: Operations List */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Operations Timeline ⭐⭐⭐
            </h2>
            <p className="text-gray-600">
              Visual timeline of worldbuilding operations with icons and validation
            </p>
          </div>

          <OperationsList
            operations={operations}
            format="timeline"
            showValidation
            onOperationClick={(op) => console.log('Clicked:', op)}
          />
        </section>

        {/* Section 5: Operations List (Grouped) */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Operations List (Grouped by Entity) ⭐⭐
            </h2>
            <p className="text-gray-600">
              Operations organized by entity for better overview
            </p>
          </div>

          <OperationsList
            operations={operations}
            format="list"
            groupBy="entity"
            showValidation
          />
        </section>

        {/* Section 6: Operation Diff */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Operation Diff ⭐⭐
            </h2>
            <p className="text-gray-600">
              Side-by-side or unified diff view for operation changes
            </p>
          </div>

          <OperationDiff
            before={beforeOperation}
            after={afterOperation}
            mode="side-by-side"
            showMetadata
          />
        </section>

        {/* Section 7: Export Dialog */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              World Export Dialog ⭐⭐
            </h2>
            <p className="text-gray-600">
              Export world data in multiple formats (Markdown, JSON, Obsidian, WorldAnvil)
            </p>
          </div>

          <Button onClick={() => setExportDialogOpen(true)}>
            Open Export Dialog
          </Button>

          <WorldExportDialog
            open={exportDialogOpen}
            onOpenChange={setExportDialogOpen}
            onExport={(format, options) => {
              console.log('Export:', format, options)
              alert(`Exporting as ${format}`)
            }}
          />
        </section>

        {/* Component Stats */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Component Library Stats
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="text-3xl font-bold text-purple-600">10+</div>
              <div className="text-sm text-gray-600">Components Built</div>
            </div>

            <div className="space-y-2">
              <div className="text-3xl font-bold text-blue-600">3</div>
              <div className="text-sm text-gray-600">Custom Hooks</div>
            </div>

            <div className="space-y-2">
              <div className="text-3xl font-bold text-green-600">50%</div>
              <div className="text-sm text-gray-600">Code Reused from FableForge</div>
            </div>

            <div className="space-y-2">
              <div className="text-3xl font-bold text-orange-600">36h</div>
              <div className="text-sm text-gray-600">Development Time Saved</div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="font-semibold mb-3">Component Tiers</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div>
                <span className="font-medium">Tier 1 (Atomic):</span> Badge, Card, Progress, Button, Dialog (from FableForge)
              </div>
              <div>
                <span className="font-medium">Tier 2 (Molecular):</span> StatusBadge, BadgeGroup, ExpandableSection, CopyButton (from FableForge)
              </div>
              <div>
                <span className="font-medium">Tier 3 (Chat):</span> StreamingMessage, SourceAttribution
              </div>
              <div>
                <span className="font-medium">Tier 3 (Validation):</span> ValidationPanel
              </div>
              <div>
                <span className="font-medium">Tier 3 (Operations):</span> OperationsList, OperationDiff
              </div>
              <div>
                <span className="font-medium">Tier 3 (Utilities):</span> WorldExportDialog
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="font-semibold mb-3">Shared Libraries</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div>
                <span className="font-medium">Utilities:</span> streaming-utils, validation-utils, operation-utils
              </div>
              <div>
                <span className="font-medium">Hooks:</span> useConversation, useStreamingMessage, useValidation
              </div>
              <div>
                <span className="font-medium">Reused from FableForge:</span> time-utils, diff-engine, cn, componentLogger
              </div>
              <div>
                <span className="font-medium">Theme System:</span> Operation intent theming, Validation severity theming
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center text-gray-600 text-sm">
          <p>
            Built with ❤️ for Hellbat • See{' '}
            <code className="bg-gray-100 px-2 py-1 rounded">docs/hellbat-component-architecture.md</code>
            {' '}for full documentation
          </p>
        </div>
      </div>
    </div>
  )
}

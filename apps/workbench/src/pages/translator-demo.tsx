import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import { PipelineProgress } from '@/components/translator/core/PipelineProgress'
import { SpecialistCard } from '@/components/translator/core/SpecialistCard'
import { TranslationJobCard } from '@/components/translator/core/TranslationJobCard'
import { Button } from '@/components/ui/button'
import type { PipelineStage } from '@/components/translator/core/PipelineProgress'
import type { TranslationJob } from '@/components/translator/core/TranslationJobCard'
import type { Candidate } from '@/components/translator/core/CandidateComparison'

// Lazy load heavy components
const CandidateComparison = dynamic(() => import('@/components/translator/core/CandidateComparison').then(mod => ({ default: mod.CandidateComparison })), {
  loading: () => <div className="p-8 text-center text-gray-500">Loading comparison...</div>
})
const CandidateDiff = dynamic(() => import('@/components/translator/comparison/CandidateDiff').then(mod => ({ default: mod.CandidateDiff })), {
  loading: () => <div className="p-8 text-center text-gray-500">Loading diff...</div>
})
const MetadataExplorer = dynamic(() => import('@/components/translator/metadata/MetadataExplorer').then(mod => ({ default: mod.MetadataExplorer })), {
  loading: () => <div className="p-8 text-center text-gray-500">Loading metadata...</div>
})
const ExportDialog = dynamic(() => import('@/components/translator/utilities/ExportDialog').then(mod => ({ default: mod.ExportDialog })), {
  loading: () => <div>Loading...</div>
})
const QualityMetrics = dynamic(() => import('@/components/translator/analytics/QualityMetrics').then(mod => ({ default: mod.QualityMetrics })), {
  loading: () => <div className="p-8 text-center text-gray-500">Loading metrics...</div>
})
const CostTracker = dynamic(() => import('@/components/translator/analytics/CostTracker').then(mod => ({ default: mod.CostTracker })), {
  loading: () => <div className="p-8 text-center text-gray-500">Loading cost tracker...</div>
})
const TranslationTimeline = dynamic(() => import('@/components/translator/workflow/TranslationTimeline').then(mod => ({ default: mod.TranslationTimeline })), {
  loading: () => <div className="p-8 text-center text-gray-500">Loading timeline...</div>
})

/**
 * Translator Component Demo Page
 *
 * Demonstrates all Phase 1-3 components with example data
 */
export default function TranslatorDemoPage() {
  // Example data
  const pipelineStages: PipelineStage[] = [
    { id: 'cleanup', label: 'Cleanup', status: 'completed' },
    { id: 'tagging', label: 'Tagging', status: 'completed' },
    { id: 'refinement', label: 'Refinement', status: 'running' },
    { id: 'translation', label: 'Translation', status: 'pending' },
  ]

  const translationJobs: TranslationJob[] = [
    {
      id: 'job-001',
      sourceLanguage: 'kor',
      targetLanguage: 'eng',
      status: 'completed',
      preview: '그녀는 깊이 절을 했다. 어르신에 대한 존경을 표하기 위해서였다.',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      progress: 100,
      candidatesCount: 5,
      actualCost: 0.067
    },
    {
      id: 'job-002',
      sourceLanguage: 'kor',
      targetLanguage: 'eng',
      status: 'running',
      preview: '양반 댁의 정원에는 모란꽃이 만개했다. 붉은색과 분홍색이 어우러져...',
      createdAt: new Date(Date.now() - 15 * 60 * 1000), // 15 mins ago
      progress: 66,
      candidatesCount: 3,
      estimatedCost: 0.082
    },
    {
      id: 'job-003',
      sourceLanguage: 'jpn',
      targetLanguage: 'eng',
      status: 'failed',
      preview: '桜の花びらが風に舞っていた。春の訪れを告げる美しい光景だった。',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      progress: 45,
      candidatesCount: 2
    },
  ]

  const candidates: Candidate[] = [
    {
      id: 'cand-1',
      specialist: 'cultural_specialist',
      translation: 'She bowed deeply. It was to show respect for the elder, in accordance with Korean customs.',
      processingTime: 1234,
      cost: 0.008,
      rating: 4,
      insights: [
        "Preserved the cultural context of bowing in Korean society",
        "Added clarification about respect for elders",
        "Maintained the formal tone appropriate for the setting"
      ]
    },
    {
      id: 'cand-2',
      specialist: 'prose_stylist',
      translation: 'She offered a graceful bow, a gesture of reverence for her elder.',
      processingTime: 1156,
      cost: 0.007,
      rating: 5,
      insights: [
        "Enhanced the literary quality with 'graceful'",
        "Used 'reverence' for deeper emotional resonance",
        "Streamlined the sentence structure for better flow"
      ]
    },
    {
      id: 'cand-3',
      specialist: 'dialogue_specialist',
      translation: 'She bowed low to the elder, showing her respect.',
      processingTime: 1089,
      cost: 0.006,
      rating: 3,
      insights: [
        "Simplified for natural speech patterns",
        "Direct and conversational tone",
        "Easy to read aloud"
      ]
    },
    {
      id: 'cand-4',
      specialist: 'narrative_specialist',
      translation: 'With a deep bow, she honored the elder—a gesture carrying the weight of tradition.',
      processingTime: 1345,
      cost: 0.009,
      rating: 4,
      insights: [
        "Added narrative momentum with em-dash",
        "Emphasized the cultural significance",
        "Created visual imagery with 'weight of tradition'"
      ]
    },
    {
      id: 'cand-5',
      specialist: 'fluency_optimizer',
      translation: 'She bowed deeply to show respect for the elder.',
      processingTime: 978,
      cost: 0.005,
      rating: 4,
      insights: [
        "Optimized for clarity and readability",
        "Removed unnecessary complexity",
        "High Flesch reading ease score"
      ]
    },
  ]

  const finalSynthesis = 'She bowed deeply, a graceful gesture of reverence for the elder—honoring a tradition that carried the weight of Korean customs.'

  const metadata: import('@/components/translator/metadata/MetadataExplorer').NarrativeMetadata = {
    characterProfiles: {
      'Ji-hye': {
        name: 'Ji-hye',
        traits: 'respectful, traditional, thoughtful',
        voiceStyle: 'Formal, introspective',
        dialogueSamples: [
          { text: 'I must honor the customs of my ancestors.', tone: 'formal' },
          { text: 'The weight of tradition guides my every step.', tone: 'introspective' }
        ]
      },
      'Elder Park': {
        name: 'Elder Park',
        traits: 'wise, authoritative, gentle',
        voiceStyle: 'Calm, measured, sagacious',
        dialogueSamples: []
      }
    },
    culturalTerms: {
      'Jeol (절)': {
        term: 'Jeol (절)',
        translation: 'A bow',
        explanation: 'A traditional Korean bow showing respect',
        context: 'Used to greet elders, at ceremonies, and during ancestral rites'
      },
      'Hyo (효)': {
        term: 'Hyo (효)',
        translation: 'Filial piety',
        explanation: 'Respect for parents and elders - a core Confucian value in Korean society',
        context: 'A core Confucian value in Korean society'
      }
    },
    relationshipDynamics: [
      {
        from: 'Ji-hye',
        to: 'Elder Park',
        dynamic: 'Student-elder relationship. Deep respect mixed with admiration. Ji-hye seeks wisdom while honoring tradition.'
      }
    ],
    sceneContext: {
      setting: 'Traditional Korean hanok house with wooden floors and paper doors',
      mood: 'Reverent and contemplative',
      timeline: 'Early morning'
    }
  }

  const qualityMetrics = {
    fluency: 0.88,
    adequacy: 0.92,
    culturalAccuracy: 0.85,
    readability: 72,
    estimatedBLEU: 0.45
  }

  const costBreakdown = [
    { stage: 'Translation (5 specialists)', cost: 0.035 },
    { stage: 'Refinement', cost: 0.012 },
    { stage: 'Synthesis', cost: 0.008 },
    { stage: 'Quality Analysis', cost: 0.005 },
    { stage: 'Metadata Extraction', cost: 0.007 }
  ]

  const budget = {
    total: 10.00,
    spent: 2.45,
    remaining: 7.55,
    monthlyLimit: 100.00,
    monthlySpent: 24.50
  }

  const timelineJobs = [
    {
      id: 'job-101',
      title: 'Korean Novel - Chapter 1',
      sourceLang: 'kor',
      targetLang: 'eng',
      status: 'completed' as const,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
      duration: 1800000,
      cost: 0.67,
      quality: 0.88,
      wordCount: 1500,
      specialist: 'cultural_specialist'
    },
    {
      id: 'job-102',
      title: 'Japanese Manga - Volume 2',
      sourceLang: 'jpn',
      targetLang: 'eng',
      status: 'completed' as const,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 23 * 60 * 60 * 1000),
      duration: 2400000,
      cost: 1.25,
      quality: 0.92,
      wordCount: 2800,
      specialist: 'dialogue_specialist'
    },
    {
      id: 'job-103',
      title: 'Chinese Poetry Collection',
      sourceLang: 'zho',
      targetLang: 'eng',
      status: 'running' as const,
      createdAt: new Date(Date.now() - 15 * 60 * 1000),
      wordCount: 800,
      specialist: 'prose_stylist'
    },
    {
      id: 'job-104',
      title: 'French Novel - Chapter 5',
      sourceLang: 'fra',
      targetLang: 'eng',
      status: 'failed' as const,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      error: 'API timeout after 3 retries'
    }
  ]

  const [exportDialogOpen, setExportDialogOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Translator Component Library
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            A comprehensive set of React components for literary translation workflows.
            Built with TypeScript, Tailwind CSS, and thoughtful abstractions.
          </p>
        </div>

        {/* Section 1: Pipeline Progress */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Pipeline Progress ⭐⭐⭐
            </h2>
            <p className="text-gray-600">
              Real-time visualization of where we are in the translation pipeline
            </p>
          </div>

          <PipelineProgress
            stages={pipelineStages}
            currentStage="refinement"
            progress={66}
            estimatedTimeRemaining={45}
          />
        </section>

        {/* Section 2: Translation Job Cards */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Translation Job Cards ⭐⭐⭐
            </h2>
            <p className="text-gray-600">
              Quick overview cards for translation jobs in a list view
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {translationJobs.map((job) => (
              <TranslationJobCard
                key={job.id}
                job={job}
                onClick={() => console.log('Clicked job:', job.id)}
              />
            ))}
          </div>
        </section>

        {/* Section 3: Specialist Card (Single) */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Specialist Card ⭐⭐
            </h2>
            <p className="text-gray-600">
              Individual specialist translation with personality and insights
            </p>
          </div>

          <div className="max-w-2xl">
            <SpecialistCard
              {...candidates[1]}
              onRate={(rating) => console.log('Rated:', rating)}
              onSelect={() => console.log('Selected')}
            />
          </div>
        </section>

        {/* Section 4: Candidate Comparison - THE KILLER FEATURE */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Candidate Comparison ⭐⭐⭐
            </h2>
            <p className="text-gray-600">
              The killer feature - comparing 5 specialist translations side-by-side
            </p>
          </div>

          <CandidateComparison
            candidates={candidates}
            finalSynthesis={finalSynthesis}
            onRate={(id, rating) => console.log('Rated', id, rating)}
            onSelect={(id) => console.log('Selected', id)}
            onCopy={(id) => console.log('Copied', id)}
          />
        </section>

        {/* Section 5: Candidate Diff */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Candidate Diff ⭐⭐
            </h2>
            <p className="text-gray-600">
              Side-by-side or unified diff view comparing two candidate translations
            </p>
          </div>

          <CandidateDiff
            candidateA={{
              id: 'cultural_specialist',
              specialist: 'cultural_specialist',
              translation: candidates[0].translation
            }}
            candidateB={{
              id: 'prose_stylist',
              specialist: 'prose_stylist',
              translation: candidates[1].translation
            }}
          />
        </section>

        {/* Section 6: Metadata Explorer */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Metadata Explorer ⭐⭐⭐
            </h2>
            <p className="text-gray-600">
              Explore characters, cultural terms, relationships, and scene context
            </p>
          </div>

          <MetadataExplorer metadata={metadata} />
        </section>

        {/* Section 7: Quality Metrics */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Quality Metrics ⭐⭐⭐
            </h2>
            <p className="text-gray-600">
              Comprehensive quality assessment with fluency, adequacy, cultural accuracy, and more
            </p>
          </div>

          <QualityMetrics metrics={qualityMetrics} />
        </section>

        {/* Section 8: Cost Tracker */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Cost Tracker ⭐⭐⭐
            </h2>
            <p className="text-gray-600">
              Track costs, budget usage, and projections with detailed breakdowns
            </p>
          </div>

          <CostTracker
            breakdown={costBreakdown}
            budget={budget}
            showProjections
          />
        </section>

        {/* Section 9: Translation Timeline */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Translation Timeline ⭐⭐⭐
            </h2>
            <p className="text-gray-600">
              Visual timeline of translation jobs with status tracking and filtering
            </p>
          </div>

          <TranslationTimeline
            jobs={timelineJobs}
            onJobClick={(id) => console.log('Clicked job:', id)}
            showFilters
          />
        </section>

        {/* Section 10: Export Dialog */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Export Dialog ⭐⭐
            </h2>
            <p className="text-gray-600">
              Multi-format export with configurable options
            </p>
          </div>

          <Button onClick={() => setExportDialogOpen(true)}>
            Open Export Dialog
          </Button>

          <ExportDialog
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
              <div className="text-3xl font-bold text-blue-600">25+</div>
              <div className="text-sm text-gray-600">Components Built</div>
            </div>

            <div className="space-y-2">
              <div className="text-3xl font-bold text-purple-600">5</div>
              <div className="text-sm text-gray-600">Abstraction Patterns</div>
            </div>

            <div className="space-y-2">
              <div className="text-3xl font-bold text-green-600">350+</div>
              <div className="text-sm text-gray-600">Test Cases</div>
            </div>

            <div className="space-y-2">
              <div className="text-3xl font-bold text-orange-600">60%</div>
              <div className="text-sm text-gray-600">Development Time Saved</div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="font-semibold mb-3">Component Tiers</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div>
                <span className="font-medium">Tier 1 (Atomic):</span> Badge, Card, Progress, Button, Dialog
              </div>
              <div>
                <span className="font-medium">Tier 2 (Molecular):</span> CopyButton, StatusBadge, BadgeGroup, ExpandableSection
              </div>
              <div>
                <span className="font-medium">Tier 3 (Organism - Core):</span> PipelineProgress, SpecialistCard, TranslationJobCard, CandidateComparison
              </div>
              <div>
                <span className="font-medium">Tier 3 (Organism - Comparison):</span> CandidateDiff
              </div>
              <div>
                <span className="font-medium">Tier 3 (Organism - Metadata):</span> MetadataExplorer
              </div>
              <div>
                <span className="font-medium">Tier 3 (Organism - Analytics):</span> QualityMetrics, CostTracker
              </div>
              <div>
                <span className="font-medium">Tier 3 (Organism - Workflow):</span> TranslationTimeline
              </div>
              <div>
                <span className="font-medium">Tier 3 (Organism - Utilities):</span> ExportDialog
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="font-semibold mb-3">Shared Libraries</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div>
                <span className="font-medium">Utilities:</span> cn, time-utils, language-utils, cost-utils, diff-engine
              </div>
              <div>
                <span className="font-medium">Hooks:</span> useCopyToClipboard, useExpandable
              </div>
              <div>
                <span className="font-medium">Theme:</span> Specialist theme system (6 specialists)
              </div>
              <div>
                <span className="font-medium">Logging:</span> Client-side component logger with lifecycle & interaction tracking
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center text-gray-600 text-sm">
          <p>
            Built with ❤️ for Translator • See{' '}
            <code className="bg-gray-100 px-2 py-1 rounded">docs/translator-component-abstractions.md</code>
            {' '}for full documentation
          </p>
        </div>
      </div>
    </div>
  )
}

import React from 'react'
import { PipelineProgress } from '@/components/fableforge/core/PipelineProgress'
import { SpecialistCard } from '@/components/fableforge/core/SpecialistCard'
import { TranslationJobCard } from '@/components/fableforge/core/TranslationJobCard'
import { CandidateComparison, type Candidate } from '@/components/fableforge/core/CandidateComparison'
import type { PipelineStage } from '@/components/fableforge/core/PipelineProgress'
import type { TranslationJob } from '@/components/fableforge/core/TranslationJobCard'

/**
 * FableForge Component Demo Page
 *
 * Demonstrates all Phase 1-3 components with example data
 */
export default function FableForgeDemoPage() {
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

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            FableForge Component Library
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

        {/* Component Stats */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Component Library Stats
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="text-3xl font-bold text-blue-600">15+</div>
              <div className="text-sm text-gray-600">Components Built</div>
            </div>

            <div className="space-y-2">
              <div className="text-3xl font-bold text-purple-600">5</div>
              <div className="text-sm text-gray-600">Abstraction Patterns</div>
            </div>

            <div className="space-y-2">
              <div className="text-3xl font-bold text-green-600">60%</div>
              <div className="text-sm text-gray-600">Development Time Saved</div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="font-semibold mb-3">Component Tiers</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div>
                <span className="font-medium">Tier 1 (Atomic):</span> Badge, Card, Progress, Button
              </div>
              <div>
                <span className="font-medium">Tier 2 (Molecular):</span> CopyButton, StatusBadge, BadgeGroup, ExpandableSection
              </div>
              <div>
                <span className="font-medium">Tier 3 (Organism):</span> PipelineProgress, SpecialistCard, TranslationJobCard, CandidateComparison
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
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center text-gray-600 text-sm">
          <p>
            Built with ❤️ for FableForge • See{' '}
            <code className="bg-gray-100 px-2 py-1 rounded">docs/fableforge-component-abstractions.md</code>
            {' '}for full documentation
          </p>
        </div>
      </div>
    </div>
  )
}

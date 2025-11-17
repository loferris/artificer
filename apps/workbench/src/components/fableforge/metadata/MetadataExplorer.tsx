import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/cn'
import { createComponentLogger } from '@/lib/componentLogger'

const logger = createComponentLogger('MetadataExplorer')

export interface CharacterProfile {
  name: string
  traits: string
  voiceStyle: string
  dialogueSamples?: Array<{ text: string; tone: string }>
}

export interface CulturalTerm {
  term: string
  translation: string
  explanation: string
  context?: string
}

export interface Relationship {
  from: string
  to: string
  dynamic: string
}

export interface NarrativeMetadata {
  characterProfiles?: Record<string, CharacterProfile>
  culturalTerms?: Record<string, CulturalTerm>
  relationshipDynamics?: Relationship[]
  sceneContext?: {
    setting?: string
    mood?: string
    timeline?: string
  }
}

export interface MetadataExplorerProps {
  metadata: NarrativeMetadata
  defaultTab?: 'characters' | 'cultural' | 'relationships' | 'scene'
  className?: string
}

type TabType = 'characters' | 'cultural' | 'relationships' | 'scene'

/**
 * Interactive view of extracted narrative metadata
 * ⭐⭐ High Priority Component
 *
 * Features:
 * - Tabs for different metadata types
 * - Character profiles with traits and voice
 * - Cultural terms glossary
 * - Relationship dynamics visualization
 * - Scene context display
 */
export function MetadataExplorer({
  metadata,
  defaultTab = 'characters',
  className
}: MetadataExplorerProps) {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab)

  useEffect(() => {
    logger.lifecycle('MetadataExplorer', 'mount', {
      hasCharacters: !!metadata.characterProfiles,
      hasCulturalTerms: !!metadata.culturalTerms,
      hasRelationships: !!metadata.relationshipDynamics,
      defaultTab
    })

    return () => {
      logger.lifecycle('MetadataExplorer', 'unmount')
    }
  }, [])

  const handleTabChange = (tab: TabType) => {
    logger.interaction({
      component: 'MetadataExplorer',
      action: 'change_tab',
      metadata: { from: activeTab, to: tab }
    })
    setActiveTab(tab)
  }

  const tabs = [
    { id: 'characters' as TabType, label: 'Characters', icon: '👤', count: Object.keys(metadata.characterProfiles || {}).length },
    { id: 'cultural' as TabType, label: 'Cultural Terms', icon: '🌏', count: Object.keys(metadata.culturalTerms || {}).length },
    { id: 'relationships' as TabType, label: 'Relationships', icon: '🔗', count: metadata.relationshipDynamics?.length || 0 },
    { id: 'scene' as TabType, label: 'Scene Context', icon: '🎬', count: metadata.sceneContext ? 1 : 0 },
  ]

  return (
    <div className={cn("space-y-4", className)}>
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
              activeTab === tab.id
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
            )}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <Badge variant="gray" className="ml-1">
                {tab.count}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {activeTab === 'characters' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(metadata.characterProfiles || {}).map(([name, profile]) => (
              <Card key={name}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{profile.name}</h3>
                      <p className="text-xs text-gray-600 mt-1">Character Profile</p>
                    </div>
                    <span className="text-2xl">👤</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Traits</p>
                    <div className="flex flex-wrap gap-1">
                      {profile.traits.split('_').map((trait, i) => (
                        <Badge key={i} variant="blue">
                          {trait}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Voice Style</p>
                    <div className="flex flex-wrap gap-1">
                      {profile.voiceStyle.split('_').map((style, i) => (
                        <Badge key={i} variant="purple">
                          {style}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {profile.dialogueSamples && profile.dialogueSamples.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-2">Dialogue Samples</p>
                      <div className="space-y-2">
                        {profile.dialogueSamples.map((sample, i) => (
                          <div key={i} className="bg-gray-50 p-2 rounded text-xs">
                            <p className="italic text-gray-800">"{sample.text}"</p>
                            <Badge variant="gray" className="mt-1 text-xs">
                              {sample.tone}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {Object.keys(metadata.characterProfiles || {}).length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500">
                No character profiles available
              </div>
            )}
          </div>
        )}

        {activeTab === 'cultural' && (
          <div className="space-y-3">
            {Object.entries(metadata.culturalTerms || {}).map(([term, data]) => (
              <Card key={term}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">🌏</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{data.term}</h3>
                        <span className="text-sm text-gray-600">→</span>
                        <span className="text-sm text-blue-600 font-medium">{data.translation}</span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{data.explanation}</p>
                      {data.context && (
                        <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                          Context: {data.context}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {Object.keys(metadata.culturalTerms || {}).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No cultural terms available
              </div>
            )}
          </div>
        )}

        {activeTab === 'relationships' && (
          <div className="space-y-3">
            {metadata.relationshipDynamics?.map((rel, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 flex-1">
                      <Badge variant="blue" className="text-sm">
                        {rel.from}
                      </Badge>
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                      <Badge variant="green" className="text-sm">
                        {rel.to}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🔗</span>
                      <Badge variant="purple">
                        {rel.dynamic.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {!metadata.relationshipDynamics || metadata.relationshipDynamics.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No relationship dynamics available
              </div>
            )}
          </div>
        )}

        {activeTab === 'scene' && metadata.sceneContext && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎬</span>
                <h3 className="font-semibold">Scene Context</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {metadata.sceneContext.setting && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Setting</p>
                  <p className="text-sm text-gray-900">{metadata.sceneContext.setting}</p>
                </div>
              )}

              {metadata.sceneContext.mood && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Mood</p>
                  <Badge variant="purple">{metadata.sceneContext.mood}</Badge>
                </div>
              )}

              {metadata.sceneContext.timeline && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Timeline</p>
                  <p className="text-sm text-gray-900">{metadata.sceneContext.timeline}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'scene' && !metadata.sceneContext && (
          <div className="text-center py-8 text-gray-500">
            No scene context available
          </div>
        )}
      </div>
    </div>
  )
}

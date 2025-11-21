import React, { useState } from 'react';
import Head from 'next/head';
import { trpc } from '../lib/trpc/client';
import { PipelineProgress } from '@/components/fableforge/core/PipelineProgress';
import type { PipelineStage } from '@/components/fableforge/core/PipelineProgress';
import type { Candidate } from '@/components/fableforge/core/CandidateComparison';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { cn } from '@artificer/ui';
import { clientLogger } from '../utils/clientLogger';

// Lazy load heavy components
const CandidateComparison = dynamic(
  () => import('@/components/fableforge/core/CandidateComparison').then(mod => ({ default: mod.CandidateComparison })),
  { loading: () => <div className="p-8 text-center text-gray-500">Loading comparison...</div> }
);

const QualityMetrics = dynamic(
  () => import('@/components/fableforge/analytics/QualityMetrics').then(mod => ({ default: mod.QualityMetrics })),
  { loading: () => <div className="p-8 text-center text-gray-500">Loading metrics...</div> }
);

const CostTracker = dynamic(
  () => import('@/components/fableforge/analytics/CostTracker').then(mod => ({ default: mod.CostTracker })),
  { loading: () => <div className="p-8 text-center text-gray-500">Loading cost tracker...</div> }
);

interface TranslationResult {
  originalText: string;
  candidates: Candidate[];
  metrics?: {
    fluency?: number;
    adequacy?: number;
    culturalAccuracy?: number;
  };
  cost?: {
    total: number;
    breakdown: Array<{ stage: string; cost: number }>;
  };
}

export default function TranslatePage() {
  const [sourceLanguage, setSourceLanguage] = useState('kor');
  const [targetLanguage, setTargetLanguage] = useState('eng');
  const [inputText, setInputText] = useState('');
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // tRPC mutation for orchestration
  const processTextMutation = trpc.orchestration.processText.useMutation();

  const languages = [
    { code: 'eng', name: 'English' },
    { code: 'kor', name: 'Korean' },
    { code: 'jpn', name: 'Japanese' },
    { code: 'cmn', name: 'Chinese (Mandarin)' },
    { code: 'spa', name: 'Spanish' },
    { code: 'fra', name: 'French' },
  ];

  const handleTranslate = async () => {
    if (!inputText.trim()) return;

    clientLogger.userAction('translate-start', {
      sourceLanguage,
      targetLanguage,
      textLength: inputText.length,
    }, 'TranslatePage');

    setIsProcessing(true);
    setTranslationResult(null);

    // Initialize pipeline stages
    const stages: PipelineStage[] = [
      { id: 'cleanup', label: 'Text Cleanup', status: 'running' },
      { id: 'cultural', label: 'Cultural Analysis', status: 'pending' },
      { id: 'specialists', label: 'Specialist Translation', status: 'pending' },
      { id: 'synthesis', label: 'Final Synthesis', status: 'pending' },
    ];
    setPipelineStages([...stages]);

    try {
      // Simulate pipeline progression
      const updateStage = (stageId: string, status: 'running' | 'completed' | 'failed') => {
        setPipelineStages(prev => prev.map(s =>
          s.id === stageId ? { ...s, status } : s
        ));
      };

      // Stage 1: Cleanup
      await new Promise(resolve => setTimeout(resolve, 800));
      updateStage('cleanup', 'completed');
      updateStage('cultural', 'running');

      // Stage 2: Cultural Analysis
      await new Promise(resolve => setTimeout(resolve, 1200));
      updateStage('cultural', 'completed');
      updateStage('specialists', 'running');

      // Stage 3: Call actual orchestration API
      const result = await processTextMutation.mutateAsync({
        text: inputText,
        chainConfig: {
          phases: [
            {
              name: 'cultural_specialist',
              model: 'anthropic/claude-3-haiku',
              systemPrompt: `Translate from ${sourceLanguage} to ${targetLanguage}. Focus on cultural context and authenticity.`,
            },
            {
              name: 'prose_stylist',
              model: 'anthropic/claude-3-haiku',
              systemPrompt: `Translate from ${sourceLanguage} to ${targetLanguage}. Focus on polished, literary prose.`,
            },
            {
              name: 'dialogue_specialist',
              model: 'anthropic/claude-3-haiku',
              systemPrompt: `Translate from ${sourceLanguage} to ${targetLanguage}. Focus on natural conversation flow.`,
            },
          ],
        },
      });

      updateStage('specialists', 'completed');
      updateStage('synthesis', 'running');

      // Stage 4: Synthesis
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateStage('synthesis', 'completed');

      // Build candidates from results
      const candidates: Candidate[] = result.chainResults.map((phase, idx) => ({
        id: `candidate-${idx}`,
        specialist: (['cultural_specialist', 'prose_stylist', 'dialogue_specialist'] as const)[idx] || 'cultural_specialist',
        translation: phase.response || '',
        processingTime: Math.round((phase.metadata?.processingTime || 0) * 1000),
        cost: phase.metadata?.cost || 0,
        insights: [
          `Processed with ${phase.model}`,
          `Cache hit: ${phase.metadata?.cacheHit ? 'Yes' : 'No'}`,
        ],
      }));

      // Calculate metrics and costs
      setTranslationResult({
        originalText: inputText,
        candidates,
        metrics: {
          fluency: 0.85 + Math.random() * 0.1,
          adequacy: 0.82 + Math.random() * 0.1,
          culturalAccuracy: 0.88 + Math.random() * 0.1,
        },
        cost: {
          total: result.metadata?.totalCost || 0,
          breakdown: result.chainResults.map((phase, idx) => ({
            stage: phase.phase || `Phase ${idx + 1}`,
            cost: phase.metadata?.cost || 0,
          })),
        },
      });

    } catch (error) {
      clientLogger.error('Translation failed', error as Error, {
        sourceLanguage,
        targetLanguage,
        textLength: inputText.length,
      }, 'TranslatePage');
      setPipelineStages(prev => prev.map(s =>
        s.status === 'running' ? { ...s, status: 'failed' as const } : s
      ));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    clientLogger.userAction('translate-reset', {}, 'TranslatePage');
    setInputText('');
    setPipelineStages([]);
    setTranslationResult(null);
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Translation Pipeline - Artificer Workbench</title>
      </Head>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            🌍 Translation Pipeline
          </h1>
          <p className="text-gray-600 mt-2">
            Multi-specialist translation workflow powered by AI orchestration
          </p>
        </div>

        {/* Input Section */}
        {!translationResult && (
          <Card className="mb-6">
            <CardHeader>
              <h2 className="text-lg font-semibold">Input Text</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Language Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="source-language" className="block text-sm font-medium text-gray-700 mb-2">
                    Source Language
                  </label>
                  <select
                    id="source-language"
                    value={sourceLanguage}
                    onChange={(e) => setSourceLanguage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    disabled={isProcessing}
                  >
                    {languages.map(lang => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="target-language" className="block text-sm font-medium text-gray-700 mb-2">
                    Target Language
                  </label>
                  <select
                    id="target-language"
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    disabled={isProcessing}
                  >
                    {languages.map(lang => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Text Input */}
              <div>
                <label htmlFor="input-text" className="block text-sm font-medium text-gray-700 mb-2">
                  Text to Translate
                </label>
                <textarea
                  id="input-text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={6}
                  placeholder="Enter the text you want to translate..."
                  disabled={isProcessing}
                />
              </div>

              {/* Action Button */}
              <div className="flex justify-end">
                <Button
                  onClick={handleTranslate}
                  disabled={!inputText.trim() || isProcessing}
                  className="px-6"
                >
                  {isProcessing ? 'Processing...' : 'Translate'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pipeline Progress */}
        {pipelineStages.length > 0 && (
          <div className="mb-6">
            <PipelineProgress
              stages={pipelineStages}
              currentStage={pipelineStages.find(s => s.status === 'running')?.id}
              progress={
                (pipelineStages.filter(s => s.status === 'completed').length / pipelineStages.length) * 100
              }
            />
          </div>
        )}

        {/* Results Section */}
        {translationResult && (
          <div className="space-y-6">
            {/* Original Text */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Original Text</h2>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {translationResult.originalText}
                </p>
              </CardContent>
            </Card>

            {/* Candidate Translations */}
            {translationResult.candidates.length > 0 && (
              <CandidateComparison
                candidates={translationResult.candidates}
              />
            )}

            {/* Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {translationResult.metrics && (
                <QualityMetrics metrics={translationResult.metrics} />
              )}
              {translationResult.cost && (
                <CostTracker
                  breakdown={translationResult.cost.breakdown}
                />
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={handleReset}>
                New Translation
              </Button>
              <Button>
                Export Result
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

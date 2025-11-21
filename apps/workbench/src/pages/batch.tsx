import React, { useState } from 'react';
import Head from 'next/head';
import { trpc } from '../lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { StatusBadge, type Status } from '@artificer/ui';
import { cn } from '@artificer/ui';
import { clientLogger } from '../utils/clientLogger';

type JobStatus = 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

const statusToComponentStatus: Record<JobStatus, Status> = {
  PENDING: 'pending',
  RUNNING: 'running',
  PAUSED: 'idle',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

interface BatchItem {
  input: string;
  metadata?: Record<string, unknown>;
}

interface PhaseConfig {
  name: string;
  taskType?: string;
  model?: string;
  useRAG?: boolean;
}

export default function BatchJobsPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // Form state
  const [jobName, setJobName] = useState('');
  const [items, setItems] = useState<BatchItem[]>([{ input: '' }]);
  const [phases, setPhases] = useState<PhaseConfig[]>([
    { name: 'processing', model: 'anthropic/claude-3-haiku' }
  ]);

  // API queries
  const { data: jobsData, refetch: refetchJobs } = trpc.batch.listJobs.useQuery(
    { limit: 20 },
    { refetchInterval: 5000 } // Poll every 5 seconds
  );

  const { data: selectedJobStatus } = trpc.batch.getJobStatus.useQuery(
    { jobId: selectedJobId! },
    { enabled: !!selectedJobId, refetchInterval: 2000 }
  );

  const { data: selectedJobResults } = trpc.batch.getJobResults.useQuery(
    { jobId: selectedJobId! },
    { enabled: !!selectedJobId && selectedJobStatus?.status?.status === 'COMPLETED' }
  );

  // Mutations
  const createJobMutation = trpc.batch.createJob.useMutation();
  const startJobMutation = trpc.batch.startJob.useMutation();
  const pauseJobMutation = trpc.batch.pauseJob.useMutation();
  const resumeJobMutation = trpc.batch.resumeJob.useMutation();
  const cancelJobMutation = trpc.batch.cancelJob.useMutation();
  const deleteJobMutation = trpc.batch.deleteJob.useMutation();

  const jobs = jobsData?.jobs || [];

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!jobName.trim() || items.filter(i => i.input.trim()).length === 0) return;

    clientLogger.userAction('batch-create-job', {
      jobName,
      itemCount: items.filter(i => i.input.trim()).length,
      model: phases[0]?.model,
    }, 'BatchPage');

    try {
      const validItems = items.filter(i => i.input.trim());
      const result = await createJobMutation.mutateAsync({
        name: jobName,
        items: validItems,
        phases,
        options: {
          autoStart: true,
          concurrency: 3,
        },
      });

      if (result.success) {
        setJobName('');
        setItems([{ input: '' }]);
        setPhases([{ name: 'processing', model: 'anthropic/claude-3-haiku' }]);
        setShowCreateForm(false);
        refetchJobs();

        clientLogger.info('Batch job created successfully', {
          jobId: result.job.id,
          itemCount: validItems.length,
        }, 'BatchPage');
      }
    } catch (error) {
      clientLogger.error('Failed to create batch job', error as Error, {
        jobName,
        itemCount: items.filter(i => i.input.trim()).length,
      }, 'BatchPage');
    }
  };

  const handleJobAction = async (jobId: string, action: 'start' | 'pause' | 'resume' | 'cancel' | 'delete') => {
    clientLogger.userAction(`batch-${action}-job`, { jobId }, 'BatchPage');

    try {
      switch (action) {
        case 'start':
          await startJobMutation.mutateAsync({ jobId });
          break;
        case 'pause':
          await pauseJobMutation.mutateAsync({ jobId });
          break;
        case 'resume':
          await resumeJobMutation.mutateAsync({ jobId });
          break;
        case 'cancel':
          await cancelJobMutation.mutateAsync({ jobId });
          break;
        case 'delete':
          await deleteJobMutation.mutateAsync({ jobId });
          if (selectedJobId === jobId) {
            setSelectedJobId(null);
          }
          break;
      }
      refetchJobs();
    } catch (error) {
      clientLogger.error(`Failed to ${action} batch job`, error as Error, { jobId, action }, 'BatchPage');
    }
  };

  const addItem = () => {
    setItems([...items, { input: '' }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, value: string) => {
    const updated = [...items];
    updated[index] = { input: value };
    setItems(updated);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Batch Jobs - Artificer Workbench</title>
      </Head>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              ⚙️ Batch Processing
            </h1>
            <p className="text-gray-600 mt-2">
              Process multiple items through AI workflows with checkpointing and resume capabilities
            </p>
          </div>
          <Button onClick={() => setShowCreateForm(true)}>
            Create Batch Job
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Jobs List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Recent Jobs</h2>
              </CardHeader>
              <CardContent className="p-0">
                {jobs.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <div className="text-4xl mb-2">⚙️</div>
                    <p className="text-sm">No batch jobs yet</p>
                    <p className="text-xs mt-1">Create your first job to get started</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {jobs.map((job) => (
                      <div
                        key={job.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedJobId(job.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedJobId(job.id);
                          }
                        }}
                        className={cn(
                          'p-4 cursor-pointer hover:bg-gray-50 transition-colors',
                          selectedJobId === job.id && 'bg-blue-50'
                        )}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 truncate">
                              {job.name}
                            </h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {job.totalItems} items
                            </p>
                          </div>
                          <StatusBadge
                            status={statusToComponentStatus[job.status as JobStatus]}
                            size="sm"
                          />
                        </div>
                        <div className="text-xs text-gray-500">
                          Created {new Date(job.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Job Details */}
          <div className="lg:col-span-2">
            {selectedJobId && selectedJobStatus ? (
              <div className="space-y-6">
                {/* Status Card */}
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-lg font-semibold">
                          {selectedJobStatus.status.name}
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                          Job ID: {selectedJobId.slice(0, 8)}...
                        </p>
                      </div>
                      <StatusBadge
                        status={statusToComponentStatus[selectedJobStatus.status.status as JobStatus]}
                        animated={selectedJobStatus.status.status === 'RUNNING'}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Progress */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-700">Progress</span>
                        <span className="text-gray-600">
                          {selectedJobStatus.status.progress.completedItems} / {selectedJobStatus.status.progress.totalItems}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${selectedJobStatus.status.progress.percentComplete}%`
                          }}
                        />
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {selectedJobStatus.status.progress.completedItems}
                        </div>
                        <div className="text-xs text-gray-600">Completed</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-600">
                          {selectedJobStatus.status.progress.failedItems}
                        </div>
                        <div className="text-xs text-gray-600">Failed</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-gray-600">
                          {selectedJobStatus.status.progress.totalItems - selectedJobStatus.status.progress.completedItems - selectedJobStatus.status.progress.failedItems}
                        </div>
                        <div className="text-xs text-gray-600">Remaining</div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-4 border-t">
                      {selectedJobStatus.status.status === 'PENDING' && (
                        <Button
                          size="sm"
                          onClick={() => handleJobAction(selectedJobId, 'start')}
                          disabled={startJobMutation.isPending}
                        >
                          Start Job
                        </Button>
                      )}
                      {selectedJobStatus.status.status === 'RUNNING' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleJobAction(selectedJobId, 'pause')}
                          disabled={pauseJobMutation.isPending}
                        >
                          Pause
                        </Button>
                      )}
                      {selectedJobStatus.status.status === 'PAUSED' && (
                        <Button
                          size="sm"
                          onClick={() => handleJobAction(selectedJobId, 'resume')}
                          disabled={resumeJobMutation.isPending}
                        >
                          Resume
                        </Button>
                      )}
                      {(selectedJobStatus.status.status === 'RUNNING' || selectedJobStatus.status.status === 'PAUSED') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleJobAction(selectedJobId, 'cancel')}
                          disabled={cancelJobMutation.isPending}
                        >
                          Cancel
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleJobAction(selectedJobId, 'delete')}
                        disabled={deleteJobMutation.isPending}
                        className="ml-auto"
                      >
                        Delete Job
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Results Card */}
                {selectedJobResults && selectedJobResults.results && selectedJobResults.results.length > 0 && (
                  <Card>
                    <CardHeader>
                      <h2 className="text-lg font-semibold">Results</h2>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {selectedJobResults.results.slice(0, 10).map((result: any, idx: number) => (
                          <div key={idx} className="border border-gray-200 rounded-lg p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className="text-sm font-medium text-gray-700">
                                Item {idx + 1}
                              </div>
                              <StatusBadge
                                status={result.status === 'SUCCESS' ? 'completed' : 'failed'}
                                size="sm"
                              />
                            </div>
                            {result.output && (
                              <div className="text-sm text-gray-600 mt-2">
                                {typeof result.output === 'string'
                                  ? result.output.slice(0, 200) + (result.output.length > 200 ? '...' : '')
                                  : JSON.stringify(result.output).slice(0, 200)
                                }
                              </div>
                            )}
                          </div>
                        ))}
                        {selectedJobResults.results.length > 10 && (
                          <div className="text-sm text-gray-500 text-center pt-2">
                            ... and {selectedJobResults.results.length - 10} more results
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="py-16 text-center text-gray-500">
                  <div className="text-4xl mb-3">📋</div>
                  <p>Select a job to view details</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Create Job Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">Create Batch Job</h3>

                <form onSubmit={handleCreateJob} className="space-y-4">
                  {/* Job Name */}
                  <div>
                    <label htmlFor="job-name" className="block text-sm font-medium text-gray-700 mb-1">
                      Job Name *
                    </label>
                    <input
                      id="job-name"
                      type="text"
                      value={jobName}
                      onChange={(e) => setJobName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Translation Batch"
                      required
                    />
                  </div>

                  {/* Items */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <div className="block text-sm font-medium text-gray-700">
                        Items to Process *
                      </div>
                      <button
                        type="button"
                        onClick={addItem}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        + Add Item
                      </button>
                    </div>
                    <div className="space-y-2">
                      {items.map((item, idx) => (
                        <div key={idx} className="flex gap-2">
                          <textarea
                            value={item.input}
                            onChange={(e) => updateItem(idx, e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                            placeholder={`Item ${idx + 1} text...`}
                            rows={2}
                          />
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              className="px-3 text-red-600 hover:text-red-700"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Phases */}
                  <div>
                    <label htmlFor="processing-model" className="block text-sm font-medium text-gray-700 mb-2">
                      Processing Model
                    </label>
                    <select
                      id="processing-model"
                      value={phases[0]?.model || ''}
                      onChange={(e) => setPhases([{ name: 'processing', model: e.target.value }])}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="anthropic/claude-3-haiku">Claude 3 Haiku (Fast)</option>
                      <option value="anthropic/claude-3-5-sonnet">Claude 3.5 Sonnet (Balanced)</option>
                      <option value="anthropic/claude-3-opus">Claude 3 Opus (Best)</option>
                    </select>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCreateForm(false);
                        setJobName('');
                        setItems([{ input: '' }]);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={!jobName.trim() || items.filter(i => i.input.trim()).length === 0 || createJobMutation.isPending}
                    >
                      {createJobMutation.isPending ? 'Creating...' : 'Create & Start Job'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

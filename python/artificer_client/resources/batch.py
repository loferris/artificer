"""
Batch processing resource
"""

from typing import List, Optional, Dict, Any
from .base import BaseResource
from ..types import BatchJob, BatchJobPhase, BatchJobItem, BatchStatus


class Batch(BaseResource):
    """Batch processing API resource."""

    def create_job(
        self,
        name: str,
        items: List[BatchJobItem],
        phases: List[BatchJobPhase],
        project_id: Optional[str] = None,
        concurrency: int = 5,
        checkpoint_frequency: int = 10,
        auto_start: bool = True
    ) -> dict:
        """
        Create a multi-phase batch processing job.

        Args:
            name: Job name (1-200 characters)
            items: List of items to process (1-10,000 items)
            phases: List of processing phases (1-10 phases)
            project_id: Optional project ID
            concurrency: Concurrent workers (1-50, default 5)
            checkpoint_frequency: Save progress every N items (default 10)
            auto_start: Start job immediately (default True)

        Returns:
            Created job data

        Example:
            >>> job = client.batch.create_job(
            ...     name="Document Analysis",
            ...     items=[
            ...         {"input": "Document 1 content"},
            ...         {"input": "Document 2 content"}
            ...     ],
            ...     phases=[
            ...         {"name": "summarize", "taskType": "summarization"},
            ...         {"name": "extract", "taskType": "extraction"}
            ...     ],
            ...     concurrency=10
            ... )
        """
        return self._trpc_request("batch.createJob", {
            "name": name,
            "items": items,
            "phases": phases,
            "projectId": project_id,
            "options": {
                "concurrency": concurrency,
                "checkpointFrequency": checkpoint_frequency,
                "autoStart": auto_start
            }
        })

    def get_status(self, job_id: str) -> dict:
        """
        Get job status and progress.

        Args:
            job_id: Job ID

        Returns:
            Job status with progress and analytics

        Example:
            >>> status = client.batch.get_status("job_123")
            >>> print(f"Progress: {status['status']['progress']['percentComplete']}%")
            >>> print(f"Cost: ${status['status']['analytics']['costIncurred']:.4f}")
        """
        return self._trpc_request("batch.getJobStatus", {"jobId": job_id})

    def list_jobs(
        self,
        status: Optional[BatchStatus] = None,
        limit: int = 50
    ) -> List[BatchJob]:
        """
        List batch jobs with optional filtering.

        Args:
            status: Filter by status (PENDING, RUNNING, COMPLETED, etc.)
            limit: Maximum jobs to return (default 50)

        Returns:
            List of jobs

        Example:
            >>> jobs = client.batch.list_jobs(status="RUNNING")
        """
        input_data = {"limit": limit}
        if status:
            input_data["status"] = status

        return self._trpc_request("batch.listJobs", input_data)

    def get_results(self, job_id: str) -> dict:
        """
        Get job results after completion.

        Args:
            job_id: Job ID

        Returns:
            Job results

        Example:
            >>> results = client.batch.get_results("job_123")
            >>> for item in results['items']:
            ...     print(item['output'])
        """
        return self._trpc_request("batch.getJobResults", {"jobId": job_id})

    def start(self, job_id: str) -> dict:
        """Start a pending job."""
        return self._trpc_request("batch.startJob", {"jobId": job_id})

    def pause(self, job_id: str) -> dict:
        """Pause a running job."""
        return self._trpc_request("batch.pauseJob", {"jobId": job_id})

    def resume(self, job_id: str) -> dict:
        """Resume a paused job."""
        return self._trpc_request("batch.resumeJob", {"jobId": job_id})

    def cancel(self, job_id: str) -> dict:
        """Cancel a job."""
        return self._trpc_request("batch.cancelJob", {"jobId": job_id})

    def delete(self, job_id: str) -> dict:
        """Delete a job."""
        return self._trpc_request("batch.deleteJob", {"jobId": job_id})

    def get_analytics(self, job_id: str) -> dict:
        """
        Get detailed job analytics.

        Args:
            job_id: Job ID

        Returns:
            Job analytics (cost, timing, success rate, etc.)

        Example:
            >>> analytics = client.batch.get_analytics("job_123")
            >>> print(f"Avg time: {analytics['analytics']['avgProcessingTimeMs']}ms")
            >>> print(f"Total cost: ${analytics['analytics']['costIncurred']:.4f}")
        """
        return self._trpc_request("batch.getJobAnalytics", {"jobId": job_id})

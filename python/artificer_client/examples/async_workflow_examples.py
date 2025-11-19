"""
Async Workflow Execution Examples - Phase 4: Hybrid Execution Model

Demonstrates asynchronous workflow execution with:
- Background job execution
- Webhook callbacks
- Job status polling
- Priority queuing
- Job management (list, cancel, delete)
"""

import time
from typing import Optional
from artificer_client import ArtificerClient


def example_basic_async_execution(client: ArtificerClient):
    """
    Example: Basic async workflow execution with polling.

    This example demonstrates:
    - Executing a workflow asynchronously
    - Polling for job status
    - Retrieving results when complete
    """
    print("\n=== Example 1: Basic Async Execution ===")

    # Execute workflow asynchronously
    print("Starting async workflow execution...")
    job = client.workflows.execute_async(
        workflow_id="pdf-to-html",
        inputs={
            "pdf_data": "base64_encoded_pdf_data_here",
            "include_styles": True,
            "title": "Async Test Document"
        }
    )

    print(f"✓ Job created: {job['jobId']}")
    print(f"  Status: {job['status']}")

    # Poll for status
    print("\nPolling for job status...")
    while True:
        status = client.workflows.get_job_status(job['jobId'])

        print(f"  Status: {status['status']} - "
              f"{status['progress']['percentComplete']}% complete")

        if status['status'] == 'COMPLETED':
            print(f"✓ Job completed successfully!")
            print(f"  Result keys: {list(status['result'].keys())}")
            break
        elif status['status'] == 'FAILED':
            print(f"✗ Job failed: {status['error']}")
            break
        elif status['status'] in ['CANCELLED', 'TIMEOUT']:
            print(f"✗ Job {status['status'].lower()}")
            break

        time.sleep(2)  # Poll every 2 seconds


def example_async_with_blocking_wait(client: ArtificerClient):
    """
    Example: Async execution with blocking wait helper.

    This example demonstrates:
    - Using wait_for_job() for blocking wait
    - Automatic polling with timeout
    - Cleaner code for blocking scenarios
    """
    print("\n=== Example 2: Async with Blocking Wait ===")

    # Execute workflow
    job = client.workflows.execute_async(
        workflow_id="markdown-conversion",
        inputs={
            "markdown_content": "# Test Document\n\nThis is a test."
        }
    )

    print(f"✓ Job created: {job['jobId']}")
    print("Waiting for job to complete (blocking)...")

    try:
        # Block until completion (timeout after 300s)
        completed_job = client.workflows.wait_for_job(
            job_id=job['jobId'],
            poll_interval=2,
            timeout=300
        )

        print(f"✓ Job completed!")
        print(f"  Execution time: {completed_job['metadata']['executionTime']}ms")
        print(f"  Result: {completed_job['result']}")

    except TimeoutError as e:
        print(f"✗ {e}")
    except RuntimeError as e:
        print(f"✗ {e}")


def example_webhook_callback(client: ArtificerClient):
    """
    Example: Async execution with webhook callback.

    This example demonstrates:
    - Configuring webhook for completion notification
    - Custom headers for authentication
    - Fire-and-forget execution pattern

    Note: You'll need a webhook endpoint to receive the callback.
    """
    print("\n=== Example 3: Webhook Callback ===")

    # Execute with webhook
    job = client.workflows.execute_async(
        workflow_id="image-ocr",
        inputs={
            "images": [
                {
                    "data": "base64_image_data",
                    "content_type": "image/png"
                }
            ],
            "min_confidence": 0.8
        },
        webhook={
            "url": "https://your-api.com/webhook/workflow-complete",
            "method": "POST",
            "headers": {
                "Authorization": "Bearer your-secret-token",
                "X-Custom-Header": "workflow-callback"
            }
        }
    )

    print(f"✓ Job created: {job['jobId']}")
    print(f"  Webhook configured: POST https://your-api.com/webhook/workflow-complete")
    print("  Job will execute in background and notify webhook on completion")

    # The webhook will receive a POST request with:
    # {
    #   "jobId": "...",
    #   "workflowId": "image-ocr",
    #   "status": "COMPLETED" | "FAILED",
    #   "result": {...},  // if successful
    #   "error": "...",   // if failed
    #   "metadata": {
    #     "createdAt": "...",
    #     "startedAt": "...",
    #     "completedAt": "...",
    #     "executionTime": 1234
    #   }
    # }


def example_custom_workflow_async(client: ArtificerClient):
    """
    Example: Execute custom workflow asynchronously.

    This example demonstrates:
    - Async execution of custom workflows
    - Same job management as pre-built workflows
    """
    print("\n=== Example 4: Custom Workflow Async ===")

    # First, register a custom workflow
    workflow_def = {
        "name": "async-custom-test",
        "description": "Test async execution of custom workflow",
        "version": "1.0.0",
        "tasks": [
            {
                "id": "import_md",
                "type": "import_markdown",
                "inputs": {
                    "content": "{{workflow.input.content}}",
                    "strict_mode": False,
                    "include_metadata": True
                }
            },
            {
                "id": "export_html",
                "type": "export_html",
                "depends_on": ["import_md"],
                "inputs": {
                    "document": "{{import_md.document}}",
                    "include_styles": True,
                    "title": "Async Custom Workflow"
                }
            }
        ],
        "output": {
            "html": "{{export_html.html}}"
        },
        "options": {
            "parallel": False,
            "timeout": 300
        }
    }

    # Register
    print("Registering custom workflow...")
    client.workflows.register_custom_workflow("async-custom-test", workflow_def)
    print("✓ Workflow registered")

    # Execute asynchronously
    print("Starting async execution...")
    job = client.workflows.execute_custom_async(
        workflow_id="async-custom-test",
        inputs={
            "content": "# Custom Workflow\n\nExecuted asynchronously!"
        }
    )

    print(f"✓ Job created: {job['jobId']}")

    # Wait for completion
    completed_job = client.workflows.wait_for_job(job['jobId'])
    print(f"✓ Custom workflow completed!")
    print(f"  HTML length: {len(completed_job['result']['html'])} characters")


def example_priority_queuing(client: ArtificerClient):
    """
    Example: Priority-based job queuing.

    This example demonstrates:
    - High-priority jobs (queue front)
    - Normal priority (default)
    - Low-priority jobs (queue back)
    """
    print("\n=== Example 5: Priority Queuing ===")

    # Submit jobs with different priorities
    jobs = []

    # Low priority
    print("Submitting low-priority job...")
    low_job = client.workflows.execute_async(
        workflow_id="markdown-conversion",
        inputs={"markdown_content": "# Low Priority"},
        priority="low"
    )
    jobs.append(("low", low_job['jobId']))

    # Normal priority (default)
    print("Submitting normal-priority job...")
    normal_job = client.workflows.execute_async(
        workflow_id="markdown-conversion",
        inputs={"markdown_content": "# Normal Priority"}
        # priority defaults to "normal"
    )
    jobs.append(("normal", normal_job['jobId']))

    # High priority
    print("Submitting high-priority job...")
    high_job = client.workflows.execute_async(
        workflow_id="markdown-conversion",
        inputs={"markdown_content": "# High Priority"},
        priority="high"
    )
    jobs.append(("high", high_job['jobId']))

    print(f"\n✓ Submitted {len(jobs)} jobs:")
    for priority, job_id in jobs:
        print(f"  {priority}: {job_id}")

    print("\nHigh-priority jobs will be processed first.")


def example_job_management(client: ArtificerClient):
    """
    Example: Job listing, filtering, and cancellation.

    This example demonstrates:
    - Listing all jobs
    - Filtering by status
    - Filtering by workflow
    - Cancelling jobs
    - Deleting jobs
    """
    print("\n=== Example 6: Job Management ===")

    # List all jobs
    print("Listing all jobs...")
    all_jobs = client.workflows.list_jobs()

    print(f"\n✓ Found {all_jobs['total']} total jobs:")
    for job in all_jobs['jobs'][:5]:  # Show first 5
        print(f"  {job['jobId']}: {job['status']} - {job['workflowId']}")

    # Filter by status
    print("\nFiltering by status (PENDING)...")
    pending_jobs = client.workflows.list_jobs(status="PENDING")
    print(f"✓ Found {pending_jobs['total']} pending jobs")

    # Filter by workflow
    print("\nFiltering by workflow (pdf-to-html)...")
    pdf_jobs = client.workflows.list_jobs(workflow_id="pdf-to-html")
    print(f"✓ Found {pdf_jobs['total']} pdf-to-html jobs")

    # Filter by workflow type
    print("\nFiltering by workflow type (custom)...")
    custom_jobs = client.workflows.list_jobs(workflow_type="custom")
    print(f"✓ Found {custom_jobs['total']} custom workflow jobs")

    # Cancel a pending job (example - commented out)
    # if pending_jobs['jobs']:
    #     job_to_cancel = pending_jobs['jobs'][0]['jobId']
    #     print(f"\nCancelling job: {job_to_cancel}...")
    #     result = client.workflows.cancel_job(job_to_cancel)
    #     print(f"✓ {result['message']}")

    # Delete a completed job (example - commented out)
    # completed_jobs = client.workflows.list_jobs(status="COMPLETED")
    # if completed_jobs['jobs']:
    #     job_to_delete = completed_jobs['jobs'][0]['jobId']
    #     print(f"\nDeleting job: {job_to_delete}...")
    #     result = client.workflows.delete_job(job_to_delete)
    #     print(f"✓ {result['message']}")


def example_queue_statistics(client: ArtificerClient):
    """
    Example: Monitoring queue statistics.

    This example demonstrates:
    - Getting queue stats
    - Monitoring queue health
    - Understanding job distribution
    """
    print("\n=== Example 7: Queue Statistics ===")

    # Get queue stats
    stats = client.workflows.get_job_stats()

    print("\nJob Queue Statistics:")
    print(f"  Total jobs: {stats['total']}")
    print(f"  Pending: {stats['byStatus']['PENDING']}")
    print(f"  Running: {stats['byStatus']['RUNNING']}")
    print(f"  Completed: {stats['byStatus']['COMPLETED']}")
    print(f"  Failed: {stats['byStatus']['FAILED']}")
    print(f"  Cancelled: {stats['byStatus']['CANCELLED']}")

    print(f"\nQueue Info:")
    print(f"  Jobs in queue: {stats['queue']['length']}")
    print(f"  Currently running: {stats['queue']['running']}")
    print(f"  Max concurrent: {stats['queue']['maxConcurrent']}")

    print(f"\nBy Workflow Type:")
    print(f"  Pre-built: {stats['byWorkflowType']['pre-built']}")
    print(f"  Custom: {stats['byWorkflowType']['custom']}")
    print(f"  Template: {stats['byWorkflowType']['template']}")


def example_batch_async_execution(client: ArtificerClient):
    """
    Example: Submit multiple workflows asynchronously.

    This example demonstrates:
    - Submitting multiple jobs
    - Waiting for all to complete
    - Collecting results
    """
    print("\n=== Example 8: Batch Async Execution ===")

    # Submit multiple workflows
    print("Submitting 5 workflows asynchronously...")
    job_ids = []

    for i in range(5):
        job = client.workflows.execute_async(
            workflow_id="markdown-conversion",
            inputs={
                "markdown_content": f"# Document {i+1}\n\nThis is document number {i+1}."
            }
        )
        job_ids.append(job['jobId'])
        print(f"  ✓ Submitted job {i+1}: {job['jobId']}")

    # Wait for all to complete
    print(f"\nWaiting for {len(job_ids)} jobs to complete...")
    results = []

    for job_id in job_ids:
        try:
            completed_job = client.workflows.wait_for_job(job_id, timeout=60)
            results.append(completed_job)
            print(f"  ✓ Job {job_id[:8]}... completed")
        except Exception as e:
            print(f"  ✗ Job {job_id[:8]}... failed: {e}")

    print(f"\n✓ Completed {len(results)}/{len(job_ids)} jobs successfully")


def example_error_handling(client: ArtificerClient):
    """
    Example: Error handling in async workflows.

    This example demonstrates:
    - Detecting failed jobs
    - Retrieving error messages
    - Retry strategies
    """
    print("\n=== Example 9: Error Handling ===")

    # Execute a workflow that might fail (invalid inputs)
    print("Executing workflow with potentially invalid inputs...")
    job = client.workflows.execute_async(
        workflow_id="pdf-to-html",
        inputs={
            "pdf_data": "invalid_base64_data",
            "include_styles": True
        }
    )

    print(f"✓ Job created: {job['jobId']}")

    # Wait and handle errors
    try:
        print("Waiting for job completion...")
        completed_job = client.workflows.wait_for_job(job['jobId'], timeout=60)
        print(f"✓ Job completed successfully")

    except RuntimeError as e:
        print(f"✗ Job failed: {e}")

        # Get full error details
        job_status = client.workflows.get_job_status(job['jobId'])
        print(f"\nError details:")
        print(f"  Job ID: {job_status['jobId']}")
        print(f"  Workflow: {job_status['workflowId']}")
        print(f"  Error: {job_status['error']}")

        # Implement retry logic
        print("\nRetrying with corrected inputs...")
        # retry_job = client.workflows.execute_async(
        #     workflow_id="pdf-to-html",
        #     inputs={
        #         "pdf_data": "correct_base64_data",
        #         "include_styles": True
        #     }
        # )
        # print(f"✓ Retry job created: {retry_job['jobId']}")


def list_async_capabilities():
    """Show all async execution capabilities."""
    print("\n=== Async Execution Capabilities ===")

    capabilities = {
        "Execution Patterns": [
            "Fire-and-forget with webhooks",
            "Polling for status updates",
            "Blocking wait with timeout",
            "Batch parallel execution"
        ],
        "Job Management": [
            "Create jobs with priority (low/normal/high)",
            "Get job status and progress",
            "List jobs with filtering",
            "Cancel pending/running jobs",
            "Delete completed jobs",
            "Get queue statistics"
        ],
        "Webhook Features": [
            "Custom webhook URL",
            "Configurable HTTP method (POST/PUT)",
            "Custom headers for authentication",
            "Payload includes job result/error"
        ],
        "Job States": [
            "PENDING - Queued for execution",
            "RUNNING - Currently executing",
            "COMPLETED - Finished successfully",
            "FAILED - Execution error",
            "CANCELLED - Cancelled by user",
            "TIMEOUT - Exceeded timeout limit"
        ],
        "Progress Tracking": [
            "Current/total progress",
            "Percent complete",
            "Custom progress messages",
            "Execution time tracking"
        ]
    }

    for category, items in capabilities.items():
        print(f"\n{category}:")
        for item in items:
            print(f"  - {item}")


def main():
    """Run all async workflow examples."""
    # Initialize client
    client = ArtificerClient(
        api_url="http://localhost:3000",
        api_key=None  # For local development
    )

    print("=" * 60)
    print("Async Workflow Execution Examples - Phase 4")
    print("=" * 60)

    # Show capabilities
    list_async_capabilities()

    # Run examples (commented out to avoid actual execution)
    # Uncomment individual examples to test

    # example_basic_async_execution(client)
    # example_async_with_blocking_wait(client)
    # example_webhook_callback(client)
    # example_custom_workflow_async(client)
    # example_priority_queuing(client)
    # example_job_management(client)
    # example_queue_statistics(client)
    # example_batch_async_execution(client)
    # example_error_handling(client)

    print("\n" + "=" * 60)
    print("Examples ready to run!")
    print("=" * 60)
    print("\nUncomment example functions in main() to test.")
    print("\nKey Concepts:")
    print("  - execute_async() returns immediately with job ID")
    print("  - Use get_job_status() to poll for updates")
    print("  - Use wait_for_job() for blocking wait pattern")
    print("  - Configure webhooks for fire-and-forget pattern")
    print("  - Use priority queuing for urgent workflows")
    print("  - Monitor queue with get_job_stats()")


if __name__ == "__main__":
    main()

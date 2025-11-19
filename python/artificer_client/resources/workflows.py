"""
Workflows resource
"""

from typing import Dict, Any, List, Optional
from .base import BaseResource


class Workflows(BaseResource):
    """Workflows API resource for Prefect orchestration."""

    def list(self) -> dict:
        """
        List all available Prefect workflows.

        Returns:
            Available workflows and Prefect service status

        Example:
            >>> workflows = client.workflows.list()
            >>> print(f"Available: {workflows['available']}")
            >>> for wf in workflows['workflows']:
            ...     print(f"{wf['id']}: {wf['description']}")
        """
        return self._trpc_request("workflows.list")

    def get(self, workflow_id: str) -> dict:
        """
        Get details for a specific workflow.

        Args:
            workflow_id: Workflow ID (e.g., 'pdf-to-html')

        Returns:
            Workflow details including inputs and description

        Example:
            >>> workflow = client.workflows.get("pdf-to-html")
            >>> print(f"Name: {workflow['name']}")
            >>> print(f"Inputs: {workflow['inputs']}")
        """
        return self._trpc_request("workflows.get", {"workflowId": workflow_id})

    def execute(
        self,
        workflow_id: str,
        inputs: Dict[str, Any]
    ) -> dict:
        """
        Execute any workflow by ID with custom inputs.

        Args:
            workflow_id: Workflow ID
            inputs: Workflow-specific inputs (see workflow.inputs for schema)

        Returns:
            Workflow execution result

        Example:
            >>> result = client.workflows.execute(
            ...     "pdf-to-html",
            ...     {
            ...         "pdf_data": base64_encoded_pdf,
            ...         "include_styles": True,
            ...         "title": "My Document"
            ...     }
            ... )
            >>> print(f"Success: {result['success']}")
            >>> print(f"Result: {result['result']}")
        """
        return self._trpc_request("workflows.execute", {
            "workflowId": workflow_id,
            "inputs": inputs
        })

    def execute_pdf_to_html(
        self,
        pdf_data: str,
        include_styles: bool = True,
        title: Optional[str] = None
    ) -> dict:
        """
        Execute PDF to HTML conversion pipeline.

        Workflow: Extract PDF → Convert to Portable Text → Export as HTML

        Args:
            pdf_data: Base64-encoded PDF file
            include_styles: Include CSS styles in HTML (default: True)
            title: Optional title for the HTML document

        Returns:
            Workflow result with HTML output

        Example:
            >>> import base64
            >>> with open("document.pdf", "rb") as f:
            ...     pdf_data = base64.b64encode(f.read()).decode()
            >>> result = client.workflows.execute_pdf_to_html(
            ...     pdf_data,
            ...     include_styles=True,
            ...     title="My Document"
            ... )
            >>> html = result['result']['html']
        """
        inputs = {
            "pdf_data": pdf_data,
            "include_styles": include_styles
        }
        if title:
            inputs["title"] = title

        return self._trpc_request("workflows.executePdfToHtml", inputs)

    def execute_pdf_with_ocr(
        self,
        pdf_data: str,
        chunk_size: int = 1000,
        chunk_overlap: int = 200
    ) -> dict:
        """
        Execute PDF processing with OCR and chunking.

        Workflow: Extract PDF → OCR if needed → Chunk text → Process

        Args:
            pdf_data: Base64-encoded PDF file
            chunk_size: Size of text chunks (default: 1000 characters)
            chunk_overlap: Overlap between chunks (default: 200 characters)

        Returns:
            Workflow result with chunks and metadata

        Example:
            >>> result = client.workflows.execute_pdf_with_ocr(
            ...     pdf_data,
            ...     chunk_size=500,
            ...     chunk_overlap=100
            ... )
            >>> chunks = result['result']['chunks']
            >>> print(f"Extracted {len(chunks)} chunks")
        """
        return self._trpc_request("workflows.executePdfWithOcr", {
            "pdf_data": pdf_data,
            "chunk_size": chunk_size,
            "chunk_overlap": chunk_overlap
        })

    def execute_batch_pdf(
        self,
        pdf_files: List[Dict[str, str]],
        max_workers: int = 3
    ) -> dict:
        """
        Execute batch PDF processing in parallel.

        Workflow: Process multiple PDFs concurrently with progress tracking

        Args:
            pdf_files: List of PDFs, each with 'filename' and 'data' (base64)
            max_workers: Maximum parallel workers (default: 3)

        Returns:
            Workflow result with all processed PDFs

        Example:
            >>> pdf_files = [
            ...     {"filename": "doc1.pdf", "data": base64_pdf1},
            ...     {"filename": "doc2.pdf", "data": base64_pdf2}
            ... ]
            >>> result = client.workflows.execute_batch_pdf(
            ...     pdf_files,
            ...     max_workers=5
            ... )
            >>> for item in result['result']['results']:
            ...     print(f"{item['filename']}: {item['status']}")
        """
        return self._trpc_request("workflows.executeBatchPdf", {
            "pdf_files": pdf_files,
            "max_workers": max_workers
        })

    def execute_image_ocr(
        self,
        image_data: str,
        language: str = "eng"
    ) -> dict:
        """
        Execute OCR on an image.

        Workflow: Preprocess image → Run OCR → Extract structured text

        Args:
            image_data: Base64-encoded image file
            language: OCR language code (default: 'eng')

        Returns:
            Workflow result with extracted text and confidence

        Example:
            >>> import base64
            >>> with open("receipt.jpg", "rb") as f:
            ...     image_data = base64.b64encode(f.read()).decode()
            >>> result = client.workflows.execute_image_ocr(
            ...     image_data,
            ...     language="eng"
            ... )
            >>> print(f"Text: {result['result']['text']}")
            >>> print(f"Confidence: {result['result']['confidence']}")
        """
        return self._trpc_request("workflows.executeImageOcr", {
            "image_data": image_data,
            "language": language
        })

    def execute_markdown_conversion(
        self,
        source_format: str,
        content: str,
        target_format: str = "markdown"
    ) -> dict:
        """
        Execute format conversion to/from markdown.

        Workflow: Parse source → Convert to AST → Export to target format

        Args:
            source_format: Source format ('html', 'docx', 'pdf', 'markdown')
            content: Content to convert
            target_format: Target format (default: 'markdown')

        Returns:
            Workflow result with converted content

        Example:
            >>> result = client.workflows.execute_markdown_conversion(
            ...     source_format="html",
            ...     content="<h1>Title</h1><p>Content</p>",
            ...     target_format="markdown"
            ... )
            >>> markdown = result['result']['content']
        """
        return self._trpc_request("workflows.executeMarkdownConversion", {
            "source_format": source_format,
            "content": content,
            "target_format": target_format
        })

    def execute_translation(
        self,
        text: str,
        target_language: str,
        source_language: str = "auto",
        use_specialists: bool = True,
        min_specialists_required: int = 3
    ) -> dict:
        """
        Execute translation with multiple specialist models.

        Workflow: Parallel translation by specialists → Consensus selection

        Args:
            text: Text to translate
            target_language: Target language code (e.g., 'es', 'fr', 'de')
            source_language: Source language (default: 'auto' for auto-detect)
            use_specialists: Use multiple models for consensus (default: True)
            min_specialists_required: Min successful translations (default: 3)

        Returns:
            Workflow result with translation and metadata

        Example:
            >>> result = client.workflows.execute_translation(
            ...     text="Hello, world!",
            ...     target_language="es",
            ...     use_specialists=True
            ... )
            >>> translation = result['result']['translation']
            >>> print(f"Confidence: {result['result']['confidence']}")
            >>> print(f"Models used: {result['result']['models_used']}")
        """
        return self._trpc_request("workflows.executeTranslation", {
            "text": text,
            "target_language": target_language,
            "source_language": source_language,
            "use_specialists": use_specialists,
            "min_specialists_required": min_specialists_required
        })

    def execute_batch_translation(
        self,
        texts: List[str],
        target_language: str,
        source_language: str = "auto",
        max_workers: int = 3
    ) -> dict:
        """
        Execute batch translation in parallel.

        Workflow: Process multiple texts concurrently with progress tracking

        Args:
            texts: List of texts to translate
            target_language: Target language code
            source_language: Source language (default: 'auto')
            max_workers: Maximum parallel workers (default: 3)

        Returns:
            Workflow result with all translations

        Example:
            >>> texts = [
            ...     "Hello, world!",
            ...     "How are you?",
            ...     "Good morning"
            ... ]
            >>> result = client.workflows.execute_batch_translation(
            ...     texts,
            ...     target_language="es",
            ...     max_workers=5
            ... )
            >>> for i, item in enumerate(result['result']['translations']):
            ...     print(f"{texts[i]} → {item['translation']}")
        """
        return self._trpc_request("workflows.executeBatchTranslation", {
            "texts": texts,
            "target_language": target_language,
            "source_language": source_language,
            "max_workers": max_workers
        })

    def health_check(self) -> dict:
        """
        Check Prefect service availability.

        Returns:
            Health check result

        Example:
            >>> health = client.workflows.health_check()
            >>> print(f"Available: {health['available']}")
            >>> print(f"Version: {health.get('version', 'unknown')}")
        """
        return self._trpc_request("workflows.healthCheck")

    # ========================================
    # CUSTOM WORKFLOWS - Phase 2
    # ========================================

    def register_custom_workflow(
        self,
        workflow_id: str,
        definition: Dict[str, Any]
    ) -> dict:
        """
        Register a custom workflow definition.

        Allows defining custom DAG workflows using declarative configuration
        that gets translated into executable Prefect flows.

        Args:
            workflow_id: Unique workflow identifier
            definition: Workflow definition dictionary with:
                - name: Workflow name
                - description: Optional description
                - version: Optional version (semver)
                - tasks: List of task definitions
                - output: Output mapping
                - options: Execution options (parallel, timeout, etc.)

        Returns:
            Registration result

        Example:
            >>> workflow_def = {
            ...     "name": "pdf-extract-and-chunk",
            ...     "description": "Extract PDF and chunk into segments",
            ...     "version": "1.0.0",
            ...     "tasks": [
            ...         {
            ...             "id": "extract",
            ...             "type": "extract_pdf_text",
            ...             "inputs": {"pdf_data": "{{workflow.input.pdf_data}}"}
            ...         },
            ...         {
            ...             "id": "chunk",
            ...             "type": "chunk_document",
            ...             "depends_on": ["extract"],
            ...             "inputs": {
            ...                 "document_id": "{{workflow.input.document_id}}",
            ...                 "project_id": "{{workflow.input.project_id}}",
            ...                 "content": "{{extract.text}}",
            ...                 "chunk_size": 1000,
            ...                 "chunk_overlap": 200
            ...             }
            ...         }
            ...     ],
            ...     "output": {
            ...         "chunks": "{{chunk.chunks}}",
            ...         "metadata": "{{extract.metadata}}"
            ...     }
            ... }
            >>> result = client.workflows.register_custom_workflow(
            ...     "my-pdf-workflow",
            ...     workflow_def
            ... )
            >>> print(f"Registered: {result['workflowId']}")
        """
        return self._trpc_request("workflows.registerCustomWorkflow", {
            "workflowId": workflow_id,
            "definition": definition
        })

    def list_custom_workflows(self) -> dict:
        """
        List all registered custom workflows.

        Returns:
            List of custom workflows with metadata

        Example:
            >>> workflows = client.workflows.list_custom_workflows()
            >>> for wf in workflows['workflows']:
            ...     print(f"{wf['id']}: {wf['name']} ({wf['taskCount']} tasks)")
        """
        return self._trpc_request("workflows.listCustomWorkflows")

    def get_custom_workflow(self, workflow_id: str) -> dict:
        """
        Get a custom workflow definition.

        Args:
            workflow_id: Workflow ID

        Returns:
            Workflow definition

        Example:
            >>> workflow = client.workflows.get_custom_workflow("my-pdf-workflow")
            >>> print(f"Name: {workflow['name']}")
            >>> print(f"Tasks: {len(workflow['tasks'])}")
        """
        return self._trpc_request("workflows.getCustomWorkflow", {
            "workflowId": workflow_id
        })

    def execute_custom_workflow(
        self,
        workflow_id: str,
        inputs: Dict[str, Any]
    ) -> dict:
        """
        Execute a registered custom workflow.

        Args:
            workflow_id: Workflow ID
            inputs: Workflow inputs (referenced as {{workflow.input.key}})

        Returns:
            Workflow execution result

        Example:
            >>> result = client.workflows.execute_custom_workflow(
            ...     "my-pdf-workflow",
            ...     {
            ...         "pdf_data": base64_encoded_pdf,
            ...         "document_id": "doc123",
            ...         "project_id": "proj456"
            ...     }
            ... )
            >>> chunks = result['result']['chunks']
            >>> print(f"Processed into {len(chunks)} chunks")
        """
        return self._trpc_request("workflows.executeCustomWorkflow", {
            "workflowId": workflow_id,
            "inputs": inputs
        })

    def delete_custom_workflow(self, workflow_id: str) -> dict:
        """
        Delete a custom workflow.

        Args:
            workflow_id: Workflow ID

        Returns:
            Deletion result

        Example:
            >>> result = client.workflows.delete_custom_workflow("my-pdf-workflow")
            >>> print(result['message'])
        """
        return self._trpc_request("workflows.deleteCustomWorkflow", {
            "workflowId": workflow_id
        })

    def validate_workflow_definition(self, definition: Dict[str, Any]) -> dict:
        """
        Validate a workflow definition without registering it.

        Useful for checking if a workflow definition is valid before registration.

        Args:
            definition: Workflow definition dictionary

        Returns:
            Validation result with 'valid' boolean and optional 'error' message

        Example:
            >>> workflow_def = {
            ...     "name": "test-workflow",
            ...     "tasks": [
            ...         {
            ...             "id": "task1",
            ...             "type": "extract_pdf_text",
            ...             "inputs": {"pdf_data": "{{workflow.input.pdf}}"}
            ...         }
            ...     ]
            ... }
            >>> result = client.workflows.validate_workflow_definition(workflow_def)
            >>> if result['valid']:
            ...     print("✓ Workflow definition is valid")
            ... else:
            ...     print(f"✗ Validation failed: {result['error']}")
        """
        return self._trpc_request("workflows.validateWorkflowDefinition", {
            "definition": definition
        })

    # ========================================
    # WORKFLOW TEMPLATES - Phase 3
    # ========================================

    def list_templates(self, category: Optional[str] = None) -> dict:
        """
        List all available workflow templates.

        Templates are pre-built workflow patterns for common use cases
        that can be instantiated with custom parameters.

        Args:
            category: Optional category filter

        Returns:
            List of templates and categories

        Example:
            >>> templates = client.workflows.list_templates()
            >>> for tmpl in templates['templates']:
            ...     print(f"{tmpl['id']}: {tmpl['name']}")
            ...     print(f"  Category: {tmpl['category']}")
            ...     print(f"  Parameters: {list(tmpl['parameters'].keys())}")
        """
        input_data = {}
        if category:
            input_data["category"] = category

        return self._trpc_request("workflows.listTemplates", input_data if input_data else None)

    def get_template(self, template_id: str) -> dict:
        """
        Get a workflow template details.

        Args:
            template_id: Template ID

        Returns:
            Template details including parameters and definition

        Example:
            >>> template = client.workflows.get_template("rag-ingestion")
            >>> print(f"Name: {template['name']}")
            >>> print(f"Description: {template['description']}")
            >>> print(f"Parameters:")
            >>> for param, schema in template['parameters'].items():
            ...     print(f"  - {param}: {schema.get('description')}")
        """
        return self._trpc_request("workflows.getTemplate", {
            "templateId": template_id
        })

    def get_template_categories(self) -> dict:
        """
        Get all template categories.

        Returns:
            List of categories

        Example:
            >>> categories = client.workflows.get_template_categories()
            >>> print(f"Categories: {categories['categories']}")
        """
        return self._trpc_request("workflows.getTemplateCategories")

    def instantiate_template(
        self,
        template_id: str,
        params: Dict[str, Any],
        auto_register: bool = False,
        workflow_id: Optional[str] = None
    ) -> dict:
        """
        Instantiate a workflow template with specific parameters.

        Args:
            template_id: Template ID
            params: Template parameters
            auto_register: Automatically register the instantiated workflow
            workflow_id: Workflow ID for auto-registration (required if auto_register=True)

        Returns:
            Instantiated workflow definition (and registration info if auto_register=True)

        Example:
            >>> # Instantiate without registering
            >>> result = client.workflows.instantiate_template(
            ...     "rag-ingestion",
            ...     {
            ...         "chunk_size": 500,
            ...         "chunk_overlap": 100,
            ...         "force_ocr": False
            ...     }
            ... )
            >>> definition = result['definition']
            >>>
            >>> # Instantiate and auto-register
            >>> result = client.workflows.instantiate_template(
            ...     "rag-ingestion",
            ...     {"chunk_size": 500, "chunk_overlap": 100},
            ...     auto_register=True,
            ...     workflow_id="my-rag-pipeline"
            ... )
            >>> print(f"Registered: {result['registered']}")
            >>> print(f"Workflow ID: {result['workflowId']}")
        """
        input_data: Dict[str, Any] = {
            "templateId": template_id,
            "params": params
        }

        if auto_register:
            if not workflow_id:
                raise ValueError("workflow_id is required when auto_register=True")
            input_data["autoRegister"] = True
            input_data["workflowId"] = workflow_id

        return self._trpc_request("workflows.instantiateTemplate", input_data)

    # ========================================
    # ASYNC EXECUTION - Phase 4
    # ========================================

    def execute_async(
        self,
        workflow_id: str,
        inputs: Dict[str, Any],
        webhook: Optional[Dict[str, Any]] = None,
        priority: str = "normal"
    ) -> dict:
        """
        Execute workflow asynchronously (background).

        Instead of blocking until completion, returns a job ID immediately.
        Poll job status or configure webhook for completion notification.

        Args:
            workflow_id: Workflow ID (pre-built or custom)
            inputs: Workflow inputs
            webhook: Optional webhook for completion notification with:
                - url: Webhook URL
                - method: HTTP method (POST or PUT, default: POST)
                - headers: Optional custom headers
            priority: Job priority (low, normal, high)

        Returns:
            Job information with jobId

        Example:
            >>> # Execute async without webhook
            >>> result = client.workflows.execute_async(
            ...     "pdf-to-html",
            ...     {"pdf_data": pdf_data, "title": "Document"}
            ... )
            >>> job_id = result['jobId']
            >>>
            >>> # Execute async with webhook
            >>> result = client.workflows.execute_async(
            ...     "pdf-to-html",
            ...     {"pdf_data": pdf_data},
            ...     webhook={
            ...         "url": "https://myapp.com/webhook/workflow-complete",
            ...         "method": "POST",
            ...         "headers": {"X-API-Key": "secret"}
            ...     },
            ...     priority="high"
            ... )
            >>> job_id = result['jobId']
        """
        input_data: Dict[str, Any] = {
            "workflowId": workflow_id,
            "inputs": inputs,
            "priority": priority
        }

        if webhook:
            input_data["webhook"] = webhook

        return self._trpc_request("workflows.executeAsync", input_data)

    def execute_custom_async(
        self,
        workflow_id: str,
        inputs: Dict[str, Any],
        webhook: Optional[Dict[str, Any]] = None,
        priority: str = "normal"
    ) -> dict:
        """
        Execute custom workflow asynchronously (background).

        Args:
            workflow_id: Custom workflow ID
            inputs: Workflow inputs
            webhook: Optional webhook for completion
            priority: Job priority (low, normal, high)

        Returns:
            Job information with jobId

        Example:
            >>> result = client.workflows.execute_custom_async(
            ...     "my-rag-pipeline",
            ...     {
            ...         "pdf_data": pdf_data,
            ...         "document_id": "doc123",
            ...         "project_id": "proj456"
            ...     },
            ...     priority="high"
            ... )
            >>> job_id = result['jobId']
        """
        input_data: Dict[str, Any] = {
            "workflowId": workflow_id,
            "inputs": inputs,
            "priority": priority
        }

        if webhook:
            input_data["webhook"] = webhook

        return self._trpc_request("workflows.executeCustomAsync", input_data)

    def get_job_status(self, job_id: str) -> dict:
        """
        Get job status and details.

        Args:
            job_id: Job ID from async execution

        Returns:
            Job details including status, progress, result (if completed)

        Example:
            >>> job = client.workflows.get_job_status(job_id)
            >>> print(f"Status: {job['status']}")
            >>> print(f"Progress: {job['progress']['percentComplete']}%")
            >>>
            >>> if job['status'] == 'COMPLETED':
            ...     result = job['result']
            ...     print("Job completed successfully")
            >>> elif job['status'] == 'FAILED':
            ...     print(f"Job failed: {job['error']}")
        """
        return self._trpc_request("workflows.getJobStatus", {"jobId": job_id})

    def list_jobs(
        self,
        status: Optional[str] = None,
        workflow_id: Optional[str] = None,
        workflow_type: Optional[str] = None,
        limit: Optional[int] = None
    ) -> dict:
        """
        List workflow jobs.

        Args:
            status: Filter by status (PENDING, RUNNING, COMPLETED, FAILED, CANCELLED, TIMEOUT)
            workflow_id: Filter by workflow ID
            workflow_type: Filter by type (pre-built, custom, template)
            limit: Maximum jobs to return

        Returns:
            List of jobs

        Example:
            >>> # List all jobs
            >>> jobs = client.workflows.list_jobs()
            >>> for job in jobs['jobs']:
            ...     print(f"{job['jobId']}: {job['status']}")
            >>>
            >>> # List running jobs
            >>> running = client.workflows.list_jobs(status="RUNNING")
            >>>
            >>> # List jobs for specific workflow
            >>> jobs = client.workflows.list_jobs(workflow_id="my-rag-pipeline", limit=10)
        """
        input_data: Dict[str, Any] = {}

        if status:
            input_data["status"] = status
        if workflow_id:
            input_data["workflowId"] = workflow_id
        if workflow_type:
            input_data["workflowType"] = workflow_type
        if limit:
            input_data["limit"] = limit

        return self._trpc_request("workflows.listJobs", input_data if input_data else None)

    def cancel_job(self, job_id: str) -> dict:
        """
        Cancel a pending or running job.

        Args:
            job_id: Job ID to cancel

        Returns:
            Cancellation result

        Example:
            >>> result = client.workflows.cancel_job(job_id)
            >>> print(result['message'])
        """
        return self._trpc_request("workflows.cancelJob", {"jobId": job_id})

    def delete_job(self, job_id: str) -> dict:
        """
        Delete a job (cannot delete running jobs).

        Args:
            job_id: Job ID to delete

        Returns:
            Deletion result

        Example:
            >>> result = client.workflows.delete_job(job_id)
            >>> print(result['message'])
        """
        return self._trpc_request("workflows.deleteJob", {"jobId": job_id})

    def get_job_stats(self) -> dict:
        """
        Get job queue statistics.

        Returns:
            Queue stats including totals by status

        Example:
            >>> stats = client.workflows.get_job_stats()
            >>> print(f"Total jobs: {stats['totalJobs']}")
            >>> print(f"Running: {stats['runningJobs']}")
            >>> print(f"Pending: {stats['pendingJobs']}")
            >>> print(f"By status: {stats['jobsByStatus']}")
        """
        return self._trpc_request("workflows.getJobStats")

    def wait_for_job(
        self,
        job_id: str,
        poll_interval: int = 2,
        timeout: int = 300
    ) -> dict:
        """
        Wait for job completion with polling (blocking).

        Polls job status until completed, failed, or timeout.

        Args:
            job_id: Job ID to wait for
            poll_interval: Seconds between polls (default: 2)
            timeout: Maximum wait time in seconds (default: 300)

        Returns:
            Completed job details

        Raises:
            TimeoutError: If job doesn't complete within timeout
            RuntimeError: If job fails

        Example:
            >>> # Start async job
            >>> result = client.workflows.execute_async("pdf-to-html", inputs)
            >>> job_id = result['jobId']
            >>>
            >>> # Wait for completion
            >>> job = client.workflows.wait_for_job(job_id, poll_interval=1, timeout=600)
            >>> print(f"Job completed in {job['metadata']['executionTime']}ms")
            >>> result = job['result']
        """
        import time

        start_time = time.time()

        while True:
            job = self.get_job_status(job_id)

            if job['status'] == 'COMPLETED':
                return job

            if job['status'] == 'FAILED':
                raise RuntimeError(f"Job failed: {job.get('error', 'Unknown error')}")

            if job['status'] == 'CANCELLED':
                raise RuntimeError("Job was cancelled")

            if job['status'] == 'TIMEOUT':
                raise TimeoutError("Job timeout")

            # Check client-side timeout
            if time.time() - start_time > timeout:
                raise TimeoutError(f"Job did not complete within {timeout} seconds")

            # Wait before next poll
            time.sleep(poll_interval)

    # ==================== LangGraph Methods ====================

    def langgraph_available(self) -> bool:
        """
        Check if LangGraph is available.

        Returns:
            bool: True if LangGraph is available

        Example:
            >>> if client.workflows.langgraph_available():
            ...     print("LangGraph is ready!")
        """
        result = self._trpc_request("workflows.langGraphAvailable", {})
        return result.get('available', False)

    def validate_graph(self, definition: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate a graph definition.

        Args:
            definition: Graph definition dict

        Returns:
            dict: Validation result with 'valid' and optional 'error'

        Example:
            >>> graph_def = {
            ...     "name": "my-graph",
            ...     "description": "Test graph",
            ...     "version": "1.0.0",
            ...     "state_schema": {"fields": {"messages": {"type": "array"}}},
            ...     "nodes": [...],
            ...     "edges": [...],
            ...     "entry_point": "start",
            ...     "finish_points": ["end"]
            ... }
            >>> result = client.workflows.validate_graph(graph_def)
            >>> if result['valid']:
            ...     print("Graph is valid!")
        """
        return self._trpc_request("workflows.validateGraph", {"definition": definition})

    def register_graph(self, graph_id: str, definition: Dict[str, Any]) -> dict:
        """
        Register a LangGraph workflow.

        Args:
            graph_id: Unique graph ID
            definition: Graph definition

        Returns:
            dict: Success response

        Example:
            >>> graph_def = {...}  # See validate_graph for structure
            >>> client.workflows.register_graph("my-agent-graph", graph_def)
            {'success': True, 'graphId': 'my-agent-graph', 'message': '...'}
        """
        return self._trpc_request("workflows.registerGraph", {
            "graphId": graph_id,
            "definition": definition
        })

    def list_graphs(self) -> List[Dict[str, Any]]:
        """
        List all registered graphs.

        Returns:
            list: List of graph summaries

        Example:
            >>> graphs = client.workflows.list_graphs()
            >>> for graph in graphs['graphs']:
            ...     print(f"{graph['id']}: {graph['name']} ({graph['nodeCount']} nodes)")
        """
        return self._trpc_request("workflows.listGraphs", {})

    def get_graph(self, graph_id: str) -> Dict[str, Any]:
        """
        Get a registered graph definition.

        Args:
            graph_id: Graph ID

        Returns:
            dict: Graph definition

        Example:
            >>> graph = client.workflows.get_graph("my-agent-graph")
            >>> print(graph['definition']['name'])
        """
        return self._trpc_request("workflows.getGraph", {"graphId": graph_id})

    def delete_graph(self, graph_id: str) -> dict:
        """
        Delete a registered graph.

        Args:
            graph_id: Graph ID

        Returns:
            dict: Success response

        Example:
            >>> client.workflows.delete_graph("my-agent-graph")
            {'success': True, 'graphId': 'my-agent-graph', 'message': '...'}
        """
        return self._trpc_request("workflows.deleteGraph", {"graphId": graph_id})

    def execute_graph(
        self,
        graph_id: str,
        inputs: Dict[str, Any],
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute a LangGraph workflow.

        Args:
            graph_id: Graph ID to execute
            inputs: Initial state inputs
            config: Execution config (thread_id for checkpointing, etc.)

        Returns:
            dict: Execution result with 'success', 'final_state', etc.

        Example:
            >>> result = client.workflows.execute_graph(
            ...     "research-agent",
            ...     inputs={"messages": [{"role": "user", "content": "Research AI"}]},
            ...     config={"thread_id": "session-123"}
            ... )
            >>> if result['success']:
            ...     print(result['final_state'])
            >>> if result.get('requires_human_input'):
            ...     # Resume later with human input
            ...     checkpoint_id = result['checkpoint_id']
        """
        input_data: Dict[str, Any] = {
            "graphId": graph_id,
            "inputs": inputs
        }
        if config:
            input_data["config"] = config

        return self._trpc_request("workflows.executeGraph", input_data)

    def resume_graph(
        self,
        graph_id: str,
        checkpoint_id: str,
        human_input: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Resume a graph from checkpoint (e.g., after human input).

        Args:
            graph_id: Graph ID
            checkpoint_id: Checkpoint/thread ID
            human_input: Human input to inject into state

        Returns:
            dict: Execution result

        Example:
            >>> # After graph pauses for human input
            >>> result = client.workflows.resume_graph(
            ...     "approval-workflow",
            ...     checkpoint_id="session-123",
            ...     human_input={"approved": True, "comment": "Looks good"}
            ... )
            >>> print(result['final_state'])
        """
        return self._trpc_request("workflows.resumeGraph", {
            "graphId": graph_id,
            "checkpointId": checkpoint_id,
            "humanInput": human_input
        })

    def list_builtin_tools(self) -> List[Dict[str, Any]]:
        """
        List built-in tools available for graph nodes.

        Returns:
            list: List of tool definitions

        Example:
            >>> tools = client.workflows.list_builtin_tools()
            >>> for tool in tools['tools']:
            ...     print(f"{tool['name']}: {tool['description']}")
        """
        return self._trpc_request("workflows.listBuiltinTools", {})

    def get_graph_summary(self, graph_id: str) -> str:
        """
        Get a human-readable summary of a graph.

        Args:
            graph_id: Graph ID

        Returns:
            str: Formatted graph summary

        Example:
            >>> summary = client.workflows.get_graph_summary("my-agent-graph")
            >>> print(summary['summary'])
        """
        return self._trpc_request("workflows.getGraphSummary", {"graphId": graph_id})

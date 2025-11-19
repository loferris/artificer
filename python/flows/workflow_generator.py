"""
Workflow Generator

Converts declarative workflow definitions into executable Prefect flows.
"""

import sys
from pathlib import Path
from typing import Dict, Any, List, Optional
import json

# Add parent directories to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from prefect import flow, task, get_run_logger
from prefect.task_runners import ConcurrentTaskRunner, SequentialTaskRunner

from flows.workflow_schema import (
    WorkflowDefinition,
    TaskDefinition,
    validate_workflow_definition,
    get_execution_order,
    resolve_input_reference,
    TASK_SIGNATURES,
)
from flows.tasks.artificer_tasks import (
    extract_pdf_text,
    process_pdf,
    chunk_document,
    import_markdown,
    import_html,
    export_html,
    export_markdown,
    count_tokens,
    ocr_image,
    health_check,
)


# Map task types to actual task functions
TASK_FUNCTION_MAP = {
    "extract_pdf_text": extract_pdf_text,
    "process_pdf": process_pdf,
    "chunk_document": chunk_document,
    "import_markdown": import_markdown,
    "import_html": import_html,
    "export_html": export_html,
    "export_markdown": export_markdown,
    "count_tokens": count_tokens,
    "ocr_image": ocr_image,
    "health_check": health_check,
}


class WorkflowExecutor:
    """Executes declarative workflows as Prefect flows."""

    def __init__(self, workflow_def: Dict[str, Any]):
        """
        Initialize workflow executor.

        Args:
            workflow_def: Workflow definition dictionary
        """
        # Validate workflow
        is_valid, error = validate_workflow_definition(workflow_def)
        if not is_valid:
            raise ValueError(f"Invalid workflow definition: {error}")

        self.workflow_def = workflow_def
        self.name = workflow_def["name"]
        self.description = workflow_def.get("description", "")
        self.tasks = workflow_def["tasks"]
        self.options = workflow_def.get("options", {})

    def create_flow(self):
        """
        Create a Prefect flow from the workflow definition.

        Returns:
            Prefect flow function
        """
        # Determine task runner
        task_runner_type = self.options.get("task_runner", "sequential")
        if task_runner_type == "concurrent" or self.options.get("parallel", False):
            task_runner = ConcurrentTaskRunner()
        else:
            task_runner = SequentialTaskRunner()

        # Create flow decorator
        @flow(
            name=self.name,
            description=self.description,
            task_runner=task_runner,
            timeout_seconds=self.options.get("timeout"),
        )
        def dynamic_workflow(workflow_input: Dict[str, Any]) -> Dict[str, Any]:
            """Dynamically generated workflow from declarative definition."""
            logger = get_run_logger()
            logger.info(f"Starting workflow: {self.name}")

            # Store task results
            task_results: Dict[str, Any] = {}

            # Get execution order
            execution_order = get_execution_order(self.tasks)
            logger.info(f"Execution order: {execution_order}")

            # Execute tasks in order
            for task_id in execution_order:
                task_def = next(t for t in self.tasks if t["id"] == task_id)
                logger.info(f"Executing task: {task_id} ({task_def['type']})")

                try:
                    # Resolve inputs
                    resolved_inputs = {}
                    for key, value in task_def["inputs"].items():
                        resolved_value = resolve_input_reference(
                            value, workflow_input, task_results
                        )
                        resolved_inputs[key] = resolved_value

                    # Get task function
                    task_func = TASK_FUNCTION_MAP[task_def["type"]]

                    # Check if task has dependencies (for parallel execution)
                    depends_on = task_def.get("depends_on", [])
                    if depends_on:
                        # Wait for dependencies
                        logger.info(
                            f"Task {task_id} waiting for: {', '.join(depends_on)}"
                        )

                    # Execute task
                    result = task_func(**resolved_inputs)
                    task_results[task_id] = result

                    logger.info(f"Task {task_id} completed successfully")

                except Exception as e:
                    logger.error(f"Task {task_id} failed: {str(e)}")

                    # Check if we should retry
                    if self.options.get("retry_failed_tasks", False):
                        max_retries = task_def.get("retry", self.options.get("max_retries", 3))
                        logger.warning(f"Retrying task {task_id} (max {max_retries} attempts)")

                    raise

            # Build output
            output_def = self.workflow_def.get("output", {})
            output = {}
            for key, reference in output_def.items():
                resolved_value = resolve_input_reference(
                    reference, workflow_input, task_results
                )
                output[key] = resolved_value

            # If no output defined, return all task results
            if not output:
                output = task_results

            logger.info(f"Workflow {self.name} completed successfully")
            return output

        return dynamic_workflow

    def execute(self, workflow_input: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the workflow.

        Args:
            workflow_input: Input data for the workflow

        Returns:
            Workflow output
        """
        flow_func = self.create_flow()
        return flow_func(workflow_input)


def create_workflow_from_json(json_str: str) -> WorkflowExecutor:
    """
    Create a workflow executor from JSON string.

    Args:
        json_str: JSON workflow definition

    Returns:
        WorkflowExecutor instance
    """
    workflow_def = json.loads(json_str)
    return WorkflowExecutor(workflow_def)


def create_workflow_from_dict(workflow_def: Dict[str, Any]) -> WorkflowExecutor:
    """
    Create a workflow executor from dictionary.

    Args:
        workflow_def: Workflow definition dictionary

    Returns:
        WorkflowExecutor instance
    """
    return WorkflowExecutor(workflow_def)


# Example workflow definitions
EXAMPLE_WORKFLOWS = {
    "pdf-extract-and-chunk": {
        "name": "pdf-extract-and-chunk",
        "description": "Extract PDF and chunk into segments",
        "version": "1.0.0",
        "tasks": [
            {
                "id": "extract",
                "type": "extract_pdf_text",
                "inputs": {"pdf_data": "{{workflow.input.pdf_data}}"},
                "outputs": ["text", "metadata"],
            },
            {
                "id": "chunk",
                "type": "chunk_document",
                "depends_on": ["extract"],
                "inputs": {
                    "document_id": "{{workflow.input.document_id}}",
                    "project_id": "{{workflow.input.project_id}}",
                    "content": "{{extract.text}}",
                    "chunk_size": "{{workflow.input.chunk_size}}",
                    "chunk_overlap": "{{workflow.input.chunk_overlap}}",
                },
                "outputs": ["chunks", "total_chunks"],
            },
        ],
        "output": {
            "chunks": "{{chunk.chunks}}",
            "total_chunks": "{{chunk.total_chunks}}",
            "metadata": "{{extract.metadata}}",
        },
        "options": {"parallel": False, "timeout": 300},
    },
    "pdf-to-html-custom": {
        "name": "pdf-to-html-custom",
        "description": "Custom PDF to HTML conversion with token counting",
        "version": "1.0.0",
        "tasks": [
            {
                "id": "extract",
                "type": "extract_pdf_text",
                "inputs": {"pdf_data": "{{workflow.input.pdf_data}}"},
                "outputs": ["text", "metadata"],
            },
            {
                "id": "count",
                "type": "count_tokens",
                "depends_on": ["extract"],
                "inputs": {
                    "content": "{{extract.text}}",
                    "model": "{{workflow.input.model}}",
                },
                "outputs": ["token_count"],
            },
            {
                "id": "import",
                "type": "import_markdown",
                "depends_on": ["extract"],
                "inputs": {
                    "content": "{{extract.text}}",
                    "strict_mode": False,
                    "include_metadata": True,
                },
                "outputs": ["document"],
            },
            {
                "id": "export",
                "type": "export_html",
                "depends_on": ["import"],
                "inputs": {
                    "document": "{{import.document}}",
                    "include_styles": "{{workflow.input.include_styles}}",
                    "include_metadata": True,
                    "class_name": "custom-doc",
                    "title": "{{workflow.input.title}}",
                },
                "outputs": ["html"],
            },
        ],
        "output": {
            "html": "{{export.html}}",
            "token_count": "{{count.token_count}}",
            "pages": "{{extract.metadata.pages}}",
        },
        "options": {"parallel": True, "timeout": 600},
    },
    "multi-format-export": {
        "name": "multi-format-export",
        "description": "Export document to multiple formats in parallel",
        "version": "1.0.0",
        "tasks": [
            {
                "id": "import",
                "type": "import_markdown",
                "inputs": {
                    "content": "{{workflow.input.content}}",
                    "strict_mode": False,
                    "include_metadata": True,
                },
                "outputs": ["document"],
            },
            {
                "id": "export_html",
                "type": "export_html",
                "depends_on": ["import"],
                "inputs": {
                    "document": "{{import.document}}",
                    "include_styles": True,
                    "include_metadata": False,
                    "class_name": "exported-doc",
                    "title": "{{workflow.input.title}}",
                },
                "outputs": ["html"],
            },
            {
                "id": "export_md",
                "type": "export_markdown",
                "depends_on": ["import"],
                "inputs": {
                    "document": "{{import.document}}",
                    "include_metadata": False,
                },
                "outputs": ["markdown"],
            },
        ],
        "output": {
            "html": "{{export_html.html}}",
            "markdown": "{{export_md.markdown}}",
        },
        "options": {"parallel": True, "timeout": 300},
    },
}


if __name__ == "__main__":
    # Example: Execute a workflow
    print("Testing workflow generator...")

    # Create workflow
    workflow_def = EXAMPLE_WORKFLOWS["pdf-extract-and-chunk"]
    executor = create_workflow_from_dict(workflow_def)

    print(f"Created workflow: {executor.name}")
    print(f"Description: {executor.description}")
    print(f"Tasks: {len(executor.tasks)}")

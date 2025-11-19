"""
Declarative Workflow Schema

Defines the schema for declarative workflow definitions that can be
translated into Prefect flows at runtime.
"""

from typing import TypedDict, List, Dict, Any, Optional, Literal


# Task type definitions
TaskType = Literal[
    "extract_pdf_text",
    "process_pdf",
    "chunk_document",
    "import_markdown",
    "import_html",
    "export_html",
    "export_markdown",
    "count_tokens",
    "ocr_image",
    "health_check",
]


class TaskDefinition(TypedDict, total=False):
    """
    Definition of a single task in a workflow.

    Fields:
        id: Unique task identifier within workflow
        type: Task type (must match available Prefect tasks)
        inputs: Input parameters (can reference workflow inputs or task outputs)
        depends_on: List of task IDs that must complete first
        outputs: List of output keys this task produces
        retry: Number of retry attempts (optional)
        timeout: Task timeout in seconds (optional)
        description: Human-readable task description (optional)
    """

    id: str
    type: TaskType
    inputs: Dict[str, Any]
    depends_on: List[str]
    outputs: List[str]
    retry: int
    timeout: int
    description: str


class WorkflowOptions(TypedDict, total=False):
    """
    Workflow execution options.

    Fields:
        parallel: Enable parallel execution where possible
        retry_failed_tasks: Retry failed tasks automatically
        timeout: Overall workflow timeout in seconds
        task_runner: Task runner type ('concurrent', 'sequential', 'dask')
        max_retries: Maximum retry attempts per task
    """

    parallel: bool
    retry_failed_tasks: bool
    timeout: int
    task_runner: Literal["concurrent", "sequential", "dask"]
    max_retries: int


class WorkflowDefinition(TypedDict, total=False):
    """
    Complete workflow definition.

    Fields:
        name: Workflow name (used as flow name in Prefect)
        description: Workflow description
        version: Workflow version (semver)
        tasks: List of task definitions
        output: Output mapping (references task outputs)
        options: Workflow execution options
        metadata: Additional metadata (tags, author, etc.)
    """

    name: str
    description: str
    version: str
    tasks: List[TaskDefinition]
    output: Dict[str, str]
    options: WorkflowOptions
    metadata: Dict[str, Any]


# Task type to function signature mapping
TASK_SIGNATURES: Dict[str, Dict[str, Any]] = {
    "extract_pdf_text": {
        "inputs": {"pdf_data": "bytes"},
        "outputs": ["text", "metadata"],
        "description": "Extract text from PDF",
    },
    "process_pdf": {
        "inputs": {
            "pdf_data": "bytes",
            "force_ocr": "bool",
            "min_text_threshold": "int",
        },
        "outputs": ["text", "metadata"],
        "description": "Process PDF with OCR fallback",
    },
    "chunk_document": {
        "inputs": {
            "document_id": "str",
            "project_id": "str",
            "content": "str",
            "chunk_size": "int",
            "chunk_overlap": "int",
        },
        "outputs": ["chunks", "total_chunks"],
        "description": "Chunk document into segments",
    },
    "import_markdown": {
        "inputs": {
            "content": "str",
            "strict_mode": "bool",
            "include_metadata": "bool",
        },
        "outputs": ["document", "processing_time_ms"],
        "description": "Import markdown to Portable Text",
    },
    "import_html": {
        "inputs": {"content": "str"},
        "outputs": ["document", "processing_time_ms"],
        "description": "Import HTML to Portable Text",
    },
    "export_html": {
        "inputs": {
            "document": "dict",
            "include_styles": "bool",
            "include_metadata": "bool",
            "class_name": "str",
            "title": "str",
        },
        "outputs": ["html", "processing_time_ms"],
        "description": "Export Portable Text to HTML",
    },
    "export_markdown": {
        "inputs": {"document": "dict", "include_metadata": "bool"},
        "outputs": ["markdown", "processing_time_ms"],
        "description": "Export Portable Text to Markdown",
    },
    "count_tokens": {
        "inputs": {"content": "str", "model": "str"},
        "outputs": ["token_count", "model", "processing_time_ms"],
        "description": "Count tokens in content",
    },
    "ocr_image": {
        "inputs": {"image_data": "bytes", "content_type": "str"},
        "outputs": ["text", "confidence", "metadata"],
        "description": "Extract text from image using OCR",
    },
    "health_check": {
        "inputs": {},
        "outputs": ["status", "service", "version", "processors"],
        "description": "Check Artificer service health",
    },
}


def validate_workflow_definition(workflow: Dict[str, Any]) -> tuple[bool, Optional[str]]:
    """
    Validate a workflow definition.

    Args:
        workflow: Workflow definition dictionary

    Returns:
        Tuple of (is_valid, error_message)
    """
    # Check required fields
    if "name" not in workflow:
        return False, "Missing required field: name"
    if "tasks" not in workflow or not workflow["tasks"]:
        return False, "Missing or empty tasks list"

    # Validate task definitions
    task_ids = set()
    for i, task in enumerate(workflow["tasks"]):
        # Check required task fields
        if "id" not in task:
            return False, f"Task {i}: Missing required field: id"
        if "type" not in task:
            return False, f"Task {i}: Missing required field: type"
        if "inputs" not in task:
            return False, f"Task {i}: Missing required field: inputs"

        task_id = task["id"]
        task_type = task["type"]

        # Check for duplicate task IDs
        if task_id in task_ids:
            return False, f"Duplicate task ID: {task_id}"
        task_ids.add(task_id)

        # Validate task type
        if task_type not in TASK_SIGNATURES:
            return False, f"Task {task_id}: Unknown task type: {task_type}"

        # Validate dependencies
        if "depends_on" in task:
            for dep_id in task["depends_on"]:
                if dep_id not in task_ids:
                    # Check if dependency will be defined later
                    if not any(t["id"] == dep_id for t in workflow["tasks"]):
                        return False, f"Task {task_id}: Unknown dependency: {dep_id}"

    # Check for circular dependencies
    if not _check_dag(workflow["tasks"]):
        return False, "Workflow contains circular dependencies"

    return True, None


def _check_dag(tasks: List[Dict[str, Any]]) -> bool:
    """
    Check if tasks form a valid DAG (no cycles).

    Args:
        tasks: List of task definitions

    Returns:
        True if DAG is valid, False if cycles detected
    """
    # Build adjacency list
    graph: Dict[str, List[str]] = {task["id"]: [] for task in tasks}
    for task in tasks:
        if "depends_on" in task:
            for dep in task["depends_on"]:
                if dep in graph:
                    graph[dep].append(task["id"])

    # Check for cycles using DFS
    visited = set()
    rec_stack = set()

    def has_cycle(node: str) -> bool:
        visited.add(node)
        rec_stack.add(node)

        for neighbor in graph.get(node, []):
            if neighbor not in visited:
                if has_cycle(neighbor):
                    return True
            elif neighbor in rec_stack:
                return True

        rec_stack.remove(node)
        return False

    for node in graph:
        if node not in visited:
            if has_cycle(node):
                return False

    return True


def get_execution_order(tasks: List[Dict[str, Any]]) -> List[str]:
    """
    Get topological sort of tasks for execution order.

    Args:
        tasks: List of task definitions

    Returns:
        List of task IDs in execution order
    """
    # Build dependency graph
    dependencies: Dict[str, List[str]] = {}
    for task in tasks:
        task_id = task["id"]
        dependencies[task_id] = task.get("depends_on", [])

    # Topological sort (Kahn's algorithm)
    in_degree = {task["id"]: 0 for task in tasks}
    for deps in dependencies.values():
        for dep in deps:
            in_degree[dep] = in_degree.get(dep, 0)  # Ensure dep exists

    for task_id, deps in dependencies.items():
        for dep in deps:
            in_degree[task_id] += 1

    # Find tasks with no dependencies
    queue = [task_id for task_id, degree in in_degree.items() if degree == 0]
    result = []

    while queue:
        task_id = queue.pop(0)
        result.append(task_id)

        # Reduce in-degree for dependent tasks
        for other_id, deps in dependencies.items():
            if task_id in deps:
                in_degree[other_id] -= 1
                if in_degree[other_id] == 0:
                    queue.append(other_id)

    return result


def resolve_input_reference(
    reference: str, workflow_input: Dict[str, Any], task_results: Dict[str, Any]
) -> Any:
    """
    Resolve input reference (e.g., "{{workflow.input.pdf_data}}" or "{{task1.text}}").

    Args:
        reference: Reference string
        workflow_input: Workflow input data
        task_results: Results from completed tasks

    Returns:
        Resolved value
    """
    if not isinstance(reference, str) or not reference.startswith("{{"):
        return reference

    # Remove {{ and }}
    ref = reference[2:-2].strip()

    # Parse reference
    if ref.startswith("workflow.input."):
        key = ref[15:]  # Remove "workflow.input."
        return workflow_input.get(key)
    elif "." in ref:
        task_id, output_key = ref.split(".", 1)
        if task_id in task_results:
            return task_results[task_id].get(output_key)

    return None

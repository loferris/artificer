"""
LangGraph Schema - Graph definition and validation for stateful workflows.

Supports:
- Cyclic graphs (loops, conditionals)
- Stateful execution (typed state)
- Agent nodes (LLM-powered)
- Tool nodes (function execution)
- Conditional edges (routing logic)
- Human-in-the-loop
"""

from typing import TypedDict, Dict, List, Any, Optional, Literal, Union, Callable
import json


# Node Types
NodeType = Literal[
    "agent",        # LLM-powered agent node
    "tool",         # Function/tool execution
    "conditional",  # Routing logic
    "human",        # Human-in-the-loop
    "passthrough",  # Pass state through unchanged
]

# Edge Types
EdgeType = Literal[
    "normal",       # Direct edge to next node
    "conditional",  # Conditional routing based on state
]


class NodeDefinition(TypedDict, total=False):
    """Definition of a graph node."""
    id: str                          # Unique node ID
    type: NodeType                   # Node type

    # Agent node fields
    model: Optional[str]             # LLM model (e.g., "gpt-4o")
    system_prompt: Optional[str]     # System prompt for agent
    tools: Optional[List[str]]       # Available tools for agent

    # Tool node fields
    function_name: Optional[str]     # Function to call
    function_code: Optional[str]     # Python code to execute

    # Conditional node fields
    condition_code: Optional[str]    # Python code returning next node

    # Human node fields
    prompt_message: Optional[str]    # Message to show human

    # Common fields
    description: Optional[str]       # Node description
    input_schema: Optional[Dict[str, Any]]   # Expected input schema
    output_schema: Optional[Dict[str, Any]]  # Expected output schema


class EdgeDefinition(TypedDict, total=False):
    """Definition of a graph edge."""
    from_node: str                   # Source node ID
    to_node: Union[str, Dict[str, str]]  # Target node or conditional mapping
    type: EdgeType                   # Edge type
    condition: Optional[str]         # Condition for edge (if conditional)


class StateSchema(TypedDict, total=False):
    """Schema for graph state."""
    fields: Dict[str, Dict[str, Any]]  # Field name -> {type, description, default}


class GraphDefinition(TypedDict, total=False):
    """Complete graph definition."""
    name: str                        # Graph name
    description: str                 # Graph description
    version: str                     # Version (e.g., "1.0.0")

    state_schema: StateSchema        # State type definition
    nodes: List[NodeDefinition]      # Graph nodes
    edges: List[EdgeDefinition]      # Graph edges

    entry_point: str                 # Starting node ID
    finish_points: List[str]         # Ending node IDs

    options: Dict[str, Any]          # Graph options (timeout, max_iterations, etc.)


# Built-in tool definitions
BUILTIN_TOOLS = {
    "search_documents": {
        "name": "search_documents",
        "description": "Search documents using semantic search",
        "parameters": {
            "query": {"type": "string", "description": "Search query"},
            "project_id": {"type": "string", "description": "Project ID"},
            "limit": {"type": "integer", "description": "Max results", "default": 5},
        },
    },
    "extract_pdf": {
        "name": "extract_pdf",
        "description": "Extract text from PDF",
        "parameters": {
            "pdf_data": {"type": "string", "description": "Base64 PDF data"},
        },
    },
    "chunk_text": {
        "name": "chunk_text",
        "description": "Chunk text into segments",
        "parameters": {
            "text": {"type": "string", "description": "Text to chunk"},
            "chunk_size": {"type": "integer", "description": "Chunk size", "default": 1000},
            "chunk_overlap": {"type": "integer", "description": "Overlap", "default": 200},
        },
    },
    "web_search": {
        "name": "web_search",
        "description": "Search the web",
        "parameters": {
            "query": {"type": "string", "description": "Search query"},
            "num_results": {"type": "integer", "description": "Number of results", "default": 5},
        },
    },
    "http_request": {
        "name": "http_request",
        "description": "Make HTTP request",
        "parameters": {
            "url": {"type": "string", "description": "URL to request"},
            "method": {"type": "string", "description": "HTTP method", "default": "GET"},
            "headers": {"type": "object", "description": "HTTP headers"},
            "body": {"type": "object", "description": "Request body"},
        },
    },
}


def validate_graph_definition(graph: Dict[str, Any]) -> tuple[bool, Optional[str]]:
    """
    Validate a graph definition.

    Args:
        graph: Graph definition dictionary

    Returns:
        Tuple of (is_valid, error_message)
    """
    # Check required fields
    if "name" not in graph:
        return False, "Missing required field: name"

    if "nodes" not in graph or not graph["nodes"]:
        return False, "Missing or empty nodes list"

    if "edges" not in graph:
        return False, "Missing edges list"

    if "entry_point" not in graph:
        return False, "Missing entry_point"

    if "state_schema" not in graph:
        return False, "Missing state_schema"

    # Collect node IDs
    node_ids = set()
    for node in graph["nodes"]:
        if "id" not in node:
            return False, "Node missing id field"

        if "type" not in node:
            return False, f"Node {node['id']} missing type field"

        node_id = node["id"]
        if node_id in node_ids:
            return False, f"Duplicate node ID: {node_id}"

        node_ids.add(node_id)

        # Validate node type-specific fields
        node_type = node["type"]

        if node_type == "agent":
            if "model" not in node:
                return False, f"Agent node {node_id} missing model field"
            if "system_prompt" not in node:
                return False, f"Agent node {node_id} missing system_prompt field"

        elif node_type == "tool":
            if "function_name" not in node and "function_code" not in node:
                return False, f"Tool node {node_id} must have function_name or function_code"

        elif node_type == "conditional":
            if "condition_code" not in node:
                return False, f"Conditional node {node_id} missing condition_code"

        elif node_type == "human":
            if "prompt_message" not in node:
                return False, f"Human node {node_id} missing prompt_message"

    # Check entry_point exists
    if graph["entry_point"] not in node_ids:
        return False, f"Entry point '{graph['entry_point']}' not found in nodes"

    # Check finish_points exist (if specified)
    if "finish_points" in graph:
        for finish_point in graph["finish_points"]:
            if finish_point not in node_ids:
                return False, f"Finish point '{finish_point}' not found in nodes"

    # Validate edges
    for i, edge in enumerate(graph["edges"]):
        if "from_node" not in edge:
            return False, f"Edge {i} missing from_node"

        if "to_node" not in edge:
            return False, f"Edge {i} missing to_node"

        from_node = edge["from_node"]
        to_node = edge["to_node"]

        # Check from_node exists
        if from_node not in node_ids:
            return False, f"Edge from_node '{from_node}' not found in nodes"

        # Check to_node (can be string or dict for conditional)
        if isinstance(to_node, str):
            if to_node not in node_ids:
                return False, f"Edge to_node '{to_node}' not found in nodes"
        elif isinstance(to_node, dict):
            # Conditional edge - check all targets exist
            for condition, target in to_node.items():
                if target not in node_ids:
                    return False, f"Conditional edge target '{target}' not found in nodes"
        else:
            return False, f"Edge to_node must be string or dict, got {type(to_node)}"

    # Check for unreachable nodes (optional warning, not error)
    # Could implement graph traversal here

    return True, None


def get_node_by_id(graph: GraphDefinition, node_id: str) -> Optional[NodeDefinition]:
    """Get a node by ID."""
    for node in graph["nodes"]:
        if node["id"] == node_id:
            return node
    return None


def get_edges_from_node(graph: GraphDefinition, node_id: str) -> List[EdgeDefinition]:
    """Get all edges originating from a node."""
    return [edge for edge in graph["edges"] if edge["from_node"] == node_id]


def get_state_fields(graph: GraphDefinition) -> Dict[str, Any]:
    """Extract state field definitions."""
    return graph.get("state_schema", {}).get("fields", {})


def create_state_class(graph: GraphDefinition) -> type:
    """
    Create a TypedDict class for the graph state.

    Args:
        graph: Graph definition

    Returns:
        TypedDict class for state
    """
    fields = get_state_fields(graph)

    # Build type annotations
    annotations = {}
    for field_name, field_def in fields.items():
        field_type = field_def.get("type", "Any")

        # Map string types to Python types
        type_mapping = {
            "string": str,
            "integer": int,
            "number": float,
            "boolean": bool,
            "array": list,
            "object": dict,
            "Any": Any,
        }

        python_type = type_mapping.get(field_type, Any)

        # Make optional if has default
        if "default" in field_def:
            annotations[field_name] = Optional[python_type]
        else:
            annotations[field_name] = python_type

    # Create TypedDict dynamically
    state_class = TypedDict(
        f"{graph['name']}State",
        annotations
    )

    return state_class


def list_builtin_tools() -> List[Dict[str, Any]]:
    """List all built-in tools."""
    return list(BUILTIN_TOOLS.values())


def get_builtin_tool(tool_name: str) -> Optional[Dict[str, Any]]:
    """Get a built-in tool definition."""
    return BUILTIN_TOOLS.get(tool_name)


def format_graph_summary(graph: GraphDefinition) -> str:
    """
    Format a human-readable graph summary.

    Args:
        graph: Graph definition

    Returns:
        Formatted summary string
    """
    lines = []
    lines.append(f"Graph: {graph['name']}")
    lines.append(f"Description: {graph.get('description', 'N/A')}")
    lines.append(f"Version: {graph.get('version', '1.0.0')}")
    lines.append(f"Entry Point: {graph['entry_point']}")
    lines.append(f"Nodes: {len(graph['nodes'])}")
    lines.append(f"Edges: {len(graph['edges'])}")

    lines.append("\nNodes:")
    for node in graph["nodes"]:
        node_type = node["type"]
        node_id = node["id"]
        desc = node.get("description", "")
        lines.append(f"  - {node_id} ({node_type}): {desc}")

    lines.append("\nEdges:")
    for edge in graph["edges"]:
        from_node = edge["from_node"]
        to_node = edge["to_node"]
        if isinstance(to_node, dict):
            lines.append(f"  - {from_node} -> [conditional]")
            for condition, target in to_node.items():
                lines.append(f"      {condition}: {target}")
        else:
            lines.append(f"  - {from_node} -> {to_node}")

    return "\n".join(lines)

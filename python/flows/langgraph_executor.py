"""
LangGraph Executor - Execute stateful, cyclic workflows using LangGraph.

Supports:
- Agent nodes with LLM calls
- Tool nodes with function execution
- Conditional routing
- Human-in-the-loop
- State management
- Checkpointing and resumability
"""

from typing import Dict, Any, Optional, List, Callable, TypedDict
import json
import os
from datetime import datetime

try:
    from langgraph.graph import StateGraph, END
    from langgraph.checkpoint.memory import MemorySaver
    from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
    from langchain_openai import ChatOpenAI
    from langchain_anthropic import ChatAnthropic
    LANGGRAPH_AVAILABLE = True
except ImportError:
    LANGGRAPH_AVAILABLE = False
    StateGraph = None
    END = None
    MemorySaver = None

from langgraph_schema import (
    GraphDefinition,
    NodeDefinition,
    EdgeDefinition,
    get_node_by_id,
    get_edges_from_node,
    get_state_fields,
    create_state_class,
    BUILTIN_TOOLS,
)


class GraphExecutor:
    """
    Executes LangGraph workflows from declarative definitions.
    """

    def __init__(self, graph_def: GraphDefinition):
        """
        Initialize executor with graph definition.

        Args:
            graph_def: Graph definition
        """
        if not LANGGRAPH_AVAILABLE:
            raise ImportError(
                "LangGraph not installed. Install with: pip install langgraph langchain-openai langchain-anthropic"
            )

        self.graph_def = graph_def
        self.name = graph_def["name"]
        self.state_class = create_state_class(graph_def)

        # Build tool registry
        self.tools = self._build_tool_registry()

        # Compile graph
        self.compiled_graph = None
        self.checkpointer = MemorySaver()

    def _build_tool_registry(self) -> Dict[str, Callable]:
        """Build registry of available tools."""
        tools = {}

        # Add built-in tools
        for tool_name in BUILTIN_TOOLS:
            tools[tool_name] = self._create_builtin_tool(tool_name)

        # Add custom tools from graph
        for node in self.graph_def["nodes"]:
            if node["type"] == "tool":
                tool_name = node["id"]
                if "function_code" in node:
                    tools[tool_name] = self._create_custom_tool(node)

        return tools

    def _create_builtin_tool(self, tool_name: str) -> Callable:
        """Create a callable for a built-in tool."""
        def tool_wrapper(**kwargs):
            # In production, these would call actual Artificer APIs
            # For now, return mock responses
            if tool_name == "search_documents":
                return {
                    "results": [
                        {"content": "Document 1 content", "score": 0.95},
                        {"content": "Document 2 content", "score": 0.87},
                    ]
                }
            elif tool_name == "extract_pdf":
                return {"text": "Extracted PDF text", "pages": 10}
            elif tool_name == "chunk_text":
                text = kwargs.get("text", "")
                chunk_size = kwargs.get("chunk_size", 1000)
                chunks = [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]
                return {"chunks": chunks, "count": len(chunks)}
            elif tool_name == "web_search":
                return {
                    "results": [
                        {"title": "Result 1", "url": "https://example.com/1", "snippet": "..."},
                        {"title": "Result 2", "url": "https://example.com/2", "snippet": "..."},
                    ]
                }
            elif tool_name == "http_request":
                return {"status": 200, "data": {"message": "Success"}}
            else:
                return {"error": f"Unknown tool: {tool_name}"}

        return tool_wrapper

    def _create_custom_tool(self, node: NodeDefinition) -> Callable:
        """Create a callable from custom function code."""
        function_code = node.get("function_code", "")

        def custom_tool(state: Dict[str, Any]) -> Dict[str, Any]:
            # Execute custom Python code
            # SECURITY WARNING: eval/exec should be sandboxed in production
            local_vars = {"state": state, "result": None}
            exec(function_code, {}, local_vars)
            return local_vars.get("result", {})

        return custom_tool

    def _get_llm(self, model: str):
        """Get LLM instance for model."""
        # Map model names to providers
        if model.startswith("gpt-"):
            return ChatOpenAI(model=model, temperature=0.7)
        elif model.startswith("claude-"):
            return ChatAnthropic(model=model, temperature=0.7)
        else:
            # Default to OpenAI
            return ChatOpenAI(model=model, temperature=0.7)

    def _create_agent_node(self, node: NodeDefinition) -> Callable:
        """Create an agent node function."""
        model = node["model"]
        system_prompt = node.get("system_prompt", "You are a helpful assistant.")
        tool_names = node.get("tools", [])

        llm = self._get_llm(model)

        # Bind tools if specified
        if tool_names:
            tools = [self.tools[name] for name in tool_names if name in self.tools]
            if tools:
                llm = llm.bind_tools(tools)

        def agent_node(state: Dict[str, Any]) -> Dict[str, Any]:
            """Execute agent node."""
            # Get messages from state
            messages = state.get("messages", [])

            # Add system message if not present
            if not messages or not isinstance(messages[0], SystemMessage):
                messages = [SystemMessage(content=system_prompt)] + messages

            # Call LLM
            response = llm.invoke(messages)

            # Update state
            new_state = state.copy()
            new_state["messages"] = messages + [response]
            new_state["last_response"] = response.content

            # If response has tool calls, execute them
            if hasattr(response, "tool_calls") and response.tool_calls:
                tool_results = []
                for tool_call in response.tool_calls:
                    tool_name = tool_call["name"]
                    tool_args = tool_call["args"]

                    if tool_name in self.tools:
                        result = self.tools[tool_name](**tool_args)
                        tool_results.append(result)

                new_state["tool_results"] = tool_results

            return new_state

        return agent_node

    def _create_tool_node(self, node: NodeDefinition) -> Callable:
        """Create a tool node function."""
        tool_name = node.get("function_name") or node["id"]

        def tool_node(state: Dict[str, Any]) -> Dict[str, Any]:
            """Execute tool node."""
            # Get tool function
            if tool_name in self.tools:
                result = self.tools[tool_name](state)
            else:
                result = {"error": f"Tool not found: {tool_name}"}

            # Update state
            new_state = state.copy()
            new_state[f"{node['id']}_result"] = result

            return new_state

        return tool_node

    def _create_conditional_node(self, node: NodeDefinition) -> Callable:
        """Create a conditional routing function."""
        condition_code = node["condition_code"]

        def conditional_node(state: Dict[str, Any]) -> str:
            """Execute conditional logic and return next node."""
            # Execute condition code
            # SECURITY WARNING: eval should be sandboxed in production
            local_vars = {"state": state, "next_node": None}
            exec(condition_code, {}, local_vars)

            next_node = local_vars.get("next_node")
            if not next_node:
                return END

            return next_node

        return conditional_node

    def _create_human_node(self, node: NodeDefinition) -> Callable:
        """Create a human-in-the-loop node."""
        prompt_message = node.get("prompt_message", "Human input required")

        def human_node(state: Dict[str, Any]) -> Dict[str, Any]:
            """Request human input."""
            # In production, this would trigger a webhook or API call
            # For now, mark state as requiring human input
            new_state = state.copy()
            new_state["requires_human_input"] = True
            new_state["human_prompt"] = prompt_message
            new_state["awaiting_human"] = node["id"]

            return new_state

        return human_node

    def _create_passthrough_node(self, node: NodeDefinition) -> Callable:
        """Create a passthrough node (no-op)."""
        def passthrough_node(state: Dict[str, Any]) -> Dict[str, Any]:
            """Pass state through unchanged."""
            return state

        return passthrough_node

    def compile_graph(self) -> Any:
        """
        Compile the graph definition into executable LangGraph.

        Returns:
            Compiled graph
        """
        # Create graph with state
        graph = StateGraph(self.state_class)

        # Add nodes
        for node in self.graph_def["nodes"]:
            node_id = node["id"]
            node_type = node["type"]

            if node_type == "agent":
                graph.add_node(node_id, self._create_agent_node(node))
            elif node_type == "tool":
                graph.add_node(node_id, self._create_tool_node(node))
            elif node_type == "conditional":
                # Conditional nodes are handled as routing functions
                pass
            elif node_type == "human":
                graph.add_node(node_id, self._create_human_node(node))
            elif node_type == "passthrough":
                graph.add_node(node_id, self._create_passthrough_node(node))

        # Set entry point
        graph.set_entry_point(self.graph_def["entry_point"])

        # Add edges
        for edge in self.graph_def["edges"]:
            from_node = edge["from_node"]
            to_node = edge["to_node"]

            # Get source node to check if it's conditional
            source_node = get_node_by_id(self.graph_def, from_node)

            if source_node and source_node["type"] == "conditional":
                # Add conditional edges
                if isinstance(to_node, dict):
                    graph.add_conditional_edges(
                        from_node,
                        self._create_conditional_node(source_node),
                        to_node
                    )
                else:
                    graph.add_edge(from_node, to_node)
            else:
                # Normal edge
                if isinstance(to_node, str):
                    graph.add_edge(from_node, to_node)

        # Add finish edges
        finish_points = self.graph_def.get("finish_points", [])
        for finish_node in finish_points:
            graph.add_edge(finish_node, END)

        # Compile with checkpointing
        compiled = graph.compile(checkpointer=self.checkpointer)

        self.compiled_graph = compiled
        return compiled

    def execute(
        self,
        inputs: Dict[str, Any],
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute the graph with given inputs.

        Args:
            inputs: Input state
            config: Execution configuration (thread_id, etc.)

        Returns:
            Final state
        """
        if not self.compiled_graph:
            self.compile_graph()

        # Execute graph
        final_state = None
        for state in self.compiled_graph.stream(inputs, config):
            final_state = state

        return final_state

    def execute_streaming(
        self,
        inputs: Dict[str, Any],
        config: Optional[Dict[str, Any]] = None
    ):
        """
        Execute graph with streaming (yields intermediate states).

        Args:
            inputs: Input state
            config: Execution configuration

        Yields:
            Intermediate states
        """
        if not self.compiled_graph:
            self.compile_graph()

        for state in self.compiled_graph.stream(inputs, config):
            yield state

    def resume_from_checkpoint(
        self,
        checkpoint_id: str,
        human_input: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Resume execution from a checkpoint (e.g., after human input).

        Args:
            checkpoint_id: Checkpoint/thread ID
            human_input: Human input to inject

        Returns:
            Final state
        """
        if not self.compiled_graph:
            self.compile_graph()

        # Get checkpoint state
        config = {"configurable": {"thread_id": checkpoint_id}}

        # If human input provided, inject it
        inputs = human_input or {}

        # Resume execution
        return self.execute(inputs, config)


# Registry of compiled graphs
_graph_registry: Dict[str, GraphExecutor] = {}


def register_graph(graph_id: str, graph_def: GraphDefinition) -> None:
    """Register a graph definition."""
    executor = GraphExecutor(graph_def)
    _graph_registry[graph_id] = executor


def get_graph(graph_id: str) -> Optional[GraphExecutor]:
    """Get a registered graph executor."""
    return _graph_registry.get(graph_id)


def list_graphs() -> List[str]:
    """List all registered graph IDs."""
    return list(_graph_registry.keys())


def delete_graph(graph_id: str) -> bool:
    """Delete a registered graph."""
    if graph_id in _graph_registry:
        del _graph_registry[graph_id]
        return True
    return False


def execute_graph(
    graph_id: str,
    inputs: Dict[str, Any],
    config: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Execute a registered graph.

    Args:
        graph_id: Graph ID
        inputs: Input state
        config: Execution config

    Returns:
        Final state
    """
    executor = get_graph(graph_id)
    if not executor:
        raise ValueError(f"Graph not found: {graph_id}")

    return executor.execute(inputs, config)


def execute_graph_streaming(
    graph_id: str,
    inputs: Dict[str, Any],
    config: Optional[Dict[str, Any]] = None
):
    """
    Execute graph with streaming.

    Args:
        graph_id: Graph ID
        inputs: Input state
        config: Execution config

    Yields:
        Intermediate states
    """
    executor = get_graph(graph_id)
    if not executor:
        raise ValueError(f"Graph not found: {graph_id}")

    yield from executor.execute_streaming(inputs, config)

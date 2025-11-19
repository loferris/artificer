"""
LangGraph Examples - Phase 5: Stateful, Cyclic Workflows

Demonstrates:
- Agent workflows with LLMs
- Conditional routing and cycles
- Human-in-the-loop
- Multi-agent collaboration
- Tool-using agents
- State management
"""

from artificer_client import ArtificerClient


def example_simple_agent_graph(client: ArtificerClient):
    """
    Example: Simple agent with single node.

    Demonstrates:
    - Basic agent node with LLM
    - State management
    - Message passing
    """
    print("\n=== Example 1: Simple Agent Graph ===")

    # Define graph
    graph_def = {
        "name": "simple-agent",
        "description": "Single agent node for Q&A",
        "version": "1.0.0",
        "state_schema": {
            "fields": {
                "messages": {"type": "array", "description": "Conversation messages"},
                "last_response": {"type": "string", "description": "Last agent response"}
            }
        },
        "nodes": [
            {
                "id": "agent",
                "type": "agent",
                "model": "gpt-4o-mini",
                "system_prompt": "You are a helpful AI assistant.",
                "description": "Main agent node"
            }
        ],
        "edges": [],
        "entry_point": "agent",
        "finish_points": ["agent"],
        "options": {"timeout": 60}
    }

    # Validate
    validation = client.workflows.validate_graph(graph_def)
    if not validation['valid']:
        print(f"✗ Validation failed: {validation['error']}")
        return

    print("✓ Graph validated")

    # Register
    client.workflows.register_graph("simple-agent", graph_def)
    print("✓ Graph registered")

    # Execute
    result = client.workflows.execute_graph(
        "simple-agent",
        inputs={
            "messages": [
                {"role": "user", "content": "What is the capital of France?"}
            ]
        }
    )

    if result['success']:
        print(f"✓ Execution successful")
        print(f"  Response: {result['final_state']['last_response']}")
    else:
        print(f"✗ Execution failed: {result['error']}")


def example_conditional_routing_graph(client: ArtificerClient):
    """
    Example: Conditional routing based on state.

    Demonstrates:
    - Conditional nodes
    - Dynamic routing
    - Multiple execution paths
    """
    print("\n=== Example 2: Conditional Routing ===")

    graph_def = {
        "name": "conditional-router",
        "description": "Route based on input type",
        "version": "1.0.0",
        "state_schema": {
            "fields": {
                "input_type": {"type": "string"},
                "question": {"type": "string"},
                "result": {"type": "string"}
            }
        },
        "nodes": [
            {
                "id": "classifier",
                "type": "conditional",
                "condition_code": """
if state.get('input_type') == 'factual':
    next_node = 'factual_agent'
elif state.get('input_type') == 'creative':
    next_node = 'creative_agent'
else:
    next_node = 'general_agent'
""",
                "description": "Route based on input type"
            },
            {
                "id": "factual_agent",
                "type": "agent",
                "model": "gpt-4o-mini",
                "system_prompt": "You provide factual, concise answers.",
                "description": "Factual question handler"
            },
            {
                "id": "creative_agent",
                "type": "agent",
                "model": "gpt-4o",
                "system_prompt": "You provide creative, imaginative responses.",
                "description": "Creative prompt handler"
            },
            {
                "id": "general_agent",
                "type": "agent",
                "model": "gpt-4o-mini",
                "system_prompt": "You are a helpful assistant.",
                "description": "General purpose handler"
            }
        ],
        "edges": [
            {
                "from_node": "classifier",
                "to_node": {
                    "factual": "factual_agent",
                    "creative": "creative_agent",
                    "general": "general_agent"
                },
                "type": "conditional"
            }
        ],
        "entry_point": "classifier",
        "finish_points": ["factual_agent", "creative_agent", "general_agent"],
        "options": {"timeout": 120}
    }

    client.workflows.register_graph("conditional-router", graph_def)
    print("✓ Graph registered")

    # Execute with different input types
    for input_type in ["factual", "creative", "general"]:
        print(f"\nTesting {input_type} routing...")
        result = client.workflows.execute_graph(
            "conditional-router",
            inputs={
                "input_type": input_type,
                "question": "Tell me about the ocean"
            }
        )
        if result['success']:
            print(f"  ✓ Routed to {input_type}_agent")


def example_multi_agent_research(client: ArtificerClient):
    """
    Example: Multi-agent research workflow.

    Demonstrates:
    - Multiple agents collaborating
    - Sequential agent execution
    - Aggregation of results
    """
    print("\n=== Example 3: Multi-Agent Research ===")

    graph_def = {
        "name": "research-team",
        "description": "Multi-agent research collaboration",
        "version": "1.0.0",
        "state_schema": {
            "fields": {
                "research_topic": {"type": "string"},
                "researcher_findings": {"type": "string"},
                "critic_feedback": {"type": "string"},
                "final_report": {"type": "string"}
            }
        },
        "nodes": [
            {
                "id": "researcher",
                "type": "agent",
                "model": "gpt-4o",
                "system_prompt": "You are a research specialist. Provide detailed findings on the given topic.",
                "tools": ["web_search", "search_documents"],
                "description": "Research specialist"
            },
            {
                "id": "critic",
                "type": "agent",
                "model": "gpt-4o",
                "system_prompt": "You are a critical reviewer. Analyze research findings and provide constructive feedback.",
                "description": "Critical reviewer"
            },
            {
                "id": "synthesizer",
                "type": "agent",
                "model": "gpt-4o",
                "system_prompt": "You synthesize research and feedback into a final report.",
                "description": "Report synthesizer"
            }
        ],
        "edges": [
            {"from_node": "researcher", "to_node": "critic"},
            {"from_node": "critic", "to_node": "synthesizer"}
        ],
        "entry_point": "researcher",
        "finish_points": ["synthesizer"],
        "options": {"timeout": 300}
    }

    client.workflows.register_graph("research-team", graph_def)
    print("✓ Research team graph registered")

    result = client.workflows.execute_graph(
        "research-team",
        inputs={
            "research_topic": "Impact of AI on healthcare"
        }
    )

    if result['success']:
        print("✓ Research completed")
        print(f"  Final report: {result['final_state'].get('final_report', 'N/A')[:200]}...")


def example_human_in_the_loop(client: ArtificerClient):
    """
    Example: Human-in-the-loop approval workflow.

    Demonstrates:
    - Human input nodes
    - Checkpoint/resume
    - Stateful execution across sessions
    """
    print("\n=== Example 4: Human-in-the-Loop ===")

    graph_def = {
        "name": "approval-workflow",
        "description": "Workflow requiring human approval",
        "version": "1.0.0",
        "state_schema": {
            "fields": {
                "proposal": {"type": "string"},
                "analysis": {"type": "string"},
                "approved": {"type": "boolean", "default": False},
                "feedback": {"type": "string", "default": ""}
            }
        },
        "nodes": [
            {
                "id": "analyzer",
                "type": "agent",
                "model": "gpt-4o-mini",
                "system_prompt": "Analyze the proposal and provide recommendations.",
                "description": "Proposal analyzer"
            },
            {
                "id": "human_review",
                "type": "human",
                "prompt_message": "Please review the analysis and approve or reject.",
                "description": "Human approval gate"
            },
            {
                "id": "finalizer",
                "type": "agent",
                "model": "gpt-4o-mini",
                "system_prompt": "Finalize the proposal based on approval status.",
                "description": "Finalizer"
            }
        ],
        "edges": [
            {"from_node": "analyzer", "to_node": "human_review"},
            {"from_node": "human_review", "to_node": "finalizer"}
        ],
        "entry_point": "analyzer",
        "finish_points": ["finalizer"],
        "options": {"timeout": 600}
    }

    client.workflows.register_graph("approval-workflow", graph_def)
    print("✓ Approval workflow registered")

    # Execute with thread_id for checkpointing
    result = client.workflows.execute_graph(
        "approval-workflow",
        inputs={"proposal": "Implement new AI feature"},
        config={"thread_id": "session-123"}
    )

    if result.get('requires_human_input'):
        print("✓ Workflow paused for human input")
        print(f"  Checkpoint ID: {result['checkpoint_id']}")
        print(f"  Prompt: {result['final_state']['human_prompt']}")

        # Simulate human approval (in real app, this would be separate API call)
        print("\nSimulating human approval...")
        resume_result = client.workflows.resume_graph(
            "approval-workflow",
            checkpoint_id=result['checkpoint_id'],
            human_input={
                "approved": True,
                "feedback": "Looks good, proceed!"
            }
        )

        if resume_result['success']:
            print("✓ Workflow resumed and completed")


def example_tool_using_agent(client: ArtificerClient):
    """
    Example: Agent with tool use.

    Demonstrates:
    - Agent with tools
    - Tool execution
    - Built-in tool integration
    """
    print("\n=== Example 5: Tool-Using Agent ===")

    # List available tools
    tools_result = client.workflows.list_builtin_tools()
    print(f"Available tools: {len(tools_result['tools'])}")
    for tool in tools_result['tools']:
        print(f"  - {tool['name']}: {tool['description']}")

    graph_def = {
        "name": "tool-agent",
        "description": "Agent with document search and web search",
        "version": "1.0.0",
        "state_schema": {
            "fields": {
                "query": {"type": "string"},
                "search_results": {"type": "array"},
                "answer": {"type": "string"}
            }
        },
        "nodes": [
            {
                "id": "search_agent",
                "type": "agent",
                "model": "gpt-4o",
                "system_prompt": "You are a research assistant. Use available tools to answer questions.",
                "tools": ["search_documents", "web_search"],
                "description": "Research agent with tools"
            }
        ],
        "edges": [],
        "entry_point": "search_agent",
        "finish_points": ["search_agent"],
        "options": {"timeout": 120}
    }

    client.workflows.register_graph("tool-agent", graph_def)
    print("\n✓ Tool agent registered")

    result = client.workflows.execute_graph(
        "tool-agent",
        inputs={
            "query": "What are the latest developments in AI?"
        }
    )

    if result['success']:
        print("✓ Agent completed research")
        print(f"  Tool results: {len(result['final_state'].get('tool_results', []))}")


def example_cyclic_graph(client: ArtificerClient):
    """
    Example: Graph with cycles (iterative refinement).

    Demonstrates:
    - Cycles in graph
    - Iterative improvement
    - Loop termination conditions
    """
    print("\n=== Example 6: Cyclic Graph (Iterative Refinement) ===")

    graph_def = {
        "name": "iterative-writer",
        "description": "Iteratively refine written content",
        "version": "1.0.0",
        "state_schema": {
            "fields": {
                "topic": {"type": "string"},
                "draft": {"type": "string"},
                "iteration": {"type": "integer", "default": 0},
                "max_iterations": {"type": "integer", "default": 3},
                "quality_score": {"type": "number", "default": 0.0}
            }
        },
        "nodes": [
            {
                "id": "writer",
                "type": "agent",
                "model": "gpt-4o",
                "system_prompt": "Write or improve content on the given topic.",
                "description": "Content writer"
            },
            {
                "id": "evaluator",
                "type": "agent",
                "model": "gpt-4o-mini",
                "system_prompt": "Evaluate content quality (0-10) and suggest improvements.",
                "description": "Quality evaluator"
            },
            {
                "id": "continue_check",
                "type": "conditional",
                "condition_code": """
iteration = state.get('iteration', 0)
max_iter = state.get('max_iterations', 3)
quality = state.get('quality_score', 0.0)

if iteration >= max_iter or quality >= 8.0:
    next_node = 'END'
else:
    next_node = 'writer'
""",
                "description": "Check if should continue iterating"
            }
        ],
        "edges": [
            {"from_node": "writer", "to_node": "evaluator"},
            {
                "from_node": "evaluator",
                "to_node": "continue_check"
            },
            {
                "from_node": "continue_check",
                "to_node": {"continue": "writer", "end": "END"},
                "type": "conditional"
            }
        ],
        "entry_point": "writer",
        "finish_points": ["continue_check"],
        "options": {"timeout": 300, "max_iterations": 3}
    }

    client.workflows.register_graph("iterative-writer", graph_def)
    print("✓ Iterative writer registered")

    result = client.workflows.execute_graph(
        "iterative-writer",
        inputs={
            "topic": "Benefits of renewable energy",
            "max_iterations": 3
        }
    )

    if result['success']:
        final_state = result['final_state']
        print(f"✓ Content refined")
        print(f"  Iterations: {final_state.get('iteration', 0)}")
        print(f"  Final quality: {final_state.get('quality_score', 0.0)}")


def example_parallel_processing(client: ArtificerClient):
    """
    Example: Parallel agent execution.

    Demonstrates:
    - Multiple agents running in parallel
    - Result aggregation
    - Parallel processing patterns
    """
    print("\n=== Example 7: Parallel Multi-Agent Processing ===")

    graph_def = {
        "name": "parallel-analysis",
        "description": "Parallel analysis from multiple perspectives",
        "version": "1.0.0",
        "state_schema": {
            "fields": {
                "document": {"type": "string"},
                "technical_analysis": {"type": "string"},
                "business_analysis": {"type": "string"},
                "legal_analysis": {"type": "string"},
                "synthesis": {"type": "string"}
            }
        },
        "nodes": [
            {
                "id": "technical_analyst",
                "type": "agent",
                "model": "gpt-4o",
                "system_prompt": "Analyze from a technical perspective.",
                "description": "Technical analyst"
            },
            {
                "id": "business_analyst",
                "type": "agent",
                "model": "gpt-4o",
                "system_prompt": "Analyze from a business perspective.",
                "description": "Business analyst"
            },
            {
                "id": "legal_analyst",
                "type": "agent",
                "model": "gpt-4o",
                "system_prompt": "Analyze from a legal/compliance perspective.",
                "description": "Legal analyst"
            },
            {
                "id": "synthesizer",
                "type": "agent",
                "model": "gpt-4o",
                "system_prompt": "Synthesize all analyses into comprehensive report.",
                "description": "Report synthesizer"
            }
        ],
        "edges": [
            # All analysts can run in parallel
            {"from_node": "technical_analyst", "to_node": "synthesizer"},
            {"from_node": "business_analyst", "to_node": "synthesizer"},
            {"from_node": "legal_analyst", "to_node": "synthesizer"}
        ],
        "entry_point": "technical_analyst",  # LangGraph will parallelize automatically
        "finish_points": ["synthesizer"],
        "options": {"timeout": 300}
    }

    client.workflows.register_graph("parallel-analysis", graph_def)
    print("✓ Parallel analysis graph registered")

    result = client.workflows.execute_graph(
        "parallel-analysis",
        inputs={
            "document": "Proposal for new AI-powered product feature"
        }
    )

    if result['success']:
        print("✓ Parallel analysis completed")
        print(f"  Synthesis: {result['final_state'].get('synthesis', '')[:200]}...")


def example_graph_management(client: ArtificerClient):
    """
    Example: Graph management operations.

    Demonstrates:
    - Listing graphs
    - Getting graph details
    - Graph summaries
    - Deleting graphs
    """
    print("\n=== Example 8: Graph Management ===")

    # List all graphs
    graphs_result = client.workflows.list_graphs()
    print(f"\nRegistered graphs: {len(graphs_result['graphs'])}")
    for graph in graphs_result['graphs']:
        print(f"  - {graph['id']}: {graph['name']} ({graph['nodeCount']} nodes)")

    # Get graph details
    if graphs_result['graphs']:
        graph_id = graphs_result['graphs'][0]['id']
        print(f"\nGetting details for: {graph_id}")

        graph = client.workflows.get_graph(graph_id)
        print(f"  Name: {graph['definition']['name']}")
        print(f"  Version: {graph['definition']['version']}")

        # Get summary
        summary_result = client.workflows.get_graph_summary(graph_id)
        print(f"\nGraph summary:")
        print(summary_result['summary'])

    # Clean up (example - commented out)
    # for graph in graphs_result['graphs']:
    #     client.workflows.delete_graph(graph['id'])
    #     print(f"✓ Deleted: {graph['id']}")


def list_langgraph_capabilities():
    """Show all LangGraph capabilities."""
    print("\n=== LangGraph Capabilities ===")

    capabilities = {
        "Node Types": [
            "agent - LLM-powered agent nodes",
            "tool - Function/tool execution",
            "conditional - Routing logic",
            "human - Human-in-the-loop",
            "passthrough - Pass state through"
        ],
        "Edge Types": [
            "normal - Direct edge to next node",
            "conditional - Dynamic routing based on state"
        ],
        "Features": [
            "Cyclic graphs (loops, iterations)",
            "Conditional routing",
            "Multi-agent collaboration",
            "Tool use (built-in and custom)",
            "Human-in-the-loop with checkpointing",
            "State management (TypedDict)",
            "Parallel execution",
            "Graph validation"
        ],
        "Built-in Tools": [
            "search_documents - Semantic document search",
            "extract_pdf - PDF text extraction",
            "chunk_text - Text chunking",
            "web_search - Web search",
            "http_request - HTTP requests"
        ],
        "Use Cases": [
            "Agentic workflows with decision-making",
            "Multi-agent research and collaboration",
            "Iterative refinement loops",
            "Approval workflows with human gates",
            "Complex routing and orchestration"
        ]
    }

    for category, items in capabilities.items():
        print(f"\n{category}:")
        for item in items:
            print(f"  - {item}")


def main():
    """Run all LangGraph examples."""
    # Initialize client
    client = ArtificerClient(
        api_url="http://localhost:3000",
        api_key=None  # For local development
    )

    print("=" * 60)
    print("LangGraph Examples - Phase 5")
    print("=" * 60)

    # Check availability
    if client.workflows.langgraph_available():
        print("✓ LangGraph is available")
    else:
        print("✗ LangGraph is not available")
        print("Install with: pip install langgraph langchain-openai langchain-anthropic")
        return

    # Show capabilities
    list_langgraph_capabilities()

    # Run examples (commented out to avoid actual execution)
    # Uncomment individual examples to test

    # example_simple_agent_graph(client)
    # example_conditional_routing_graph(client)
    # example_multi_agent_research(client)
    # example_human_in_the_loop(client)
    # example_tool_using_agent(client)
    # example_cyclic_graph(client)
    # example_parallel_processing(client)
    # example_graph_management(client)

    print("\n" + "=" * 60)
    print("Examples ready to run!")
    print("=" * 60)
    print("\nUncomment example functions in main() to test.")
    print("\nKey Concepts:")
    print("  - LangGraph enables cyclic workflows (vs Prefect's DAGs)")
    print("  - Agents can use tools and make decisions")
    print("  - Human-in-the-loop with checkpointing")
    print("  - State flows through the graph")
    print("  - Conditional routing for dynamic workflows")


if __name__ == "__main__":
    main()

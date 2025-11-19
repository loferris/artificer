/**
 * LangGraph Service - Manages stateful, cyclic workflows using LangGraph.
 *
 * Features:
 * - Agent-based workflows with LLMs
 * - Conditional routing and cycles
 * - Human-in-the-loop
 * - State management
 * - Checkpointing and resumability
 */

import { spawn } from 'child_process';
import * as path from 'path';

export interface GraphNode {
  id: string;
  type: 'agent' | 'tool' | 'conditional' | 'human' | 'passthrough';
  description?: string;

  // Agent fields
  model?: string;
  system_prompt?: string;
  tools?: string[];

  // Tool fields
  function_name?: string;
  function_code?: string;

  // Conditional fields
  condition_code?: string;

  // Human fields
  prompt_message?: string;
}

export interface GraphEdge {
  from_node: string;
  to_node: string | Record<string, string>;
  type?: 'normal' | 'conditional';
  condition?: string;
}

export interface StateSchema {
  fields: Record<string, {
    type: string;
    description?: string;
    default?: any;
  }>;
}

export interface GraphDefinition {
  name: string;
  description: string;
  version: string;
  state_schema: StateSchema;
  nodes: GraphNode[];
  edges: GraphEdge[];
  entry_point: string;
  finish_points: string[];
  options?: {
    timeout?: number;
    max_iterations?: number;
    [key: string]: any;
  };
}

export interface GraphExecutionConfig {
  thread_id?: string;
  human_input?: Record<string, any>;
  streaming?: boolean;
}

export interface GraphExecutionResult {
  success: boolean;
  final_state?: Record<string, any>;
  error?: string;
  requires_human_input?: boolean;
  checkpoint_id?: string;
}

export class LangGraphService {
  private pythonPath: string;
  private flowsPath: string;
  private graphs: Map<string, GraphDefinition>;
  private available: boolean;

  constructor(pythonPath: string = 'python3') {
    this.pythonPath = pythonPath;
    this.flowsPath = path.join(process.cwd(), 'python', 'flows');
    this.graphs = new Map();
    this.available = false;

    this.checkAvailability();
  }

  /**
   * Check if LangGraph is available.
   */
  async checkAvailability(): Promise<void> {
    try {
      const result = await this.executeCommand(this.pythonPath, [
        '-c',
        'import langgraph; print("available")',
      ]);

      this.available = result.trim() === 'available';
    } catch (error) {
      console.warn('LangGraph not available:', error);
      this.available = false;
    }
  }

  /**
   * Execute a Python command.
   */
  private executeCommand(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const env = {
        ...process.env,
        PYTHONPATH: this.flowsPath,
      };

      const proc = spawn(command, args, { env });
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(stderr || `Process exited with code ${code}`));
        } else {
          resolve(stdout);
        }
      });

      proc.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Check if LangGraph is available.
   */
  isAvailable(): boolean {
    return this.available;
  }

  /**
   * Validate a graph definition.
   */
  async validateGraph(definition: GraphDefinition): Promise<{ valid: boolean; error?: string }> {
    const pythonScript = `
import sys
import json
from langgraph_schema import validate_graph_definition

graph_def = json.loads('''${JSON.stringify(definition)}''')
is_valid, error = validate_graph_definition(graph_def)
result = {"valid": is_valid, "error": error}
print(json.dumps(result))
`;

    try {
      const output = await this.executeCommand(this.pythonPath, ['-c', pythonScript]);
      return JSON.parse(output.trim());
    } catch (error: any) {
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  /**
   * Register a graph.
   */
  registerGraph(graphId: string, definition: GraphDefinition): void {
    this.graphs.set(graphId, definition);
  }

  /**
   * Get a registered graph.
   */
  getGraph(graphId: string): GraphDefinition | undefined {
    return this.graphs.get(graphId);
  }

  /**
   * List all registered graphs.
   */
  listGraphs(): Array<{ id: string; name: string; description: string; nodeCount: number }> {
    const graphs: Array<{ id: string; name: string; description: string; nodeCount: number }> = [];

    for (const [id, definition] of this.graphs.entries()) {
      graphs.push({
        id,
        name: definition.name,
        description: definition.description,
        nodeCount: definition.nodes.length,
      });
    }

    return graphs;
  }

  /**
   * Delete a graph.
   */
  deleteGraph(graphId: string): boolean {
    return this.graphs.delete(graphId);
  }

  /**
   * Execute a graph.
   */
  async executeGraph(
    graphId: string,
    inputs: Record<string, any>,
    config?: GraphExecutionConfig
  ): Promise<GraphExecutionResult> {
    const definition = this.getGraph(graphId);
    if (!definition) {
      throw new Error(`Graph not found: ${graphId}`);
    }

    const pythonScript = `
import sys
import json
from langgraph_executor import register_graph, execute_graph

# Register graph
graph_def = json.loads('''${JSON.stringify(definition)}''')
register_graph("${graphId}", graph_def)

# Execute
inputs = json.loads('''${JSON.stringify(inputs)}''')
config = json.loads('''${JSON.stringify(config || {})}''') if '''${JSON.stringify(config || {})}''' else None

try:
    result = execute_graph("${graphId}", inputs, config)
    output = {
        "success": True,
        "final_state": result
    }

    # Check if requires human input
    if result.get("requires_human_input"):
        output["requires_human_input"] = True
        output["checkpoint_id"] = config.get("thread_id") if config else None

except Exception as e:
    output = {
        "success": False,
        "error": str(e)
    }

print(json.dumps(output))
`;

    try {
      const output = await this.executeCommand(this.pythonPath, ['-c', pythonScript]);
      return JSON.parse(output.trim());
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Execute graph with streaming.
   */
  async* executeGraphStreaming(
    graphId: string,
    inputs: Record<string, any>,
    config?: GraphExecutionConfig
  ): AsyncGenerator<Record<string, any>> {
    const definition = this.getGraph(graphId);
    if (!definition) {
      throw new Error(`Graph not found: ${graphId}`);
    }

    const pythonScript = `
import sys
import json
from langgraph_executor import register_graph, execute_graph_streaming

# Register graph
graph_def = json.loads('''${JSON.stringify(definition)}''')
register_graph("${graphId}", graph_def)

# Execute with streaming
inputs = json.loads('''${JSON.stringify(inputs)}''')
config = json.loads('''${JSON.stringify(config || {})}''') if '''${JSON.stringify(config || {})}''' else None

for state in execute_graph_streaming("${graphId}", inputs, config):
    print(json.dumps(state))
    sys.stdout.flush()
`;

    // Stream output from Python process
    const env = {
      ...process.env,
      PYTHONPATH: this.flowsPath,
    };

    const proc = spawn(this.pythonPath, ['-c', pythonScript], { env });
    let buffer = '';

    for await (const chunk of proc.stdout) {
      buffer += chunk.toString();

      // Split by newlines
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            const state = JSON.parse(line);
            yield state;
          } catch (e) {
            console.error('Failed to parse streaming output:', line);
          }
        }
      }
    }

    // Process remaining buffer
    if (buffer.trim()) {
      try {
        const state = JSON.parse(buffer);
        yield state;
      } catch (e) {
        console.error('Failed to parse final output:', buffer);
      }
    }
  }

  /**
   * Resume graph from checkpoint (e.g., after human input).
   */
  async resumeGraph(
    graphId: string,
    checkpointId: string,
    humanInput: Record<string, any>
  ): Promise<GraphExecutionResult> {
    const definition = this.getGraph(graphId);
    if (!definition) {
      throw new Error(`Graph not found: ${graphId}`);
    }

    const pythonScript = `
import sys
import json
from langgraph_executor import register_graph

# Register graph
graph_def = json.loads('''${JSON.stringify(definition)}''')
from langgraph_executor import GraphExecutor
executor = GraphExecutor(graph_def)

# Resume from checkpoint
checkpoint_id = "${checkpointId}"
human_input = json.loads('''${JSON.stringify(humanInput)}''')

try:
    result = executor.resume_from_checkpoint(checkpoint_id, human_input)
    output = {
        "success": True,
        "final_state": result
    }
except Exception as e:
    output = {
        "success": False,
        "error": str(e)
    }

print(json.dumps(output))
`;

    try {
      const output = await this.executeCommand(this.pythonPath, ['-c', pythonScript]);
      return JSON.parse(output.trim());
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * List built-in tools.
   */
  async listBuiltinTools(): Promise<Array<Record<string, any>>> {
    const pythonScript = `
import json
from langgraph_schema import list_builtin_tools

tools = list_builtin_tools()
print(json.dumps(tools))
`;

    try {
      const output = await this.executeCommand(this.pythonPath, ['-c', pythonScript]);
      return JSON.parse(output.trim());
    } catch (error) {
      return [];
    }
  }

  /**
   * Get graph summary.
   */
  async getGraphSummary(graphId: string): Promise<string> {
    const definition = this.getGraph(graphId);
    if (!definition) {
      throw new Error(`Graph not found: ${graphId}`);
    }

    const pythonScript = `
import json
from langgraph_schema import format_graph_summary

graph_def = json.loads('''${JSON.stringify(definition)}''')
summary = format_graph_summary(graph_def)
print(summary)
`;

    try {
      return await this.executeCommand(this.pythonPath, ['-c', pythonScript]);
    } catch (error: any) {
      return `Error generating summary: ${error.message}`;
    }
  }
}

// Singleton instance
let langGraphService: LangGraphService | null = null;

export function getLangGraphService(): LangGraphService {
  if (!langGraphService) {
    langGraphService = new LangGraphService();
  }
  return langGraphService;
}

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
import { logger } from '../../utils/logger';

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
  private static readonly PROCESS_TIMEOUT = 60000; // 60 seconds for graph execution

  constructor(pythonPath: string = 'python3') {
    this.pythonPath = pythonPath;
    this.flowsPath = path.join(process.cwd(), 'python', 'flows');
    this.graphs = new Map();
    this.available = false;

    this.checkAvailability();
  }

  /**
   * Safely encode data for passing to Python scripts.
   * Uses base64 encoding to prevent injection attacks.
   */
  private safeEncode(data: any): string {
    const jsonStr = JSON.stringify(data);
    return Buffer.from(jsonStr).toString('base64');
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
      logger.warn('LangGraph not available', { error });
      this.available = false;
    }
  }

  /**
   * Execute a Python command with timeout.
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

      // Set timeout
      const timeout = setTimeout(() => {
        proc.kill('SIGKILL');
        reject(new Error(`Process timed out after ${LangGraphService.PROCESS_TIMEOUT}ms`));
      }, LangGraphService.PROCESS_TIMEOUT);

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          reject(new Error(stderr || `Process exited with code ${code}`));
        } else {
          resolve(stdout);
        }
      });

      proc.on('error', (error) => {
        clearTimeout(timeout);
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
   * Returns unavailable status if Python/LangGraph is not configured.
   */
  async validateGraph(definition: GraphDefinition): Promise<{ valid: boolean; error?: string }> {
    if (!this.available) {
      return {
        valid: false,
        error: 'LangGraph validation unavailable - Python LangGraph not configured',
      };
    }

    const encodedData = this.safeEncode({ definition });
    const pythonScript = `
import sys
import json
import base64
from langgraph_schema import validate_graph_definition

data = json.loads(base64.b64decode("${encodedData}").decode('utf-8'))
graph_def = data['definition']
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
   * Returns unavailable status if Python/LangGraph is not configured.
   */
  async executeGraph(
    graphId: string,
    inputs: Record<string, any>,
    config?: GraphExecutionConfig
  ): Promise<GraphExecutionResult> {
    if (!this.available) {
      return {
        success: false,
        error: 'Graph execution unavailable - Python LangGraph not configured',
      };
    }

    const definition = this.getGraph(graphId);
    if (!definition) {
      throw new Error(`Graph not found: ${graphId}`);
    }

    const encodedData = this.safeEncode({ definition, graphId, inputs, config: config || {} });
    const pythonScript = `
import sys
import json
import base64
from langgraph_executor import register_graph, execute_graph

data = json.loads(base64.b64decode("${encodedData}").decode('utf-8'))
graph_def = data['definition']
graph_id = data['graphId']
inputs = data['inputs']
config = data['config'] if data['config'] else None

# Register graph
register_graph(graph_id, graph_def)

try:
    result = execute_graph(graph_id, inputs, config)
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
   * Yields error state if Python/LangGraph is not configured.
   */
  async* executeGraphStreaming(
    graphId: string,
    inputs: Record<string, any>,
    config?: GraphExecutionConfig
  ): AsyncGenerator<Record<string, any>> {
    if (!this.available) {
      yield {
        error: 'Graph streaming unavailable - Python LangGraph not configured',
        success: false,
      };
      return;
    }

    const definition = this.getGraph(graphId);
    if (!definition) {
      throw new Error(`Graph not found: ${graphId}`);
    }

    const encodedData = this.safeEncode({ definition, graphId, inputs, config: config || {} });
    const pythonScript = `
import sys
import json
import base64
from langgraph_executor import register_graph, execute_graph_streaming

data = json.loads(base64.b64decode("${encodedData}").decode('utf-8'))
graph_def = data['definition']
graph_id = data['graphId']
inputs = data['inputs']
config = data['config'] if data['config'] else None

# Register graph
register_graph(graph_id, graph_def)

for state in execute_graph_streaming(graph_id, inputs, config):
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
            logger.error('Failed to parse streaming output', { line, error: e });
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
        logger.error('Failed to parse final output', { buffer, error: e });
      }
    }
  }

  /**
   * Resume graph from checkpoint (e.g., after human input).
   * Returns unavailable status if Python/LangGraph is not configured.
   */
  async resumeGraph(
    graphId: string,
    checkpointId: string,
    humanInput: Record<string, any>
  ): Promise<GraphExecutionResult> {
    if (!this.available) {
      return {
        success: false,
        error: 'Graph resume unavailable - Python LangGraph not configured',
      };
    }

    const definition = this.getGraph(graphId);
    if (!definition) {
      throw new Error(`Graph not found: ${graphId}`);
    }

    const encodedData = this.safeEncode({ definition, checkpointId, humanInput });
    const pythonScript = `
import sys
import json
import base64
from langgraph_executor import GraphExecutor

data = json.loads(base64.b64decode("${encodedData}").decode('utf-8'))
graph_def = data['definition']
checkpoint_id = data['checkpointId']
human_input = data['humanInput']

executor = GraphExecutor(graph_def)

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
   * Returns empty array if Python/LangGraph is not configured.
   */
  async listBuiltinTools(): Promise<Array<Record<string, any>>> {
    if (!this.available) {
      return [];
    }

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
   * Returns unavailable message if Python/LangGraph is not configured.
   */
  async getGraphSummary(graphId: string): Promise<string> {
    if (!this.available) {
      return 'Graph summary unavailable - Python LangGraph not configured';
    }

    const definition = this.getGraph(graphId);
    if (!definition) {
      throw new Error(`Graph not found: ${graphId}`);
    }

    const encodedData = this.safeEncode({ definition });
    const pythonScript = `
import json
import base64
from langgraph_schema import format_graph_summary

data = json.loads(base64.b64decode("${encodedData}").decode('utf-8'))
graph_def = data['definition']
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

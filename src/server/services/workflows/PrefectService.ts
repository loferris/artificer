/**
 * Prefect Workflow Service
 *
 * Manages Prefect workflow execution via Python subprocess.
 * Exposes pre-built workflows through TypeScript API.
 */

import { spawn } from 'child_process';
import { logger } from '../../utils/logger';
import path from 'path';

export interface WorkflowInput {
  [key: string]: any;
}

export interface WorkflowResult {
  success: boolean;
  result?: any;
  error?: string;
  metadata: {
    workflowName: string;
    executionTime: number;
    timestamp: string;
  };
}

/**
 * Available Prefect workflows
 */
export const AVAILABLE_WORKFLOWS = {
  // Document Processing
  'pdf-to-html': {
    name: 'pdf-to-html-pipeline',
    description: 'Extract PDF, convert to Portable Text, export as HTML',
    inputs: {
      pdf_data: 'bytes (base64 encoded)',
      include_styles: 'boolean (optional, default: true)',
      title: 'string (optional)',
    },
  },
  'pdf-with-ocr': {
    name: 'pdf-with-ocr-pipeline',
    description: 'Process PDF with OCR fallback and chunking',
    inputs: {
      pdf_data: 'bytes (base64 encoded)',
      chunk_size: 'number (optional, default: 1000)',
      chunk_overlap: 'number (optional, default: 200)',
    },
  },
  'batch-pdf-processing': {
    name: 'batch-pdf-processing',
    description: 'Process multiple PDFs in parallel',
    inputs: {
      pdf_files: 'array of {filename: string, data: bytes}',
    },
  },
  'image-ocr': {
    name: 'image-ocr-pipeline',
    description: 'Extract text from images using OCR',
    inputs: {
      images: 'array of {data: bytes, content_type: string}',
      min_confidence: 'number (optional, default: 0.7)',
    },
  },
  'markdown-conversion': {
    name: 'markdown-conversion-pipeline',
    description: 'Convert markdown to multiple formats',
    inputs: {
      markdown_content: 'string',
    },
  },

  // Translation (FableForge example)
  'translation': {
    name: 'translation-pipeline',
    description: 'Full translation pipeline with parallel specialist refinement',
    inputs: {
      text: 'string',
      language: 'string (kor, jpn, chi)',
      min_successful_specialists: 'number (optional, default: 3)',
      selection_strategy: 'string (optional, default: ensemble)',
    },
  },
  'translation-simple': {
    name: 'translation-pipeline-simple',
    description: 'Simplified translation pipeline',
    inputs: {
      text: 'string',
      language: 'string',
    },
  },
  'batch-translation': {
    name: 'batch-translation',
    description: 'Process multiple documents in parallel',
    inputs: {
      documents: 'array of {id: string, text: string}',
      language: 'string',
      min_successful: 'number (optional, default: 3)',
    },
  },

  // Utility
  'health-check': {
    name: 'health-check-flow',
    description: 'Check Artificer service health',
    inputs: {},
  },
} as const;

export type WorkflowName = keyof typeof AVAILABLE_WORKFLOWS;

export interface CustomWorkflowDefinition {
  name: string;
  description?: string;
  version?: string;
  tasks: Array<{
    id: string;
    type: string;
    inputs: Record<string, any>;
    depends_on?: string[];
    outputs?: string[];
  }>;
  output?: Record<string, string>;
  options?: {
    parallel?: boolean;
    retry_failed_tasks?: boolean;
    timeout?: number;
    task_runner?: 'concurrent' | 'sequential' | 'dask';
    max_retries?: number;
  };
  metadata?: Record<string, any>;
}

export class PrefectService {
  private pythonPath: string;
  private flowsPath: string;
  private customWorkflows: Map<string, CustomWorkflowDefinition>;

  constructor() {
    // Path to Python flows directory
    this.flowsPath = path.join(process.cwd(), 'python', 'flows');
    this.pythonPath = process.env.PYTHON_PATH || 'python3';
    this.customWorkflows = new Map();
  }

  /**
   * Check if Prefect is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const result = await this.executeCommand('python3', ['-c', 'import prefect; print("ok")']);
      return result.trim() === 'ok';
    } catch (error) {
      logger.warn('Prefect not available', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * List all available workflows
   */
  listWorkflows(): Array<{
    id: string;
    name: string;
    description: string;
    inputs: Record<string, string>;
  }> {
    return Object.entries(AVAILABLE_WORKFLOWS).map(([id, workflow]) => ({
      id,
      name: workflow.name,
      description: workflow.description,
      inputs: workflow.inputs,
    }));
  }

  /**
   * Get workflow details
   */
  getWorkflow(workflowId: string): typeof AVAILABLE_WORKFLOWS[WorkflowName] | null {
    if (workflowId in AVAILABLE_WORKFLOWS) {
      return AVAILABLE_WORKFLOWS[workflowId as WorkflowName];
    }
    return null;
  }

  /**
   * Execute a Prefect workflow
   */
  async executeWorkflow(
    workflowId: string,
    inputs: WorkflowInput
  ): Promise<WorkflowResult> {
    const startTime = Date.now();

    const workflow = this.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Unknown workflow: ${workflowId}`);
    }

    logger.info('Executing Prefect workflow', {
      workflow: workflow.name,
      workflowId,
    });

    try {
      // Execute Python workflow
      const result = await this.executePythonWorkflow(workflow.name, inputs);

      const executionTime = Date.now() - startTime;

      logger.info('Workflow completed successfully', {
        workflow: workflow.name,
        executionTime,
      });

      return {
        success: true,
        result,
        metadata: {
          workflowName: workflow.name,
          executionTime,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      logger.error('Workflow execution failed', {
        workflow: workflow.name,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          workflowName: workflow.name,
          executionTime,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Execute Python workflow via subprocess
   */
  private async executePythonWorkflow(
    flowName: string,
    inputs: WorkflowInput
  ): Promise<any> {
    // Create Python script to execute workflow
    const pythonScript = `
import sys
import json
import asyncio
from pathlib import Path

# Add flows directory to path
sys.path.insert(0, '${this.flowsPath}')

# Import the specific workflow
${this.generateImportStatement(flowName)}

# Parse inputs
inputs = json.loads('''${JSON.stringify(inputs)}''')

# Execute workflow
async def main():
    result = await ${flowName}(**inputs) if asyncio.iscoroutinefunction(${flowName}) else ${flowName}(**inputs)
    print(json.dumps(result))

if __name__ == "__main__":
    asyncio.run(main()) if asyncio.iscoroutinefunction(${flowName}) else main()
`;

    // Execute Python script
    const output = await this.executeCommand(this.pythonPath, ['-c', pythonScript]);

    // Parse JSON result
    try {
      return JSON.parse(output);
    } catch (error) {
      logger.warn('Failed to parse workflow output as JSON', { output });
      return { raw_output: output };
    }
  }

  /**
   * Generate import statement for a flow
   */
  private generateImportStatement(flowName: string): string {
    // Map flow names to their modules
    const flowModules: Record<string, string> = {
      'pdf-to-html-pipeline': 'document_processing',
      'pdf-with-ocr-pipeline': 'document_processing',
      'batch-pdf-processing': 'document_processing',
      'image-ocr-pipeline': 'document_processing',
      'markdown-conversion-pipeline': 'document_processing',
      'health-check-flow': 'document_processing',
      'translation-pipeline': 'translation_pipeline',
      'translation-pipeline-simple': 'translation_pipeline',
      'batch-translation': 'translation_pipeline',
    };

    const module = flowModules[flowName] || 'document_processing';

    // Convert flow name to Python function name (kebab-case to snake_case)
    const functionName = flowName.replace(/-/g, '_');

    return `from ${module} import ${functionName}`;
  }

  /**
   * Execute a command and return output
   */
  private executeCommand(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args);
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
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
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
   * Register a custom workflow definition
   */
  registerCustomWorkflow(
    workflowId: string,
    definition: CustomWorkflowDefinition
  ): void {
    logger.info('Registering custom workflow', {
      workflowId,
      name: definition.name,
    });

    this.customWorkflows.set(workflowId, definition);
  }

  /**
   * Get a custom workflow definition
   */
  getCustomWorkflow(workflowId: string): CustomWorkflowDefinition | null {
    return this.customWorkflows.get(workflowId) || null;
  }

  /**
   * List all custom workflows
   */
  listCustomWorkflows(): Array<{
    id: string;
    name: string;
    description?: string;
    version?: string;
    taskCount: number;
  }> {
    return Array.from(this.customWorkflows.entries()).map(([id, definition]) => ({
      id,
      name: definition.name,
      description: definition.description,
      version: definition.version,
      taskCount: definition.tasks.length,
    }));
  }

  /**
   * Delete a custom workflow
   */
  deleteCustomWorkflow(workflowId: string): boolean {
    return this.customWorkflows.delete(workflowId);
  }

  /**
   * Execute a custom workflow definition
   */
  async executeCustomWorkflow(
    workflowId: string,
    inputs: WorkflowInput
  ): Promise<WorkflowResult> {
    const startTime = Date.now();

    const definition = this.getCustomWorkflow(workflowId);
    if (!definition) {
      throw new Error(`Custom workflow not found: ${workflowId}`);
    }

    logger.info('Executing custom workflow', {
      workflowId,
      name: definition.name,
    });

    try {
      // Execute via workflow generator
      const result = await this.executePythonCustomWorkflow(definition, inputs);

      const executionTime = Date.now() - startTime;

      logger.info('Custom workflow completed successfully', {
        workflowId,
        name: definition.name,
        executionTime,
      });

      return {
        success: true,
        result,
        metadata: {
          workflowName: definition.name,
          executionTime,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      logger.error('Custom workflow execution failed', {
        workflowId,
        name: definition.name,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          workflowName: definition.name,
          executionTime,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Execute custom workflow via Python workflow generator
   */
  private async executePythonCustomWorkflow(
    definition: CustomWorkflowDefinition,
    inputs: WorkflowInput
  ): Promise<any> {
    // Create Python script to execute custom workflow
    const pythonScript = `
import sys
import json
from pathlib import Path

# Add flows directory to path
sys.path.insert(0, '${this.flowsPath}')

# Import workflow generator
from workflow_generator import create_workflow_from_dict

# Parse workflow definition and inputs
workflow_def = json.loads('''${JSON.stringify(definition)}''')
workflow_input = json.loads('''${JSON.stringify(inputs)}''')

# Create and execute workflow
executor = create_workflow_from_dict(workflow_def)
result = executor.execute(workflow_input)

# Output result
print(json.dumps(result))
`;

    // Execute Python script
    const output = await this.executeCommand(this.pythonPath, ['-c', pythonScript]);

    // Parse JSON result
    try {
      return JSON.parse(output);
    } catch (error) {
      logger.warn('Failed to parse custom workflow output as JSON', { output });
      return { raw_output: output };
    }
  }

  /**
   * Validate a custom workflow definition
   */
  async validateWorkflowDefinition(
    definition: CustomWorkflowDefinition
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      // Use Python validator
      const pythonScript = `
import sys
import json
from pathlib import Path

# Add flows directory to path
sys.path.insert(0, '${this.flowsPath}')

# Import validator
from workflow_schema import validate_workflow_definition

# Parse workflow definition
workflow_def = json.loads('''${JSON.stringify(definition)}''')

# Validate
is_valid, error = validate_workflow_definition(workflow_def)

# Output result
print(json.dumps({"valid": is_valid, "error": error}))
`;

      const output = await this.executeCommand(this.pythonPath, ['-c', pythonScript]);
      const result = JSON.parse(output);

      return {
        valid: result.valid,
        error: result.error || undefined,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      };
    }
  }

  /**
   * WORKFLOW TEMPLATES - Phase 3
   */

  /**
   * List all workflow templates
   */
  async listTemplates(category?: string): Promise<
    Array<{
      id: string;
      name: string;
      description: string;
      category: string;
      version: string;
      parameters: Record<string, any>;
    }>
  > {
    try {
      const pythonScript = `
import sys
import json
from pathlib import Path

# Add flows directory to path
sys.path.insert(0, '${this.flowsPath}')

# Import template registry
from workflow_templates import list_templates

# List templates
category = ${category ? `"${category}"` : 'None'}
templates = list_templates(category=category)

# Output result
print(json.dumps(templates))
`;

      const output = await this.executeCommand(this.pythonPath, ['-c', pythonScript]);
      return JSON.parse(output);
    } catch (error) {
      logger.error('Failed to list workflow templates', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Get a workflow template
   */
  async getTemplate(templateId: string): Promise<{
    id: string;
    name: string;
    description: string;
    category: string;
    version: string;
    parameters: Record<string, any>;
    definition: CustomWorkflowDefinition;
  } | null> {
    try {
      const pythonScript = `
import sys
import json
from pathlib import Path

# Add flows directory to path
sys.path.insert(0, '${this.flowsPath}')

# Import template registry
from workflow_templates import get_template

# Get template
template = get_template("${templateId}")
if template:
    result = {
        "id": template.template_id,
        "name": template.name,
        "description": template.description,
        "category": template.category,
        "version": template.version,
        "parameters": template.get_parameters(),
        "definition": template.get_definition()
    }
    print(json.dumps(result))
else:
    print(json.dumps(None))
`;

      const output = await this.executeCommand(this.pythonPath, ['-c', pythonScript]);
      const result = JSON.parse(output);
      return result;
    } catch (error) {
      logger.error('Failed to get workflow template', {
        templateId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Get template categories
   */
  async getTemplateCategories(): Promise<string[]> {
    try {
      const pythonScript = `
import sys
import json
from pathlib import Path

# Add flows directory to path
sys.path.insert(0, '${this.flowsPath}')

# Import template registry
from workflow_templates import get_template_categories

# Get categories
categories = get_template_categories()
print(json.dumps(categories))
`;

      const output = await this.executeCommand(this.pythonPath, ['-c', pythonScript]);
      return JSON.parse(output);
    } catch (error) {
      logger.error('Failed to get template categories', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Instantiate a template with parameters
   */
  async instantiateTemplate(
    templateId: string,
    params: Record<string, any>
  ): Promise<CustomWorkflowDefinition> {
    try {
      const pythonScript = `
import sys
import json
from pathlib import Path

# Add flows directory to path
sys.path.insert(0, '${this.flowsPath}')

# Import template registry
from workflow_templates import instantiate_template

# Instantiate template
params = json.loads('''${JSON.stringify(params)}''')
definition = instantiate_template("${templateId}", params)

print(json.dumps(definition))
`;

      const output = await this.executeCommand(this.pythonPath, ['-c', pythonScript]);
      return JSON.parse(output);
    } catch (error) {
      throw new Error(
        `Failed to instantiate template: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

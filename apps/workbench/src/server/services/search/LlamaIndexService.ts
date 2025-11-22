/**
 * LlamaIndex Service - Enhanced retrieval using LlamaIndex
 *
 * Provides:
 * - Reranking (cross-encoder for better results)
 * - HyDE (Hypothetical Document Embeddings)
 * - Query Fusion (multiple query variations)
 * - Sub-question decomposition
 * - RAG evaluation
 */

import { spawn } from 'child_process';
import * as path from 'path';
import { logger } from '../../utils/logger';

export interface RerankerConfig {
  model?: 'ms-marco-mini' | 'ms-marco-base' | 'bge-reranker' | 'cohere-rerank';
  topN?: number;
  topK?: number;
}

export interface SearchResult {
  content: string;
  score: number;
  metadata?: Record<string, any>;
  [key: string]: any;
}

export interface HyDEConfig {
  llmModel?: string;
  alpha?: number;
}

export interface QueryFusionConfig {
  numVariations?: number;
  fusionMethod?: 'reciprocal_rank' | 'score_average';
  topK?: number;
}

export interface SubQuestionConfig {
  llmModel?: string;
  maxSubquestions?: number;
}

export interface RAGEvaluation {
  score: number | null;
  passing: boolean;
  feedback: string;
  metric: string;
}

export interface FullRAGEvaluation {
  query: string;
  response: string;
  num_contexts: number;
  evaluations: {
    faithfulness: RAGEvaluation;
    relevancy: RAGEvaluation;
    answer_relevancy: RAGEvaluation;
  };
  overall_score: number | null;
  all_passing: boolean;
}

export class LlamaIndexService {
  private pythonPath: string;
  private flowsPath: string;
  private available: boolean;
  private static readonly PROCESS_TIMEOUT = 30000; // 30 seconds

  constructor(pythonPath: string = 'python3') {
    this.pythonPath = pythonPath;
    this.flowsPath = path.join(process.cwd(), 'python', 'flows');
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
        reject(new Error(`Process timed out after ${LlamaIndexService.PROCESS_TIMEOUT}ms`));
      }, LlamaIndexService.PROCESS_TIMEOUT);

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
   * Check if LlamaIndex is available.
   */
  async checkAvailability(): Promise<void> {
    try {
      const result = await this.executeCommand(this.pythonPath, [
        '-c',
        'from llamaindex_retrieval import check_availability; print("available" if check_availability() else "unavailable")',
      ]);

      this.available = result.trim() === 'available';
    } catch (error) {
      logger.warn('LlamaIndex not available', { error });
      this.available = false;
    }
  }

  /**
   * Check if LlamaIndex is available.
   */
  isAvailable(): boolean {
    return this.available;
  }

  /**
   * Rerank search results using cross-encoder.
   * Returns original results if Python is unavailable.
   */
  async rerankResults(
    searchResults: SearchResult[],
    query: string,
    config: RerankerConfig = {}
  ): Promise<SearchResult[]> {
    // Graceful degradation: return original results if unavailable
    if (!this.available) {
      logger.warn('LlamaIndex not available - returning unranked results');
      return searchResults;
    }

    const encodedData = this.safeEncode({ searchResults, query, config });
    const pythonScript = `
import sys
import json
import base64
from llamaindex_retrieval import rerank_search_results

data = json.loads(base64.b64decode("${encodedData}").decode('utf-8'))
search_results = data['searchResults']
query = data['query']
config = data['config']

try:
    reranked = rerank_search_results(
        search_results,
        query,
        top_n=config.get('topN', 5),
        model=config.get('model', 'ms-marco-mini')
    )
    print(json.dumps(reranked))
except Exception as e:
    print(json.dumps({"error": str(e)}), file=sys.stderr)
    sys.exit(1)
`;

    try {
      const output = await this.executeCommand(this.pythonPath, ['-c', pythonScript]);
      return JSON.parse(output.trim());
    } catch (error: any) {
      throw new Error(`Reranking failed: ${error.message}`);
    }
  }

  /**
   * Generate hypothetical document for HyDE.
   * Returns the original query if Python is unavailable.
   */
  async generateHypotheticalDocument(query: string, llmModel: string = 'gpt-4o-mini'): Promise<string> {
    // Graceful degradation: return original query if unavailable
    if (!this.available) {
      logger.warn('LlamaIndex not available - HyDE disabled, using original query');
      return query;
    }

    const encodedData = this.safeEncode({ query, llmModel });
    const pythonScript = `
import sys
import json
import base64
from llamaindex_retrieval import hyde_generate_hypothetical_document

data = json.loads(base64.b64decode("${encodedData}").decode('utf-8'))
query = data['query']
llm_model = data['llmModel']

try:
    hypothetical = hyde_generate_hypothetical_document(query, llm_model)
    print(hypothetical)
except Exception as e:
    print(json.dumps({"error": str(e)}), file=sys.stderr)
    sys.exit(1)
`;

    try {
      const output = await this.executeCommand(this.pythonPath, ['-c', pythonScript]);
      return output.trim();
    } catch (error: any) {
      throw new Error(`HyDE generation failed: ${error.message}`);
    }
  }

  /**
   * Generate query variations for query fusion.
   * Returns just the original query if Python is unavailable.
   */
  async generateQueryVariations(
    query: string,
    numVariations: number = 3,
    llmModel: string = 'gpt-4o-mini'
  ): Promise<string[]> {
    // Graceful degradation: return original query only if unavailable
    if (!this.available) {
      logger.warn('LlamaIndex not available - returning original query only');
      return [query];
    }

    const encodedData = this.safeEncode({ query, numVariations, llmModel });
    const pythonScript = `
import sys
import json
import base64
from llamaindex_retrieval import generate_query_variations

data = json.loads(base64.b64decode("${encodedData}").decode('utf-8'))
query = data['query']
num_variations = data['numVariations']
llm_model = data['llmModel']

try:
    variations = generate_query_variations(query, num_variations, llm_model)
    print(json.dumps(variations))
except Exception as e:
    print(json.dumps({"error": str(e)}), file=sys.stderr)
    sys.exit(1)
`;

    try {
      const output = await this.executeCommand(this.pythonPath, ['-c', pythonScript]);
      return JSON.parse(output.trim());
    } catch (error: any) {
      throw new Error(`Query variation generation failed: ${error.message}`);
    }
  }

  /**
   * Decompose query into sub-questions.
   * Returns just the original query if Python is unavailable.
   */
  async decomposeIntoSubquestions(
    query: string,
    llmModel: string = 'gpt-4o-mini'
  ): Promise<string[]> {
    // Graceful degradation: return original query only if unavailable
    if (!this.available) {
      logger.warn('LlamaIndex not available - returning original query only');
      return [query];
    }

    const encodedData = this.safeEncode({ query, llmModel });
    const pythonScript = `
import sys
import json
import base64
from llamaindex_retrieval import decompose_into_subquestions

data = json.loads(base64.b64decode("${encodedData}").decode('utf-8'))
query = data['query']
llm_model = data['llmModel']

try:
    subquestions = decompose_into_subquestions(query, llm_model)
    print(json.dumps(subquestions))
except Exception as e:
    print(json.dumps({"error": str(e)}), file=sys.stderr)
    sys.exit(1)
`;

    try {
      const output = await this.executeCommand(this.pythonPath, ['-c', pythonScript]);
      return JSON.parse(output.trim());
    } catch (error: any) {
      throw new Error(`Sub-question decomposition failed: ${error.message}`);
    }
  }

  /**
   * Evaluate RAG faithfulness (no hallucination).
   * Returns unavailable status if Python is not configured.
   */
  async evaluateFaithfulness(
    query: string,
    response: string,
    contexts: string[]
  ): Promise<RAGEvaluation> {
    // Graceful degradation: return unavailable evaluation if not configured
    if (!this.available) {
      return {
        score: null,
        passing: false,
        feedback: 'Evaluation unavailable - LlamaIndex Python service not configured',
        metric: 'faithfulness',
      };
    }

    const encodedData = this.safeEncode({ query, response, contexts });
    const pythonScript = `
import sys
import json
import base64
from llamaindex_retrieval import RAGEvaluator

data = json.loads(base64.b64decode("${encodedData}").decode('utf-8'))
query = data['query']
response = data['response']
contexts = data['contexts']

try:
    evaluator = RAGEvaluator()
    result = evaluator.evaluate_faithfulness(query, response, contexts)
    print(json.dumps(result))
except Exception as e:
    print(json.dumps({"error": str(e)}), file=sys.stderr)
    sys.exit(1)
`;

    try {
      const output = await this.executeCommand(this.pythonPath, ['-c', pythonScript]);
      return JSON.parse(output.trim());
    } catch (error: any) {
      throw new Error(`Faithfulness evaluation failed: ${error.message}`);
    }
  }

  /**
   * Evaluate retrieval relevancy.
   * Returns unavailable status if Python is not configured.
   */
  async evaluateRelevancy(query: string, contexts: string[]): Promise<RAGEvaluation> {
    // Graceful degradation: return unavailable evaluation if not configured
    if (!this.available) {
      return {
        score: null,
        passing: false,
        feedback: 'Evaluation unavailable - LlamaIndex Python service not configured',
        metric: 'relevancy',
      };
    }

    const encodedData = this.safeEncode({ query, contexts });
    const pythonScript = `
import sys
import json
import base64
from llamaindex_retrieval import RAGEvaluator

data = json.loads(base64.b64decode("${encodedData}").decode('utf-8'))
query = data['query']
contexts = data['contexts']

try:
    evaluator = RAGEvaluator()
    result = evaluator.evaluate_relevancy(query, contexts)
    print(json.dumps(result))
except Exception as e:
    print(json.dumps({"error": str(e)}), file=sys.stderr)
    sys.exit(1)
`;

    try {
      const output = await this.executeCommand(this.pythonPath, ['-c', pythonScript]);
      return JSON.parse(output.trim());
    } catch (error: any) {
      throw new Error(`Relevancy evaluation failed: ${error.message}`);
    }
  }

  /**
   * Evaluate answer relevancy.
   * Returns unavailable status if Python is not configured.
   */
  async evaluateAnswerRelevancy(query: string, response: string): Promise<RAGEvaluation> {
    // Graceful degradation: return unavailable evaluation if not configured
    if (!this.available) {
      return {
        score: null,
        passing: false,
        feedback: 'Evaluation unavailable - LlamaIndex Python service not configured',
        metric: 'answer_relevancy',
      };
    }

    const encodedData = this.safeEncode({ query, response });
    const pythonScript = `
import sys
import json
import base64
from llamaindex_retrieval import RAGEvaluator

data = json.loads(base64.b64decode("${encodedData}").decode('utf-8'))
query = data['query']
response = data['response']

try:
    evaluator = RAGEvaluator()
    result = evaluator.evaluate_answer_relevancy(query, response)
    print(json.dumps(result))
except Exception as e:
    print(json.dumps({"error": str(e)}), file=sys.stderr)
    sys.exit(1)
`;

    try {
      const output = await this.executeCommand(this.pythonPath, ['-c', pythonScript]);
      return JSON.parse(output.trim());
    } catch (error: any) {
      throw new Error(`Answer relevancy evaluation failed: ${error.message}`);
    }
  }

  /**
   * Full RAG pipeline evaluation.
   * Returns unavailable status if Python is not configured.
   */
  async evaluateFullRAGPipeline(
    query: string,
    response: string,
    contexts: string[]
  ): Promise<FullRAGEvaluation> {
    // Graceful degradation: return unavailable evaluation if not configured
    if (!this.available) {
      const unavailableEval: RAGEvaluation = {
        score: null,
        passing: false,
        feedback: 'Evaluation unavailable - LlamaIndex Python service not configured',
        metric: '',
      };
      return {
        query,
        response,
        num_contexts: contexts.length,
        evaluations: {
          faithfulness: { ...unavailableEval, metric: 'faithfulness' },
          relevancy: { ...unavailableEval, metric: 'relevancy' },
          answer_relevancy: { ...unavailableEval, metric: 'answer_relevancy' },
        },
        overall_score: null,
        all_passing: false,
      };
    }

    const encodedData = this.safeEncode({ query, response, contexts });
    const pythonScript = `
import sys
import json
import base64
from llamaindex_retrieval import RAGEvaluator

data = json.loads(base64.b64decode("${encodedData}").decode('utf-8'))
query = data['query']
response = data['response']
contexts = data['contexts']

try:
    evaluator = RAGEvaluator()
    result = evaluator.evaluate_full_rag_pipeline(query, response, contexts)
    print(json.dumps(result))
except Exception as e:
    print(json.dumps({"error": str(e)}), file=sys.stderr)
    sys.exit(1)
`;

    try {
      const output = await this.executeCommand(this.pythonPath, ['-c', pythonScript]);
      return JSON.parse(output.trim());
    } catch (error: any) {
      throw new Error(`Full RAG evaluation failed: ${error.message}`);
    }
  }

  /**
   * Batch evaluate multiple test cases.
   * Returns unavailable status if Python is not configured.
   */
  async batchEvaluateRAG(
    testCases: Array<{ query: string; response: string; contexts: string[] }>
  ): Promise<any> {
    // Graceful degradation: return empty results if not configured
    if (!this.available) {
      return {
        results: [],
        summary: {
          total: testCases.length,
          evaluated: 0,
          error: 'Batch evaluation unavailable - LlamaIndex Python service not configured',
        },
      };
    }

    const encodedData = this.safeEncode({ testCases });
    const pythonScript = `
import sys
import json
import base64
from llamaindex_retrieval import batch_evaluate_rag

data = json.loads(base64.b64decode("${encodedData}").decode('utf-8'))
test_cases = data['testCases']

try:
    result = batch_evaluate_rag(test_cases)
    print(json.dumps(result))
except Exception as e:
    print(json.dumps({"error": str(e)}), file=sys.stderr)
    sys.exit(1)
`;

    try {
      const output = await this.executeCommand(this.pythonPath, ['-c', pythonScript]);
      return JSON.parse(output.trim());
    } catch (error: any) {
      throw new Error(`Batch RAG evaluation failed: ${error.message}`);
    }
  }
}

// Singleton instance
let llamaIndexService: LlamaIndexService | null = null;

export function getLlamaIndexService(): LlamaIndexService {
  if (!llamaIndexService) {
    llamaIndexService = new LlamaIndexService();
  }
  return llamaIndexService;
}

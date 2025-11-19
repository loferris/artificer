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

  constructor(pythonPath: string = 'python3') {
    this.pythonPath = pythonPath;
    this.flowsPath = path.join(process.cwd(), 'python', 'flows');
    this.available = false;

    this.checkAvailability();
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
      console.warn('LlamaIndex not available:', error);
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
   */
  async rerankResults(
    searchResults: SearchResult[],
    query: string,
    config: RerankerConfig = {}
  ): Promise<SearchResult[]> {
    const pythonScript = `
import sys
import json
from llamaindex_retrieval import rerank_search_results

search_results = json.loads('''${JSON.stringify(searchResults)}''')
query = '''${query}'''
config = json.loads('''${JSON.stringify(config)}''')

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
   */
  async generateHypotheticalDocument(query: string, llmModel: string = 'gpt-4o-mini'): Promise<string> {
    const pythonScript = `
import sys
import json
from llamaindex_retrieval import hyde_generate_hypothetical_document

query = '''${query}'''
llm_model = '''${llmModel}'''

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
   */
  async generateQueryVariations(
    query: string,
    numVariations: number = 3,
    llmModel: string = 'gpt-4o-mini'
  ): Promise<string[]> {
    const pythonScript = `
import sys
import json
from llamaindex_retrieval import generate_query_variations

query = '''${query}'''
num_variations = ${numVariations}
llm_model = '''${llmModel}'''

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
   */
  async decomposeIntoSubquestions(
    query: string,
    llmModel: string = 'gpt-4o-mini'
  ): Promise<string[]> {
    const pythonScript = `
import sys
import json
from llamaindex_retrieval import decompose_into_subquestions

query = '''${query}'''
llm_model = '''${llmModel}'''

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
   */
  async evaluateFaithfulness(
    query: string,
    response: string,
    contexts: string[]
  ): Promise<RAGEvaluation> {
    const pythonScript = `
import sys
import json
from llamaindex_retrieval import RAGEvaluator

query = '''${query}'''
response = '''${response}'''
contexts = json.loads('''${JSON.stringify(contexts)}''')

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
   */
  async evaluateRelevancy(query: string, contexts: string[]): Promise<RAGEvaluation> {
    const pythonScript = `
import sys
import json
from llamaindex_retrieval import RAGEvaluator

query = '''${query}'''
contexts = json.loads('''${JSON.stringify(contexts)}''')

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
   */
  async evaluateAnswerRelevancy(query: string, response: string): Promise<RAGEvaluation> {
    const pythonScript = `
import sys
import json
from llamaindex_retrieval import RAGEvaluator

query = '''${query}'''
response = '''${response}'''

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
   */
  async evaluateFullRAGPipeline(
    query: string,
    response: string,
    contexts: string[]
  ): Promise<FullRAGEvaluation> {
    const pythonScript = `
import sys
import json
from llamaindex_retrieval import RAGEvaluator

query = '''${query}'''
response = '''${response}'''
contexts = json.loads('''${JSON.stringify(contexts)}''')

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
   */
  async batchEvaluateRAG(
    testCases: Array<{ query: string; response: string; contexts: string[] }>
  ): Promise<any> {
    const pythonScript = `
import sys
import json
from llamaindex_retrieval import batch_evaluate_rag

test_cases = json.loads('''${JSON.stringify(testCases)}''')

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

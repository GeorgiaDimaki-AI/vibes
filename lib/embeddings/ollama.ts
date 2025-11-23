/**
 * Ollama Embedding Provider
 * Uses local Ollama for zero-cost embeddings
 */

import { EmbeddingProvider, EmbeddingOptions } from './types';
import { fetchWithTimeout, retryWithBackoff, isRetryableError, parallelLimit } from '@/lib/utils/network';

export class OllamaEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'ollama';
  readonly dimensions = 768; // nomic-embed-text default

  private baseUrl: string;
  private model: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';
  }

  async generateEmbedding(text: string): Promise<number[]> {
    return retryWithBackoff(async () => {
      const response = await fetchWithTimeout(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: text.slice(0, 2000), // Truncate to reasonable length
        }),
        timeout: 30000, // 30s timeout for embeddings
      });

      if (!response.ok) {
        const error = new Error(`Ollama embedding failed: ${response.status} ${response.statusText}`);
        (error as any).response = { status: response.status };
        throw error;
      }

      const data = await response.json();

      if (!data.embedding || !Array.isArray(data.embedding)) {
        throw new Error('Invalid response from Ollama: missing or invalid embedding');
      }

      return data.embedding;
    }, {
      maxRetries: 3,
      baseDelay: 1000,
      shouldRetry: isRetryableError,
    });
  }

  async generateEmbeddings(texts: string[], options?: EmbeddingOptions): Promise<number[][]> {
    const batchSize = options?.batchSize || 10;

    // Ollama doesn't support batch embeddings natively, so we make parallel requests
    // Use parallelLimit to avoid overwhelming the local server
    const embeddings = await parallelLimit(
      texts,
      (text) => this.generateEmbedding(text),
      3 // Limit to 3 concurrent requests to local Ollama server
    );

    return embeddings;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        timeout: 5000, // 5s timeout for availability check
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();

      // Check if the embedding model is available
      const models = data.models || [];
      const hasModel = models.some((m: any) => m.name.includes(this.model.split(':')[0]));

      if (!hasModel) {
        console.warn(`Ollama embedding model '${this.model}' not found. Run: ollama pull ${this.model}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Ollama availability check failed:', error);
      return false;
    }
  }
}

/**
 * Ollama Embedding Provider
 * Uses local Ollama for zero-cost embeddings
 */

import { EmbeddingProvider, EmbeddingOptions } from './types';

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
    try {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: text.slice(0, 2000), // Truncate to reasonable length
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama embedding failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.embedding;
    } catch (error) {
      console.error('Ollama embedding generation failed:', error);
      throw error;
    }
  }

  async generateEmbeddings(texts: string[], options?: EmbeddingOptions): Promise<number[][]> {
    const batchSize = options?.batchSize || 10;
    const embeddings: number[][] = [];

    // Process in batches
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      // Ollama doesn't support batch embeddings natively, so we make parallel requests
      const batchPromises = batch.map(text => this.generateEmbedding(text));
      const batchEmbeddings = await Promise.all(batchPromises);

      embeddings.push(...batchEmbeddings);

      // Small delay to avoid overwhelming the local server
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return embeddings;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
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

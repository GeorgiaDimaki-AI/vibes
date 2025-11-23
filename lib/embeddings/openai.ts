/**
 * OpenAI Embedding Provider
 * Uses OpenAI API for high-quality embeddings (paid option)
 */

import OpenAI from 'openai';
import { EmbeddingProvider, EmbeddingOptions } from './types';

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'openai';
  readonly dimensions = 1536; // text-embedding-3-small

  private client: OpenAI;
  private model: string;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.model = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: text.slice(0, 8000), // OpenAI's token limit
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('OpenAI embedding generation failed:', error);
      throw error;
    }
  }

  async generateEmbeddings(texts: string[], options?: EmbeddingOptions): Promise<number[][]> {
    const batchSize = options?.batchSize || 10;
    const embeddings: number[][] = [];

    // Process in batches
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      try {
        const response = await this.client.embeddings.create({
          model: this.model,
          input: batch.map(text => text.slice(0, 8000)),
        });

        const batchEmbeddings = response.data.map(item => item.embedding);
        embeddings.push(...batchEmbeddings);
      } catch (error) {
        console.error('OpenAI batch embedding failed:', error);
        throw error;
      }

      // Small delay between batches to respect rate limits
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return embeddings;
  }

  async isAvailable(): Promise<boolean> {
    // Simple check - don't make actual API calls as it costs money
    return !!process.env.OPENAI_API_KEY;
  }
}

/**
 * Embedding Provider Types
 * Abstraction layer for different embedding providers
 */

export interface EmbeddingProvider {
  /** Provider name */
  name: string;

  /** Embedding dimension (e.g., 768 for nomic-embed, 1536 for OpenAI) */
  dimensions: number;

  /**
   * Generate embedding for a single text
   */
  generateEmbedding(text: string): Promise<number[]>;

  /**
   * Generate embeddings for multiple texts (batched)
   */
  generateEmbeddings(texts: string[]): Promise<number[][]>;

  /**
   * Check if this provider is available and configured
   */
  isAvailable(): Promise<boolean>;
}

export interface EmbeddingOptions {
  /** Maximum length of text to embed (truncate if longer) */
  maxLength?: number;

  /** Batch size for multiple embeddings */
  batchSize?: number;
}

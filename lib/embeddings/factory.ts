/**
 * Embedding Provider Factory
 * Automatically selects and initializes the best available embedding provider
 */

import { EmbeddingProvider } from './types';
import { OllamaEmbeddingProvider } from './ollama';
import { OpenAIEmbeddingProvider } from './openai';

let cachedProvider: EmbeddingProvider | null = null;

/**
 * Get the embedding provider based on environment configuration
 * Priority:
 * 1. EMBEDDING_PROVIDER env var (explicit choice)
 * 2. Auto-detect: Try Ollama first (free), fallback to OpenAI
 */
export async function getEmbeddingProvider(): Promise<EmbeddingProvider> {
  // Return cached provider if available
  if (cachedProvider) {
    return cachedProvider;
  }

  const explicitProvider = process.env.EMBEDDING_PROVIDER?.toLowerCase();

  // If explicitly set to ollama
  if (explicitProvider === 'ollama') {
    const ollama = new OllamaEmbeddingProvider();
    if (await ollama.isAvailable()) {
      console.log('[Embeddings] Using Ollama (local, free)');
      cachedProvider = ollama;
      return ollama;
    }
    throw new Error('Ollama embedding provider requested but not available. Run: ollama pull nomic-embed-text');
  }

  // If explicitly set to openai
  if (explicitProvider === 'openai') {
    const openai = new OpenAIEmbeddingProvider();
    if (await openai.isAvailable()) {
      console.log('[Embeddings] Using OpenAI (cloud, paid)');
      cachedProvider = openai;
      return openai;
    }
    throw new Error('OpenAI embedding provider requested but OPENAI_API_KEY not set or invalid');
  }

  // Auto-detect: Try Ollama first (free), then OpenAI
  console.log('[Embeddings] Auto-detecting provider...');

  const ollama = new OllamaEmbeddingProvider();
  if (await ollama.isAvailable()) {
    console.log('[Embeddings] Using Ollama (local, free)');
    cachedProvider = ollama;
    return ollama;
  }

  const openai = new OpenAIEmbeddingProvider();
  if (await openai.isAvailable()) {
    console.log('[Embeddings] Using OpenAI (cloud, paid)');
    cachedProvider = openai;
    return openai;
  }

  throw new Error(
    'No embedding provider available. Please either:\n' +
    '1. Install Ollama and run: ollama pull nomic-embed-text\n' +
    '2. Set OPENAI_API_KEY environment variable'
  );
}

/**
 * Clear the cached provider (useful for testing)
 */
export function clearProviderCache(): void {
  cachedProvider = null;
}

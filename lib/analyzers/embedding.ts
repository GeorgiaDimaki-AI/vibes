/**
 * Embedding Analyzer
 * Uses embeddings to cluster content and identify vibes through similarity
 */

import OpenAI from 'openai';
import { BaseAnalyzer } from './base';
import { RawContent, Vibe } from '@/lib/types';

export class EmbeddingAnalyzer extends BaseAnalyzer {
  readonly name = 'embedding';
  readonly description = 'Uses embeddings to cluster and identify vibes';

  private client: OpenAI;

  constructor() {
    super();
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async analyze(content: RawContent[]): Promise<Vibe[]> {
    if (content.length === 0) {
      return [];
    }

    try {
      // Generate embeddings for all content
      const embeddings = await this.generateEmbeddings(content);

      // Cluster similar content
      const clusters = this.clusterBySimilarity(embeddings, 0.7); // similarity threshold

      // Generate vibes from clusters
      const vibes: Vibe[] = [];
      for (const cluster of clusters) {
        const clusterContent = cluster.map(idx => content[idx]);
        const vibe = await this.generateVibeFromCluster(clusterContent, embeddings[cluster[0]].embedding);
        if (vibe) {
          vibes.push(vibe);
        }
      }

      return vibes;
    } catch (error) {
      console.error('Embedding analysis failed:', error);
      return [];
    }
  }

  private async generateEmbeddings(content: RawContent[]): Promise<Array<{ idx: number; embedding: number[] }>> {
    const texts = content.map(c => `${c.title || ''} ${c.body || ''}`.slice(0, 2000));

    const embeddings: Array<{ idx: number; embedding: number[] }> = [];

    // Batch API calls
    for (let i = 0; i < texts.length; i += 10) {
      const batch = texts.slice(i, i + 10);

      const response = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: batch,
      });

      response.data.forEach((item, batchIdx) => {
        embeddings.push({
          idx: i + batchIdx,
          embedding: item.embedding,
        });
      });
    }

    return embeddings;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private clusterBySimilarity(
    embeddings: Array<{ idx: number; embedding: number[] }>,
    threshold: number
  ): number[][] {
    const clusters: number[][] = [];
    const assigned = new Set<number>();

    for (const { idx, embedding } of embeddings) {
      if (assigned.has(idx)) continue;

      const cluster = [idx];
      assigned.add(idx);

      // Find similar items
      for (const other of embeddings) {
        if (assigned.has(other.idx)) continue;

        const similarity = this.cosineSimilarity(embedding, other.embedding);
        if (similarity >= threshold) {
          cluster.push(other.idx);
          assigned.add(other.idx);
        }
      }

      if (cluster.length >= 2) {
        clusters.push(cluster);
      }
    }

    return clusters;
  }

  private async generateVibeFromCluster(content: RawContent[], embedding: number[]): Promise<Vibe | null> {
    if (content.length === 0) return null;

    // Extract common keywords
    const allText = content.map(c => `${c.title || ''} ${c.body || ''}`).join(' ');
    const words = allText.toLowerCase().match(/\b\w{4,}\b/g) || [];
    const wordFreq = new Map<string, number>();

    for (const word of words) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }

    const topKeywords = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    // Generate vibe name from top keywords
    const vibeName = topKeywords.slice(0, 3).map(w =>
      w.charAt(0).toUpperCase() + w.slice(1)
    ).join(' ');

    return this.createVibe({
      name: vibeName || 'Unnamed Cluster',
      description: `Emerging topic cluster from ${content.length} related pieces of content`,
      category: 'topic',
      keywords: topKeywords,
      strength: Math.min(content.length / 10, 1),
      sentiment: 'neutral',
      sources: content.map(c => c.url || c.id).filter(Boolean),
      embedding,
    });
  }
}

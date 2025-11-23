/**
 * Embedding Analyzer
 * Uses embeddings to cluster content and identify vibes through similarity
 */

import { BaseAnalyzer } from './base';
import { RawContent, Vibe } from '@/lib/types';
import { getEmbeddingProvider } from '@/lib/embeddings';

export class EmbeddingAnalyzer extends BaseAnalyzer {
  readonly name = 'embedding';
  readonly description = 'Uses embeddings to cluster and identify vibes';

  async analyze(content: RawContent[]): Promise<Vibe[]> {
    if (content.length === 0) {
      return [];
    }

    try {
      // Generate embeddings for all content
      const embeddings = await this.generateEmbeddings(content);

      // Cluster similar content
      // Reduced threshold from 0.7 to 0.6 to avoid over-restrictive clustering
      const clusters = this.clusterBySimilarity(embeddings, 0.6);

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

    const embeddingProvider = await getEmbeddingProvider();
    const rawEmbeddings = await embeddingProvider.generateEmbeddings(texts, { batchSize: 10 });

    return rawEmbeddings.map((embedding, idx) => ({
      idx,
      embedding,
    }));
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    // Validate dimensional compatibility
    if (!a || !b || a.length !== b.length) {
      console.warn(`[EmbeddingAnalyzer] Dimension mismatch: ${a?.length} vs ${b?.length}`);
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;

    return dotProduct / denominator;
  }

  private clusterBySimilarity(
    embeddings: Array<{ idx: number; embedding: number[] }>,
    threshold: number
  ): number[][] {
    const clusters: number[][] = [];
    const assigned = new Set<number>();

    // Sort for determinism to reduce order-dependence
    const sorted = [...embeddings].sort((a, b) => {
      const meanA = a.embedding.reduce((s, v) => s + v, 0) / a.embedding.length;
      const meanB = b.embedding.reduce((s, v) => s + v, 0) / b.embedding.length;
      return meanB - meanA;
    });

    for (const { idx, embedding } of sorted) {
      if (assigned.has(idx)) continue;

      const cluster = [idx];
      assigned.add(idx);

      // Find similar items
      for (const other of sorted) {
        if (assigned.has(other.idx)) continue;

        const similarity = this.cosineSimilarity(embedding, other.embedding);
        if (similarity >= threshold) {
          cluster.push(other.idx);
          assigned.add(other.idx);
        }
      }

      // FIX: Include ALL clusters, even singletons
      // This prevents data loss of unique/emerging trends
      clusters.push(cluster);
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

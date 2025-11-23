/**
 * Zeitgeist Service
 * Main orchestration layer that ties everything together
 *
 * Updated: Now uses dependency injection for better testability and flexibility
 */

import { CollectorRegistry } from './collectors/base';
import { AnalyzerRegistry } from './analyzers/base';
import { MatcherRegistry } from './matchers/base';
import { GraphStore } from './graph/store';
import { Scenario, Advice, Vibe, CollectorOptions } from './types';
import { getLLM } from './llm';
import { getEmbeddingProvider } from './embeddings';
import {
  applyDecayToVibes,
  filterDecayedVibes,
  getTemporalStats,
  sortByRelevance,
} from './temporal-decay';

/**
 * Configuration for creating a ZeitgeistService instance
 */
export interface ZeitgeistServiceConfig {
  store?: GraphStore;
  collectors?: CollectorRegistry;
  analyzers?: AnalyzerRegistry;
  matchers?: MatcherRegistry;
}

export class ZeitgeistService {
  private initialized = false;
  private store: GraphStore;
  private collectors: CollectorRegistry;
  private analyzers: AnalyzerRegistry;
  private matchers: MatcherRegistry;

  /**
   * Create a new ZeitgeistService with dependency injection
   * @param config Optional configuration with injected dependencies
   */
  constructor(config?: ZeitgeistServiceConfig) {
    // Use provided dependencies or fall back to defaults
    this.store = config?.store || this.getDefaultStore();
    this.collectors = config?.collectors || this.getDefaultCollectors();
    this.analyzers = config?.analyzers || this.getDefaultAnalyzers();
    this.matchers = config?.matchers || this.getDefaultMatchers();
  }

  private getDefaultStore(): GraphStore {
    const { getGraphStore } = require('./graph');
    return getGraphStore();
  }

  private getDefaultCollectors(): CollectorRegistry {
    const { collectorRegistry, initializeCollectors } = require('./collectors');
    initializeCollectors();
    return collectorRegistry;
  }

  private getDefaultAnalyzers(): AnalyzerRegistry {
    const { analyzerRegistry, initializeAnalyzers } = require('./analyzers');
    initializeAnalyzers();
    return analyzerRegistry;
  }

  private getDefaultMatchers(): MatcherRegistry {
    const { matcherRegistry, initializeMatchers } = require('./matchers');
    initializeMatchers();
    return matcherRegistry;
  }

  async initialize() {
    if (this.initialized) return;

    // Initialize database if using Postgres
    if ('initialize' in this.store) {
      await (this.store as any).initialize();
    }

    this.initialized = true;
  }

  /**
   * Collect new data and update the cultural graph
   */
  async updateGraph(options?: CollectorOptions): Promise<{ vibesAdded: number }> {
    await this.initialize();

    // Collect raw content
    console.log('Collecting content...');
    const rawContent = await this.collectors.collectAll(options);
    console.log(`Collected ${rawContent.length} pieces of content`);

    if (rawContent.length === 0) {
      return { vibesAdded: 0 };
    }

    // Analyze content to extract vibes
    console.log('Analyzing content...');
    const newVibes = await this.analyzers.analyzeWithPrimary(rawContent);
    console.log(`Extracted ${newVibes.length} vibes`);

    // Generate embeddings for vibes that don't have them
    const vibesWithEmbeddings = await this.ensureEmbeddings(newVibes);

    // Get existing vibes and merge
    const existingVibes = await this.store.getAllVibes();
    const analyzer = this.analyzers.getPrimary();
    const mergedVibes = analyzer
      ? await analyzer.update(existingVibes, rawContent)
      : vibesWithEmbeddings;

    // Apply decay and filter out highly decayed vibes (below 5% relevance)
    console.log('Applying temporal decay...');
    const vibesWithDecay = applyDecayToVibes(mergedVibes);
    const activeVibes = filterDecayedVibes(vibesWithDecay, 0.05);
    console.log(`Filtered ${mergedVibes.length - activeVibes.length} decayed vibes`);

    // Save to store
    await this.store.saveVibes(activeVibes);

    return { vibesAdded: newVibes.length };
  }

  /**
   * Get advice for a scenario
   */
  async getAdvice(scenario: Scenario): Promise<Advice> {
    await this.initialize();

    // Get the cultural graph
    const graph = await this.store.getGraph();

    // Match scenario to relevant vibes
    console.log('Matching scenario to vibes...');
    const matches = await this.matchers.matchWithDefault(scenario, graph);
    console.log(`Found ${matches.length} relevant vibes`);

    // Generate advice using LLM
    console.log('Generating advice...');
    const advice = await this.generateAdvice(scenario, matches);

    return advice;
  }

  /**
   * Get current state of the cultural graph
   */
  async getGraphStatus() {
    await this.initialize();

    const graph = await this.store.getGraph();
    const vibes = Array.from(graph.vibes.values());

    // Get statistics
    const categories = new Map<string, number>();
    const domains = new Map<string, number>();

    for (const vibe of vibes) {
      categories.set(vibe.category, (categories.get(vibe.category) || 0) + 1);
      for (const domain of vibe.domains || []) {
        domains.set(domain, (domains.get(domain) || 0) + 1);
      }
    }

    // Get temporal stats
    const temporalStats = getTemporalStats(vibes);

    // Get most relevant vibes (sorted by current relevance)
    const topVibes = sortByRelevance(vibes).slice(0, 10);

    return {
      totalVibes: vibes.length,
      totalEdges: graph.edges.length,
      lastUpdated: graph.metadata.lastUpdated,
      categories: Object.fromEntries(categories),
      domains: Object.fromEntries(domains),
      temporal: temporalStats,
      topVibes: topVibes.map(v => ({
        name: v.name,
        category: v.category,
        strength: v.strength,
        currentRelevance: v.currentRelevance,
        daysSinceLastSeen: Math.floor((new Date().getTime() - v.lastSeen.getTime()) / (1000 * 60 * 60 * 24)),
        timestamp: v.timestamp,
      })),
    };
  }

  /**
   * Search vibes
   */
  async searchVibes(query: string, limit = 20): Promise<Vibe[]> {
    await this.initialize();

    // Generate embedding for query using configured provider
    const embeddingProvider = await getEmbeddingProvider();
    const embedding = await embeddingProvider.generateEmbedding(query);

    // Search by embedding
    return this.store.findVibesByEmbedding(embedding, limit);
  }

  /**
   * Ensure all vibes have embeddings
   */
  private async ensureEmbeddings(vibes: Vibe[]): Promise<Vibe[]> {
    const vibesNeedingEmbeddings = vibes.filter(v => !v.embedding);

    if (vibesNeedingEmbeddings.length === 0) return vibes;

    try {
      const embeddingProvider = await getEmbeddingProvider();
      console.log(`[${embeddingProvider.name}] Generating embeddings for ${vibesNeedingEmbeddings.length} vibes...`);

      // Generate texts for embedding
      const texts = vibesNeedingEmbeddings.map(v =>
        `${v.name}: ${v.description}. Keywords: ${v.keywords.join(', ')}`
      );

      // Generate embeddings in batches
      const embeddings = await embeddingProvider.generateEmbeddings(texts, { batchSize: 10 });

      // Assign embeddings to vibes
      embeddings.forEach((embedding, idx) => {
        vibesNeedingEmbeddings[idx].embedding = embedding;
      });

      console.log(`[${embeddingProvider.name}] Successfully generated ${embeddings.length} embeddings`);
    } catch (error) {
      console.error('Failed to generate embeddings:', error);
      console.warn('Continuing without embeddings - some features may be limited');
    }

    return vibes;
  }

  /**
   * Generate advice from matched vibes using local LLM
   */
  private async generateAdvice(scenario: Scenario, matches: any[]): Promise<Advice> {
    const prompt = `You are a cultural advisor helping someone navigate a social situation.

SCENARIO:
${scenario.description}
${scenario.context ? `\nContext: ${JSON.stringify(scenario.context, null, 2)}` : ''}
${scenario.preferences ? `\nPreferences: ${JSON.stringify(scenario.preferences, null, 2)}` : ''}

RELEVANT CULTURAL VIBES:
${matches.map((m, i) => `${i + 1}. ${m.vibe.name} (${m.vibe.category})
   ${m.vibe.description}
   Keywords: ${m.vibe.keywords.join(', ')}
   Current Relevance: ${(m.vibe.currentRelevance * 100).toFixed(0)}%
   ${m.reasoning}`).join('\n\n')}

Based on these vibes, provide specific, actionable advice:

1. TOPICS TO DISCUSS (3-5 topics with talking points)
2. BEHAVIOR RECOMMENDATIONS (how to act, conversation style, energy level)
3. STYLE RECOMMENDATIONS (clothing, accessories, overall aesthetic)

Return ONLY valid JSON in this format:
{
  "topics": [
    {
      "topic": "Topic name",
      "talking_points": ["point 1", "point 2"],
      "relevantVibes": ["vibe-id"],
      "priority": "high"
    }
  ],
  "behavior": [
    {
      "aspect": "conversation style",
      "suggestion": "Be conversational and curious...",
      "reasoning": "Given the vibes..."
    }
  ],
  "style": [
    {
      "category": "clothing",
      "suggestions": ["suggestion 1", "suggestion 2"],
      "reasoning": "To fit the aesthetic..."
    }
  ],
  "reasoning": "Overall reasoning for these recommendations",
  "confidence": 0.85
}

Be specific and practical. Reference the vibes to justify your suggestions.`;

    const llm = await getLLM();
    const response = await llm.complete([
      { role: 'user', content: prompt }
    ], {
      maxTokens: 3000,
      temperature: 0.7,
    });

    let adviceData: any = {};
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        adviceData = JSON.parse(jsonMatch[0]);
      } else {
        console.warn('No JSON found in LLM response for advice generation');
      }
    } catch (error) {
      console.error('Failed to parse advice JSON:', error);
      console.error('Response content:', response.content);
    }

    return {
      scenario,
      matchedVibes: matches,
      recommendations: {
        topics: adviceData.topics || [],
        behavior: adviceData.behavior || [],
        style: adviceData.style || [],
      },
      reasoning: adviceData.reasoning || 'Unable to generate reasoning',
      confidence: adviceData.confidence || 0.5,
      timestamp: new Date(),
    };
  }
}

/**
 * Factory function to create a configured ZeitgeistService instance
 * @param config Optional configuration with custom dependencies
 * @returns A new ZeitgeistService instance
 */
export function createZeitgeistService(config?: ZeitgeistServiceConfig): ZeitgeistService {
  return new ZeitgeistService(config);
}

/**
 * Default global service instance for convenience
 * Uses default configurations and auto-initialized registries
 *
 * For testing or custom configurations, use createZeitgeistService() instead:
 * ```typescript
 * const service = createZeitgeistService({
 *   store: mockStore,
 *   collectors: testCollectors
 * });
 * ```
 */
export const zeitgeist = new ZeitgeistService();

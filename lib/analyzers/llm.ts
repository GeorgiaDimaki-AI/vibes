/**
 * LLM Analyzer
 * Uses Claude to extract vibes from raw content
 */

import Anthropic from '@anthropic-ai/sdk';
import { BaseAnalyzer } from './base';
import { RawContent, Vibe, VibeCategory, Sentiment } from '@/lib/types';

interface ExtractedVibe {
  name: string;
  description: string;
  category: VibeCategory;
  keywords: string[];
  strength: number;
  sentiment: Sentiment;
  demographics?: string[];
  locations?: string[];
  domains?: string[];
}

export class LLMAnalyzer extends BaseAnalyzer {
  readonly name = 'llm';
  readonly description = 'Uses Claude to extract cultural vibes from content';

  private client: Anthropic;

  constructor() {
    super();
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async analyze(content: RawContent[]): Promise<Vibe[]> {
    if (content.length === 0) {
      return [];
    }

    try {
      // Batch content for efficiency
      const batches = this.batchContent(content, 10);
      const allVibes: Vibe[] = [];

      for (const batch of batches) {
        const vibes = await this.analyzeBatch(batch);
        allVibes.push(...vibes);
      }

      // Deduplicate and merge similar vibes
      return this.deduplicateVibes(allVibes);
    } catch (error) {
      console.error('LLM analysis failed:', error);
      return [];
    }
  }

  private async analyzeBatch(content: RawContent[]): Promise<Vibe[]> {
    const contentSummary = content.map((c, idx) =>
      `[${idx + 1}] ${c.title || 'Untitled'}\n${c.body?.slice(0, 300) || ''}...\nSource: ${c.source}\nURL: ${c.url || 'N/A'}`
    ).join('\n\n---\n\n');

    const prompt = `You are a cultural analyst identifying emerging trends, vibes, and cultural moments from various content sources.

Analyze the following content and extract distinct cultural "vibes" - these could be trends, aesthetics, topics, sentiments, or movements that are relevant for understanding the current cultural zeitgeist.

Content:
${contentSummary}

For each vibe you identify, provide:
1. name: A catchy, descriptive name (2-5 words)
2. description: What this vibe represents (1-2 sentences)
3. category: One of: trend, topic, aesthetic, sentiment, event, movement, meme
4. keywords: 5-10 relevant keywords or phrases
5. strength: How prevalent/strong this vibe is (0.0-1.0)
6. sentiment: positive, negative, neutral, or mixed
7. demographics: Who is this relevant to? (optional)
8. locations: Geographic relevance (optional)
9. domains: Categories like fashion, tech, politics, music, etc.

Return ONLY a valid JSON array of vibes. Example:
[
  {
    "name": "AI Acceleration Anxiety",
    "description": "Growing concern about rapid AI advancement and its societal impact",
    "category": "sentiment",
    "keywords": ["AI", "artificial intelligence", "automation", "job displacement", "ethics"],
    "strength": 0.8,
    "sentiment": "mixed",
    "demographics": ["tech workers", "knowledge workers"],
    "domains": ["tech", "politics", "economy"]
  }
]

Important: Be specific and insightful. Look for underlying patterns, not just surface-level topics. Identify 3-7 vibes.`;

    const message = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Extract JSON from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('No valid JSON found in LLM response');
      return [];
    }

    const extractedVibes: ExtractedVibe[] = JSON.parse(jsonMatch[0]);

    return extractedVibes.map(ev => this.createVibe({
      ...ev,
      sources: content.map(c => c.url || c.id).filter(Boolean),
    }));
  }

  private batchContent(content: RawContent[], batchSize: number): RawContent[][] {
    const batches: RawContent[][] = [];
    for (let i = 0; i < content.length; i += batchSize) {
      batches.push(content.slice(i, i + batchSize));
    }
    return batches;
  }

  private deduplicateVibes(vibes: Vibe[]): Vibe[] {
    const vibeMap = new Map<string, Vibe>();

    for (const vibe of vibes) {
      const key = vibe.name.toLowerCase();
      const existing = vibeMap.get(key);

      if (existing) {
        // Merge vibes with same name
        vibeMap.set(key, {
          ...existing,
          strength: Math.max(existing.strength, vibe.strength),
          keywords: Array.from(new Set([...existing.keywords, ...vibe.keywords])),
          sources: Array.from(new Set([...existing.sources, ...vibe.sources])),
          domains: Array.from(new Set([
            ...(existing.domains || []),
            ...(vibe.domains || [])
          ])),
        });
      } else {
        vibeMap.set(key, vibe);
      }
    }

    return Array.from(vibeMap.values());
  }
}

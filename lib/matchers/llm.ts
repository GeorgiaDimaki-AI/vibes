/**
 * LLM Matcher
 * Uses local LLM to reason about which vibes are relevant for a scenario
 */

import { BaseMatcher } from './base';
import { Scenario, CulturalGraph, VibeMatch, Vibe } from '@/lib/types';
import { getLLM } from '@/lib/llm';
import { applyDecayToVibes, sortByRelevance } from '@/lib/temporal-decay';

interface LLMMatch {
  vibeId: string;
  relevanceScore: number;
  reasoning: string;
}

export class LLMMatcher extends BaseMatcher {
  readonly name = 'llm';
  readonly description = 'Uses local LLM to reason about scenario-vibe relevance';

  async match(scenario: Scenario, graph: CulturalGraph): Promise<VibeMatch[]> {
    try {
      // Apply decay to get current relevance scores
      const vibes = Array.from(graph.vibes.values());
      const vibesWithDecay = applyDecayToVibes(vibes);

      // Filter to only highly relevant vibes to reduce prompt size
      const relevantVibes = sortByRelevance(vibesWithDecay)
        .filter(v => v.currentRelevance > 0.1)
        .slice(0, 50); // Limit to top 50 to avoid token limits

      // Prepare vibes data for LLM
      const vibesData = relevantVibes.map(v => ({
        id: v.id,
        name: v.name,
        description: v.description,
        category: v.category,
        keywords: v.keywords,
        currentRelevance: v.currentRelevance,
        sentiment: v.sentiment,
        domains: v.domains,
      }));

      const prompt = this.buildPrompt(scenario, vibesData);

      const llm = await getLLM();
      const response = await llm.complete([
        { role: 'user', content: prompt }
      ], {
        maxTokens: 2000,
        temperature: 0.7,
      });

      // Extract JSON from response
      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn('No valid JSON found in LLM response');
        return [];
      }

      const matches: LLMMatch[] = JSON.parse(jsonMatch[0]);

      // Map back to full vibes
      return matches
        .map(m => {
          const vibe = graph.vibes.get(m.vibeId);
          if (!vibe) return null;

          return {
            vibe,
            relevanceScore: m.relevanceScore,
            reasoning: m.reasoning,
          } as VibeMatch;
        })
        .filter((m): m is VibeMatch => m !== null);
    } catch (error) {
      console.error('LLM matching failed:', error);
      return [];
    }
  }

  private buildPrompt(scenario: Scenario, vibes: any[]): string {
    return `You are a cultural advisor helping someone navigate a social situation by identifying relevant cultural trends and vibes.

SCENARIO:
${scenario.description}

${scenario.context ? `Context: ${JSON.stringify(scenario.context, null, 2)}` : ''}
${scenario.preferences ? `Preferences: ${JSON.stringify(scenario.preferences, null, 2)}` : ''}

AVAILABLE VIBES:
${JSON.stringify(vibes, null, 2)}

Your task: Identify which vibes are most relevant for this scenario. Consider:
- What topics/trends would resonate with the people in this scenario?
- What cultural knowledge would be useful?
- What aesthetics or styles would fit?
- What sentiments or attitudes are appropriate?

Return ONLY a JSON array of matches, ranked by relevance. Include 5-15 vibes.

Format:
[
  {
    "vibeId": "vibe-id-here",
    "relevanceScore": 0.95,
    "reasoning": "Why this vibe is relevant for this specific scenario"
  }
]

Be specific in your reasoning - explain WHY each vibe matters for THIS scenario.`;
  }
}

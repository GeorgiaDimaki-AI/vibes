/**
 * LLM Matcher
 * Uses Claude to reason about which vibes are relevant for a scenario
 */

import Anthropic from '@anthropic-ai/sdk';
import { BaseMatcher } from './base';
import { Scenario, CulturalGraph, VibeMatch, Vibe } from '@/lib/types';

interface LLMMatch {
  vibeId: string;
  relevanceScore: number;
  reasoning: string;
}

export class LLMMatcher extends BaseMatcher {
  readonly name = 'llm';
  readonly description = 'Uses Claude to reason about scenario-vibe relevance';

  private client: Anthropic;

  constructor() {
    super();
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async match(scenario: Scenario, graph: CulturalGraph): Promise<VibeMatch[]> {
    try {
      // Prepare vibes data for LLM
      const vibesData = Array.from(graph.vibes.values()).map(v => ({
        id: v.id,
        name: v.name,
        description: v.description,
        category: v.category,
        keywords: v.keywords,
        strength: v.strength,
        sentiment: v.sentiment,
        domains: v.domains,
      }));

      const prompt = this.buildPrompt(scenario, vibesData);

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

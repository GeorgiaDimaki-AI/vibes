import { describe, it, expect } from 'vitest';
import {
  calculateInterestMatch,
  isTopicAvoided,
  getRegionalRelevance,
  getConversationStyleInstruction,
  meetsRegionalThreshold,
  calculatePersonalizationScore,
} from '../personalization-utils';
import { createMockVibe } from '../../__fixtures__/vibes';
import { UserProfile, Region } from '../../types';

describe('Personalization Utils', () => {
  describe('calculateInterestMatch', () => {
    it('should return 1.0 for perfect match', () => {
      const vibe = createMockVibe({
        name: 'AI Revolution',
        description: 'Artificial intelligence trends',
        keywords: ['AI', 'technology', 'machine learning'],
      });

      const interests = ['AI', 'technology'];
      const score = calculateInterestMatch(vibe, interests);

      expect(score).toBe(1.0); // Both interests matched
    });

    it('should return 0.5 for partial match', () => {
      const vibe = createMockVibe({
        name: 'AI Revolution',
        description: 'Artificial intelligence trends',
        keywords: ['AI', 'machine learning'],
      });

      const interests = ['AI', 'blockchain'];
      const score = calculateInterestMatch(vibe, interests);

      expect(score).toBe(0.5); // 1 out of 2 interests matched
    });

    it('should return 0 for no match', () => {
      const vibe = createMockVibe({
        name: 'Fashion Week',
        description: 'Fashion trends',
        keywords: ['fashion', 'style'],
      });

      const interests = ['technology', 'gaming'];
      const score = calculateInterestMatch(vibe, interests);

      expect(score).toBe(0);
    });

    it('should return 0 for empty interests', () => {
      const vibe = createMockVibe({
        name: 'Test',
        keywords: ['test'],
      });

      const score = calculateInterestMatch(vibe, []);

      expect(score).toBe(0);
    });

    it('should be case-insensitive', () => {
      const vibe = createMockVibe({
        name: 'AI Revolution',
        keywords: ['AI', 'Technology'],
      });

      const interests = ['ai', 'technology'];
      const score = calculateInterestMatch(vibe, interests);

      expect(score).toBe(1.0);
    });
  });

  describe('isTopicAvoided', () => {
    it('should return true when topic matches keywords', () => {
      const vibe = createMockVibe({
        name: 'Election Results',
        keywords: ['politics', 'election', 'voting'],
      });

      const avoidTopics = ['politics'];
      const isAvoided = isTopicAvoided(vibe, avoidTopics);

      expect(isAvoided).toBe(true);
    });

    it('should return true when topic matches description', () => {
      const vibe = createMockVibe({
        name: 'Political Campaign',
        description: 'Politics and election coverage',
        keywords: ['campaign'],
      });

      const avoidTopics = ['politics'];
      const isAvoided = isTopicAvoided(vibe, avoidTopics);

      expect(isAvoided).toBe(true);
    });

    it('should return true when topic matches domain', () => {
      const vibe = createMockVibe({
        name: 'Test Vibe',
        keywords: ['test'],
        domains: ['politics', 'news'],
      });

      const avoidTopics = ['politics'];
      const isAvoided = isTopicAvoided(vibe, avoidTopics);

      expect(isAvoided).toBe(true);
    });

    it('should return false when no match', () => {
      const vibe = createMockVibe({
        name: 'Tech Innovation',
        keywords: ['technology', 'innovation'],
        domains: ['tech'],
      });

      const avoidTopics = ['politics', 'sports'];
      const isAvoided = isTopicAvoided(vibe, avoidTopics);

      expect(isAvoided).toBe(false);
    });

    it('should return false for empty avoid topics', () => {
      const vibe = createMockVibe({
        name: 'Test',
        keywords: ['politics'],
      });

      const isAvoided = isTopicAvoided(vibe, []);

      expect(isAvoided).toBe(false);
    });

    it('should be case-insensitive', () => {
      const vibe = createMockVibe({
        name: 'Politics News',
        keywords: ['POLITICS'],
      });

      const avoidTopics = ['politics'];
      const isAvoided = isTopicAvoided(vibe, avoidTopics);

      expect(isAvoided).toBe(true);
    });
  });

  describe('getRegionalRelevance', () => {
    it('should return 1.0 for global vibes', () => {
      const vibe = createMockVibe({
        geography: {
          primary: 'Global',
          relevance: {},
          detectedFrom: [],
        },
      });

      const relevance = getRegionalRelevance(vibe, 'US-West');

      expect(relevance).toBe(1.0);
    });

    it('should return specific relevance score when defined', () => {
      const vibe = createMockVibe({
        geography: {
          primary: 'US-West',
          relevance: {
            'US-West': 1.0,
            'US-East': 0.7,
            'EU-UK': 0.3,
          },
          detectedFrom: [],
        },
      });

      expect(getRegionalRelevance(vibe, 'US-West')).toBe(1.0);
      expect(getRegionalRelevance(vibe, 'US-East')).toBe(0.7);
      expect(getRegionalRelevance(vibe, 'EU-UK')).toBe(0.3);
    });

    it('should return 1.0 when region matches primary', () => {
      const vibe = createMockVibe({
        geography: {
          primary: 'US-West',
          relevance: {},
          detectedFrom: [],
        },
      });

      const relevance = getRegionalRelevance(vibe, 'US-West');

      expect(relevance).toBe(1.0);
    });

    it('should return 0.3 for non-matching regions without specific score', () => {
      const vibe = createMockVibe({
        geography: {
          primary: 'US-West',
          relevance: {},
          detectedFrom: [],
        },
      });

      const relevance = getRegionalRelevance(vibe, 'EU-UK');

      expect(relevance).toBe(0.3);
    });

    it('should return 1.0 when no geography metadata', () => {
      const vibe = createMockVibe({
        geography: undefined,
      });

      const relevance = getRegionalRelevance(vibe, 'US-West');

      expect(relevance).toBe(1.0);
    });
  });

  describe('getConversationStyleInstruction', () => {
    it('should return casual style instruction', () => {
      const instruction = getConversationStyleInstruction('casual');

      expect(instruction).toContain('casual');
      expect(instruction).toContain('friendly');
    });

    it('should return professional style instruction', () => {
      const instruction = getConversationStyleInstruction('professional');

      expect(instruction).toContain('professional');
      expect(instruction).toContain('polished');
    });

    it('should return academic style instruction', () => {
      const instruction = getConversationStyleInstruction('academic');

      expect(instruction).toContain('analytical');
      expect(instruction).toContain('thoughtful');
    });

    it('should return friendly style instruction', () => {
      const instruction = getConversationStyleInstruction('friendly');

      expect(instruction).toContain('warm');
      expect(instruction).toContain('encouraging');
    });

    it('should default to casual for unknown style', () => {
      const instruction = getConversationStyleInstruction('unknown');

      expect(instruction).toContain('casual');
    });
  });

  describe('meetsRegionalThreshold', () => {
    it('should return true when above threshold', () => {
      const vibe = createMockVibe({
        geography: {
          primary: 'US-West',
          relevance: { 'US-East': 0.5 },
          detectedFrom: [],
        },
      });

      const meets = meetsRegionalThreshold(vibe, 'US-East', 0.2);

      expect(meets).toBe(true);
    });

    it('should return false when below threshold', () => {
      const vibe = createMockVibe({
        geography: {
          primary: 'US-West',
          relevance: { 'EU-UK': 0.1 },
          detectedFrom: [],
        },
      });

      const meets = meetsRegionalThreshold(vibe, 'EU-UK', 0.2);

      expect(meets).toBe(false);
    });

    it('should use default threshold of 0.2', () => {
      const vibe = createMockVibe({
        geography: {
          primary: 'US-West',
          relevance: { 'US-East': 0.25 },
          detectedFrom: [],
        },
      });

      const meets = meetsRegionalThreshold(vibe, 'US-East');

      expect(meets).toBe(true);
    });
  });

  describe('calculatePersonalizationScore', () => {
    let userProfile: UserProfile;

    beforeEach(() => {
      userProfile = {
        id: 'user-123',
        email: 'test@example.com',
        tier: 'regular',
        queriesThisMonth: 10,
        queryLimit: 100,
        region: 'US-West' as Region,
        interests: ['technology', 'AI'],
        avoidTopics: ['politics'],
        conversationStyle: 'casual',
        emailNotifications: true,
        shareDataForResearch: false,
        createdAt: new Date(),
        lastActive: new Date(),
        onboardingCompleted: true,
      };
    });

    it('should return 0 for avoided topics', () => {
      const vibe = createMockVibe({
        name: 'Politics',
        keywords: ['politics', 'election'],
      });

      const score = calculatePersonalizationScore(vibe, userProfile);

      expect(score).toBe(0);
    });

    it('should boost score for matching interests', () => {
      const vibe = createMockVibe({
        name: 'AI Revolution',
        keywords: ['AI', 'technology'],
      });

      const score = calculatePersonalizationScore(vibe, userProfile);

      expect(score).toBeGreaterThan(1.0);
    });

    it('should apply regional multiplier', () => {
      const vibe = createMockVibe({
        name: 'Tech Innovation',
        keywords: ['technology'],
        geography: {
          primary: 'US-West',
          relevance: { 'US-West': 1.0 },
          detectedFrom: [],
        },
      });

      const score = calculatePersonalizationScore(vibe, userProfile);

      expect(score).toBeGreaterThan(0);
    });

    it('should combine regional and interest factors', () => {
      const vibe = createMockVibe({
        name: 'AI in Silicon Valley',
        keywords: ['AI', 'technology'],
        geography: {
          primary: 'US-West',
          relevance: { 'US-West': 1.0 },
          detectedFrom: [],
        },
      });

      const score = calculatePersonalizationScore(vibe, userProfile);

      // Should have both regional (1.0) and interest boost
      expect(score).toBeGreaterThan(1.0);
    });

    it('should handle vibes without geography', () => {
      const vibe = createMockVibe({
        name: 'Tech Trends',
        keywords: ['technology'],
        geography: undefined,
      });

      const score = calculatePersonalizationScore(vibe, userProfile);

      // Should still apply interest boost
      expect(score).toBeGreaterThan(0);
    });
  });
});

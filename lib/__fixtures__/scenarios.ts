import { Scenario, Advice, VibeMatch } from '../types';
import { mockVibes } from './vibes';

/**
 * Test fixtures for Scenarios
 */

export const mockScenario: Scenario = {
  description: 'Dinner with tech friends at a trendy restaurant',
  context: {
    location: 'San Francisco',
    timeOfDay: 'evening',
    peopleTypes: ['tech workers', 'engineers', 'designers'],
    formality: 'casual',
    duration: '2 hours',
  },
  preferences: {
    conversationStyle: 'casual but informed',
    topics: ['technology', 'startups', 'culture'],
    avoid: ['politics', 'controversial topics'],
  },
};

export const mockBusinessScenario: Scenario = {
  description: 'Business lunch with potential investors',
  context: {
    location: 'New York',
    timeOfDay: 'afternoon',
    peopleTypes: ['investors', 'executives'],
    formality: 'business-casual',
    duration: '1 hour',
  },
  preferences: {
    conversationStyle: 'professional',
    topics: ['business', 'technology', 'market trends'],
    avoid: ['personal topics'],
  },
};

export const mockCasualScenario: Scenario = {
  description: 'Weekend hangout with friends',
  context: {
    location: 'Los Angeles',
    timeOfDay: 'afternoon',
    peopleTypes: ['friends', 'creatives'],
    formality: 'casual',
  },
  preferences: {
    conversationStyle: 'relaxed',
    topics: ['entertainment', 'pop culture'],
  },
};

export const mockVibeMatch: VibeMatch = {
  vibe: mockVibes[0],
  relevanceScore: 0.85,
  reasoning: 'This vibe matches your scenario because...',
};

export const mockAdvice: Advice = {
  scenario: mockScenario,
  matchedVibes: [mockVibeMatch],
  recommendations: {
    topics: [
      {
        topic: 'AI Productivity Tools',
        talking_points: [
          'Recent advances in AI assistants',
          'How AI is changing workflows',
        ],
        relevantVibes: ['vibe-1'],
        priority: 'high',
      },
    ],
    behavior: [
      {
        aspect: 'conversation style',
        suggestion: 'Keep it casual but informed',
        reasoning: 'Your friends appreciate knowledgeable conversation without formality',
      },
    ],
    style: [
      {
        category: 'overall',
        suggestions: ['Smart casual', 'Tech casual'],
        reasoning: 'Matches the setting and crowd',
      },
    ],
  },
  reasoning: 'Based on current trends in your social circle...',
  confidence: 0.8,
  timestamp: new Date('2025-11-23T12:00:00Z'),
};

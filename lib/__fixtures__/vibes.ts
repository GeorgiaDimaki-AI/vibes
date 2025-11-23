import { Vibe, VibeCategory, Sentiment } from '../types';

/**
 * Test fixtures for Vibes
 */

export const createMockVibe = (overrides?: Partial<Vibe>): Vibe => {
  const now = new Date('2025-11-23T12:00:00Z');

  return {
    id: 'vibe-1',
    name: 'AI Productivity Tools',
    description: 'Tools using AI for productivity',
    category: 'trend',
    keywords: ['ai', 'productivity', 'tools', 'automation'],
    embedding: Array(1536).fill(0).map((_, i) => Math.sin(i * 0.1)),
    strength: 0.8,
    sentiment: 'positive',
    timestamp: now,
    sources: ['https://techcrunch.com/article-1'],
    firstSeen: new Date('2025-11-20T10:00:00Z'),
    lastSeen: new Date('2025-11-23T10:00:00Z'),
    currentRelevance: 0.8,
    halfLife: 14,
    relatedVibes: [],
    demographics: ['tech workers', 'professionals'],
    domains: ['tech', 'business'],
    geography: {
      primary: 'US-West',
      relevance: {
        'US-West': 0.9,
        'US-East': 0.6,
        'Global': 0.5,
      },
      detectedFrom: ['https://techcrunch.com/article-1'],
    },
    metadata: {},
    ...overrides,
  };
};

export const mockVibes: Vibe[] = [
  createMockVibe({
    id: 'vibe-meme-1',
    name: 'Viral Cat Meme',
    category: 'meme',
    strength: 0.9,
    sentiment: 'positive',
    halfLife: 3,
    firstSeen: new Date('2025-11-22T08:00:00Z'),
    lastSeen: new Date('2025-11-23T10:00:00Z'),
    keywords: ['cat', 'meme', 'viral', 'funny'],
  }),
  createMockVibe({
    id: 'vibe-event-1',
    name: 'Tech Conference',
    category: 'event',
    strength: 0.7,
    sentiment: 'neutral',
    halfLife: 7,
    firstSeen: new Date('2025-11-15T09:00:00Z'),
    lastSeen: new Date('2025-11-20T15:00:00Z'),
    keywords: ['conference', 'tech', 'networking'],
  }),
  createMockVibe({
    id: 'vibe-trend-1',
    name: 'Sustainable Fashion',
    category: 'trend',
    strength: 0.6,
    sentiment: 'positive',
    halfLife: 14,
    firstSeen: new Date('2025-11-10T12:00:00Z'),
    lastSeen: new Date('2025-11-22T14:00:00Z'),
    keywords: ['fashion', 'sustainable', 'eco-friendly'],
  }),
  createMockVibe({
    id: 'vibe-sentiment-1',
    name: 'Tech Optimism',
    category: 'sentiment',
    strength: 0.5,
    sentiment: 'positive',
    halfLife: 30,
    firstSeen: new Date('2025-10-01T00:00:00Z'),
    lastSeen: new Date('2025-11-20T00:00:00Z'),
    keywords: ['optimism', 'tech', 'future'],
  }),
  createMockVibe({
    id: 'vibe-aesthetic-1',
    name: 'Y2K Revival',
    category: 'aesthetic',
    strength: 0.4,
    sentiment: 'neutral',
    halfLife: 60,
    firstSeen: new Date('2025-09-01T00:00:00Z'),
    lastSeen: new Date('2025-11-15T00:00:00Z'),
    keywords: ['y2k', 'aesthetic', 'retro', 'fashion'],
  }),
];

export const mockVibeWithEmbedding = createMockVibe({
  id: 'vibe-with-embedding',
  embedding: Array(1536).fill(0).map((_, i) => Math.sin(i * 0.1)),
});

export const mockVibeSimilar = createMockVibe({
  id: 'vibe-similar',
  name: 'AI Writing Assistants',
  description: 'AI tools for writing',
  keywords: ['ai', 'writing', 'assistant', 'productivity'],
  embedding: Array(1536).fill(0).map((_, i) => Math.sin(i * 0.1 + 0.1)), // Slightly different
});

export const mockVibeOld = createMockVibe({
  id: 'vibe-old',
  name: 'Outdated Trend',
  firstSeen: new Date('2025-10-01T00:00:00Z'),
  lastSeen: new Date('2025-10-15T00:00:00Z'), // 39 days old
  strength: 0.8,
  halfLife: 14,
});

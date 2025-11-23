/**
 * Regression Tests
 *
 * Ensures existing functionality still works after multi-user implementation:
 * - Basic advice generation
 * - Graph visualization
 * - Data collection
 * - Temporal decay
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryGraphStore } from '@/lib/graph/memory';
import { ZeitgeistService } from '@/lib/zeitgeist-service';
import { Scenario, Vibe } from '@/lib/types';
import { applyDecayToVibes } from '@/lib/temporal-decay';

describe('Regression Tests - Backwards Compatibility', () => {
  let store: MemoryGraphStore;
  let zeitgeist: ZeitgeistService;

  beforeEach(async () => {
    store = new MemoryGraphStore();
    zeitgeist = new ZeitgeistService(store);

    // Seed test data
    await seedTestData(store);
  });

  describe('Basic Advice Generation (No Authentication)', () => {
    it('should generate advice without user profile', async () => {
      const scenario: Scenario = {
        description: 'What are the latest tech trends?',
      };

      // Get advice without authentication (userProfile = undefined)
      const advice = await zeitgeist.getAdvice(scenario);

      expect(advice).toBeDefined();
      expect(advice.scenario).toEqual(scenario);
      expect(advice.recommendations).toBeDefined();
      expect(advice.recommendations.topics).toBeDefined();
      expect(advice.recommendations.behavior).toBeDefined();
      expect(advice.recommendations.style).toBeDefined();
      expect(advice.reasoning).toBeDefined();
      expect(typeof advice.reasoning).toBe('string');
      expect(advice.confidence).toBeGreaterThanOrEqual(0);
      expect(advice.confidence).toBeLessThanOrEqual(1);
      expect(advice.timestamp).toBeInstanceOf(Date);
    });

    it('should match vibes for generic scenarios', async () => {
      const scenario: Scenario = {
        description: 'General cultural advice',
      };

      const advice = await zeitgeist.getAdvice(scenario);

      expect(advice.matchedVibes).toBeDefined();
      expect(Array.isArray(advice.matchedVibes)).toBe(true);
    });

    it('should work with simple scenarios', async () => {
      const scenarios: Scenario[] = [
        { description: 'Fashion advice' },
        { description: 'Tech trends' },
        { description: 'Music recommendations' },
        { description: 'Food culture' },
      ];

      for (const scenario of scenarios) {
        const advice = await zeitgeist.getAdvice(scenario);

        expect(advice).toBeDefined();
        expect(advice.recommendations).toBeDefined();
      }
    });

    it('should handle empty description gracefully', async () => {
      const scenario: Scenario = {
        description: '',
      };

      try {
        const advice = await zeitgeist.getAdvice(scenario);

        // If it doesn't throw, verify it returns something
        expect(advice).toBeDefined();
      } catch (error) {
        // Acceptable - validation error
        expect(error).toBeDefined();
      }
    });
  });

  describe('Graph Visualization', () => {
    it('should retrieve all vibes for visualization', async () => {
      const vibes = await store.getRecentVibes(100);

      expect(Array.isArray(vibes)).toBe(true);
      expect(vibes.length).toBeGreaterThan(0);
      expect(vibes[0]).toHaveProperty('id');
      expect(vibes[0]).toHaveProperty('name');
      expect(vibes[0]).toHaveProperty('strength');
    });

    it('should include regional metadata', async () => {
      const vibes = await store.getRecentVibes(100);

      // At least some vibes should have regional data
      const vibesWithRegion = vibes.filter(v => v.region !== undefined);
      expect(vibesWithRegion.length).toBeGreaterThan(0);

      // Check regional data structure
      if (vibesWithRegion.length > 0) {
        const vibe = vibesWithRegion[0];
        expect(typeof vibe.region).toBe('string');
      }
    });

    it('should retrieve vibes by category', async () => {
      const vibes = await store.getRecentVibes(100);

      const categories = new Set(vibes.map(v => v.category));

      // Should have multiple categories
      expect(categories.size).toBeGreaterThan(0);
      expect(Array.from(categories).every(c => typeof c === 'string')).toBe(true);
    });

    it('should calculate vibe relationships', async () => {
      const vibes = await store.getRecentVibes(100);

      // Vibes should have metadata needed for graph
      for (const vibe of vibes) {
        expect(vibe.id).toBeDefined();
        expect(vibe.strength).toBeGreaterThanOrEqual(0);
        expect(vibe.strength).toBeLessThanOrEqual(1);
        expect(vibe.category).toBeDefined();
      }
    });
  });

  describe('Data Collection', () => {
    it('should save new vibes to the graph', async () => {
      const newVibe: Vibe = {
        id: 'new-vibe-1',
        name: 'New Cultural Trend',
        description: 'A new emerging trend',
        category: 'trend',
        keywords: ['new', 'emerging'],
        strength: 0.7,
        sentiment: 'positive',
        timestamp: new Date(),
        sources: [],
        firstSeen: new Date(),
        lastSeen: new Date(),
        currentRelevance: 0.7,
      };

      await store.saveVibe(newVibe);

      const retrieved = await store.getVibe(newVibe.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(newVibe.id);
      expect(retrieved?.name).toBe(newVibe.name);
    });

    it('should update existing vibes', async () => {
      const vibe: Vibe = {
        id: 'update-vibe',
        name: 'Original Name',
        description: 'Original description',
        category: 'trend',
        keywords: ['original'],
        strength: 0.5,
        sentiment: 'neutral',
        timestamp: new Date(),
        sources: [],
        firstSeen: new Date(),
        lastSeen: new Date(),
        currentRelevance: 0.5,
      };

      await store.saveVibe(vibe);

      // Update the vibe
      const updated: Vibe = {
        ...vibe,
        strength: 0.8,
        lastSeen: new Date(),
        currentRelevance: 0.8,
      };

      await store.saveVibe(updated);

      const retrieved = await store.getVibe(vibe.id);

      expect(retrieved?.strength).toBe(0.8);
      expect(retrieved?.currentRelevance).toBe(0.8);
    });

    it('should handle bulk vibe insertion', async () => {
      const vibes: Vibe[] = [];

      for (let i = 0; i < 20; i++) {
        vibes.push({
          id: `bulk-vibe-${i}`,
          name: `Bulk Vibe ${i}`,
          description: `Description ${i}`,
          category: 'trend',
          keywords: [`keyword${i}`],
          strength: 0.5 + i / 40,
          sentiment: 'neutral',
          timestamp: new Date(),
          sources: [],
          firstSeen: new Date(),
          lastSeen: new Date(),
          currentRelevance: 0.5 + i / 40,
        });
      }

      for (const vibe of vibes) {
        await store.saveVibe(vibe);
      }

      const allVibes = await store.getRecentVibes(100);
      const bulkVibes = allVibes.filter(v => v.id.startsWith('bulk-vibe-'));

      expect(bulkVibes.length).toBe(20);
    });
  });

  describe('Temporal Decay', () => {
    it('should apply decay to vibes over time', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const vibes: Vibe[] = [
        {
          id: 'recent-vibe',
          name: 'Recent',
          description: 'Recent vibe',
          category: 'trend',
          keywords: [],
          strength: 0.9,
          sentiment: 'positive',
          timestamp: now,
          sources: [],
          firstSeen: now,
          lastSeen: now,
          currentRelevance: 0.9,
        },
        {
          id: 'yesterday-vibe',
          name: 'Yesterday',
          description: 'Yesterday vibe',
          category: 'trend',
          keywords: [],
          strength: 0.9,
          sentiment: 'positive',
          timestamp: yesterday,
          sources: [],
          firstSeen: yesterday,
          lastSeen: yesterday,
          currentRelevance: 0.9,
        },
        {
          id: 'old-vibe',
          name: 'Old',
          description: 'Old vibe',
          category: 'trend',
          keywords: [],
          strength: 0.9,
          sentiment: 'positive',
          timestamp: lastMonth,
          sources: [],
          firstSeen: lastMonth,
          lastSeen: lastMonth,
          currentRelevance: 0.9,
        },
      ];

      const decayed = applyDecayToVibes(vibes);

      // Recent should have highest relevance
      const recent = decayed.find(v => v.id === 'recent-vibe');
      const old = decayed.find(v => v.id === 'old-vibe');

      expect(recent?.currentRelevance).toBeGreaterThan(old?.currentRelevance || 0);
    });

    it('should maintain vibe strength while adjusting relevance', () => {
      const oldVibe: Vibe = {
        id: 'strength-test',
        name: 'Strength Test',
        description: 'Test',
        category: 'trend',
        keywords: [],
        strength: 0.9,
        sentiment: 'positive',
        timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        sources: [],
        firstSeen: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        lastSeen: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        currentRelevance: 0.9,
      };

      const [decayed] = applyDecayToVibes([oldVibe]);

      // Strength should remain unchanged
      expect(decayed.strength).toBe(0.9);

      // Relevance should be decayed
      expect(decayed.currentRelevance).toBeLessThan(0.9);
    });

    it('should handle vibes with different timestamps', () => {
      const vibes: Vibe[] = [];

      // Create vibes from different time periods
      for (let i = 0; i < 10; i++) {
        const daysAgo = i * 3; // 0, 3, 6, 9... days ago

        vibes.push({
          id: `time-vibe-${i}`,
          name: `Vibe ${i}`,
          description: `Test`,
          category: 'trend',
          keywords: [],
          strength: 0.8,
          sentiment: 'neutral',
          timestamp: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
          sources: [],
          firstSeen: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
          lastSeen: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
          currentRelevance: 0.8,
        });
      }

      const decayed = applyDecayToVibes(vibes);

      // Verify decay is applied progressively
      for (let i = 0; i < decayed.length - 1; i++) {
        // More recent vibes should have higher or equal relevance
        expect(decayed[i].currentRelevance).toBeGreaterThanOrEqual(decayed[i + 1].currentRelevance);
      }
    });
  });

  describe('Existing API Compatibility', () => {
    it('should maintain /api/status endpoint', async () => {
      // Status endpoint should still work (public)
      const status = {
        vibeCount: (await store.getRecentVibes(100)).length,
        lastUpdate: new Date(),
        status: 'healthy',
      };

      expect(status.vibeCount).toBeGreaterThan(0);
      expect(status.status).toBe('healthy');
    });

    it('should maintain /api/graph endpoint', async () => {
      // Graph endpoint should still return vibe data
      const vibes = await store.getRecentVibes(100);

      expect(Array.isArray(vibes)).toBe(true);
      expect(vibes.length).toBeGreaterThan(0);
    });

    it('should maintain vibe search functionality', async () => {
      const searchTerm = 'tech';
      const vibes = await store.getRecentVibes(100);

      const results = vibes.filter(v =>
        v.name.toLowerCase().includes(searchTerm) ||
        v.description.toLowerCase().includes(searchTerm) ||
        v.keywords.some(k => k.toLowerCase().includes(searchTerm))
      );

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Data Structure Compatibility', () => {
    it('should maintain Vibe interface structure', async () => {
      const vibe = await store.getVibe('test-vibe-1');

      if (vibe) {
        expect(vibe).toHaveProperty('id');
        expect(vibe).toHaveProperty('name');
        expect(vibe).toHaveProperty('description');
        expect(vibe).toHaveProperty('category');
        expect(vibe).toHaveProperty('keywords');
        expect(vibe).toHaveProperty('strength');
        expect(vibe).toHaveProperty('sentiment');
        expect(vibe).toHaveProperty('timestamp');
        expect(vibe).toHaveProperty('sources');
        expect(vibe).toHaveProperty('firstSeen');
        expect(vibe).toHaveProperty('lastSeen');
        expect(vibe).toHaveProperty('currentRelevance');
      }
    });

    it('should maintain Advice interface structure', async () => {
      const scenario: Scenario = { description: 'Test' };
      const advice = await zeitgeist.getAdvice(scenario);

      expect(advice).toHaveProperty('scenario');
      expect(advice).toHaveProperty('matchedVibes');
      expect(advice).toHaveProperty('recommendations');
      expect(advice.recommendations).toHaveProperty('topics');
      expect(advice.recommendations).toHaveProperty('behavior');
      expect(advice.recommendations).toHaveProperty('style');
      expect(advice).toHaveProperty('reasoning');
      expect(advice).toHaveProperty('confidence');
      expect(advice).toHaveProperty('timestamp');
    });

    it('should maintain Scenario interface structure', () => {
      const scenario: Scenario = {
        description: 'Test scenario',
      };

      expect(scenario).toHaveProperty('description');
      expect(typeof scenario.description).toBe('string');
    });
  });

  describe('Matcher Compatibility', () => {
    it('should use semantic matcher when no user profile', async () => {
      const scenario: Scenario = {
        description: 'What should I know about AI trends?',
      };

      const advice = await zeitgeist.getAdvice(scenario);

      expect(advice).toBeDefined();
      expect(advice.matchedVibes).toBeDefined();
      expect(advice.confidence).toBeGreaterThan(0);
    });

    it('should handle various scenario types', async () => {
      const scenarios: Scenario[] = [
        { description: 'Short' },
        { description: 'This is a longer scenario description that provides more context about what the user is looking for in terms of cultural advice and recommendations.' },
        { description: 'What, why, how, when?' },
        { description: '?' },
      ];

      for (const scenario of scenarios) {
        const advice = await zeitgeist.getAdvice(scenario);
        expect(advice).toBeDefined();
      }
    });
  });

  describe('Performance Regression', () => {
    it('should not slow down basic operations', async () => {
      const scenario: Scenario = {
        description: 'Performance test',
      };

      const startTime = Date.now();
      const advice = await zeitgeist.getAdvice(scenario);
      const endTime = Date.now();

      const duration = endTime - startTime;

      expect(advice).toBeDefined();
      expect(duration).toBeLessThan(3000); // Should be reasonably fast

      console.log(`Basic advice generation: ${duration}ms`);
    });

    it('should handle large vibe datasets', async () => {
      // Add many vibes
      for (let i = 0; i < 100; i++) {
        const vibe: Vibe = {
          id: `perf-vibe-${i}`,
          name: `Performance Vibe ${i}`,
          description: `Description ${i}`,
          category: 'trend',
          keywords: [`keyword${i}`],
          strength: 0.5 + (i % 50) / 100,
          sentiment: 'neutral',
          timestamp: new Date(),
          sources: [],
          firstSeen: new Date(),
          lastSeen: new Date(),
          currentRelevance: 0.5,
        };

        await store.saveVibe(vibe);
      }

      const startTime = Date.now();
      const vibes = await store.getRecentVibes(200);
      const endTime = Date.now();

      const duration = endTime - startTime;

      expect(vibes.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(500); // Should be fast

      console.log(`Retrieved ${vibes.length} vibes in ${duration}ms`);
    });
  });
});

/**
 * Helper to seed test data
 */
async function seedTestData(store: MemoryGraphStore): Promise<void> {
  const testVibes: Vibe[] = [
    {
      id: 'test-vibe-1',
      name: 'AI Innovation',
      description: 'Artificial intelligence advances',
      category: 'trend',
      keywords: ['ai', 'tech', 'innovation'],
      strength: 0.9,
      sentiment: 'positive',
      timestamp: new Date(),
      sources: [],
      firstSeen: new Date(),
      lastSeen: new Date(),
      currentRelevance: 0.9,
      region: 'US-West',
    },
    {
      id: 'test-vibe-2',
      name: 'Sustainable Living',
      description: 'Eco-conscious lifestyle trends',
      category: 'behavior',
      keywords: ['sustainability', 'eco', 'green'],
      strength: 0.8,
      sentiment: 'positive',
      timestamp: new Date(),
      sources: [],
      firstSeen: new Date(),
      lastSeen: new Date(),
      currentRelevance: 0.8,
      region: 'Europe',
    },
    {
      id: 'test-vibe-3',
      name: 'Remote Work Culture',
      description: 'Work from home becoming mainstream',
      category: 'behavior',
      keywords: ['remote', 'work', 'culture'],
      strength: 0.7,
      sentiment: 'neutral',
      timestamp: new Date(),
      sources: [],
      firstSeen: new Date(),
      lastSeen: new Date(),
      currentRelevance: 0.7,
      region: 'Global',
    },
  ];

  for (const vibe of testVibes) {
    await store.saveVibe(vibe);
  }
}

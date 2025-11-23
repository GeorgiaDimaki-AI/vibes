import { describe, it, expect } from 'vitest';
import {
  detectRegionFromUrl,
  detectRegionFromContent,
  calculateRegionalRelevance,
  filterVibesByRegion,
  getPrimaryRegion,
  suggestRegionFromContent,
} from '../regional-utils';
import { createMockVibe } from '../__fixtures__/vibes';
import { Region } from '../types';

describe('regional-utils', () => {
  describe('detectRegionFromUrl', () => {
    it('should detect US-West from tech URLs', () => {
      expect(detectRegionFromUrl('https://techcrunch.com/article')).toBe('US-West');
      expect(detectRegionFromUrl('https://reddit.com/r/sanfrancisco/post')).toBe('US-West');
      expect(detectRegionFromUrl('https://reddit.com/r/bayarea/discussion')).toBe('US-West');
      expect(detectRegionFromUrl('https://reddit.com/r/losangeles/topic')).toBe('US-West');
      expect(detectRegionFromUrl('https://reddit.com/r/seattle/news')).toBe('US-West');
    });

    it('should detect US-East from east coast URLs', () => {
      expect(detectRegionFromUrl('https://reddit.com/r/nyc/post')).toBe('US-East');
      expect(detectRegionFromUrl('https://reddit.com/r/boston/discussion')).toBe('US-East');
      expect(detectRegionFromUrl('https://reddit.com/r/washingtondc/news')).toBe('US-East');
    });

    it('should detect EU-UK from UK URLs', () => {
      expect(detectRegionFromUrl('https://bbc.co.uk/news')).toBe('EU-UK');
      expect(detectRegionFromUrl('https://www.guardian.com/article')).toBe('EU-UK');
      expect(detectRegionFromUrl('https://something.uk/page')).toBe('EU-UK');
    });

    it('should detect EU-Central from European URLs', () => {
      expect(detectRegionFromUrl('https://example.de/article')).toBe('EU-Central');
      expect(detectRegionFromUrl('https://news.fr/story')).toBe('EU-Central');
      expect(detectRegionFromUrl('https://euronews.com/article')).toBe('EU-Central');
    });

    it('should default to Global for unknown URLs', () => {
      expect(detectRegionFromUrl('https://example.com/article')).toBe('Global');
      expect(detectRegionFromUrl('https://random-site.io/page')).toBe('Global');
    });

    it('should be case-insensitive', () => {
      expect(detectRegionFromUrl('https://TECHCRUNCH.COM/article')).toBe('US-West');
      expect(detectRegionFromUrl('https://BBC.CO.UK/news')).toBe('EU-UK');
    });
  });

  describe('detectRegionFromContent', () => {
    it('should detect US-West from content', () => {
      const regions = detectRegionFromContent(
        'This happened in San Francisco at a Silicon Valley startup'
      );
      expect(regions).toContain('US-West');
    });

    it('should detect US-East from content', () => {
      const regions = detectRegionFromContent(
        'The event took place in New York City last week'
      );
      expect(regions).toContain('US-East');
    });

    it('should detect EU-UK from content', () => {
      const regions = detectRegionFromContent(
        'London tech scene is growing rapidly in the UK'
      );
      expect(regions).toContain('EU-UK');
    });

    it('should detect EU-Central from content', () => {
      const regions = detectRegionFromContent(
        'The European summit in Paris and Berlin discussed technology'
      );
      expect(regions).toContain('EU-Central');
    });

    it('should detect multiple regions', () => {
      const regions = detectRegionFromContent(
        'The conference in San Francisco will connect with teams in London and New York'
      );
      expect(regions).toContain('US-West');
      expect(regions).toContain('US-East');
      expect(regions).toContain('EU-UK');
    });

    it('should return empty array for generic content', () => {
      const regions = detectRegionFromContent(
        'This is generic content about technology without location mentions'
      );
      expect(regions).toHaveLength(0);
    });

    it('should be case-insensitive', () => {
      const regions = detectRegionFromContent('SILICON VALLEY and NYC');
      expect(regions).toContain('US-West');
      expect(regions).toContain('US-East');
    });
  });

  describe('calculateRegionalRelevance', () => {
    it('should give primary region highest relevance', () => {
      const relevance = calculateRegionalRelevance('US-West', []);
      expect(relevance['US-West']).toBe(0.9);
    });

    it('should give detected regions medium-high relevance', () => {
      const relevance = calculateRegionalRelevance('US-West', ['US-East', 'EU-UK']);
      expect(relevance['US-East']).toBe(0.7);
      expect(relevance['EU-UK']).toBe(0.7);
    });

    it('should always include Global with default relevance', () => {
      const relevance = calculateRegionalRelevance('US-West', []);
      expect(relevance['Global']).toBe(0.5);
    });

    it('should add proximity boost for US-West and US-East', () => {
      const relevance = calculateRegionalRelevance('US-West', []);
      expect(relevance['US-East']).toBe(0.4);
      expect(relevance['US-Central']).toBe(0.3);
    });

    it('should add proximity boost for US-East and US-West', () => {
      const relevance = calculateRegionalRelevance('US-East', []);
      expect(relevance['US-West']).toBe(0.4);
      expect(relevance['US-Central']).toBe(0.3);
    });

    it('should add proximity boost for EU-UK and EU-Central', () => {
      const relevance = calculateRegionalRelevance('EU-UK', []);
      expect(relevance['EU-Central']).toBe(0.6);
    });

    it('should not override higher detected region scores', () => {
      const relevance = calculateRegionalRelevance('US-West', ['US-East']);
      expect(relevance['US-East']).toBe(0.7); // Detected score, not proximity
    });
  });

  describe('filterVibesByRegion', () => {
    it('should boost vibes relevant to preferred region', () => {
      const vibe = createMockVibe({
        currentRelevance: 0.5,
        geography: {
          primary: 'US-West',
          relevance: {
            'US-West': 0.9,
            'US-East': 0.4,
            'Global': 0.5,
          },
          detectedFrom: [],
        },
      });

      const filtered = filterVibesByRegion([vibe], 'US-West', 1.5);
      expect(filtered[0].currentRelevance).toBeGreaterThan(0.5);
    });

    it('should not boost vibes without geography data', () => {
      const vibe = createMockVibe({
        currentRelevance: 0.5,
        geography: undefined,
      });

      const filtered = filterVibesByRegion([vibe], 'US-West', 1.5);
      expect(filtered[0].currentRelevance).toBe(0.5);
    });

    it('should cap boosted relevance at 1.0', () => {
      const vibe = createMockVibe({
        currentRelevance: 0.9,
        geography: {
          primary: 'US-West',
          relevance: {
            'US-West': 0.9,
            'Global': 0.5,
          },
          detectedFrom: [],
        },
      });

      const filtered = filterVibesByRegion([vibe], 'US-West', 2.0);
      expect(filtered[0].currentRelevance).toBeLessThanOrEqual(1.0);
    });

    it('should sort vibes by boosted relevance', () => {
      const vibe1 = createMockVibe({
        id: 'vibe1',
        currentRelevance: 0.5,
        geography: {
          primary: 'US-West',
          relevance: { 'US-West': 0.9, 'Global': 0.5 },
          detectedFrom: [],
        },
      });

      const vibe2 = createMockVibe({
        id: 'vibe2',
        currentRelevance: 0.6,
        geography: {
          primary: 'US-East',
          relevance: { 'US-East': 0.9, 'US-West': 0.3, 'Global': 0.5 },
          detectedFrom: [],
        },
      });

      const filtered = filterVibesByRegion([vibe1, vibe2], 'US-West', 1.5);
      expect(filtered[0].id).toBe('vibe1'); // More relevant to US-West
    });

    it('should use default boost factor of 1.5', () => {
      const vibe = createMockVibe({
        currentRelevance: 0.5,
        geography: {
          primary: 'US-West',
          relevance: { 'US-West': 0.9, 'Global': 0.5 },
          detectedFrom: [],
        },
      });

      const filtered = filterVibesByRegion([vibe], 'US-West');
      expect(filtered[0].currentRelevance).toBeGreaterThan(0.5);
    });

    it('should handle vibes with missing regional relevance gracefully', () => {
      const vibe = createMockVibe({
        currentRelevance: 0.5,
        geography: {
          primary: 'US-West',
          relevance: { 'US-West': 0.9 }, // Missing preferred region
          detectedFrom: [],
        },
      });

      const filtered = filterVibesByRegion([vibe], 'EU-UK', 1.5);
      expect(filtered[0].currentRelevance).toBeCloseTo(0.5, 1); // Uses default 0.5
    });
  });

  describe('getPrimaryRegion', () => {
    it('should return region with highest relevance', () => {
      const vibe = createMockVibe({
        geography: {
          primary: 'US-West',
          relevance: {
            'US-West': 0.9,
            'US-East': 0.6,
            'Global': 0.5,
          },
          detectedFrom: [],
        },
      });

      expect(getPrimaryRegion(vibe)).toBe('US-West');
    });

    it('should ignore Global when finding primary', () => {
      const vibe = createMockVibe({
        geography: {
          primary: 'US-West',
          relevance: {
            'Global': 0.9, // High global score
            'US-West': 0.8,
            'US-East': 0.6,
          },
          detectedFrom: [],
        },
      });

      expect(getPrimaryRegion(vibe)).toBe('US-West');
    });

    it('should return Global if no geography data', () => {
      const vibe = createMockVibe({
        geography: undefined,
      });

      expect(getPrimaryRegion(vibe)).toBe('Global');
    });

    it('should return Global if no relevance data', () => {
      const vibe = createMockVibe({
        geography: {
          primary: 'US-West',
          relevance: {},
          detectedFrom: [],
        },
      });

      expect(getPrimaryRegion(vibe)).toBe('Global');
    });

    it('should return Global if only Global has relevance', () => {
      const vibe = createMockVibe({
        geography: {
          primary: 'Global',
          relevance: {
            'Global': 0.9,
          },
          detectedFrom: [],
        },
      });

      expect(getPrimaryRegion(vibe)).toBe('Global');
    });
  });

  describe('suggestRegionFromContent', () => {
    it('should detect primary region from URLs', () => {
      const contents = [
        { url: 'https://techcrunch.com/article' },
        { url: 'https://reddit.com/r/sanfrancisco/post' },
      ];

      const { primary, detected } = suggestRegionFromContent(contents);
      expect(primary).toBe('US-West');
      expect(detected).toContain('US-West');
    });

    it('should detect regions from text content', () => {
      const contents = [
        { text: 'This happened in San Francisco' },
        { text: 'The New York event was amazing' },
      ];

      const { primary, detected } = suggestRegionFromContent(contents);
      expect(detected).toContain('US-West');
      expect(detected).toContain('US-East');
    });

    it('should combine URL and text detection', () => {
      const contents = [
        { url: 'https://bbc.co.uk/news', text: 'Silicon Valley startups' },
      ];

      const { detected } = suggestRegionFromContent(contents);
      expect(detected).toContain('EU-UK');
      expect(detected).toContain('US-West');
    });

    it('should return Global for generic content', () => {
      const contents = [
        { text: 'Generic content about technology' },
        { url: 'https://example.com/article' },
      ];

      const { primary, detected } = suggestRegionFromContent(contents);
      expect(primary).toBe('Global');
      expect(detected).toContain('Global');
    });

    it('should filter out Global when other regions detected', () => {
      const contents = [
        { url: 'https://techcrunch.com/article' },
        { url: 'https://example.com/generic' }, // Would detect Global
      ];

      const { detected } = suggestRegionFromContent(contents);
      expect(detected).not.toContain('Global');
      expect(detected).toContain('US-West');
    });

    it('should deduplicate detected regions', () => {
      const contents = [
        { text: 'San Francisco event' },
        { text: 'Silicon Valley startups' },
        { url: 'https://techcrunch.com/article' },
      ];

      const { detected } = suggestRegionFromContent(contents);
      const westCount = detected.filter(r => r === 'US-West').length;
      expect(westCount).toBe(1);
    });

    it('should handle empty content array', () => {
      const { primary, detected } = suggestRegionFromContent([]);
      expect(primary).toBe('Global');
      expect(detected).toContain('Global');
    });

    it('should handle content without url or text', () => {
      const contents = [
        { url: undefined, text: undefined },
        {},
      ] as any;

      const { primary } = suggestRegionFromContent(contents);
      expect(primary).toBe('Global');
    });
  });
});

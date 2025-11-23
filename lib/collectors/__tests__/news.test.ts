import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NewsCollector } from '../news';

describe('NewsCollector', () => {
  let collector: NewsCollector;

  beforeEach(() => {
    collector = new NewsCollector();
    vi.clearAllMocks();
  });

  describe('isAvailable', () => {
    it('should return true if API key is configured', async () => {
      process.env.NEWS_API_KEY = 'test-key';
      collector = new NewsCollector();

      const available = await collector.isAvailable();
      expect(available).toBe(true);
    });

    it('should return false if API key is not configured', async () => {
      delete process.env.NEWS_API_KEY;
      collector = new NewsCollector();

      const available = await collector.isAvailable();
      expect(available).toBe(false);
    });
  });

  describe('collect', () => {
    beforeEach(() => {
      process.env.NEWS_API_KEY = 'test-key';
      collector = new NewsCollector();
    });

    it('should return empty array if API key is missing', async () => {
      delete process.env.NEWS_API_KEY;
      collector = new NewsCollector();

      const content = await collector.collect();
      expect(content).toEqual([]);
    });

    it('should fetch top headlines by default', async () => {
      const mockResponse = {
        status: 'ok',
        totalResults: 2,
        articles: [
          {
            source: { id: 'techcrunch', name: 'TechCrunch' },
            author: 'Jane Doe',
            title: 'AI News',
            description: 'Latest AI developments',
            url: 'https://techcrunch.com/article1',
            urlToImage: 'https://example.com/image.jpg',
            publishedAt: '2025-11-23T10:00:00Z',
            content: 'Full article content here',
          },
          {
            source: { id: null, name: 'BBC' },
            author: null,
            title: 'Tech Update',
            description: null,
            url: 'https://bbc.co.uk/article2',
            urlToImage: null,
            publishedAt: '2025-11-23T11:00:00Z',
            content: 'Another article',
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as any);

      const content = await collector.collect();

      expect(content).toHaveLength(2);
      expect(content[0].source).toBe('news');
      expect(content[0].title).toBe('AI News');
      expect(content[0].body).toBe('Latest AI developments');
      expect(content[0].author).toBe('Jane Doe');
      expect(content[0].imageUrls).toContain('https://example.com/image.jpg');
    });

    it('should search for keywords when provided', async () => {
      const mockResponse = {
        status: 'ok',
        totalResults: 1,
        articles: [
          {
            source: { id: 'test', name: 'Test' },
            author: 'Author',
            title: 'Keyword Article',
            description: 'Description',
            url: 'https://example.com/article',
            urlToImage: null,
            publishedAt: '2025-11-23T10:00:00Z',
            content: 'Content',
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as any);

      await collector.collect({ keywords: ['ai', 'technology'] });

      const fetchCall = (global.fetch as any).mock.calls[0][0];
      expect(fetchCall).toContain('everything');
      expect(fetchCall).toContain('q=ai+OR+technology');
    });

    it('should respect limit option', async () => {
      const mockResponse = {
        status: 'ok',
        totalResults: 0,
        articles: [],
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as any);

      await collector.collect({ limit: 10 });

      const fetchCall = (global.fetch as any).mock.calls[0][0];
      expect(fetchCall).toContain('pageSize=10');
    });

    it('should include since parameter when provided', async () => {
      const mockResponse = {
        status: 'ok',
        totalResults: 0,
        articles: [],
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as any);

      const since = new Date('2025-11-20T00:00:00Z');
      await collector.collect({ since });

      const fetchCall = (global.fetch as any).mock.calls[0][0];
      expect(fetchCall).toContain('from=2025-11-20T00%3A00%3A00.000Z');
    });

    it('should handle API errors gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized',
      } as any);

      const content = await collector.collect();
      expect(content).toEqual([]);
    });

    it('should handle fetch errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      const content = await collector.collect();
      expect(content).toEqual([]);
    });

    it('should transform articles correctly', async () => {
      const mockResponse = {
        status: 'ok',
        totalResults: 1,
        articles: [
          {
            source: { id: 'techcrunch', name: 'TechCrunch' },
            author: 'John Smith',
            title: 'Test Article',
            description: 'Test description',
            url: 'https://example.com/article',
            urlToImage: 'https://example.com/image.jpg',
            publishedAt: '2025-11-23T10:00:00Z',
            content: 'Full content',
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as any);

      const content = await collector.collect();

      expect(content[0]).toMatchObject({
        source: 'news',
        url: 'https://example.com/article',
        title: 'Test Article',
        body: 'Test description',
        author: 'John Smith',
        imageUrls: ['https://example.com/image.jpg'],
      });
      expect(content[0].timestamp).toBeInstanceOf(Date);
      expect(content[0].raw?.sourceName).toBe('TechCrunch');
    });

    it('should use content if description is null', async () => {
      const mockResponse = {
        status: 'ok',
        totalResults: 1,
        articles: [
          {
            source: { id: 'test', name: 'Test' },
            author: null,
            title: 'Title',
            description: null,
            url: 'https://example.com/article',
            urlToImage: null,
            publishedAt: '2025-11-23T10:00:00Z',
            content: 'This is the content',
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as any);

      const content = await collector.collect();

      expect(content[0].body).toBe('This is the content');
    });
  });

  describe('metadata', () => {
    it('should have correct name and description', () => {
      expect(collector.name).toBe('news');
      expect(collector.description).toBe('Collects trending news articles from NewsAPI');
    });
  });
});

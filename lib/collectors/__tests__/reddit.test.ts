import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RedditCollector } from '../reddit';

describe('RedditCollector', () => {
  let collector: RedditCollector;

  beforeEach(() => {
    collector = new RedditCollector();
    vi.clearAllMocks();
  });

  describe('collect', () => {
    it('should fetch posts from multiple subreddits', async () => {
      const mockResponse = {
        data: {
          children: [
            {
              data: {
                id: 'post1',
                title: 'Test Post',
                selftext: 'Post content',
                author: 'testuser',
                subreddit: 'technology',
                url: 'https://example.com',
                permalink: '/r/technology/comments/post1',
                created_utc: 1700000000,
                ups: 100,
                num_comments: 50,
              },
            },
          ],
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as any);

      const content = await collector.collect({ limit: 12 });

      // Should fetch from 6 subreddits
      expect(global.fetch).toHaveBeenCalledTimes(6);
      expect(content.length).toBeGreaterThan(0);
    });

    it('should transform Reddit posts correctly', async () => {
      const mockResponse = {
        data: {
          children: [
            {
              data: {
                id: 'abc123',
                title: 'Amazing Tech News',
                selftext: 'This is the post body',
                author: 'techfan',
                subreddit: 'technology',
                url: 'https://example.com/link',
                permalink: '/r/technology/comments/abc123/amazing_tech_news',
                created_utc: 1700740800, // Nov 23, 2023 12:00:00 GMT
                ups: 250,
                num_comments: 75,
                preview: {
                  images: [
                    {
                      source: {
                        url: 'https://preview.redd.it/image.jpg?param=value&amp;other=val',
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as any);

      const content = await collector.collect({ limit: 6 });

      const post = content[0];
      expect(post.source).toBe('reddit');
      expect(post.title).toBe('Amazing Tech News');
      expect(post.body).toBe('This is the post body');
      expect(post.author).toBe('techfan');
      expect(post.url).toBe('https://www.reddit.com/r/technology/comments/abc123/amazing_tech_news');
      expect(post.engagement?.likes).toBe(250);
      expect(post.engagement?.comments).toBe(75);
      expect(post.raw?.subreddit).toBe('technology');
      expect(post.raw?.id).toBe('abc123');
    });

    it('should decode HTML entities in image URLs', async () => {
      const mockResponse = {
        data: {
          children: [
            {
              data: {
                id: 'post1',
                title: 'Post with image',
                selftext: '',
                author: 'user',
                subreddit: 'pics',
                url: 'https://example.com',
                permalink: '/r/pics/comments/post1',
                created_utc: 1700000000,
                ups: 10,
                num_comments: 5,
                preview: {
                  images: [
                    {
                      source: {
                        url: 'https://example.com/image.jpg?a=1&amp;b=2&amp;c=3',
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as any);

      const content = await collector.collect({ limit: 6 });

      expect(content[0].imageUrls).toContain('https://example.com/image.jpg?a=1&b=2&c=3');
    });

    it('should handle posts without images', async () => {
      const mockResponse = {
        data: {
          children: [
            {
              data: {
                id: 'post1',
                title: 'Text only post',
                selftext: 'Just text',
                author: 'user',
                subreddit: 'askreddit',
                url: 'https://reddit.com/post1',
                permalink: '/r/askreddit/comments/post1',
                created_utc: 1700000000,
                ups: 10,
                num_comments: 5,
              },
            },
          ],
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as any);

      const content = await collector.collect({ limit: 6 });

      expect(content[0].imageUrls).toEqual([]);
    });

    it('should use correct User-Agent header', async () => {
      const mockResponse = {
        data: { children: [] },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as any);

      await collector.collect({ limit: 6 });

      const firstCall = (global.fetch as any).mock.calls[0];
      expect(firstCall[1].headers['User-Agent']).toBe('Zeitgeist-App/1.0');
    });

    it('should handle API errors gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Rate Limited',
      } as any);

      const content = await collector.collect();
      expect(content).toEqual([]);
    });

    it('should handle fetch errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const content = await collector.collect();
      expect(content).toEqual([]);
    });

    it('should distribute limit across subreddits', async () => {
      const mockResponse = {
        data: { children: [] },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as any);

      await collector.collect({ limit: 24 });

      // 6 subreddits, 24 / 6 = 4 per subreddit
      const firstCallUrl = (global.fetch as any).mock.calls[0][0];
      expect(firstCallUrl).toContain('limit=4');
    });

    it('should fetch from default subreddits', async () => {
      const mockResponse = {
        data: { children: [] },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as any);

      await collector.collect({ limit: 12 });

      const urls = (global.fetch as any).mock.calls.map((call: any) => call[0]);
      expect(urls.some((url: string) => url.includes('/r/popular/'))).toBe(true);
      expect(urls.some((url: string) => url.includes('/r/technology/'))).toBe(true);
      expect(urls.some((url: string) => url.includes('/r/fashion/'))).toBe(true);
      expect(urls.some((url: string) => url.includes('/r/music/'))).toBe(true);
      expect(urls.some((url: string) => url.includes('/r/worldnews/'))).toBe(true);
      expect(urls.some((url: string) => url.includes('/r/art/'))).toBe(true);
    });
  });

  describe('isAvailable', () => {
    it('should return true (Reddit API is public)', async () => {
      const available = await collector.isAvailable();
      expect(available).toBe(true);
    });
  });

  describe('metadata', () => {
    it('should have correct name and description', () => {
      expect(collector.name).toBe('reddit');
      expect(collector.description).toBe('Collects trending posts from Reddit');
    });
  });
});

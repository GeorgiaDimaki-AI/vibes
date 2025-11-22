/**
 * Reddit Collector
 * Fetches trending posts from Reddit
 */

import { BaseCollector } from './base';
import { CollectorOptions, RawContent } from '@/lib/types';

interface RedditPost {
  data: {
    id: string;
    title: string;
    selftext: string;
    author: string;
    subreddit: string;
    url: string;
    permalink: string;
    created_utc: number;
    ups: number;
    num_comments: number;
    thumbnail?: string;
    preview?: {
      images: Array<{
        source: { url: string };
      }>;
    };
  };
}

interface RedditResponse {
  data: {
    children: RedditPost[];
  };
}

export class RedditCollector extends BaseCollector {
  readonly name = 'reddit';
  readonly description = 'Collects trending posts from Reddit';

  private baseUrl = 'https://www.reddit.com';
  private userAgent = 'Zeitgeist-App/1.0';

  async collect(options?: CollectorOptions): Promise<RawContent[]> {
    try {
      const limit = options?.limit || 25;

      // Collect from multiple sources for diverse vibes
      const subreddits = [
        'popular',
        'technology',
        'fashion',
        'music',
        'worldnews',
        'art',
      ];

      const allPosts: RawContent[] = [];

      for (const subreddit of subreddits) {
        const posts = await this.fetchSubreddit(subreddit, Math.ceil(limit / subreddits.length));
        allPosts.push(...posts);
      }

      return allPosts;
    } catch (error) {
      console.error('Reddit collection failed:', error);
      return [];
    }
  }

  private async fetchSubreddit(subreddit: string, limit: number): Promise<RawContent[]> {
    const url = `${this.baseUrl}/r/${subreddit}/hot.json?limit=${limit}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': this.userAgent,
      },
    });

    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.statusText}`);
    }

    const data: RedditResponse = await response.json();

    return data.data.children.map(post => this.transformPost(post));
  }

  private transformPost(post: RedditPost): RawContent {
    const images: string[] = [];

    if (post.data.preview?.images?.[0]?.source?.url) {
      images.push(post.data.preview.images[0].source.url.replace(/&amp;/g, '&'));
    }

    return this.createRawContent({
      source: this.name,
      url: `${this.baseUrl}${post.data.permalink}`,
      title: post.data.title,
      body: post.data.selftext,
      imageUrls: images,
      timestamp: new Date(post.data.created_utc * 1000),
      author: post.data.author,
      engagement: {
        likes: post.data.ups,
        comments: post.data.num_comments,
      },
      raw: {
        subreddit: post.data.subreddit,
        id: post.data.id,
      },
    });
  }
}

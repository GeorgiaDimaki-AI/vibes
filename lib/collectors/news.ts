/**
 * News Collector
 * Fetches trending news articles from NewsAPI
 */

import { BaseCollector } from './base';
import { CollectorOptions, RawContent } from '@/lib/types';

interface NewsAPIArticle {
  source: { id: string | null; name: string };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: NewsAPIArticle[];
}

export class NewsCollector extends BaseCollector {
  readonly name = 'news';
  readonly description = 'Collects trending news articles from NewsAPI';

  private apiKey: string | undefined;
  private baseUrl = 'https://newsapi.org/v2';

  constructor() {
    super();
    this.apiKey = process.env.NEWS_API_KEY;
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async collect(options?: CollectorOptions): Promise<RawContent[]> {
    if (!this.apiKey) {
      console.warn('NewsAPI key not configured');
      return [];
    }

    try {
      const limit = options?.limit || 20;
      const keywords = options?.keywords || [];

      // Fetch top headlines or search for keywords
      const endpoint = keywords.length > 0 ? 'everything' : 'top-headlines';
      const url = new URL(`${this.baseUrl}/${endpoint}`);

      url.searchParams.append('apiKey', this.apiKey);
      url.searchParams.append('pageSize', limit.toString());
      url.searchParams.append('language', 'en');

      if (keywords.length > 0) {
        url.searchParams.append('q', keywords.join(' OR '));
      } else {
        url.searchParams.append('country', 'us');
      }

      if (options?.since) {
        url.searchParams.append('from', options.since.toISOString());
      }

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`NewsAPI error: ${response.statusText}`);
      }

      const data: NewsAPIResponse = await response.json();

      return data.articles.map(article => this.transformArticle(article));
    } catch (error) {
      console.error('News collection failed:', error);
      return [];
    }
  }

  private transformArticle(article: NewsAPIArticle): RawContent {
    return this.createRawContent({
      source: this.name,
      url: article.url,
      title: article.title,
      body: article.description || article.content || '',
      imageUrls: article.urlToImage ? [article.urlToImage] : [],
      timestamp: new Date(article.publishedAt),
      author: article.author || undefined,
      raw: {
        sourceName: article.source.name,
      },
    });
  }
}

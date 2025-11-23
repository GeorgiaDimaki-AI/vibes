/**
 * YouTube Collector
 * Collects trending videos from YouTube
 * Uses official YouTube Data API v3
 *
 * Setup:
 * 1. Create project at: https://console.cloud.google.com/
 * 2. Enable YouTube Data API v3
 * 3. Create API key (no OAuth needed for public data)
 * 4. Add to .env.local:
 *    YOUTUBE_API_KEY=your_api_key
 *
 * Free tier: 10,000 quota units/day (each video = ~3 units, so ~3000 videos/day)
 */

import { BaseCollector } from './base';
import { CollectorOptions, RawContent } from '@/lib/types';

interface YouTubeVideo {
  id: string;
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails: {
      high: { url: string };
    };
    categoryId: string;
    tags?: string[];
  };
  statistics: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
  };
  contentDetails: {
    duration: string; // ISO 8601 format: PT15M33S
  };
}

export class YouTubeCollector extends BaseCollector {
  readonly name = 'youtube';
  readonly description = 'Collects trending videos from YouTube';

  private apiKey = process.env.YOUTUBE_API_KEY;
  private baseUrl = 'https://www.googleapis.com/youtube/v3';

  // YouTube category IDs
  private categories = {
    music: '10',
    entertainment: '24',
    news: '25',
    howto: '26',
    education: '27',
    tech: '28',
    lifestyle: '22',
  };

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async collect(options?: CollectorOptions): Promise<RawContent[]> {
    if (!await this.isAvailable()) {
      console.warn('YouTube API key not configured');
      return [];
    }

    try {
      const limit = options?.limit || 30;

      // Get trending videos from multiple categories for diverse content
      const allVideos: RawContent[] = [];

      // Get general trending videos
      const trending = await this.fetchTrendingVideos(Math.ceil(limit / 2));
      allVideos.push(...trending);

      // Get category-specific trending (tech, music, entertainment)
      const techVideos = await this.fetchVideoByCategoryLimit(this.categories.tech, 5);
      const musicVideos = await this.fetchVideoByCategoryLimit(this.categories.music, 5);
      const newsVideos = await this.fetchVideoByCategoryLimit(this.categories.news, 5);

      allVideos.push(...techVideos, ...musicVideos, ...newsVideos);

      // Deduplicate and limit
      const uniqueVideos = this.deduplicateVideos(allVideos);
      return uniqueVideos.slice(0, limit);
    } catch (error) {
      console.error('YouTube collection failed:', error);
      return [];
    }
  }

  private async fetchTrendingVideos(maxResults: number): Promise<RawContent[]> {
    // Get trending videos using the videos.list endpoint with chart=mostPopular
    const url = new URL(`${this.baseUrl}/videos`);
    url.searchParams.append('part', 'snippet,statistics,contentDetails');
    url.searchParams.append('chart', 'mostPopular');
    url.searchParams.append('regionCode', 'US');
    url.searchParams.append('maxResults', maxResults.toString());
    url.searchParams.append('key', this.apiKey!);

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.statusText}`);
    }

    const data = await response.json();
    const videos: YouTubeVideo[] = data.items || [];

    return videos.map(video => this.transformVideo(video));
  }

  private async fetchVideoByCategoryLimit(categoryId: string, maxResults: number): Promise<RawContent[]> {
    const url = new URL(`${this.baseUrl}/videos`);
    url.searchParams.append('part', 'snippet,statistics,contentDetails');
    url.searchParams.append('chart', 'mostPopular');
    url.searchParams.append('regionCode', 'US');
    url.searchParams.append('videoCategoryId', categoryId);
    url.searchParams.append('maxResults', maxResults.toString());
    url.searchParams.append('key', this.apiKey!);

    const response = await fetch(url.toString());

    if (!response.ok) {
      console.warn(`YouTube category ${categoryId} fetch failed:`, response.statusText);
      return [];
    }

    const data = await response.json();
    const videos: YouTubeVideo[] = data.items || [];

    return videos.map(video => this.transformVideo(video));
  }

  private transformVideo(video: YouTubeVideo): RawContent {
    // Convert video metadata to text representation for LLM analysis
    const textRepresentation = this.createTextRepresentation(video);

    const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;

    return this.createRawContent({
      source: this.name,
      url: videoUrl,
      title: video.snippet.title,
      body: textRepresentation,
      videoUrl: videoUrl,
      imageUrls: [video.snippet.thumbnails.high.url],
      author: video.snippet.channelTitle,
      engagement: {
        views: parseInt(video.statistics.viewCount) || 0,
        likes: parseInt(video.statistics.likeCount) || 0,
        comments: parseInt(video.statistics.commentCount) || 0,
      },
      raw: {
        videoId: video.id,
        categoryId: video.snippet.categoryId,
        tags: video.snippet.tags || [],
        duration: video.contentDetails.duration,
        publishedAt: video.snippet.publishedAt,
      },
    });
  }

  private createTextRepresentation(video: YouTubeVideo): string {
    const parts: string[] = [
      `Title: ${video.snippet.title}`,
      `Channel: ${video.snippet.channelTitle}`,
      `Published: ${new Date(video.snippet.publishedAt).toLocaleDateString()}`,
      `Duration: ${this.parseDuration(video.contentDetails.duration)}`,
      '',
      `Description: ${video.snippet.description.substring(0, 500)}${video.snippet.description.length > 500 ? '...' : ''}`,
    ];

    // Add engagement metrics
    const views = parseInt(video.statistics.viewCount) || 0;
    const likes = parseInt(video.statistics.likeCount) || 0;
    const comments = parseInt(video.statistics.commentCount) || 0;

    parts.push('');
    parts.push('Engagement:');
    parts.push(`Views: ${this.formatNumber(views)}`);
    parts.push(`Likes: ${this.formatNumber(likes)}`);
    parts.push(`Comments: ${this.formatNumber(comments)}`);

    // Calculate engagement rate
    if (views > 0) {
      const engagementRate = ((likes + comments) / views) * 100;
      parts.push(`Engagement rate: ${engagementRate.toFixed(2)}%`);
    }

    // Add tags if available
    if (video.snippet.tags && video.snippet.tags.length > 0) {
      parts.push('');
      parts.push(`Tags: ${video.snippet.tags.slice(0, 10).join(', ')}`);
    }

    // Interpret category
    const category = this.getCategoryName(video.snippet.categoryId);
    if (category) {
      parts.push(`Category: ${category}`);
    }

    return parts.join('\n');
  }

  private parseDuration(duration: string): string {
    // Convert ISO 8601 duration (PT15M33S) to readable format
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return duration;

    const hours = match[1] || '0';
    const minutes = match[2] || '0';
    const seconds = match[3] || '0';

    if (hours !== '0') {
      return `${hours}h ${minutes}m`;
    } else if (minutes !== '0') {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  }

  private getCategoryName(categoryId: string): string | null {
    const categoryMap: Record<string, string> = {
      '1': 'Film & Animation',
      '2': 'Autos & Vehicles',
      '10': 'Music',
      '15': 'Pets & Animals',
      '17': 'Sports',
      '19': 'Travel & Events',
      '20': 'Gaming',
      '22': 'People & Blogs',
      '23': 'Comedy',
      '24': 'Entertainment',
      '25': 'News & Politics',
      '26': 'Howto & Style',
      '27': 'Education',
      '28': 'Science & Technology',
    };

    return categoryMap[categoryId] || null;
  }

  private deduplicateVideos(videos: RawContent[]): RawContent[] {
    const seen = new Set<string>();
    return videos.filter(video => {
      const videoId = video.raw?.videoId;
      if (!videoId || seen.has(videoId)) {
        return false;
      }
      seen.add(videoId);
      return true;
    });
  }
}

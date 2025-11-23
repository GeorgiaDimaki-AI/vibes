/**
 * Pexels Collector
 * Collects trending videos and stock footage from Pexels
 * Uses official Pexels API
 *
 * Setup:
 * 1. Create account at: https://www.pexels.com/api/
 * 2. Get API key (instant approval)
 * 3. Add to .env.local:
 *    PEXELS_API_KEY=your_api_key
 *
 * Free tier: 200 requests/hour, unlimited downloads
 * Very generous free API for video content
 */

import { BaseCollector } from './base';
import { CollectorOptions, RawContent } from '@/lib/types';

interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  duration: number;
  image: string; // Preview image
  url: string; // Pexels page URL
  user: {
    name: string;
    url: string;
  };
  video_files: Array<{
    id: number;
    quality: string; // 'hd', 'sd', etc.
    file_type: string; // 'video/mp4'
    width: number;
    height: number;
    link: string; // Direct video file URL
  }>;
  video_pictures: Array<{
    id: number;
    picture: string;
    nr: number;
  }>;
}

interface PexelsVideosResponse {
  page: number;
  per_page: number;
  total_results: number;
  url: string;
  videos: PexelsVideo[];
}

export class PexelsCollector extends BaseCollector {
  readonly name = 'pexels';
  readonly description = 'Collects trending videos and stock footage from Pexels';

  private apiKey = process.env.PEXELS_API_KEY;
  private baseUrl = 'https://api.pexels.com/videos';

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async collect(options?: CollectorOptions): Promise<RawContent[]> {
    if (!await this.isAvailable()) {
      console.warn('Pexels API key not configured');
      return [];
    }

    try {
      const limit = options?.limit || 30;

      // Collect trending videos from multiple sources
      const allVideos: RawContent[] = [];

      // 1. Popular videos (most downloaded/viewed)
      const popular = await this.fetchPopularVideos(Math.ceil(limit / 2));
      allVideos.push(...popular);

      // 2. Search-based trending topics
      const trendingTopics = ['lifestyle', 'nature', 'technology', 'urban', 'people'];
      const videosPerTopic = Math.ceil(limit / (2 * trendingTopics.length));

      for (const topic of trendingTopics) {
        const topicVideos = await this.searchVideos(topic, videosPerTopic);
        allVideos.push(...topicVideos);
      }

      // Deduplicate and limit
      const uniqueVideos = this.deduplicateVideos(allVideos);
      return uniqueVideos.slice(0, limit);
    } catch (error) {
      console.error('Pexels collection failed:', error);
      return [];
    }
  }

  private async fetchPopularVideos(perPage: number): Promise<RawContent[]> {
    const url = new URL(`${this.baseUrl}/popular`);
    url.searchParams.append('per_page', Math.min(perPage, 80).toString());
    url.searchParams.append('page', '1');

    const response = await this.fetchFromAPI(url.toString());
    return response.videos.map(video => this.transformVideo(video));
  }

  private async searchVideos(query: string, perPage: number): Promise<RawContent[]> {
    const url = new URL(`${this.baseUrl}/search`);
    url.searchParams.append('query', query);
    url.searchParams.append('per_page', Math.min(perPage, 80).toString());
    url.searchParams.append('page', '1');
    url.searchParams.append('orientation', 'landscape'); // Most suitable for trends

    try {
      const response = await this.fetchFromAPI(url.toString());
      return response.videos.map(video => this.transformVideo(video));
    } catch (error) {
      console.warn(`Pexels search for "${query}" failed:`, error);
      return [];
    }
  }

  private async fetchFromAPI(url: string): Promise<PexelsVideosResponse> {
    const response = await fetch(url, {
      headers: {
        'Authorization': this.apiKey!,
      },
    });

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.statusText}`);
    }

    return await response.json();
  }

  private transformVideo(video: PexelsVideo): RawContent {
    // Get best quality video file
    const hdVideo = video.video_files.find(f => f.quality === 'hd') || video.video_files[0];

    // Convert video metadata to text representation for LLM analysis
    const textRepresentation = this.createTextRepresentation(video);

    return this.createRawContent({
      source: this.name,
      url: video.url,
      title: `Video ${video.id} by ${video.user.name}`,
      body: textRepresentation,
      videoUrl: hdVideo?.link,
      imageUrls: [video.image], // Preview/thumbnail
      author: video.user.name,
      raw: {
        videoId: video.id,
        duration: video.duration,
        dimensions: {
          width: video.width,
          height: video.height,
        },
        videoFiles: video.video_files.map(f => ({
          quality: f.quality,
          link: f.link,
          width: f.width,
          height: f.height,
        })),
        // Store all preview images (can be used for visual analysis)
        previewImages: video.video_pictures.map(p => p.picture),
      },
    });
  }

  private createTextRepresentation(video: PexelsVideo): string {
    const parts: string[] = [];

    parts.push(`Video ID: ${video.id}`);
    parts.push(`Creator: ${video.user.name}`);
    parts.push(`Duration: ${this.formatDuration(video.duration)}`);
    parts.push(`Resolution: ${video.width}x${video.height} (${this.getAspectRatio(video.width, video.height)})`);

    // Determine video style based on dimensions and quality
    parts.push('');
    parts.push('Video characteristics:');

    const orientation = this.getOrientation(video.width, video.height);
    parts.push(`Orientation: ${orientation}`);

    const qualityLevel = this.determineQualityLevel(video.width, video.height);
    parts.push(`Quality: ${qualityLevel}`);

    // Infer usage/context
    parts.push('');
    parts.push('Likely usage contexts:');
    const contexts = this.inferContexts(video.width, video.height, video.duration);
    contexts.forEach(context => parts.push(`- ${context}`));

    // Note about visual content
    parts.push('');
    parts.push('[Stock footage video - represents current visual trends in professional video content]');
    parts.push('[Analysis of video frames could reveal: subjects, colors, composition, mood, style]');

    return parts.join('\n');
  }

  private formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  }

  private getAspectRatio(width: number, height: number): string {
    const ratio = width / height;

    if (Math.abs(ratio - 16/9) < 0.1) return '16:9 widescreen';
    if (Math.abs(ratio - 4/3) < 0.1) return '4:3 standard';
    if (Math.abs(ratio - 1) < 0.1) return '1:1 square';
    if (Math.abs(ratio - 9/16) < 0.1) return '9:16 vertical (mobile)';
    if (Math.abs(ratio - 21/9) < 0.1) return '21:9 ultra-wide';

    return `${(ratio).toFixed(2)}:1`;
  }

  private getOrientation(width: number, height: number): string {
    if (width > height * 1.3) return 'Landscape (horizontal)';
    if (height > width * 1.3) return 'Portrait (vertical)';
    return 'Square or near-square';
  }

  private determineQualityLevel(width: number, height: number): string {
    const pixels = width * height;

    if (pixels >= 3840 * 2160) return '4K Ultra HD or higher';
    if (pixels >= 1920 * 1080) return 'Full HD 1080p';
    if (pixels >= 1280 * 720) return 'HD 720p';
    if (pixels >= 854 * 480) return 'SD 480p';

    return 'Low resolution';
  }

  private inferContexts(width: number, height: number, duration: number): string[] {
    const contexts: string[] = [];
    const ratio = width / height;

    // Aspect ratio-based contexts
    if (Math.abs(ratio - 16/9) < 0.1) {
      contexts.push('YouTube, TV, presentations');
    }
    if (Math.abs(ratio - 9/16) < 0.1) {
      contexts.push('Instagram Stories, TikTok, Reels');
    }
    if (Math.abs(ratio - 1) < 0.1) {
      contexts.push('Instagram posts, social media');
    }

    // Duration-based contexts
    if (duration < 10) {
      contexts.push('Quick social media clip, intro/outro');
    } else if (duration < 30) {
      contexts.push('Social media video, advertisement');
    } else if (duration < 60) {
      contexts.push('Promotional video, B-roll footage');
    } else {
      contexts.push('Long-form content, documentary B-roll');
    }

    return contexts;
  }

  private deduplicateVideos(videos: RawContent[]): RawContent[] {
    const seen = new Set<number>();
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

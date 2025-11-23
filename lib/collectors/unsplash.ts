/**
 * Unsplash Collector
 * Collects trending photos and visual aesthetics from Unsplash
 * Uses official Unsplash API
 *
 * Setup:
 * 1. Create app at: https://unsplash.com/developers
 * 2. Get Access Key
 * 3. Add to .env.local:
 *    UNSPLASH_ACCESS_KEY=your_access_key
 *
 * Free tier: 50 requests/hour (demo mode)
 * Production: Requires approval for higher limits
 */

import { BaseCollector } from './base';
import { CollectorOptions, RawContent } from '@/lib/types';

interface UnsplashPhoto {
  id: string;
  created_at: string;
  description: string | null;
  alt_description: string | null;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
  };
  links: {
    html: string;
  };
  user: {
    name: string;
    username: string;
  };
  likes: number;
  downloads: number;
  views: number;
  tags?: Array<{ title: string }>;
  location?: {
    name: string;
    city: string;
    country: string;
  };
  exif?: {
    make: string;
    model: string;
    exposure_time: string;
    aperture: string;
    focal_length: string;
    iso: number;
  };
}

export class UnsplashCollector extends BaseCollector {
  readonly name = 'unsplash';
  readonly description = 'Collects trending photos and visual aesthetics from Unsplash';

  private accessKey = process.env.UNSPLASH_ACCESS_KEY;
  private baseUrl = 'https://api.unsplash.com';

  async isAvailable(): Promise<boolean> {
    return !!this.accessKey;
  }

  async collect(options?: CollectorOptions): Promise<RawContent[]> {
    if (!await this.isAvailable()) {
      console.warn('Unsplash API key not configured');
      return [];
    }

    try {
      const limit = options?.limit || 30;

      // Collect trending photos from multiple sources
      const allPhotos: RawContent[] = [];

      // 1. Editorial photos (curated trending)
      const editorial = await this.fetchEditorialPhotos(Math.ceil(limit / 3));
      allPhotos.push(...editorial);

      // 2. Popular photos
      const popular = await this.fetchPopularPhotos(Math.ceil(limit / 3));
      allPhotos.push(...popular);

      // 3. Topic-specific trending (e.g., fashion, nature, architecture)
      const topicPhotos = await this.fetchTopicPhotos('fashion', Math.ceil(limit / 3));
      allPhotos.push(...topicPhotos);

      // Deduplicate and limit
      const uniquePhotos = this.deduplicatePhotos(allPhotos);
      return uniquePhotos.slice(0, limit);
    } catch (error) {
      console.error('Unsplash collection failed:', error);
      return [];
    }
  }

  private async fetchEditorialPhotos(perPage: number): Promise<RawContent[]> {
    const url = new URL(`${this.baseUrl}/photos`);
    url.searchParams.append('order_by', 'popular');
    url.searchParams.append('per_page', Math.min(perPage, 30).toString());

    const photos = await this.fetchFromAPI(url.toString());
    return photos.map(photo => this.transformPhoto(photo));
  }

  private async fetchPopularPhotos(perPage: number): Promise<RawContent[]> {
    const url = new URL(`${this.baseUrl}/photos`);
    url.searchParams.append('order_by', 'latest');
    url.searchParams.append('per_page', Math.min(perPage, 30).toString());

    const photos = await this.fetchFromAPI(url.toString());
    return photos.map(photo => this.transformPhoto(photo));
  }

  private async fetchTopicPhotos(topicSlug: string, perPage: number): Promise<RawContent[]> {
    const url = new URL(`${this.baseUrl}/topics/${topicSlug}/photos`);
    url.searchParams.append('order_by', 'popular');
    url.searchParams.append('per_page', Math.min(perPage, 30).toString());

    try {
      const photos = await this.fetchFromAPI(url.toString());
      return photos.map(photo => this.transformPhoto(photo));
    } catch (error) {
      console.warn(`Failed to fetch ${topicSlug} topic:`, error);
      return [];
    }
  }

  private async fetchFromAPI(url: string): Promise<UnsplashPhoto[]> {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Client-ID ${this.accessKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.statusText}`);
    }

    return await response.json();
  }

  private transformPhoto(photo: UnsplashPhoto): RawContent {
    // Convert photo metadata to text representation for LLM analysis
    const textRepresentation = this.createTextRepresentation(photo);

    return this.createRawContent({
      source: this.name,
      url: photo.links.html,
      title: photo.description || photo.alt_description || `Photo by ${photo.user.name}`,
      body: textRepresentation,
      imageUrls: [photo.urls.regular],
      author: photo.user.name,
      engagement: {
        likes: photo.likes,
        views: photo.views || 0,
      },
      raw: {
        photoId: photo.id,
        tags: photo.tags?.map(t => t.title) || [],
        location: photo.location,
        exif: photo.exif,
        downloads: photo.downloads,
        highResUrl: photo.urls.full,
      },
    });
  }

  private createTextRepresentation(photo: UnsplashPhoto): string {
    const parts: string[] = [];

    // Description
    if (photo.description) {
      parts.push(`Description: ${photo.description}`);
    } else if (photo.alt_description) {
      parts.push(`Visual: ${photo.alt_description}`);
    }

    parts.push(`Photographer: ${photo.user.name} (@${photo.user.username})`);
    parts.push(`Published: ${new Date(photo.created_at).toLocaleDateString()}`);

    // Engagement
    parts.push('');
    parts.push('Engagement:');
    parts.push(`Likes: ${this.formatNumber(photo.likes)}`);
    if (photo.views) {
      parts.push(`Views: ${this.formatNumber(photo.views)}`);
    }
    if (photo.downloads) {
      parts.push(`Downloads: ${this.formatNumber(photo.downloads)}`);
    }

    // Tags (indicate visual trends)
    if (photo.tags && photo.tags.length > 0) {
      parts.push('');
      parts.push(`Visual themes: ${photo.tags.map(t => t.title).join(', ')}`);
    }

    // Location (cultural/geographic context)
    if (photo.location?.name) {
      parts.push('');
      parts.push(`Location: ${photo.location.name}`);
      if (photo.location.city && photo.location.country) {
        parts.push(`${photo.location.city}, ${photo.location.country}`);
      }
    }

    // Camera/technical info (indicates aesthetic style)
    if (photo.exif) {
      parts.push('');
      parts.push('Technical style:');
      if (photo.exif.make && photo.exif.model) {
        parts.push(`Camera: ${photo.exif.make} ${photo.exif.model}`);
      }
      if (photo.exif.aperture) {
        const aperture = parseFloat(photo.exif.aperture);
        const depthOfField = aperture < 2.8 ? 'shallow depth of field (bokeh effect)' :
                            aperture > 8 ? 'deep depth of field (everything in focus)' :
                            'moderate depth of field';
        parts.push(`Aperture: f/${photo.exif.aperture} (${depthOfField})`);
      }
      if (photo.exif.iso) {
        const lighting = photo.exif.iso < 400 ? 'bright lighting' :
                        photo.exif.iso < 1600 ? 'moderate lighting' :
                        'low light / moody';
        parts.push(`ISO: ${photo.exif.iso} (${lighting})`);
      }
    }

    // Aesthetic interpretation for LLM
    parts.push('');
    parts.push('[This image represents current visual aesthetics and photography trends]');

    return parts.join('\n');
  }

  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  }

  private deduplicatePhotos(photos: RawContent[]): RawContent[] {
    const seen = new Set<string>();
    return photos.filter(photo => {
      const photoId = photo.raw?.photoId;
      if (!photoId || seen.has(photoId)) {
        return false;
      }
      seen.add(photoId);
      return true;
    });
  }
}

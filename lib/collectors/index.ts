/**
 * Collector exports and initialization
 */

export { BaseCollector, CollectorRegistry, collectorRegistry } from './base';
export { NewsCollector } from './news';
export { RedditCollector } from './reddit';
export { SpotifyCollector } from './spotify';
export { YouTubeCollector } from './youtube';
export { UnsplashCollector } from './unsplash';
export { PexelsCollector } from './pexels';

import { collectorRegistry } from './base';
import { NewsCollector } from './news';
import { RedditCollector } from './reddit';
import { SpotifyCollector } from './spotify';
import { YouTubeCollector } from './youtube';
import { UnsplashCollector } from './unsplash';
import { PexelsCollector } from './pexels';

/**
 * Initialize and register all collectors
 *
 * Multi-modal collectors:
 * - Text: News, Reddit
 * - Audio: Spotify (music trends)
 * - Video: YouTube, Pexels (video content)
 * - Images: Unsplash (visual aesthetics)
 * - Multi-modal: Reddit (text + images)
 */
export function initializeCollectors() {
  // Text collectors
  collectorRegistry.register(new NewsCollector());
  collectorRegistry.register(new RedditCollector());

  // Audio collectors
  collectorRegistry.register(new SpotifyCollector());

  // Video collectors
  collectorRegistry.register(new YouTubeCollector());
  collectorRegistry.register(new PexelsCollector());

  // Image collectors
  collectorRegistry.register(new UnsplashCollector());
}

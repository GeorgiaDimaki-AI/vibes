/**
 * Collector exports and initialization
 */

export { BaseCollector, CollectorRegistry, collectorRegistry } from './base';
export { NewsCollector } from './news';
export { RedditCollector } from './reddit';

import { collectorRegistry } from './base';
import { NewsCollector } from './news';
import { RedditCollector } from './reddit';

/**
 * Initialize and register all collectors
 */
export function initializeCollectors() {
  collectorRegistry.register(new NewsCollector());
  collectorRegistry.register(new RedditCollector());
}

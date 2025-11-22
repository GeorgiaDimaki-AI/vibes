/**
 * Base collector implementations and registry
 */

import { Collector, CollectorOptions, RawContent } from '@/lib/types';

/**
 * Abstract base class for collectors
 * Extend this to create new collectors
 */
export abstract class BaseCollector implements Collector {
  abstract readonly name: string;
  abstract readonly description: string;

  abstract collect(options?: CollectorOptions): Promise<RawContent[]>;

  async isAvailable(): Promise<boolean> {
    return true; // Override in subclasses to check API keys, etc.
  }

  protected generateId(source: string, uniqueIdentifier: string): string {
    return `${source}-${uniqueIdentifier}-${Date.now()}`;
  }

  protected createRawContent(partial: Partial<RawContent> & { source: string }): RawContent {
    return {
      id: this.generateId(partial.source, partial.url || partial.title || ''),
      timestamp: new Date(),
      ...partial,
    } as RawContent;
  }
}

/**
 * Collector Registry
 * Manages all available collectors and provides a unified interface
 */
export class CollectorRegistry {
  private collectors: Map<string, Collector> = new Map();

  register(collector: Collector): void {
    this.collectors.set(collector.name, collector);
  }

  unregister(name: string): void {
    this.collectors.delete(name);
  }

  get(name: string): Collector | undefined {
    return this.collectors.get(name);
  }

  getAll(): Collector[] {
    return Array.from(this.collectors.values());
  }

  async getAvailable(): Promise<Collector[]> {
    const available: Collector[] = [];
    for (const collector of this.collectors.values()) {
      if (await collector.isAvailable()) {
        available.push(collector);
      }
    }
    return available;
  }

  async collectAll(options?: CollectorOptions): Promise<RawContent[]> {
    const available = await this.getAvailable();
    const results = await Promise.allSettled(
      available.map(collector => collector.collect(options))
    );

    const allContent: RawContent[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allContent.push(...result.value);
      } else {
        console.error('Collector failed:', result.reason);
      }
    }

    return allContent;
  }

  async collectFrom(names: string[], options?: CollectorOptions): Promise<RawContent[]> {
    const collectors = names
      .map(name => this.collectors.get(name))
      .filter((c): c is Collector => c !== undefined);

    const results = await Promise.allSettled(
      collectors.map(collector => collector.collect(options))
    );

    const allContent: RawContent[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allContent.push(...result.value);
      } else {
        console.error('Collector failed:', result.reason);
      }
    }

    return allContent;
  }
}

// Global registry instance
export const collectorRegistry = new CollectorRegistry();

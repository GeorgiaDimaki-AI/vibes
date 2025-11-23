import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseCollector, CollectorRegistry } from '../base';
import { Collector, CollectorOptions, RawContent } from '@/lib/types';

// Mock collector implementation for testing
class MockCollector extends BaseCollector {
  readonly name = 'mock';
  readonly description = 'Mock collector for testing';

  async collect(options?: CollectorOptions): Promise<RawContent[]> {
    return [
      this.createRawContent({
        source: 'mock',
        url: 'https://example.com/article-1',
        title: 'Test Article',
        body: 'Test content',
      }),
    ];
  }
}

// Mock collector that is not available
class UnavailableCollector extends BaseCollector {
  readonly name = 'unavailable';
  readonly description = 'Unavailable collector';

  async collect(): Promise<RawContent[]> {
    return [];
  }

  async isAvailable(): Promise<boolean> {
    return false;
  }
}

// Mock collector that throws errors
class ErrorCollector extends BaseCollector {
  readonly name = 'error';
  readonly description = 'Error collector';

  async collect(): Promise<RawContent[]> {
    throw new Error('Collection failed');
  }
}

describe('BaseCollector', () => {
  let collector: MockCollector;

  beforeEach(() => {
    collector = new MockCollector();
  });

  describe('isAvailable', () => {
    it('should return true by default', async () => {
      const available = await collector.isAvailable();
      expect(available).toBe(true);
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs with source and identifier', () => {
      const id1 = collector['generateId']('test-source', 'unique-1');
      const id2 = collector['generateId']('test-source', 'unique-2');

      expect(id1).toContain('test-source');
      expect(id1).toContain('unique-1');
      expect(id2).toContain('test-source');
      expect(id2).toContain('unique-2');
      expect(id1).not.toBe(id2);
    });

    it('should include timestamp for uniqueness', async () => {
      const id1 = collector['generateId']('source', 'id');
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 2));
      const id2 = collector['generateId']('source', 'id');

      expect(id1).not.toBe(id2); // Different timestamps
    });
  });

  describe('createRawContent', () => {
    it('should create raw content with required fields', () => {
      const content = collector['createRawContent']({
        source: 'test',
        url: 'https://example.com',
        title: 'Test Title',
        body: 'Test body',
      });

      expect(content.id).toBeDefined();
      expect(content.source).toBe('test');
      expect(content.url).toBe('https://example.com');
      expect(content.title).toBe('Test Title');
      expect(content.body).toBe('Test body');
      expect(content.timestamp).toBeInstanceOf(Date);
    });

    it('should generate ID from source and url', () => {
      const content = collector['createRawContent']({
        source: 'test',
        url: 'https://example.com',
      });

      expect(content.id).toContain('test');
      expect(content.id).toContain('https://example.com');
    });

    it('should fallback to title if no url', () => {
      const content = collector['createRawContent']({
        source: 'test',
        title: 'Test Title',
      });

      expect(content.id).toContain('test');
      expect(content.id).toContain('Test Title');
    });

    it('should use empty string as fallback identifier', () => {
      const content = collector['createRawContent']({
        source: 'test',
      });

      expect(content.id).toContain('test');
      expect(content.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('collect', () => {
    it('should collect content', async () => {
      const content = await collector.collect();

      expect(content).toHaveLength(1);
      expect(content[0].source).toBe('mock');
      expect(content[0].url).toBe('https://example.com/article-1');
    });
  });
});

describe('CollectorRegistry', () => {
  let registry: CollectorRegistry;
  let mockCollector: MockCollector;
  let unavailableCollector: UnavailableCollector;
  let errorCollector: ErrorCollector;

  beforeEach(() => {
    registry = new CollectorRegistry();
    mockCollector = new MockCollector();
    unavailableCollector = new UnavailableCollector();
    errorCollector = new ErrorCollector();
  });

  describe('register and get', () => {
    it('should register and retrieve collectors', () => {
      registry.register(mockCollector);
      const retrieved = registry.get('mock');

      expect(retrieved).toBe(mockCollector);
    });

    it('should return undefined for non-existent collector', () => {
      const retrieved = registry.get('non-existent');
      expect(retrieved).toBeUndefined();
    });

    it('should allow multiple collectors', () => {
      registry.register(mockCollector);
      registry.register(unavailableCollector);

      expect(registry.get('mock')).toBe(mockCollector);
      expect(registry.get('unavailable')).toBe(unavailableCollector);
    });

    it('should override collector with same name', () => {
      const collector1 = new MockCollector();
      const collector2 = new MockCollector();

      registry.register(collector1);
      registry.register(collector2);

      expect(registry.get('mock')).toBe(collector2);
    });
  });

  describe('unregister', () => {
    it('should unregister collectors', () => {
      registry.register(mockCollector);
      registry.unregister('mock');

      expect(registry.get('mock')).toBeUndefined();
    });

    it('should not error when unregistering non-existent collector', () => {
      expect(() => registry.unregister('non-existent')).not.toThrow();
    });
  });

  describe('getAll', () => {
    it('should return all registered collectors', () => {
      registry.register(mockCollector);
      registry.register(unavailableCollector);

      const all = registry.getAll();

      expect(all).toHaveLength(2);
      expect(all).toContain(mockCollector);
      expect(all).toContain(unavailableCollector);
    });

    it('should return empty array when no collectors', () => {
      const all = registry.getAll();
      expect(all).toEqual([]);
    });
  });

  describe('getAvailable', () => {
    it('should return only available collectors', async () => {
      registry.register(mockCollector);
      registry.register(unavailableCollector);

      const available = await registry.getAvailable();

      expect(available).toHaveLength(1);
      expect(available[0]).toBe(mockCollector);
    });

    it('should return empty array when no collectors available', async () => {
      registry.register(unavailableCollector);

      const available = await registry.getAvailable();
      expect(available).toEqual([]);
    });

    it('should check availability for each collector', async () => {
      const spy1 = vi.spyOn(mockCollector, 'isAvailable');
      const spy2 = vi.spyOn(unavailableCollector, 'isAvailable');

      registry.register(mockCollector);
      registry.register(unavailableCollector);

      await registry.getAvailable();

      expect(spy1).toHaveBeenCalled();
      expect(spy2).toHaveBeenCalled();
    });
  });

  describe('collectAll', () => {
    it('should collect from all available collectors', async () => {
      registry.register(mockCollector);

      const content = await registry.collectAll();

      expect(content).toHaveLength(1);
      expect(content[0].source).toBe('mock');
    });

    it('should skip unavailable collectors', async () => {
      registry.register(mockCollector);
      registry.register(unavailableCollector);

      const content = await registry.collectAll();

      expect(content).toHaveLength(1);
      expect(content[0].source).toBe('mock');
    });

    it('should handle collector errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      registry.register(mockCollector);
      registry.register(errorCollector);

      const content = await registry.collectAll();

      expect(content).toHaveLength(1); // Only successful collector
      expect(content[0].source).toBe('mock');
      expect(consoleSpy).toHaveBeenCalledWith('Collector failed:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should combine content from multiple collectors', async () => {
      const collector1 = new MockCollector();
      const collector2 = new MockCollector();
      (collector2 as any).name = 'mock2';

      registry.register(collector1);
      registry.register(collector2);

      const content = await registry.collectAll();

      expect(content.length).toBeGreaterThanOrEqual(2);
    });

    it('should pass options to collectors', async () => {
      const spy = vi.spyOn(mockCollector, 'collect');
      registry.register(mockCollector);

      const options: CollectorOptions = { limit: 10 };
      await registry.collectAll(options);

      expect(spy).toHaveBeenCalledWith(options);
    });

    it('should return empty array when no collectors available', async () => {
      registry.register(unavailableCollector);

      const content = await registry.collectAll();
      expect(content).toEqual([]);
    });
  });

  describe('collectFrom', () => {
    it('should collect from specified collectors', async () => {
      registry.register(mockCollector);
      registry.register(unavailableCollector);

      const content = await registry.collectFrom(['mock']);

      expect(content).toHaveLength(1);
      expect(content[0].source).toBe('mock');
    });

    it('should collect from multiple specified collectors', async () => {
      const collector1 = new MockCollector();
      const collector2 = new MockCollector();
      (collector2 as any).name = 'mock2';

      registry.register(collector1);
      registry.register(collector2);

      const content = await registry.collectFrom(['mock', 'mock2']);

      expect(content.length).toBeGreaterThanOrEqual(2);
    });

    it('should skip non-existent collectors', async () => {
      registry.register(mockCollector);

      const content = await registry.collectFrom(['mock', 'non-existent']);

      expect(content).toHaveLength(1);
      expect(content[0].source).toBe('mock');
    });

    it('should handle errors from individual collectors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      registry.register(mockCollector);
      registry.register(errorCollector);

      const content = await registry.collectFrom(['mock', 'error']);

      expect(content).toHaveLength(1);
      expect(content[0].source).toBe('mock');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should pass options to specified collectors', async () => {
      const spy = vi.spyOn(mockCollector, 'collect');
      registry.register(mockCollector);

      const options: CollectorOptions = { limit: 5 };
      await registry.collectFrom(['mock'], options);

      expect(spy).toHaveBeenCalledWith(options);
    });

    it('should return empty array when no valid collectors specified', async () => {
      registry.register(mockCollector);

      const content = await registry.collectFrom(['non-existent']);
      expect(content).toEqual([]);
    });

    it('should return empty array for empty collector list', async () => {
      registry.register(mockCollector);

      const content = await registry.collectFrom([]);
      expect(content).toEqual([]);
    });
  });
});

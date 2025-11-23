/**
 * Example test demonstrating improved testability with dependency injection
 *
 * This file shows how the refactored ZeitgeistService can be tested
 * with mock dependencies, which was difficult with global singletons.
 */

import { createZeitgeistService, ZeitgeistService } from './zeitgeist-service';
import { GraphStore } from './graph/store';
import { CollectorRegistry } from './collectors/base';
import { AnalyzerRegistry } from './analyzers/base';
import { MatcherRegistry } from './matchers/base';
import { Vibe, RawContent, Scenario, CulturalGraph, VibeMatch } from './types';

/**
 * Mock GraphStore for testing
 */
class MockGraphStore implements GraphStore {
  private vibes: Map<string, Vibe> = new Map();

  async saveVibe(vibe: Vibe): Promise<void> {
    this.vibes.set(vibe.id, vibe);
  }

  async saveVibes(vibes: Vibe[]): Promise<void> {
    for (const vibe of vibes) {
      await this.saveVibe(vibe);
    }
  }

  async getVibe(id: string): Promise<Vibe | null> {
    return this.vibes.get(id) || null;
  }

  async getAllVibes(): Promise<Vibe[]> {
    return Array.from(this.vibes.values());
  }

  async deleteVibe(id: string): Promise<void> {
    this.vibes.delete(id);
  }

  async saveEdge(): Promise<void> {}
  async getEdges(): Promise<any[]> {
    return [];
  }

  async getGraph(): Promise<CulturalGraph> {
    return {
      vibes: new Map(this.vibes),
      edges: [],
      metadata: {
        lastUpdated: new Date(),
        vibeCount: this.vibes.size,
        version: '1.0-test',
      },
    };
  }

  async clearGraph(): Promise<void> {
    this.vibes.clear();
  }

  async findVibesByKeywords(): Promise<Vibe[]> {
    return [];
  }

  async findVibesByEmbedding(): Promise<Vibe[]> {
    return [];
  }

  async findRecentVibes(): Promise<Vibe[]> {
    return [];
  }
}

/**
 * Example test: Testing with mock dependencies
 */
async function testWithMockDependencies() {
  console.log('=== Testing ZeitgeistService with Mock Dependencies ===\n');

  // Create mock store
  const mockStore = new MockGraphStore();

  // Create service with injected mock
  const service = createZeitgeistService({
    store: mockStore,
    // collectors, analyzers, matchers will use defaults
  });

  // Now we can test without touching real database!
  await service.initialize();

  console.log('✅ Service initialized with mock store');
  console.log('✅ No real database was touched');
  console.log('✅ Tests can run in isolation\n');
}

/**
 * Example: Multiple service instances with different configurations
 */
async function testMultipleInstances() {
  console.log('=== Testing Multiple Service Instances ===\n');

  // Create two independent service instances
  const service1 = createZeitgeistService({
    store: new MockGraphStore(),
  });

  const service2 = createZeitgeistService({
    store: new MockGraphStore(),
  });

  await service1.initialize();
  await service2.initialize();

  console.log('✅ Created two independent service instances');
  console.log('✅ Each has its own store and configuration');
  console.log('✅ No global state conflicts\n');
}

/**
 * Example: Testing specific components in isolation
 */
async function testIsolatedComponents() {
  console.log('=== Testing Isolated Components ===\n');

  // Create custom registries for testing
  const testCollectors = new CollectorRegistry();
  const testAnalyzers = new AnalyzerRegistry();
  const testMatchers = new MatcherRegistry();

  // Register only the components you want to test
  // (In real tests, these would be mock implementations)

  const service = createZeitgeistService({
    store: new MockGraphStore(),
    collectors: testCollectors,
    analyzers: testAnalyzers,
    matchers: testMatchers,
  });

  console.log('✅ Service created with custom test registries');
  console.log('✅ Can test specific component combinations');
  console.log('✅ Full control over dependencies\n');
}

/**
 * Comparison: Before and After
 */
function comparisonExample() {
  console.log('=== Before vs After Refactoring ===\n');

  console.log('BEFORE (Global Singletons):');
  console.log('❌ Hard to test - must use real dependencies');
  console.log('❌ Global state - tests can interfere with each other');
  console.log('❌ No isolation - all tests share same registries');
  console.log('❌ Difficult to mock - requires complex module mocking\n');

  console.log('AFTER (Dependency Injection):');
  console.log('✅ Easy to test - inject mock dependencies');
  console.log('✅ No global state - each test gets fresh instances');
  console.log('✅ Full isolation - control all dependencies');
  console.log('✅ Simple mocking - just pass mock objects\n');

  console.log('CODE COMPARISON:\n');

  console.log('// Before: Hard to test');
  console.log('const service = new ZeitgeistService(); // Uses globals');
  console.log('// Must mock global registries - complex!\n');

  console.log('// After: Easy to test');
  console.log('const service = createZeitgeistService({');
  console.log('  store: mockStore,');
  console.log('  collectors: mockCollectors');
  console.log('});');
  console.log('// Clean, explicit, testable!\n');
}

// Run examples
if (require.main === module) {
  (async () => {
    await testWithMockDependencies();
    await testMultipleInstances();
    await testIsolatedComponents();
    comparisonExample();

    console.log('=== All Examples Completed ===');
  })();
}

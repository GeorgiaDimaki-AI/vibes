/**
 * Main library exports
 */

// Types
export * from './types';

// Collectors
export {
  BaseCollector,
  CollectorRegistry,
  collectorRegistry,
  NewsCollector,
  RedditCollector,
  initializeCollectors,
} from './collectors';

// Analyzers
export {
  BaseAnalyzer,
  AnalyzerRegistry,
  analyzerRegistry,
  LLMAnalyzer,
  EmbeddingAnalyzer,
  initializeAnalyzers,
} from './analyzers';

// Matchers
export {
  BaseMatcher,
  MatcherRegistry,
  matcherRegistry,
  SemanticMatcher,
  LLMMatcher,
  initializeMatchers,
} from './matchers';

// Graph storage
export {
  GraphStore,
  PostgresGraphStore,
  MemoryGraphStore,
  graphStore,
  memoryStore,
  getGraphStore,
} from './graph';

// Main service
export { ZeitgeistService, zeitgeist } from './zeitgeist-service';

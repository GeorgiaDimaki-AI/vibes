/**
 * Analyzer exports and initialization
 */

export { BaseAnalyzer, AnalyzerRegistry, analyzerRegistry } from './base';
export { LLMAnalyzer } from './llm';
export { EmbeddingAnalyzer } from './embedding';

import { analyzerRegistry } from './base';
import { LLMAnalyzer } from './llm';
import { EmbeddingAnalyzer } from './embedding';

/**
 * Initialize and register all analyzers
 */
export function initializeAnalyzers() {
  analyzerRegistry.register(new LLMAnalyzer(), true); // Set as primary
  analyzerRegistry.register(new EmbeddingAnalyzer());
}

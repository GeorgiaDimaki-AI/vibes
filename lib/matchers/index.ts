/**
 * Matcher exports and initialization
 */

export { BaseMatcher, MatcherRegistry, matcherRegistry } from './base';
export { SemanticMatcher } from './semantic';
export { LLMMatcher } from './llm';
export { PersonalizedMatcher } from './personalized';

import { matcherRegistry } from './base';
import { SemanticMatcher } from './semantic';
import { LLMMatcher } from './llm';
import { PersonalizedMatcher } from './personalized';

/**
 * Initialize and register all matchers
 */
export function initializeMatchers() {
  matcherRegistry.register(new LLMMatcher(), true); // Set as default
  matcherRegistry.register(new SemanticMatcher());
  matcherRegistry.register(new PersonalizedMatcher());
}

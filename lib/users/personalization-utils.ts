/**
 * Personalization Utilities
 *
 * Helper functions for personalizing vibe matching based on user preferences.
 * These utilities support the PersonalizedMatcher by providing granular control
 * over filtering, boosting, and style adjustments.
 */

import { Vibe, UserProfile } from '@/lib/types';

/**
 * Calculate how well a vibe matches user interests
 *
 * Compares vibe keywords and description against user's declared interests.
 * Returns a score from 0 (no match) to 1 (perfect match).
 *
 * @param vibe - The vibe to check
 * @param interests - User's interest keywords
 * @returns Match score 0-1
 */
export function calculateInterestMatch(vibe: Vibe, interests: string[]): number {
  if (!interests || interests.length === 0) {
    return 0;
  }

  const lowerInterests = interests.map(i => i.toLowerCase());
  const vibeText = `${vibe.name} ${vibe.description} ${vibe.keywords.join(' ')}`.toLowerCase();

  let matchCount = 0;
  for (const interest of lowerInterests) {
    if (vibeText.includes(interest.toLowerCase())) {
      matchCount++;
    }
  }

  // Return proportion of interests that matched
  return matchCount / lowerInterests.length;
}

/**
 * Check if a vibe should be avoided based on user's topic preferences
 *
 * Checks if vibe contains any keywords or topics the user wants to avoid.
 * Uses fuzzy matching to catch related terms.
 *
 * @param vibe - The vibe to check
 * @param avoidTopics - Topics user wants to avoid
 * @returns true if vibe should be filtered out
 */
export function isTopicAvoided(vibe: Vibe, avoidTopics: string[]): boolean {
  if (!avoidTopics || avoidTopics.length === 0) {
    return false;
  }

  const lowerAvoidTopics = avoidTopics.map(t => t.toLowerCase());
  const vibeText = `${vibe.name} ${vibe.description} ${vibe.keywords.join(' ')}`.toLowerCase();

  // Also check domains
  const vibeDomains = (vibe.domains || []).map(d => d.toLowerCase());

  for (const avoidTopic of lowerAvoidTopics) {
    // Check if avoided topic appears in vibe text
    if (vibeText.includes(avoidTopic)) {
      return true;
    }

    // Check if avoided topic matches a domain
    if (vibeDomains.includes(avoidTopic)) {
      return true;
    }
  }

  return false;
}

/**
 * Get regional relevance score for a vibe
 *
 * Calculates how relevant a vibe is to a specific region using the vibe's
 * geography metadata. Returns 1.0 for global vibes or vibes without region data.
 *
 * @param vibe - The vibe to check
 * @param region - User's region preference
 * @returns Relevance score 0-1
 */
export function getRegionalRelevance(vibe: Vibe, region: string): number {
  // If no region data, treat as globally relevant
  if (!vibe.geography) {
    return 1.0;
  }

  // If vibe is marked as global, return full relevance
  if (vibe.geography.primary === 'Global') {
    return 1.0;
  }

  // If vibe has specific regional relevance scores
  if (vibe.geography.relevance && vibe.geography.relevance[region] !== undefined) {
    return vibe.geography.relevance[region];
  }

  // If vibe's primary region matches user's region
  if (vibe.geography.primary === region) {
    return 1.0;
  }

  // Otherwise, give it moderate relevance (still show it, just lower priority)
  return 0.3;
}

/**
 * Apply conversation style adjustments to advice text
 *
 * Modifies the tone and style of generated advice based on user preferences.
 * This is used in the advice generation prompt to customize the LLM's output.
 *
 * @param basePrompt - The base prompt to modify
 * @param style - User's preferred conversation style
 * @returns Style instruction to add to prompt
 */
export function getConversationStyleInstruction(style: string): string {
  const styleInstructions = {
    casual: 'Use a casual, friendly tone. Keep it conversational and approachable, like talking to a friend. Use contractions and natural language.',
    professional: 'Use a professional, polished tone. Be clear and articulate while maintaining warmth. Avoid slang or overly casual language.',
    academic: 'Use a thoughtful, analytical tone. Provide well-reasoned explanations with context. Be precise and informative.',
    friendly: 'Use a warm, encouraging tone. Be supportive and enthusiastic. Make the advice feel personal and caring.'
  };

  return styleInstructions[style as keyof typeof styleInstructions] || styleInstructions.casual;
}

/**
 * Check if a vibe is regionally relevant (helper for filtering)
 *
 * Determines if a vibe should be kept based on regional relevance threshold.
 * Uses soft filtering - vibes below threshold are not removed, just deprioritized.
 *
 * @param vibe - The vibe to check
 * @param region - User's region
 * @param threshold - Minimum relevance to keep (default: 0.2)
 * @returns true if vibe meets threshold
 */
export function meetsRegionalThreshold(vibe: Vibe, region: string, threshold = 0.2): boolean {
  const relevance = getRegionalRelevance(vibe, region);
  return relevance >= threshold;
}

/**
 * Calculate a combined personalization score for a vibe
 *
 * Combines multiple personalization factors into a single multiplier:
 * - Regional relevance
 * - Interest matching
 * - Topic avoidance (binary: 0 if avoided, 1 if not)
 *
 * @param vibe - The vibe to score
 * @param userProfile - User's profile with preferences
 * @returns Personalization multiplier (0-2.0)
 */
export function calculatePersonalizationScore(vibe: Vibe, userProfile: UserProfile): number {
  // If topic is avoided, return 0 immediately
  if (isTopicAvoided(vibe, userProfile.avoidTopics)) {
    return 0;
  }

  let score = 1.0; // Start at neutral

  // Apply regional boost/penalty
  if (userProfile.region) {
    const regionalRelevance = getRegionalRelevance(vibe, userProfile.region);
    // Regional relevance can boost (1.0-1.5x) or reduce (0.3-1.0x)
    score *= (0.5 + regionalRelevance);
  }

  // Apply interest boost
  if (userProfile.interests && userProfile.interests.length > 0) {
    const interestMatch = calculateInterestMatch(vibe, userProfile.interests);
    // Interest match can add up to 0.5x boost
    score *= (1.0 + (interestMatch * 0.5));
  }

  return score;
}

/**
 * Temporal Decay System
 *
 * Manages how vibes lose relevance over time
 * Different vibe categories have different half-lives
 */

import { Vibe, VibeCategory } from './types';

/**
 * Default half-life (in days) for different vibe categories
 * These are starting assumptions and can be tuned based on observation
 */
export const DEFAULT_HALF_LIVES: Record<VibeCategory, number> = {
  'meme': 3,           // Memes die quickly (3 days)
  'event': 7,          // Events relevant for a week
  'trend': 14,         // Trends last ~2 weeks
  'topic': 21,         // Topics remain relevant for ~3 weeks
  'sentiment': 30,     // Sentiments change slowly (1 month)
  'aesthetic': 60,     // Aesthetics evolve over months
  'movement': 90,      // Movements last longer (3 months)
  'custom': 14,        // Default for custom categories
};

/**
 * Calculate relevance decay using exponential decay
 *
 * Formula: currentRelevance = initialStrength * (0.5 ^ (daysSinceLastSeen / halfLife))
 *
 * This means:
 * - After 1 half-life: 50% relevance
 * - After 2 half-lives: 25% relevance
 * - After 3 half-lives: 12.5% relevance
 */
export function calculateDecay(vibe: Vibe, now: Date = new Date()): number {
  // BUG-001 FIX: Validate strength is within [0, 1]
  const strength = Math.max(0, Math.min(1, vibe.strength));

  const daysSinceLastSeen = (now.getTime() - vibe.lastSeen.getTime()) / (1000 * 60 * 60 * 24);

  // If seen very recently (< 1 hour), no decay
  if (daysSinceLastSeen < 1/24) {
    return strength;
  }

  // BUG-002 FIX: Use nullish coalescing to handle halfLife = 0
  const halfLife = vibe.halfLife ?? DEFAULT_HALF_LIVES[vibe.category] ?? 14;

  // Additional safety: prevent division by zero
  if (halfLife <= 0) {
    console.warn(`Invalid halfLife (${halfLife}) for vibe ${vibe.id}, using default`);
    return strength * 0.01; // Assume rapid decay
  }

  // Exponential decay formula
  const decayFactor = Math.pow(0.5, daysSinceLastSeen / halfLife);

  return strength * decayFactor;
}

/**
 * Apply decay to all vibes in a list
 */
export function applyDecayToVibes(vibes: Vibe[], now: Date = new Date()): Vibe[] {
  return vibes.map(vibe => ({
    ...vibe,
    currentRelevance: calculateDecay(vibe, now),
  }));
}

/**
 * Filter out vibes that have decayed below a threshold
 */
export function filterDecayedVibes(
  vibes: Vibe[],
  threshold = 0.05, // Remove vibes below 5% relevance
  now: Date = new Date()
): Vibe[] {
  return vibes.filter(vibe => {
    // PERF-001 FIX: Use cached currentRelevance if available
    const relevance = vibe.currentRelevance ?? calculateDecay(vibe, now);
    return relevance >= threshold;
  });
}

/**
 * Boost a vibe when it's seen again
 * This prevents good trends from dying if they keep appearing
 */
export function boostVibe(vibe: Vibe, boostAmount = 0.2): Vibe {
  return {
    ...vibe,
    lastSeen: new Date(),
    strength: Math.min(1.0, vibe.strength + boostAmount),
    currentRelevance: Math.min(1.0, vibe.currentRelevance + boostAmount),
  };
}

/**
 * Merge a new occurrence of a vibe with an existing one
 * This is called when we detect the same vibe again in new data
 */
export function mergeVibeOccurrence(existing: Vibe, newVibe: Vibe): Vibe {
  const now = new Date();

  // Calculate how much to boost based on time since last seen
  const daysSinceLastSeen = (now.getTime() - existing.lastSeen.getTime()) / (1000 * 60 * 60 * 24);
  const boostAmount = Math.min(0.3, 0.1 + (daysSinceLastSeen * 0.02)); // More boost if it's been a while

  return {
    ...existing,
    lastSeen: now,
    // BUG-003 FIX: Clamp both lower and upper bounds
    strength: Math.max(0, Math.min(1.0, existing.strength + boostAmount)),
    currentRelevance: Math.max(0, Math.min(1.0, calculateDecay(existing, now) + boostAmount)),
    keywords: Array.from(new Set([...existing.keywords, ...newVibe.keywords])),
    sources: Array.from(new Set([...existing.sources, ...newVibe.sources])),
    relatedVibes: Array.from(new Set([
      ...(existing.relatedVibes || []),
      ...(newVibe.relatedVibes || [])
    ])),
  };
}

/**
 * Get vibes sorted by current relevance (considering decay)
 */
export function sortByRelevance(vibes: Vibe[], now: Date = new Date()): Vibe[] {
  return vibes
    .map(vibe => ({
      ...vibe,
      currentRelevance: calculateDecay(vibe, now),
    }))
    .sort((a, b) => b.currentRelevance - a.currentRelevance);
}

/**
 * Get statistics about vibe ages and decay
 */
export function getTemporalStats(vibes: Vibe[], now: Date = new Date()) {
  if (vibes.length === 0) {
    return {
      totalVibes: 0,
      averageAge: 0,
      averageDaysSinceLastSeen: 0,
      averageRelevance: 0,
      highlyRelevant: 0,
      moderatelyRelevant: 0,
      lowRelevance: 0,
      decayed: 0,
    };
  }

  const ages = vibes.map(v => (now.getTime() - v.firstSeen.getTime()) / (1000 * 60 * 60 * 24));
  const recencies = vibes.map(v => (now.getTime() - v.lastSeen.getTime()) / (1000 * 60 * 60 * 24));
  const relevances = vibes.map(v => calculateDecay(v, now));

  return {
    totalVibes: vibes.length,
    averageAge: ages.reduce((a, b) => a + b, 0) / ages.length,
    averageDaysSinceLastSeen: recencies.reduce((a, b) => a + b, 0) / recencies.length,
    averageRelevance: relevances.reduce((a, b) => a + b, 0) / relevances.length,
    highlyRelevant: vibes.filter(v => calculateDecay(v, now) > 0.7).length,
    moderatelyRelevant: vibes.filter(v => {
      const rel = calculateDecay(v, now);
      return rel > 0.3 && rel <= 0.7;
    }).length,
    lowRelevance: vibes.filter(v => {
      const rel = calculateDecay(v, now);
      return rel > 0.05 && rel <= 0.3;
    }).length,
    decayed: vibes.filter(v => calculateDecay(v, now) <= 0.05).length,
  };
}

/**
 * Configure custom half-life for a vibe based on heuristics
 */
export function suggestHalfLife(vibe: Vibe): number {
  const baseHalfLife = DEFAULT_HALF_LIVES[vibe.category] || 14;

  // BUG-006 FIX: Clamp strength to [0, 1] before using
  const clampedStrength = Math.max(0, Math.min(1, vibe.strength));

  // Adjust based on strength - stronger vibes last longer
  const strengthMultiplier = 0.7 + (clampedStrength * 0.6); // 0.7 to 1.3

  // Adjust based on sentiment - controversial things die faster
  const sentimentMultiplier = vibe.sentiment === 'mixed' ? 0.8 : 1.0;

  // Adjust based on number of sources - more sources = more staying power
  const sourceMultiplier = Math.min(1.5, 1.0 + (vibe.sources.length * 0.05));

  const suggestedHalfLife = baseHalfLife * strengthMultiplier * sentimentMultiplier * sourceMultiplier;

  // BUG-007 FIX: Ensure minimum half-life of 1 day
  return Math.max(1, suggestedHalfLife);
}

/**
 * Calculate semantic similarity between two vibes using embeddings
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  const similarity = dotProduct / denominator;

  // BUG-005 FIX: Clamp to valid cosine similarity range [-1, 1]
  // (handles numerical errors in floating point arithmetic)
  return Math.max(-1, Math.min(1, similarity));
}

/**
 * Halo Effect: When a vibe reappears, boost semantically similar vibes
 *
 * Theory: If one vibe from a cultural cluster reappears, related vibes
 * in that cluster are likely to also become relevant soon. This creates
 * a "ripple effect" through the cultural graph.
 *
 * @param boostedVibe The vibe that was just boosted (reappeared)
 * @param allVibes All vibes in the graph
 * @param similarityThreshold Minimum similarity to apply halo (default: 0.6)
 * @param maxHaloBoost Maximum boost to apply (default: 0.15)
 * @returns Updated vibes with halo effect applied
 */
export function applyHaloEffect(
  boostedVibe: Vibe,
  allVibes: Vibe[],
  similarityThreshold = 0.6,
  maxHaloBoost = 0.15
): Vibe[] {
  if (!boostedVibe.embedding) {
    // Can't apply halo without embeddings
    return allVibes;
  }

  const now = new Date();

  return allVibes.map(vibe => {
    // Don't boost the vibe itself (already boosted)
    if (vibe.id === boostedVibe.id) {
      return vibe;
    }

    // Skip vibes without embeddings
    if (!vibe.embedding) {
      return vibe;
    }

    // Calculate semantic similarity
    const similarity = cosineSimilarity(boostedVibe.embedding, vibe.embedding);

    // Only apply halo if similarity is above threshold
    if (similarity < similarityThreshold) {
      return vibe;
    }

    // Calculate halo boost proportional to similarity
    // similarity of 1.0 → maxHaloBoost
    // similarity of threshold → small boost
    const normalizedSimilarity = (similarity - similarityThreshold) / (1 - similarityThreshold);
    const haloBoost = normalizedSimilarity * maxHaloBoost;

    // Apply the boost
    return {
      ...vibe,
      strength: Math.min(1.0, vibe.strength + haloBoost),
      currentRelevance: Math.min(1.0, vibe.currentRelevance + haloBoost),
      // BUG-004 FIX (CRITICAL): DO NOT update lastSeen for halo boosts
      // Halo-boosted vibes should still decay naturally since they weren't actually observed
      // Only strength and currentRelevance are boosted, lastSeen remains unchanged
      // This preserves the semantic correctness of temporal tracking
      // Track that this was a halo boost in metadata
      metadata: {
        ...vibe.metadata,
        lastHaloBoost: {
          from: boostedVibe.id,
          amount: haloBoost,
          similarity,
          timestamp: now.toISOString(),
        },
      },
    };
  });
}

/**
 * Apply halo effect for multiple boosted vibes
 * Useful when multiple vibes reappear in the same collection cycle
 */
export function applyMultipleHaloEffects(
  boostedVibes: Vibe[],
  allVibes: Vibe[],
  similarityThreshold = 0.6,
  maxHaloBoost = 0.15
): Vibe[] {
  let updatedVibes = [...allVibes];

  for (const boostedVibe of boostedVibes) {
    updatedVibes = applyHaloEffect(
      boostedVibe,
      updatedVibes,
      similarityThreshold,
      maxHaloBoost
    );
  }

  return updatedVibes;
}

/**
 * Find semantically similar vibes (useful for graph visualization and analysis)
 */
export function findSimilarVibes(
  targetVibe: Vibe,
  allVibes: Vibe[],
  topK = 10,
  minSimilarity = 0.5
): Array<{ vibe: Vibe; similarity: number }> {
  if (!targetVibe.embedding) {
    return [];
  }

  const similarities = allVibes
    .filter(v => v.id !== targetVibe.id && v.embedding)
    .map(vibe => ({
      vibe,
      similarity: cosineSimilarity(targetVibe.embedding!, vibe.embedding!),
    }))
    .filter(s => s.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  return similarities;
}


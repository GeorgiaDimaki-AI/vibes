/**
 * Regional Utilities
 * Helper functions for detecting and filtering vibes by geographic region
 */

import { Vibe, Region } from './types';

/**
 * Detect region from URL or content
 * This is a basic heuristic-based detector
 */
export function detectRegionFromUrl(url: string): Region | null {
  const urlLower = url.toLowerCase();

  // US regions
  if (
    urlLower.includes('techcrunch.com') ||
    urlLower.includes('reddit.com/r/sanfrancisco') ||
    urlLower.includes('reddit.com/r/bayarea') ||
    urlLower.includes('reddit.com/r/losangeles') ||
    urlLower.includes('reddit.com/r/seattle')
  ) {
    return 'US-West';
  }

  if (
    urlLower.includes('reddit.com/r/nyc') ||
    urlLower.includes('reddit.com/r/boston') ||
    urlLower.includes('reddit.com/r/washingtondc')
  ) {
    return 'US-East';
  }

  // EU regions
  if (
    urlLower.includes('.uk') ||
    urlLower.includes('bbc.') ||
    urlLower.includes('guardian.')
  ) {
    return 'EU-UK';
  }

  if (
    urlLower.includes('.de') ||
    urlLower.includes('.fr') ||
    urlLower.includes('euronews.')
  ) {
    return 'EU-Central';
  }

  // Default to Global for now
  return 'Global';
}

/**
 * Detect region from content text
 * Looks for location mentions
 */
export function detectRegionFromContent(text: string): Region[] {
  const textLower = text.toLowerCase();
  const regions: Set<Region> = new Set();

  // US West keywords
  const westKeywords = ['san francisco', 'silicon valley', 'sf bay', 'los angeles', 'seattle', 'portland', 'california'];
  if (westKeywords.some(kw => textLower.includes(kw))) {
    regions.add('US-West');
  }

  // US East keywords
  const eastKeywords = ['new york', 'nyc', 'boston', 'washington dc', 'philadelphia'];
  if (eastKeywords.some(kw => textLower.includes(kw))) {
    regions.add('US-East');
  }

  // UK keywords
  const ukKeywords = ['london', 'uk', 'united kingdom', 'britain', 'british'];
  if (ukKeywords.some(kw => textLower.includes(kw))) {
    regions.add('EU-UK');
  }

  // EU keywords
  const euKeywords = ['paris', 'berlin', 'europe', 'european', 'brussels'];
  if (euKeywords.some(kw => textLower.includes(kw))) {
    regions.add('EU-Central');
  }

  return Array.from(regions);
}

/**
 * Calculate default regional relevance for a vibe
 * Returns a map of regions to relevance scores
 */
export function calculateRegionalRelevance(
  primaryRegion: Region,
  detectedRegions: Region[]
): Record<string, number> {
  const relevance: Record<string, number> = {
    'Global': 0.5, // Default global relevance
  };

  // Primary region gets highest relevance
  relevance[primaryRegion] = 0.9;

  // Detected regions get medium-high relevance
  for (const region of detectedRegions) {
    if (region !== primaryRegion && region !== 'Global') {
      relevance[region] = 0.7;
    }
  }

  // Add regional proximity scores
  // e.g., US-West and US-East are related
  if (primaryRegion === 'US-West' || detectedRegions.includes('US-West')) {
    relevance['US-East'] = Math.max(relevance['US-East'] || 0, 0.4);
    relevance['US-Central'] = Math.max(relevance['US-Central'] || 0, 0.3);
  }

  if (primaryRegion === 'US-East' || detectedRegions.includes('US-East')) {
    relevance['US-West'] = Math.max(relevance['US-West'] || 0, 0.4);
    relevance['US-Central'] = Math.max(relevance['US-Central'] || 0, 0.3);
  }

  if (primaryRegion === 'EU-UK' || detectedRegions.includes('EU-UK')) {
    relevance['EU-Central'] = Math.max(relevance['EU-Central'] || 0, 0.6);
  }

  return relevance;
}

/**
 * Filter vibes by region with boosting
 * Returns vibes with relevance scores adjusted by regional preference
 */
export function filterVibesByRegion(
  vibes: Vibe[],
  preferredRegion: Region,
  boostFactor: number = 1.5
): Vibe[] {
  return vibes.map(vibe => {
    if (!vibe.geography) {
      // No geography data, return as-is
      return vibe;
    }

    const regionalRelevance = vibe.geography.relevance[preferredRegion] || 0.5;

    // Boost current relevance based on regional match
    const boostedRelevance = vibe.currentRelevance * (1 + (regionalRelevance - 0.5) * boostFactor);

    return {
      ...vibe,
      currentRelevance: Math.min(1, boostedRelevance), // Cap at 1
    };
  }).sort((a, b) => b.currentRelevance - a.currentRelevance);
}

/**
 * Get the most relevant region for a vibe
 */
export function getPrimaryRegion(vibe: Vibe): Region {
  if (!vibe.geography || !vibe.geography.relevance) {
    return 'Global';
  }

  let maxRelevance = 0;
  let primaryRegion: Region = 'Global';

  for (const [region, relevance] of Object.entries(vibe.geography.relevance)) {
    if (relevance > maxRelevance && region !== 'Global') {
      maxRelevance = relevance;
      primaryRegion = region as Region;
    }
  }

  return primaryRegion;
}

/**
 * Suggest region based on multiple content pieces
 */
export function suggestRegionFromContent(
  contents: Array<{ url?: string; text?: string }>
): { primary: Region; detected: Region[] } {
  const detectedRegions = new Set<Region>();

  for (const content of contents) {
    if (content.url) {
      const urlRegion = detectRegionFromUrl(content.url);
      if (urlRegion) {
        detectedRegions.add(urlRegion);
      }
    }

    if (content.text) {
      const textRegions = detectRegionFromContent(content.text);
      textRegions.forEach(r => detectedRegions.add(r));
    }
  }

  const detected = Array.from(detectedRegions);

  // If only Global was detected, keep it as primary
  if (detected.length === 0 || (detected.length === 1 && detected[0] === 'Global')) {
    return { primary: 'Global', detected: ['Global'] };
  }

  // Remove Global from detected if there are other regions
  const nonGlobalRegions = detected.filter(r => r !== 'Global');

  // Primary is the most frequently detected non-global region
  // For now, just use the first one (could be improved with frequency counting)
  const primary = nonGlobalRegions[0] || 'Global';

  return { primary, detected: nonGlobalRegions };
}

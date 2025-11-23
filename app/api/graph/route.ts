/**
 * Graph API endpoint
 * GET /api/graph - Get graph data for visualization
 */

import { NextResponse } from 'next/server';
import { zeitgeist } from '@/lib';
import { applyDecayToVibes } from '@/lib/temporal-decay';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const region = searchParams.get('region') || undefined;
    const category = searchParams.get('category') || undefined;

    // SECURITY: Validate and bound minRelevance parameter
    const minRelevanceParam = searchParams.get('minRelevance') || '0.1';
    const parsedMinRelevance = parseFloat(minRelevanceParam);

    if (isNaN(parsedMinRelevance)) {
      return NextResponse.json(
        { error: 'Invalid minRelevance parameter' },
        { status: 400 }
      );
    }

    // Clamp minRelevance between 0 and 1
    const minRelevance = Math.min(Math.max(parsedMinRelevance, 0), 1);

    const store = (zeitgeist as any).store;
    let vibes = await store.getAllVibes();

    // Apply temporal decay
    vibes = applyDecayToVibes(vibes);

    // Filter by minimum relevance
    vibes = vibes.filter((v: any) => v.currentRelevance >= minRelevance);

    // Filter by region if specified
    if (region && region !== 'Global') {
      vibes = vibes.filter((v: any) => {
        if (!v.geography) return false;
        return v.geography.relevance[region] && v.geography.relevance[region] > 0.3;
      });
    }

    // Filter by category if specified
    if (category) {
      vibes = vibes.filter((v: any) => v.category === category);
    }

    // Build nodes for D3
    const nodes = vibes.map((vibe: any) => ({
      id: vibe.id,
      name: vibe.name,
      category: vibe.category,
      strength: vibe.strength,
      currentRelevance: vibe.currentRelevance,
      sentiment: vibe.sentiment,
      region: vibe.geography?.primary || 'Global',
      keywords: vibe.keywords?.slice(0, 5) || [],
      description: vibe.description,
    }));

    // Build edges based on semantic similarity (halo connections)
    // For now, we'll create edges between vibes in the same category with high relevance
    const edges: Array<{ source: string; target: string; strength: number }> = [];
    const vibeMap = new Map(vibes.map((v: any) => [v.id, v]));

    for (let i = 0; i < vibes.length; i++) {
      for (let j = i + 1; j < vibes.length; j++) {
        const v1 = vibes[i];
        const v2 = vibes[j];

        // Create edge if:
        // 1. Same category, or
        // 2. Share keywords, or
        // 3. Same primary region (non-Global)
        const sameCategory = v1.category === v2.category;
        const sharedKeywords = v1.keywords?.some((k: string) =>
          v2.keywords?.includes(k)
        );
        const sameRegion = v1.geography?.primary === v2.geography?.primary &&
          v1.geography?.primary !== 'Global';

        if (sameCategory || sharedKeywords || sameRegion) {
          const strength = sameCategory ? 0.8 : (sharedKeywords ? 0.5 : 0.3);

          edges.push({
            source: v1.id,
            target: v2.id,
            strength,
          });
        }
      }
    }

    // Limit edges to prevent clutter (keep strongest connections)
    const sortedEdges = edges
      .sort((a, b) => b.strength - a.strength)
      .slice(0, Math.min(edges.length, nodes.length * 3)); // Max 3 edges per node on average

    return NextResponse.json({
      nodes,
      edges: sortedEdges,
      metadata: {
        totalVibes: vibes.length,
        filters: {
          region,
          minRelevance,
          category,
        },
      },
    });
  } catch (error) {
    console.error('Failed to get graph:', error);
    // SECURITY: Don't expose internal error details in production
    const isProduction = process.env.NODE_ENV === 'production';
    return NextResponse.json(
      {
        error: 'Failed to get graph data',
        details: isProduction ? undefined : (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 }
    );
  }
}

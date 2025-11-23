# Zeitgeist Code Navigation Guide

Your map to understanding and extending the Zeitgeist codebase.

## Table of Contents
- [Codebase Overview](#codebase-overview)
- [Key Files and Their Purposes](#key-files-and-their-purposes)
- [Data Flow Through the System](#data-flow-through-the-system)
- [Extension Points](#extension-points)
- [Common Tasks](#common-tasks)

## Codebase Overview

```
vibes/
├── app/                          # Next.js App Router (UI + API)
│   ├── api/                      # Backend API endpoints
│   │   ├── advice/route.ts       # POST - Generate advice
│   │   ├── collect/route.ts      # GET/POST - Trigger collection
│   │   ├── status/route.ts       # GET - Graph statistics
│   │   ├── search/route.ts       # GET - Search vibes
│   │   ├── graph/route.ts        # GET - Graph visualization data
│   │   └── cron/route.ts         # GET - Scheduled collection
│   ├── graph/page.tsx            # Graph visualization page
│   ├── page.tsx                  # Main chat interface
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles
│
├── lib/                          # Core business logic
│   ├── types/index.ts            # TypeScript interfaces
│   │
│   ├── zeitgeist-service.ts      # 🎯 MAIN ORCHESTRATOR
│   ├── temporal-decay.ts         # ⏰ Time-based relevance
│   ├── regional-utils.ts         # 🌍 Geographic detection
│   │
│   ├── llm/                      # LLM abstraction layer
│   │   ├── types.ts              # LLM interfaces
│   │   ├── lmstudio.ts           # LM Studio provider
│   │   ├── ollama.ts             # Ollama provider
│   │   ├── factory.ts            # Provider selection
│   │   └── index.ts              # Exports
│   │
│   ├── embeddings/               # Embedding abstraction layer
│   │   ├── types.ts              # Embedding interfaces
│   │   ├── openai.ts             # OpenAI embeddings
│   │   ├── ollama.ts             # Ollama embeddings
│   │   ├── factory.ts            # Provider selection
│   │   └── index.ts              # Exports
│   │
│   ├── collectors/               # 📥 Data collection plugins
│   │   ├── base.ts               # Base class + registry
│   │   ├── news.ts               # NewsAPI collector
│   │   ├── reddit.ts             # Reddit RSS collector
│   │   └── index.ts              # Initialization
│   │
│   ├── analyzers/                # 🔍 Vibe extraction plugins
│   │   ├── base.ts               # Base class + registry
│   │   ├── llm.ts                # LLM-based analysis
│   │   ├── embedding.ts          # Clustering-based analysis
│   │   └── index.ts              # Initialization
│   │
│   ├── matchers/                 # 🎯 Scenario matching plugins
│   │   ├── base.ts               # Base class + registry
│   │   ├── llm.ts                # LLM reasoning matcher
│   │   ├── semantic.ts           # Embedding similarity matcher
│   │   └── index.ts              # Initialization
│   │
│   ├── graph/                    # 💾 Storage layer
│   │   ├── store.ts              # Storage interface
│   │   ├── postgres.ts           # Postgres + pgvector
│   │   ├── memory.ts             # In-memory store
│   │   └── index.ts              # Factory + auto-detection
│   │
│   └── index.ts                  # Library exports
│
├── components/                   # React components
│   └── graph/                    # Graph visualization
│       ├── ForceGraph.tsx        # D3.js force-directed graph
│       └── GraphControls.tsx     # Filter controls
│
├── docs/                         # Documentation
│   ├── ARCHITECTURE.md           # Technical architecture
│   ├── DEPLOYMENT.md             # Deployment guide
│   ├── PROJECT_OVERVIEW.md       # Project overview
│   └── FUTURE_DIRECTIONS.md      # Roadmap
│
├── claude_docs/                  # Developer guides (this file!)
│
├── .env.local                    # Your config (not in git)
├── .env.example                  # Example config
├── vercel.json                   # Vercel configuration
├── package.json                  # Dependencies
└── tsconfig.json                 # TypeScript config
```

## Key Files and Their Purposes

### Core Orchestration

#### `lib/zeitgeist-service.ts` - The Brain
**What it does:** Orchestrates the entire system

**Key methods:**
- `updateGraph()` - Collects data, analyzes vibes, applies decay, saves to store
- `getAdvice(scenario)` - Matches scenario to vibes, generates recommendations
- `getGraphStatus()` - Returns statistics about the cultural graph
- `searchVibes(query)` - Semantic search across vibes

**When to modify:**
- Adding new orchestration logic
- Changing the collection/analysis pipeline
- Modifying advice generation flow

**Example: Adding pre-processing step**
```typescript
// In updateGraph(), after collecting:
async updateGraph() {
  const rawContent = await collectorRegistry.collectAll();

  // ADD: Pre-process content
  const filteredContent = rawContent.filter(c => c.body.length > 100);

  const newVibes = await analyzerRegistry.analyzeWithPrimary(filteredContent);
  // ... rest of method
}
```

#### `lib/temporal-decay.ts` - Time Logic
**What it does:** All time-based calculations for vibe relevance

**Key functions:**
- `calculateDecay(vibe)` - Calculate current relevance based on time
- `applyDecayToVibes(vibes)` - Apply decay to all vibes
- `filterDecayedVibes(vibes)` - Remove vibes below threshold
- `mergeVibeOccurrence(existing, new)` - Boost when vibe reappears
- `applyHaloEffect(boosted, all)` - Ripple effect to similar vibes
- `suggestHalfLife(vibe)` - Smart half-life calculation

**When to modify:**
- Changing decay formula
- Adjusting category half-lives
- Modifying halo effect strength
- Adding new temporal features

**Example: Modify decay formula**
```typescript
// Current: exponential decay
export function calculateDecay(vibe: Vibe, now: Date = new Date()): number {
  const daysSince = (now.getTime() - vibe.lastSeen.getTime()) / (1000 * 60 * 60 * 24);
  const halfLife = vibe.halfLife || DEFAULT_HALF_LIVES[vibe.category] || 14;

  // Change this formula:
  const decayFactor = Math.pow(0.5, daysSince / halfLife);

  return vibe.strength * decayFactor;
}

// Example: Linear decay instead
const decayFactor = Math.max(0, 1 - (daysSince / (halfLife * 2)));
```

#### `lib/types/index.ts` - Type Definitions
**What it does:** Defines all interfaces and types

**Key types:**
- `Vibe` - The fundamental cultural unit
- `RawContent` - Collected data before analysis
- `Scenario` - User input for advice
- `Advice` - Generated recommendations
- `CulturalGraph` - Graph structure
- `Collector` / `Analyzer` / `Matcher` - Plugin interfaces

**When to modify:**
- Adding new fields to vibes
- Creating new plugin types
- Adding new metadata structures

### API Routes

#### `app/api/advice/route.ts`
```typescript
POST /api/advice
Request: { description, context?, preferences? }
Response: { scenario, matchedVibes, recommendations, reasoning, confidence }
```

#### `app/api/collect/route.ts`
```typescript
GET/POST /api/collect
Request: { options?: { limit, since, keywords } }
Response: { success, vibesAdded, message }
```

#### `app/api/status/route.ts`
```typescript
GET /api/status
Response: { totalVibes, categories, temporal, topVibes }
```

#### `app/api/search/route.ts`
```typescript
GET /api/search?q=query&limit=20
Response: { vibes: [...] }
```

#### `app/api/graph/route.ts`
```typescript
GET /api/graph?region=US-West&category=trend&minRelevance=0.1
Response: { nodes: [...], edges: [...], metadata }
```

### Plugin System

#### Collectors: `lib/collectors/`

**Purpose:** Fetch raw data from external sources

**Base class:** `BaseCollector` in `base.ts`
**Registry:** `collectorRegistry` (singleton)

**Available collectors:**
- `NewsCollector` (`news.ts`) - NewsAPI integration
- `RedditCollector` (`reddit.ts`) - Reddit RSS scraping

**Interface:**
```typescript
interface Collector {
  readonly name: string;
  readonly description: string;
  collect(options?: CollectorOptions): Promise<RawContent[]>;
  isAvailable(): Promise<boolean>;
}
```

#### Analyzers: `lib/analyzers/`

**Purpose:** Transform raw content into vibes

**Base class:** `BaseAnalyzer` in `base.ts`
**Registry:** `analyzerRegistry` (singleton)

**Available analyzers:**
- `LLMAnalyzer` (`llm.ts`) - Uses local LLM to extract vibes
- `EmbeddingAnalyzer` (`embedding.ts`) - Clustering approach

**Interface:**
```typescript
interface Analyzer {
  readonly name: string;
  readonly description: string;
  analyze(content: RawContent[]): Promise<Vibe[]>;
  update?(existing: Vibe[], new: RawContent[]): Promise<Vibe[]>;
}
```

#### Matchers: `lib/matchers/`

**Purpose:** Find relevant vibes for a scenario

**Base class:** `BaseMatcher` in `base.ts`
**Registry:** `matcherRegistry` (singleton)

**Available matchers:**
- `LLMMatcher` (`llm.ts`) - Deep reasoning about relevance
- `SemanticMatcher` (`semantic.ts`) - Embedding similarity

**Interface:**
```typescript
interface Matcher {
  readonly name: string;
  readonly description: string;
  match(scenario: Scenario, graph: CulturalGraph): Promise<VibeMatch[]>;
}
```

### Storage Layer

#### `lib/graph/store.ts` - Interface
Defines the storage contract all implementations must follow.

#### `lib/graph/postgres.ts` - Postgres Implementation
Production storage with pgvector for similarity search.

#### `lib/graph/memory.ts` - In-Memory Implementation
Development/testing storage (data lost on restart).

#### `lib/graph/index.ts` - Factory
Auto-detects which store to use based on environment variables.

## Data Flow Through the System

### Collection → Storage Flow

```
1. User/Cron triggers: POST /api/collect
   ↓
2. zeitgeist.updateGraph()
   ↓
3. collectorRegistry.collectAll()
   ↓ News Collector + Reddit Collector run in parallel
   ↓
4. RawContent[] (20-50 items)
   ↓
5. analyzerRegistry.analyzeWithPrimary(rawContent)
   ↓ LLM batches content (10 items at a time)
   ↓ Sends to local LLM for analysis
   ↓
6. Vibe[] (5-10 vibes extracted)
   ↓
7. ensureEmbeddings(vibes)
   ↓ Generate embeddings for vibes without them
   ↓
8. Vibe[] with embeddings
   ↓
9. analyzer.update(existing, new)
   ↓ Merge new vibes with existing
   ↓ Apply halo effect to similar vibes
   ↓
10. Merged Vibe[]
    ↓
11. applyDecayToVibes(vibes)
    ↓ Calculate current relevance
    ↓
12. filterDecayedVibes(vibes, 0.05)
    ↓ Remove vibes below 5% relevance
    ↓
13. Active Vibe[]
    ↓
14. store.saveVibes(vibes)
    ↓
15. Postgres/Memory storage
```

### Query → Advice Flow

```
1. User submits scenario: POST /api/advice
   ↓
2. zeitgeist.getAdvice(scenario)
   ↓
3. store.getGraph()
   ↓ Loads all vibes from storage
   ↓
4. CulturalGraph { vibes, edges, metadata }
   ↓
5. matcherRegistry.matchWithDefault(scenario, graph)
   ↓ Semantic matcher: embedding similarity
   ↓ LLM matcher: reasoning about relevance
   ↓
6. VibeMatch[] (top 10-15 matches with scores)
   ↓
7. generateAdvice(scenario, matches)
   ↓ Constructs prompt with scenario + matched vibes
   ↓ Sends to local LLM
   ↓
8. LLM generates structured advice
   ↓
9. Parse JSON from LLM response
   ↓
10. Advice { topics, behavior, style, reasoning }
    ↓
11. Return to user
```

## Extension Points

### 1. Adding a New Collector

**File to create:** `lib/collectors/your-collector.ts`

```typescript
import { BaseCollector } from './base';
import { CollectorOptions, RawContent } from '@/lib/types';

export class TwitterCollector extends BaseCollector {
  readonly name = 'twitter';
  readonly description = 'Collects trending tweets from Twitter API';

  async isAvailable(): Promise<boolean> {
    return !!process.env.TWITTER_API_KEY;
  }

  async collect(options?: CollectorOptions): Promise<RawContent[]> {
    // 1. Fetch from external API
    const tweets = await fetchTwitterAPI();

    // 2. Transform to RawContent format
    return tweets.map(tweet => this.createRawContent({
      source: this.name,
      url: tweet.url,
      title: tweet.text.slice(0, 100),
      body: tweet.text,
      timestamp: new Date(tweet.created_at),
      author: tweet.author.username,
      engagement: {
        likes: tweet.like_count,
        shares: tweet.retweet_count,
      },
    }));
  }
}
```

**File to modify:** `lib/collectors/index.ts`

```typescript
import { TwitterCollector } from './twitter';

export function initializeCollectors() {
  collectorRegistry.register(new NewsCollector());
  collectorRegistry.register(new RedditCollector());
  collectorRegistry.register(new TwitterCollector()); // ADD THIS
}
```

**Environment variable:** Add to `.env.local`
```bash
TWITTER_API_KEY=your_key_here
```

### 2. Adding a New Analyzer

**File to create:** `lib/analyzers/clustering.ts`

```typescript
import { BaseAnalyzer } from './base';
import { RawContent, Vibe } from '@/lib/types';
import { getEmbeddingProvider } from '@/lib/embeddings';

export class ClusteringAnalyzer extends BaseAnalyzer {
  readonly name = 'clustering';
  readonly description = 'Groups content by semantic similarity using k-means';

  async analyze(content: RawContent[]): Promise<Vibe[]> {
    // 1. Generate embeddings for all content
    const embedder = await getEmbeddingProvider();
    const texts = content.map(c => `${c.title} ${c.body}`);
    const embeddings = await embedder.generateEmbeddings(texts);

    // 2. Cluster embeddings (k-means or similar)
    const clusters = performClustering(embeddings, 5);

    // 3. Create vibe for each cluster
    return clusters.map(cluster => {
      const clusterContent = cluster.indices.map(i => content[i]);

      return this.createVibe({
        name: `Cluster ${cluster.id}`,
        description: this.summarizeCluster(clusterContent),
        category: 'topic',
        keywords: this.extractKeywords(clusterContent),
        strength: cluster.coherence,
        sentiment: 'neutral',
        sources: clusterContent.map(c => c.url).filter(Boolean),
        firstSeen: new Date(),
        lastSeen: new Date(),
        currentRelevance: cluster.coherence,
      });
    });
  }
}
```

**File to modify:** `lib/analyzers/index.ts`

```typescript
import { ClusteringAnalyzer } from './clustering';

export function initializeAnalyzers() {
  analyzerRegistry.register(new LLMAnalyzer(), true); // true = primary
  analyzerRegistry.register(new EmbeddingAnalyzer());
  analyzerRegistry.register(new ClusteringAnalyzer()); // ADD THIS
}
```

### 3. Adding a New Matcher

**File to create:** `lib/matchers/hybrid.ts`

```typescript
import { BaseMatcher } from './base';
import { Scenario, CulturalGraph, VibeMatch } from '@/lib/types';

export class HybridMatcher extends BaseMatcher {
  readonly name = 'hybrid';
  readonly description = 'Combines semantic + LLM matching';

  async match(scenario: Scenario, graph: CulturalGraph): Promise<VibeMatch[]> {
    // 1. Get semantic matches
    const semanticMatcher = new SemanticMatcher();
    const semanticMatches = await semanticMatcher.match(scenario, graph);

    // 2. Get LLM matches
    const llmMatcher = new LLMMatcher();
    const llmMatches = await llmMatcher.match(scenario, graph);

    // 3. Combine scores (weighted average)
    const combined = this.combineMatches(semanticMatches, llmMatches, {
      semanticWeight: 0.4,
      llmWeight: 0.6,
    });

    return combined.slice(0, 15); // Top 15
  }

  private combineMatches(
    semantic: VibeMatch[],
    llm: VibeMatch[],
    weights: { semanticWeight: number; llmWeight: number }
  ): VibeMatch[] {
    const scoreMap = new Map<string, VibeMatch>();

    // Aggregate scores
    for (const match of semantic) {
      scoreMap.set(match.vibe.id, {
        ...match,
        relevanceScore: match.relevanceScore * weights.semanticWeight,
      });
    }

    for (const match of llm) {
      const existing = scoreMap.get(match.vibe.id);
      if (existing) {
        existing.relevanceScore += match.relevanceScore * weights.llmWeight;
      } else {
        scoreMap.set(match.vibe.id, {
          ...match,
          relevanceScore: match.relevanceScore * weights.llmWeight,
        });
      }
    }

    return Array.from(scoreMap.values())
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
}
```

**File to modify:** `lib/matchers/index.ts`

```typescript
import { HybridMatcher } from './hybrid';

export function initializeMatchers() {
  matcherRegistry.register(new SemanticMatcher(), true); // true = default
  matcherRegistry.register(new LLMMatcher());
  matcherRegistry.register(new HybridMatcher()); // ADD THIS
}
```

### 4. Modifying Decay Parameters

**File to modify:** `lib/temporal-decay.ts`

**Change half-lives:**
```typescript
export const DEFAULT_HALF_LIVES: Record<VibeCategory, number> = {
  'meme': 1,           // Was 3, now 1 day (faster decay)
  'event': 5,          // Was 7
  'trend': 10,         // Was 14
  'topic': 21,         // Unchanged
  'sentiment': 45,     // Was 30 (slower decay)
  'aesthetic': 90,     // Was 60
  'movement': 180,     // Was 90
  'custom': 14,
};
```

**Change decay formula:**
```typescript
export function calculateDecay(vibe: Vibe, now: Date = new Date()): number {
  const daysSince = (now.getTime() - vibe.lastSeen.getTime()) / (1000 * 60 * 60 * 24);
  const halfLife = vibe.halfLife || DEFAULT_HALF_LIVES[vibe.category] || 14;

  // Option 1: Exponential (current)
  const decayFactor = Math.pow(0.5, daysSince / halfLife);

  // Option 2: Linear
  // const decayFactor = Math.max(0, 1 - (daysSince / (halfLife * 2)));

  // Option 3: Logarithmic
  // const decayFactor = 1 / (1 + Math.log(1 + daysSince / halfLife));

  return vibe.strength * decayFactor;
}
```

**Adjust halo effect:**
```typescript
export function applyHaloEffect(
  boostedVibe: Vibe,
  allVibes: Vibe[],
  similarityThreshold = 0.5,  // Was 0.6 (more permissive)
  maxHaloBoost = 0.25         // Was 0.15 (stronger boost)
): Vibe[] {
  // ... implementation
}
```

### 5. Adding New API Routes

**File to create:** `app/api/your-route/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { zeitgeist } from '@/lib';

// GET /api/your-route
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const param = searchParams.get('param');

    // Your logic here
    const result = await zeitgeist.yourMethod(param);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Route failed:', error);
    return NextResponse.json(
      { error: 'Failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

// POST /api/your-route
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Your logic here
    const result = await zeitgeist.yourMethod(body);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Route failed:', error);
    return NextResponse.json(
      { error: 'Failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
```

## Common Tasks

### Task 1: Change LLM Model

**File:** `.env.local`

```bash
# For LM Studio
LMSTUDIO_MODEL=mixtral-8x7b-instruct  # Change this

# For Ollama
OLLAMA_MODEL=mistral:7b-instruct      # Change this
```

Restart the server after changing.

### Task 2: Add a New Vibe Category

**File:** `lib/types/index.ts`

```typescript
export type VibeCategory =
  | 'trend'
  | 'topic'
  | 'aesthetic'
  | 'sentiment'
  | 'event'
  | 'movement'
  | 'meme'
  | 'technology'    // ADD NEW CATEGORIES
  | 'culture'       // ADD NEW CATEGORIES
  | 'custom';
```

**File:** `lib/temporal-decay.ts`

```typescript
export const DEFAULT_HALF_LIVES: Record<VibeCategory, number> = {
  'meme': 3,
  'event': 7,
  'trend': 14,
  'topic': 21,
  'sentiment': 30,
  'aesthetic': 60,
  'movement': 90,
  'technology': 10,  // ADD HALF-LIFE
  'culture': 30,     // ADD HALF-LIFE
  'custom': 14,
};
```

### Task 3: Add Regional Detection Logic

**File:** `lib/regional-utils.ts` (read this file for current implementation)

Add new region detection patterns or modify existing ones.

### Task 4: Customize Advice Prompt

**File:** `lib/zeitgeist-service.ts`

**Method:** `generateAdvice()`

```typescript
private async generateAdvice(scenario: Scenario, matches: any[]): Promise<Advice> {
  const prompt = `You are a cultural advisor...

SCENARIO:
${scenario.description}

RELEVANT VIBES:
${matches.map(m => `...`).join('\n\n')}

// MODIFY THIS SECTION:
Based on these vibes, provide specific, actionable advice:

1. TOPICS TO DISCUSS (5-7 topics instead of 3-5)
2. BEHAVIOR RECOMMENDATIONS (conversation style, energy level, body language)
3. STYLE RECOMMENDATIONS (clothing, accessories, colors, brands)
4. CONVERSATION STARTERS (new section)

// ... rest of prompt
`;
```

### Task 5: Add New Embedding Model

**File:** `lib/embeddings/factory.ts`

```typescript
export async function getEmbeddingProvider(): Promise<EmbeddingProvider> {
  const provider = process.env.EMBEDDING_PROVIDER || 'ollama';

  if (provider === 'ollama') {
    return new OllamaEmbeddingProvider();
  } else if (provider === 'openai') {
    return new OpenAIEmbeddingProvider();
  } else if (provider === 'custom') {  // ADD NEW PROVIDER
    return new CustomEmbeddingProvider();
  }

  // fallback
  return new OllamaEmbeddingProvider();
}
```

**File to create:** `lib/embeddings/custom.ts`

```typescript
import { EmbeddingProvider } from './types';

export class CustomEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'custom';

  async generateEmbedding(text: string): Promise<number[]> {
    // Your implementation
  }

  async generateEmbeddings(texts: string[], options?: any): Promise<number[][]> {
    // Your implementation
  }
}
```

### Task 6: Change Collection Schedule

**File:** `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "0 * * * *"  // Every hour
      // "schedule": "0 */6 * * *"  // Every 6 hours
      // "schedule": "0 0 * * *"     // Once per day
      // "schedule": "*/30 * * * *"  // Every 30 minutes
    }
  ]
}
```

### Task 7: Add Custom Metadata to Vibes

**File:** `lib/types/index.ts`

```typescript
export interface Vibe {
  // ... existing fields

  // ADD YOUR CUSTOM FIELDS:
  customScore?: number;
  aiGenerated?: boolean;
  userTags?: string[];

  // OR use metadata:
  metadata?: Record<string, any>; // Already exists, add your data here
}
```

**File:** `lib/analyzers/llm.ts` (or your analyzer)

```typescript
const vibe = this.createVibe({
  ...ev,
  // ADD CUSTOM FIELDS:
  customScore: calculateCustomScore(ev),
  metadata: {
    analyzedBy: 'llm-v2',
    confidence: 0.9,
    yourCustomField: 'value',
  },
});
```

### Task 8: Modify Graph Visualization

**File:** `components/graph/ForceGraph.tsx`

Change colors, sizes, or physics:

```typescript
// Node colors by category
const colorScale = {
  trend: '#3b82f6',      // blue
  topic: '#10b981',      // green
  aesthetic: '#8b5cf6',  // purple
  sentiment: '#f59e0b',  // amber
  event: '#ef4444',      // red
  movement: '#ec4899',   // pink
  meme: '#14b8a6',       // teal
  custom: '#6b7280',     // gray
};

// Force simulation parameters
d3.forceSimulation(nodes)
  .force('charge', d3.forceManyBody().strength(-200))  // Change repulsion
  .force('link', d3.forceLink(links).distance(100))    // Change link distance
  .force('center', d3.forceCenter(width / 2, height / 2));
```

### Task 9: Add Logging/Monitoring

**File:** `lib/zeitgeist-service.ts`

```typescript
async updateGraph() {
  console.log('[MONITOR] Collection started at', new Date().toISOString());

  const startTime = Date.now();
  const rawContent = await collectorRegistry.collectAll();

  console.log('[MONITOR] Collected', rawContent.length, 'items in', Date.now() - startTime, 'ms');

  // Add more logging as needed
}
```

Or integrate a service like Sentry, LogRocket, etc.

### Task 10: Add Vibe Filtering/Validation

**File:** `lib/zeitgeist-service.ts`

In `updateGraph()`, after analysis:

```typescript
// Filter out low-quality vibes
const qualityVibes = newVibes.filter(vibe => {
  // Must have description
  if (!vibe.description || vibe.description.length < 20) return false;

  // Must have keywords
  if (!vibe.keywords || vibe.keywords.length < 3) return false;

  // Must have reasonable strength
  if (vibe.strength < 0.3) return false;

  // Custom validation
  if (yourCustomValidation(vibe)) return false;

  return true;
});
```

## Quick Reference

### Important Constants

- **Batch size for LLM:** 10 items (in analyzers)
- **Decay threshold:** 0.05 (5% relevance)
- **Halo similarity threshold:** 0.6
- **Halo max boost:** 0.15
- **Default half-life:** 14 days
- **Top matches returned:** 10-15

### Key Registry Methods

```typescript
// Collectors
collectorRegistry.register(collector, isPrimary?)
collectorRegistry.collectAll(options?)
collectorRegistry.get(name)

// Analyzers
analyzerRegistry.register(analyzer, isPrimary?)
analyzerRegistry.analyzeWithPrimary(content)
analyzerRegistry.get(name)

// Matchers
matcherRegistry.register(matcher, isDefault?)
matcherRegistry.matchWithDefault(scenario, graph)
matcherRegistry.get(name)
```

### Environment Variable Patterns

```bash
# Provider selection
{PROVIDER}_PROVIDER=provider_name

# Provider configuration
{PROVIDER}_{PARAM}=value

# API keys
{SERVICE}_API_KEY=key

# Feature flags
ENABLE_{FEATURE}=true
```

## Navigation Tips

1. **Start with types:** `lib/types/index.ts` - understand the data model
2. **Follow the flow:** `lib/zeitgeist-service.ts` - see how it all connects
3. **Check registries:** `lib/*/index.ts` - see what plugins are available
4. **Read base classes:** `lib/*/base.ts` - understand plugin architecture
5. **Look at API routes:** `app/api/*/route.ts` - see external interface
6. **Reference docs:** `docs/ARCHITECTURE.md` - deep technical details

## Getting Help

If you're stuck:
1. Check inline comments in the file you're modifying
2. Look for similar implementations in other plugins
3. Read the type definitions for interfaces
4. Check console logs for runtime behavior
5. Review tests (once added)

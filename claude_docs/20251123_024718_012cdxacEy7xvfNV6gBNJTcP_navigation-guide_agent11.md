# Zeitgeist Code Navigation Guide

**Your complete map to navigating and extending the Zeitgeist codebase.**

Version: 1.0
Date: 2025-11-23
Audience: Mid-level developers

---

## Table of Contents

1. [Quick Start (30 Minutes to First Contribution)](#quick-start-30-minutes-to-first-contribution)
2. [Codebase Tour](#codebase-tour)
3. [How to Add Features](#how-to-add-features)
4. [Code Patterns](#code-patterns)
5. [Common Tasks](#common-tasks)

---

## Quick Start (30 Minutes to First Contribution)

### Minute 0-5: Setup

```bash
# Clone and install
git clone <repo>
cd vibes
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local - add LLM config
```

### Minute 5-10: Understand the Flow

**Data Flow:**
```
1. Collectors → Gather raw content (news, reddit)
2. Analyzers → Extract vibes from content (using LLM)
3. Graph Store → Save vibes with embeddings
4. Matchers → Find relevant vibes for scenarios
5. Advice Generator → Create recommendations
```

### Minute 10-15: Explore the Code

```bash
# Start here - main orchestrator
cat lib/zeitgeist-service.ts | head -100

# See how vibes are defined
cat lib/types/index.ts | grep -A 20 "interface Vibe"

# Check an example collector
cat lib/collectors/news.ts | head -50
```

### Minute 15-20: Run and Test

```bash
# Start dev server
npm run dev

# In another terminal - collect data
curl -X POST http://localhost:3000/api/collect

# Check what got collected
curl http://localhost:3000/api/status | jq .
```

### Minute 20-25: Make a Small Change

**Example: Add a console log to see vibes being created**

```typescript
// lib/analyzers/llm.ts
async analyze(content: RawContent[]): Promise<Vibe[]> {
  // ...existing code...

  const vibes = this.parseVibes(llmResponse);
  console.log('[MY DEBUG] Created vibes:', vibes.map(v => v.name)); // ADD THIS

  return vibes;
}
```

Save, restart server, collect again:
```bash
curl -X POST http://localhost:3000/api/collect
# Check terminal for your log
```

### Minute 25-30: Understand Testing

```bash
# Run tests
npm test

# Look at a test file
cat lib/__tests__/integration.test.ts | head -50

# Your first contribution could be:
# - Add a test case
# - Fix a typo in docs
# - Add a console log for debugging
```

**Congratulations!** You now understand the basics. Let's dive deeper.

---

## Codebase Tour

### Directory Structure

```
vibes/
├── app/                        # Next.js App (Frontend + API)
│   ├── api/                    # API Routes (serverless functions)
│   │   ├── advice/route.ts     # GET advice for scenario
│   │   ├── collect/route.ts    # Trigger data collection
│   │   ├── status/route.ts     # Graph statistics
│   │   ├── search/route.ts     # Search vibes
│   │   ├── graph/route.ts      # Graph visualization data
│   │   └── cron/route.ts       # Automated collection
│   │
│   ├── page.tsx                # Home page (chat UI)
│   ├── graph/page.tsx          # Graph visualization page
│   ├── layout.tsx              # Root layout
│   └── globals.css             # Global styles
│
├── lib/                        # Core Business Logic
│   ├── types/                  # TypeScript Type Definitions
│   │   └── index.ts            # All interfaces (Vibe, Scenario, etc.)
│   │
│   ├── collectors/             # Data Collection Modules
│   │   ├── base.ts             # BaseCollector + Registry
│   │   ├── news.ts             # NewsAPI collector
│   │   ├── reddit.ts           # Reddit collector
│   │   └── index.ts            # Exports + initialization
│   │
│   ├── analyzers/              # Vibe Extraction Strategies
│   │   ├── base.ts             # BaseAnalyzer + Registry
│   │   ├── llm.ts              # LLM-based extraction
│   │   ├── embedding.ts        # Embedding clustering (experimental)
│   │   └── index.ts            # Exports + initialization
│   │
│   ├── matchers/               # Scenario Matching Strategies
│   │   ├── base.ts             # BaseMatcher + Registry
│   │   ├── llm.ts              # LLM-based matching (primary)
│   │   ├── semantic.ts         # Embedding similarity matching
│   │   └── index.ts            # Exports + initialization
│   │
│   ├── graph/                  # Storage Layer
│   │   ├── store.ts            # GraphStore interface
│   │   ├── memory.ts           # In-memory implementation
│   │   ├── postgres.ts         # Postgres implementation
│   │   └── index.ts            # Factory (auto-selects store)
│   │
│   ├── llm/                    # LLM Provider Abstraction
│   │   ├── base.ts             # LLMProvider interface
│   │   ├── ollama.ts           # Ollama implementation
│   │   ├── lmstudio.ts         # LM Studio implementation
│   │   └── index.ts            # Factory (selects by env var)
│   │
│   ├── embeddings/             # Embedding Provider Abstraction
│   │   ├── base.ts             # EmbeddingProvider interface
│   │   ├── ollama.ts           # Ollama embeddings
│   │   ├── openai.ts           # OpenAI embeddings
│   │   └── index.ts            # Factory
│   │
│   ├── utils/                  # Utility Functions
│   │   ├── network.ts          # Input sanitization
│   │   ├── date.ts             # Date utilities
│   │   └── similarity.ts       # Cosine similarity
│   │
│   ├── __tests__/              # Integration Tests
│   ├── __fixtures__/           # Test Data
│   │
│   ├── zeitgeist-service.ts    # Main Orchestrator (START HERE)
│   ├── temporal-decay.ts       # Decay calculations
│   ├── regional-utils.ts       # Geographic detection
│   └── index.ts                # Main exports
│
├── components/                 # React Components
│   └── graph/                  # Graph visualization
│       ├── ForceGraph.tsx      # D3 force-directed graph
│       └── GraphControls.tsx   # Filter controls
│
├── docs/                       # Documentation
│   ├── ARCHITECTURE.md
│   ├── DEVELOPER_GUIDE.md
│   ├── API_DOCUMENTATION.md
│   └── ...
│
├── claude_docs/                # AI-Generated Guides
│
├── public/                     # Static Assets
│
├── .env.local                  # Your local config (gitignored)
├── .env.example                # Example config
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
├── vitest.config.ts            # Test configuration
├── next.config.ts              # Next.js config
└── vercel.json                 # Deployment config
```

### Key Files and Their Purpose

#### `/lib/zeitgeist-service.ts` - Main Orchestrator

**What it does:**
- Coordinates all components (collectors, analyzers, matchers)
- Main entry point for business logic
- Implements dependency injection pattern

**Key methods:**
```typescript
class ZeitgeistService {
  // Collect data and update graph
  async updateGraph(options?: CollectorOptions): Promise<UpdateResult>

  // Get advice for a scenario
  async getAdvice(scenario: Scenario): Promise<Advice>

  // Search vibes by text
  async searchVibes(query: string, limit?: number): Promise<Vibe[]>

  // Get graph status
  async getGraphStatus(): Promise<GraphStatus>
}
```

**When to modify:**
- Adding new high-level operations
- Changing orchestration logic
- Adding new dependencies

#### `/lib/types/index.ts` - Type Definitions

**What it does:**
- Defines all core interfaces
- Single source of truth for data structures

**Key types:**
- `Vibe` - Cultural trend/topic/aesthetic
- `Scenario` - User's situation
- `Advice` - Generated recommendations
- `Collector`, `Analyzer`, `Matcher` - Plugin interfaces

**When to modify:**
- Adding fields to existing types
- Creating new types
- Changing data structure

#### `/lib/temporal-decay.ts` - Decay Calculations

**What it does:**
- Calculates time-based relevance decay
- Defines category-specific half-lives
- Provides utility functions for temporal operations

**Key functions:**
```typescript
// Calculate current relevance based on age
calculateDecay(vibe: Vibe, now?: Date): number

// Apply decay to all vibes in a list
applyDecayToVibes(vibes: Vibe[], now?: Date): Vibe[]

// Filter out very low relevance vibes
filterDecayedVibes(vibes: Vibe[], threshold?: number): Vibe[]

// Get statistics about temporal state
getTemporalStats(vibes: Vibe[]): TemporalStats
```

**When to modify:**
- Changing decay formula
- Adjusting half-lives
- Adding new temporal logic

#### `/lib/collectors/base.ts` - Collector Pattern

**What it does:**
- Defines `Collector` interface
- Implements `CollectorRegistry` for plugin management
- Provides `BaseCollector` class for common logic

**Pattern:**
```typescript
// All collectors implement this
interface Collector {
  readonly name: string;
  readonly description: string;
  collect(options?: CollectorOptions): Promise<RawContent[]>;
  isAvailable(): Promise<boolean>;
}

// Registry manages all collectors
class CollectorRegistry {
  register(collector: Collector): void
  get(name: string): Collector | undefined
  getAll(): Collector[]
  collectAll(options?: CollectorOptions): Promise<RawContent[]>
}
```

**When to modify:**
- Adding common collector functionality
- Changing registration logic
- Adding collector lifecycle hooks

#### `/lib/analyzers/base.ts` - Analyzer Pattern

**Similar to collectors, but:**
- Input: `RawContent[]`
- Output: `Vibe[]`
- Transforms raw data into structured vibes

#### `/lib/matchers/base.ts` - Matcher Pattern

**Similar to collectors, but:**
- Input: `Scenario` + `CulturalGraph`
- Output: `VibeMatch[]`
- Finds relevant vibes for a scenario

#### `/app/api/*/route.ts` - API Routes

**Next.js API routes:**
- Each folder = one endpoint
- `route.ts` = handler
- Supports GET, POST, etc.

**Pattern:**
```typescript
// app/api/advice/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json();
  // Validate input
  // Call zeitgeist service
  // Return JSON response
}
```

### Data Flow Diagrams (ASCII Art)

#### Collection Flow

```
┌─────────────┐
│   Cron Job  │  (Every hour in production)
│ /api/cron   │
└──────┬──────┘
       │
       v
┌──────────────────┐
│  /api/collect    │
└──────┬───────────┘
       │
       v
┌──────────────────────────────────────┐
│  ZeitgeistService.updateGraph()      │
└──────┬───────────────────────────────┘
       │
       v
┌──────────────────────────────────────┐
│  CollectorRegistry.collectAll()      │
│  ┌──────────┐  ┌──────────┐         │
│  │  News    │  │  Reddit  │         │
│  │Collector │  │Collector │         │
│  └────┬─────┘  └────┬─────┘         │
└───────┼─────────────┼────────────────┘
        │             │
        v             v
    RawContent[]  RawContent[]
        │             │
        └──────┬──────┘
               │
               v
┌──────────────────────────────────────┐
│  AnalyzerRegistry.analyzeAll()       │
│  ┌──────────┐                        │
│  │   LLM    │  Extract vibes         │
│  │ Analyzer │  from content          │
│  └────┬─────┘                        │
└───────┼──────────────────────────────┘
        │
        v
    Vibe[] (new vibes)
        │
        v
┌──────────────────────────────────────┐
│  Merge with existing vibes           │
│  - Detect duplicates                 │
│  - Boost repeated vibes              │
│  - Update lastSeen dates             │
└───────┼──────────────────────────────┘
        │
        v
┌──────────────────────────────────────┐
│  Generate embeddings                 │
│  - For vibes without embeddings      │
│  - Using Ollama/OpenAI               │
└───────┼──────────────────────────────┘
        │
        v
┌──────────────────────────────────────┐
│  GraphStore.saveVibes()              │
│  - Postgres OR Memory                │
└──────────────────────────────────────┘
```

#### Advice Generation Flow

```
┌─────────────────┐
│   User Input    │
│  "Coffee with   │
│   a founder"    │
└────────┬────────┘
         │
         v
┌──────────────────┐
│  /api/advice     │
└────────┬─────────┘
         │
         v
┌────────────────────────────────────┐
│  ZeitgeistService.getAdvice()      │
└────────┬───────────────────────────┘
         │
         v
┌────────────────────────────────────┐
│  Load graph from store             │
│  - Get all vibes                   │
│  - Apply temporal decay            │
│  - Filter low relevance            │
└────────┬───────────────────────────┘
         │
         v
┌────────────────────────────────────┐
│  Generate scenario embedding       │
│  "Coffee with a founder" → [...]   │
└────────┬───────────────────────────┘
         │
         v
┌────────────────────────────────────┐
│  MatcherRegistry.matchAll()        │
│  ┌──────────┐  ┌──────────┐       │
│  │   LLM    │  │ Semantic │       │
│  │ Matcher  │  │ Matcher  │       │
│  └────┬─────┘  └────┬─────┘       │
└───────┼─────────────┼──────────────┘
        │             │
        v             v
   VibeMatch[]   VibeMatch[]
        │             │
        └──────┬──────┘
               │ Combine & dedupe
               v
        VibeMatch[] (top 10-20)
               │
               v
┌──────────────────────────────────────┐
│  LLM generates recommendations       │
│  Prompt:                             │
│  - Scenario description              │
│  - Matched vibes                     │
│  - Format: topics, behavior, style   │
└───────┬──────────────────────────────┘
        │
        v
┌──────────────────────────────────────┐
│  Parse LLM response                  │
│  - Extract topics with points        │
│  - Extract behavior suggestions      │
│  - Extract style recommendations     │
└───────┬──────────────────────────────┘
        │
        v
┌──────────────────────────────────────┐
│  Return Advice object                │
│  {                                   │
│    scenario,                         │
│    matchedVibes,                     │
│    recommendations: {                │
│      topics: [...],                  │
│      behavior: [...],                │
│      style: [...]                    │
│    }                                 │
│  }                                   │
└──────────────────────────────────────┘
```

#### Registry Pattern Flow

```
Initialization (lib/collectors/index.ts)
│
v
┌──────────────────────────────────────┐
│  initializeCollectors()              │
│                                      │
│  collectorRegistry.register(         │
│    new NewsCollector()               │
│  );                                  │
│                                      │
│  collectorRegistry.register(         │
│    new RedditCollector()             │
│  );                                  │
└──────────────────────────────────────┘

Usage (lib/zeitgeist-service.ts)
│
v
┌──────────────────────────────────────┐
│  collectorRegistry.collectAll()      │
│                                      │
│  For each registered collector:      │
│    if (collector.isAvailable())      │
│      content += collector.collect()  │
└──────────────────────────────────────┘
```

---

## How to Add Features

### Add a New Collector (Step-by-Step)

**Example: Add Twitter/X collector**

#### Step 1: Create collector file

```bash
# Create new file
touch lib/collectors/twitter.ts
```

#### Step 2: Implement collector

```typescript
// lib/collectors/twitter.ts
import { BaseCollector } from './base';
import { CollectorOptions, RawContent } from '@/lib/types';

export class TwitterCollector extends BaseCollector {
  readonly name = 'twitter';
  readonly description = 'Collects trending tweets from Twitter/X';

  private apiKey: string | undefined;
  private apiSecret: string | undefined;

  constructor() {
    super();
    this.apiKey = process.env.TWITTER_API_KEY;
    this.apiSecret = process.env.TWITTER_API_SECRET;
  }

  async isAvailable(): Promise<boolean> {
    return !!(this.apiKey && this.apiSecret);
  }

  async collect(options?: CollectorOptions): Promise<RawContent[]> {
    if (!this.apiKey || !this.apiSecret) {
      console.warn('Twitter API credentials not configured');
      return [];
    }

    try {
      const limit = options?.limit || 20;

      // 1. Authenticate with Twitter API
      const token = await this.authenticate();

      // 2. Fetch trending tweets
      const tweets = await this.fetchTrendingTweets(token, limit);

      // 3. Transform to RawContent
      return tweets.map(tweet => this.transformTweet(tweet));
    } catch (error) {
      console.error('Twitter collection failed:', error);
      return [];
    }
  }

  private async authenticate(): Promise<string> {
    // Twitter OAuth implementation
    const response = await fetch('https://api.twitter.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(
          `${this.apiKey}:${this.apiSecret}`
        ).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const data = await response.json();
    return data.access_token;
  }

  private async fetchTrendingTweets(token: string, limit: number): Promise<any[]> {
    // Use Twitter API to get trending tweets
    const response = await fetch(
      `https://api.twitter.com/2/tweets/search/recent?query=trending&max_results=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    return data.data || [];
  }

  private transformTweet(tweet: any): RawContent {
    return this.createRawContent({
      source: this.name,
      url: `https://twitter.com/user/status/${tweet.id}`,
      title: tweet.text.slice(0, 100),
      body: tweet.text,
      timestamp: new Date(tweet.created_at),
      author: tweet.author_id,
      engagement: {
        likes: tweet.public_metrics?.like_count || 0,
        shares: tweet.public_metrics?.retweet_count || 0,
      },
    });
  }
}
```

#### Step 3: Register collector

```typescript
// lib/collectors/index.ts
export { TwitterCollector } from './twitter';  // ADD THIS

import { TwitterCollector } from './twitter';  // ADD THIS

export function initializeCollectors() {
  collectorRegistry.register(new NewsCollector());
  collectorRegistry.register(new RedditCollector());
  collectorRegistry.register(new TwitterCollector());  // ADD THIS
}
```

#### Step 4: Add environment variables

```bash
# .env.local
TWITTER_API_KEY=your_key
TWITTER_API_SECRET=your_secret
```

#### Step 5: Test it

```bash
# Restart server
npm run dev

# Trigger collection
curl -X POST http://localhost:3000/api/collect

# Check console - should see Twitter collector running
# Check status
curl http://localhost:3000/api/status | jq '.totalVibes'
```

#### Step 6: Add tests

```typescript
// lib/collectors/__tests__/twitter.test.ts
import { describe, it, expect, vi } from 'vitest';
import { TwitterCollector } from '../twitter';

describe('TwitterCollector', () => {
  it('should collect tweets', async () => {
    const collector = new TwitterCollector();

    // Mock API calls
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ json: () => ({ access_token: 'token' }) })
      .mockResolvedValueOnce({ json: () => ({ data: [/* tweets */] }) });

    const content = await collector.collect({ limit: 5 });

    expect(content.length).toBeGreaterThan(0);
    expect(content[0].source).toBe('twitter');
  });
});
```

### Add a New Analyzer

**Example: Keyword-based analyzer (no LLM)**

#### Step 1: Create analyzer file

```typescript
// lib/analyzers/keyword.ts
import { BaseAnalyzer } from './base';
import { RawContent, Vibe, VibeCategory } from '@/lib/types';

export class KeywordAnalyzer extends BaseAnalyzer {
  readonly name = 'keyword';
  readonly description = 'Extracts vibes using keyword matching (no LLM)';

  // Predefined keyword patterns
  private patterns = {
    ai: { category: 'trend' as VibeCategory, keywords: ['ai', 'artificial intelligence', 'machine learning'] },
    climate: { category: 'topic' as VibeCategory, keywords: ['climate', 'environment', 'sustainability'] },
    fashion: { category: 'aesthetic' as VibeCategory, keywords: ['fashion', 'style', 'outfit'] },
  };

  async analyze(content: RawContent[]): Promise<Vibe[]> {
    const vibes: Vibe[] = [];

    for (const [vibeName, pattern] of Object.entries(this.patterns)) {
      const matchingContent = content.filter(c =>
        this.matchesPattern(c, pattern.keywords)
      );

      if (matchingContent.length > 0) {
        vibes.push(this.createVibe({
          name: vibeName,
          description: `Detected via keywords: ${pattern.keywords.join(', ')}`,
          category: pattern.category,
          keywords: pattern.keywords,
          strength: Math.min(matchingContent.length / content.length, 1),
          sentiment: 'neutral',
          sources: matchingContent.map(c => c.url || c.id),
        }));
      }
    }

    return vibes;
  }

  private matchesPattern(content: RawContent, keywords: string[]): boolean {
    const text = `${content.title} ${content.body}`.toLowerCase();
    return keywords.some(keyword => text.includes(keyword.toLowerCase()));
  }
}
```

#### Step 2: Register analyzer

```typescript
// lib/analyzers/index.ts
export { KeywordAnalyzer } from './keyword';

export function initializeAnalyzers() {
  analyzerRegistry.register(new LLMAnalyzer(), true); // Primary
  analyzerRegistry.register(new EmbeddingAnalyzer());
  analyzerRegistry.register(new KeywordAnalyzer()); // ADD THIS
}
```

#### Step 3: Use it

```typescript
// To use non-primary analyzer explicitly
const analyzer = analyzerRegistry.get('keyword');
const vibes = await analyzer.analyze(content);
```

### Add a New Matcher

**Example: Time-based matcher (prefer recent vibes)**

```typescript
// lib/matchers/temporal.ts
import { BaseMatcher } from './base';
import { Scenario, CulturalGraph, VibeMatch } from '@/lib/types';

export class TemporalMatcher extends BaseMatcher {
  readonly name = 'temporal';
  readonly description = 'Matches based on recency (prioritizes fresh vibes)';

  async match(scenario: Scenario, graph: CulturalGraph): Promise<VibeMatch[]> {
    const vibes = Array.from(graph.vibes.values());

    // Sort by lastSeen (most recent first)
    const sorted = vibes.sort((a, b) =>
      b.lastSeen.getTime() - a.lastSeen.getTime()
    );

    // Take top 10 most recent
    const matches = sorted.slice(0, 10).map(vibe => ({
      vibe,
      relevanceScore: vibe.currentRelevance,
      reasoning: `Fresh vibe, last seen ${this.timeAgo(vibe.lastSeen)}`,
    }));

    return matches;
  }

  private timeAgo(date: Date): string {
    const hours = (Date.now() - date.getTime()) / (1000 * 60 * 60);
    if (hours < 1) return 'just now';
    if (hours < 24) return `${Math.floor(hours)} hours ago`;
    return `${Math.floor(hours / 24)} days ago`;
  }
}
```

### Add a New API Endpoint

**Example: DELETE /api/vibes/:id - Remove a vibe**

#### Step 1: Create route directory

```bash
mkdir -p app/api/vibes/[id]
touch app/api/vibes/[id]/route.ts
```

#### Step 2: Implement handler

```typescript
// app/api/vibes/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { zeitgeist } from '@/lib';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Validate ID
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Valid vibe ID required' },
        { status: 400 }
      );
    }

    // Delete vibe
    const success = await zeitgeist.deleteVibe(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Vibe not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Vibe ${id} deleted`,
    });
  } catch (error) {
    console.error('Delete failed:', error);
    return NextResponse.json(
      { error: 'Failed to delete vibe' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const vibe = await zeitgeist.getVibe(id);

    if (!vibe) {
      return NextResponse.json(
        { error: 'Vibe not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(vibe);
  } catch (error) {
    console.error('Get failed:', error);
    return NextResponse.json(
      { error: 'Failed to get vibe' },
      { status: 500 }
    );
  }
}
```

#### Step 3: Add methods to ZeitgeistService

```typescript
// lib/zeitgeist-service.ts
export class ZeitgeistService {
  // ... existing methods ...

  async deleteVibe(id: string): Promise<boolean> {
    try {
      await this.store.deleteVibe(id);
      return true;
    } catch {
      return false;
    }
  }

  async getVibe(id: string): Promise<Vibe | null> {
    return this.store.getVibe(id);
  }
}
```

#### Step 4: Test it

```bash
# Get a vibe ID
curl http://localhost:3000/api/status | jq '.topVibes[0]'

# Get specific vibe
curl "http://localhost:3000/api/vibes/vibe-123"

# Delete it
curl -X DELETE "http://localhost:3000/api/vibes/vibe-123"

# Verify deleted
curl http://localhost:3000/api/status
```

---

## Code Patterns

### Registry Pattern

**Purpose:** Manage plugins (collectors, analyzers, matchers)

**Where used:**
- `lib/collectors/base.ts`
- `lib/analyzers/base.ts`
- `lib/matchers/base.ts`

**Pattern:**
```typescript
// Define interface
interface Plugin {
  readonly name: string;
  readonly description: string;
  doWork(...args): Promise<Result>;
}

// Create registry
class PluginRegistry {
  private plugins = new Map<string, Plugin>();
  private default?: Plugin;

  register(plugin: Plugin, isDefault = false) {
    this.plugins.set(plugin.name, plugin);
    if (isDefault) this.default = plugin;
  }

  get(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  getDefault(): Plugin | undefined {
    return this.default;
  }

  getAll(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  async runAll(...args): Promise<Result[]> {
    const results = await Promise.all(
      this.getAll().map(p => p.doWork(...args))
    );
    return results.flat();
  }
}

// Export singleton
export const pluginRegistry = new PluginRegistry();
```

**Usage:**
```typescript
// Registration (lib/collectors/index.ts)
export function initializeCollectors() {
  collectorRegistry.register(new NewsCollector());
  collectorRegistry.register(new RedditCollector());
}

// Usage (lib/zeitgeist-service.ts)
const content = await collectorRegistry.collectAll(options);
```

### Factory Pattern

**Purpose:** Create objects based on configuration

**Where used:**
- `lib/graph/index.ts` (storage selection)
- `lib/llm/index.ts` (LLM provider selection)
- `lib/embeddings/index.ts` (embedding provider selection)

**Pattern:**
```typescript
// lib/graph/index.ts
export function getGraphStore(): GraphStore {
  const postgresUrl = process.env.POSTGRES_URL;

  if (postgresUrl) {
    console.log('Using Postgres storage');
    return new PostgresGraphStore(postgresUrl);
  }

  console.log('Using in-memory storage');
  return new MemoryGraphStore();
}

// Usage
import { getGraphStore } from '@/lib/graph';
const store = getGraphStore(); // Auto-selects based on env
```

### Dependency Injection

**Purpose:** Make code testable and flexible

**Where used:**
- `lib/zeitgeist-service.ts`

**Pattern:**
```typescript
export class ZeitgeistService {
  private store: GraphStore;
  private collectors: CollectorRegistry;

  constructor(config?: ZeitgeistServiceConfig) {
    // Inject dependencies OR use defaults
    this.store = config?.store || getGraphStore();
    this.collectors = config?.collectors || getDefaultCollectors();
  }
}

// Production: Use defaults
const zeitgeist = new ZeitgeistService();

// Testing: Inject mocks
const testService = new ZeitgeistService({
  store: new MemoryGraphStore(),
  collectors: mockCollectorRegistry,
});
```

### Where to Find Interfaces

**All in one place:**
```typescript
// lib/types/index.ts
export interface Vibe { ... }
export interface Scenario { ... }
export interface Advice { ... }
export interface Collector { ... }
export interface Analyzer { ... }
export interface Matcher { ... }
export interface GraphStore { ... }
export interface LLMProvider { ... }
export interface EmbeddingProvider { ... }
```

**Why:** Single source of truth, easier to find and update

---

## Common Tasks

### 1. Change Decay Parameters

**Task:** Make memes decay faster (1 day half-life instead of 3)

**File:** `lib/temporal-decay.ts`

**Change:**
```typescript
export const DEFAULT_HALF_LIVES: Record<VibeCategory, number> = {
  'meme': 1,    // Changed from 3 to 1
  'event': 7,
  'trend': 14,
  // ... rest unchanged
};
```

**Test:**
```bash
# Collect meme vibes
curl -X POST http://localhost:3000/api/collect

# Check initial relevance
curl http://localhost:3000/api/status | jq '.topVibes[] | select(.category == "meme")'

# Wait 1 day OR manually age vibes
# Check relevance again (should be ~50%)
```

### 2. Add a New Vibe Category

**Task:** Add "technology" category

**File 1:** `lib/types/index.ts`
```typescript
export type VibeCategory =
  | 'trend'
  | 'topic'
  | 'aesthetic'
  | 'sentiment'
  | 'event'
  | 'movement'
  | 'meme'
  | 'technology'  // ADD THIS
  | 'custom';
```

**File 2:** `lib/temporal-decay.ts`
```typescript
export const DEFAULT_HALF_LIVES: Record<VibeCategory, number> = {
  'meme': 3,
  'event': 7,
  'trend': 14,
  'topic': 21,
  'sentiment': 30,
  'aesthetic': 60,
  'movement': 90,
  'technology': 30,  // ADD THIS
  'custom': 14,
};
```

**File 3:** Update LLM prompts to include new category

```typescript
// lib/analyzers/llm.ts
const categories = [
  'trend', 'topic', 'aesthetic', 'sentiment',
  'event', 'movement', 'meme', 'technology'  // ADD THIS
];
```

### 3. Modify LLM Prompts

**Task:** Change how vibes are extracted

**File:** `lib/analyzers/llm.ts`

**Find the prompt:**
```typescript
private buildPrompt(content: RawContent[]): string {
  return `Analyze this content and extract cultural vibes.

  For each vibe, identify:
  - Name: Clear, descriptive name
  - Description: What this vibe represents
  - Category: trend, topic, aesthetic, etc.
  - Keywords: Key terms (3-7 words)
  - Strength: 0-1 (how prevalent)
  - Sentiment: positive, negative, neutral, mixed

  // ADD YOUR CHANGES HERE
  // Example: Add regional detection
  - Region: Where this is most relevant (US-West, Global, etc.)

  Return JSON array of vibes.`;
}
```

**Test:**
```bash
# Collect data with new prompt
curl -X POST http://localhost:3000/api/collect

# Check if new fields present
curl http://localhost:3000/api/graph | jq '.nodes[0]'
```

### 4. Change Similarity Thresholds

**Task:** Return more matches (lower threshold)

**File:** `lib/matchers/semantic.ts`

**Change:**
```typescript
async match(scenario: Scenario, graph: CulturalGraph): Promise<VibeMatch[]> {
  // ... calculate similarities ...

  const threshold = 0.3;  // Changed from 0.5 to 0.3
  const matches = vibes
    .filter(v => v.similarity > threshold)
    .map(v => ({
      vibe: v.vibe,
      relevanceScore: v.similarity,
      reasoning: `${(v.similarity * 100).toFixed(0)}% similar`,
    }));

  return matches;
}
```

### 5. Add Custom Metadata to Vibes

**Task:** Track source domain for each vibe

**File 1:** `lib/types/index.ts`
```typescript
export interface Vibe {
  // ... existing fields ...

  sourceDomain?: string;  // ADD THIS: e.g., 'newsapi.org', 'reddit.com'
}
```

**File 2:** Update collectors to set it
```typescript
// lib/collectors/news.ts
private transformArticle(article: NewsAPIArticle): RawContent {
  return this.createRawContent({
    // ... existing fields ...
    raw: {
      sourceDomain: 'newsapi.org',  // ADD THIS
    },
  });
}
```

**File 3:** Update analyzer to use it
```typescript
// lib/analyzers/llm.ts
const vibe = this.createVibe({
  // ... existing fields ...
  sourceDomain: content[0].raw?.sourceDomain,  // ADD THIS
});
```

### 6. Implement Vibe Boosting

**Task:** Increase strength when vibe reappears

**File:** `lib/zeitgeist-service.ts`

**Find merge logic:**
```typescript
private async mergeVibes(newVibes: Vibe[], existingVibes: Vibe[]): Promise<Vibe[]> {
  // ... existing merge logic ...

  // ENHANCE: Boost strength when vibe reappears
  if (existing) {
    const timeSinceLastSeen = (now.getTime() - existing.lastSeen.getTime()) / (1000 * 60 * 60 * 24);

    // Boost strength by 10% if seen again within 7 days
    const boost = timeSinceLastSeen < 7 ? 0.1 : 0;

    updated.strength = Math.min(1.0, existing.strength + boost);
  }
}
```

### 7. Add Logging for Debugging

**Task:** Track how long each step takes

**File:** `lib/zeitgeist-service.ts`

**Add timing:**
```typescript
async updateGraph(options?: CollectorOptions): Promise<UpdateResult> {
  console.time('[Zeitgeist] Total time');

  console.time('[Zeitgeist] Collection');
  const rawContent = await this.collectors.collectAll(options);
  console.timeEnd('[Zeitgeist] Collection');
  console.log(`[Zeitgeist] Collected ${rawContent.length} items`);

  console.time('[Zeitgeist] Analysis');
  const newVibes = await this.analyzers.analyzeAll(rawContent);
  console.timeEnd('[Zeitgeist] Analysis');
  console.log(`[Zeitgeist] Extracted ${newVibes.length} vibes`);

  console.time('[Zeitgeist] Storage');
  await this.store.saveVibes(newVibes);
  console.timeEnd('[Zeitgeist] Storage');

  console.timeEnd('[Zeitgeist] Total time');
}
```

### 8. Filter Vibes by Sentiment

**Task:** Only return positive vibes in advice

**File:** `lib/zeitgeist-service.ts`

**Modify matching:**
```typescript
async getAdvice(scenario: Scenario): Promise<Advice> {
  // ... get graph ...

  // Filter to positive vibes only
  const positiveVibes = Array.from(graph.vibes.values())
    .filter(v => v.sentiment === 'positive' || v.sentiment === 'mixed');

  const filteredGraph: CulturalGraph = {
    ...graph,
    vibes: new Map(positiveVibes.map(v => [v.id, v])),
  };

  const matches = await this.matchers.matchAll(scenario, filteredGraph);
  // ... rest of method ...
}
```

### 9. Implement Vibe Relationships

**Task:** Automatically connect similar vibes

**File:** `lib/zeitgeist-service.ts`

**Add after saving vibes:**
```typescript
async updateGraph(options?: CollectorOptions): Promise<UpdateResult> {
  // ... collect, analyze, save vibes ...

  // Create edges between similar vibes
  await this.createSimilarityEdges();

  return result;
}

private async createSimilarityEdges(): Promise<void> {
  const vibes = await this.store.getAllVibes();

  for (let i = 0; i < vibes.length; i++) {
    for (let j = i + 1; j < vibes.length; j++) {
      const similarity = this.calculateSimilarity(vibes[i], vibes[j]);

      if (similarity > 0.7) {
        await this.store.saveEdge({
          from: vibes[i].id,
          to: vibes[j].id,
          type: 'related',
          strength: similarity,
        });
      }
    }
  }
}

private calculateSimilarity(a: Vibe, b: Vibe): number {
  // Simple keyword overlap
  const aKeywords = new Set(a.keywords);
  const bKeywords = new Set(b.keywords);
  const overlap = [...aKeywords].filter(k => bKeywords.has(k)).length;
  return overlap / Math.max(aKeywords.size, bKeywords.size);
}
```

### 10. Change Number of Matches Returned

**Task:** Return top 20 vibes instead of 10

**File:** `lib/matchers/llm.ts`

**Change:**
```typescript
async match(scenario: Scenario, graph: CulturalGraph): Promise<VibeMatch[]> {
  // ... matching logic ...

  // Return top 20 instead of 10
  return vibeMatches.slice(0, 20);  // Changed from 10
}
```

**Also update semantic matcher:**
```typescript
// lib/matchers/semantic.ts
return vibes
  .slice(0, 20)  // Changed from 10
  .map(v => ({...}));
```

---

## Quick Reference

### Import Paths

```typescript
// Types
import { Vibe, Scenario, Advice } from '@/lib/types';

// Services
import { zeitgeist } from '@/lib';
import { getGraphStore } from '@/lib/graph';
import { getLLM } from '@/lib/llm';
import { getEmbeddingProvider } from '@/lib/embeddings';

// Utilities
import { calculateDecay, applyDecayToVibes } from '@/lib/temporal-decay';
import { cosineSimilarity } from '@/lib/utils/similarity';

// Registries
import { collectorRegistry } from '@/lib/collectors';
import { analyzerRegistry } from '@/lib/analyzers';
import { matcherRegistry } from '@/lib/matchers';
```

### Environment Variables

```bash
# LLM
LLM_PROVIDER=ollama|lmstudio
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2
LMSTUDIO_BASE_URL=http://localhost:1234/v1
LMSTUDIO_MODEL=local-model

# Embeddings
EMBEDDING_PROVIDER=ollama|openai
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
OPENAI_API_KEY=sk-...

# Data Sources
NEWS_API_KEY=...

# Database
POSTGRES_URL=postgres://...

# Production
CRON_SECRET=...
INTERNAL_API_KEY=...
```

### Common Commands

```bash
# Development
npm run dev              # Start dev server
npm test                 # Run tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage
npm run lint             # Lint code
npm run build            # Build for production

# Testing
curl http://localhost:3000/api/status
curl -X POST http://localhost:3000/api/collect
curl -X POST http://localhost:3000/api/advice -H "Content-Type: application/json" -d '{"description": "test"}'
curl "http://localhost:3000/api/search?q=technology"
curl "http://localhost:3000/api/graph?minRelevance=0.5"
```

---

## Next Steps

1. Try implementing one of the example features
2. Read the [Testing Guide](./20251123_024718_012cdxacEy7xvfNV6gBNJTcP_testing-guide_agent11.md)
3. Review [ARCHITECTURE.md](/docs/ARCHITECTURE.md) for technical deep dive
4. Check [DEVELOPER_GUIDE.md](/docs/DEVELOPER_GUIDE.md) for code conventions
5. Start contributing!

---

**Questions?**
- Check inline code comments (they're extensive!)
- Look at existing implementations for examples
- Check test files for usage patterns
- Grep the codebase for examples

Happy coding!

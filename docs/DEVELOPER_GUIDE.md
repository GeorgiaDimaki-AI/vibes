# Zeitgeist Developer Guide

Complete onboarding guide for developers. Get started contributing in under 30 minutes.

## Quick Start (5 Minutes to First Run)

### 1. Prerequisites
```bash
# Verify installations
node --version   # Should be 18+
npm --version    # Should be 9+
git --version    # Any recent version
```

### 2. Clone and Install
```bash
git clone <repository-url>
cd vibes
npm install
```

### 3. Set Up Local LLM

Choose one:

**Option A: LM Studio (Recommended for beginners)**
1. Download from https://lmstudio.ai
2. Install and open
3. Download a model (search "mistral 7b instruct")
4. Click "Load" on the model
5. Start local server (port 1234)

**Option B: Ollama (Recommended for developers)**
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull models
ollama pull llama2
ollama pull nomic-embed-text

# Start server (runs automatically after install)
ollama serve
```

### 4. Configure Environment
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```bash
# For LM Studio
LLM_PROVIDER=lmstudio
LMSTUDIO_BASE_URL=http://localhost:1234/v1
LMSTUDIO_MODEL=local-model

# OR for Ollama
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2

# Embeddings (local, free)
EMBEDDING_PROVIDER=ollama
OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# Optional: News collection
NEWS_API_KEY=get_from_newsapi.org
```

### 5. Run Development Server
```bash
npm run dev
```

Open http://localhost:3000

### 6. Verify It Works
```bash
# Test collection
curl http://localhost:3000/api/collect

# Check status
curl http://localhost:3000/api/status

# Test on UI
# Go to http://localhost:3000
# Enter: "Coffee with friends"
# Click "Get Advice"
```

**Success!** If you see advice generated, everything is working.

## Development Workflow

### Daily Development

```bash
# 1. Pull latest changes
git pull origin main

# 2. Install any new dependencies
npm install

# 3. Start dev server
npm run dev

# 4. Make your changes
# Edit files in /lib, /app, or /components

# 5. Test your changes
curl http://localhost:3000/api/your-endpoint

# 6. Check for errors
npm run lint

# 7. Build to verify no build errors
npm run build

# 8. Commit (see conventions below)
git add .
git commit -m "feat: your feature description"

# 9. Push
git push origin your-branch
```

### Hot Reload

Next.js automatically reloads when you save files:
- **Frontend changes** (`app/`, `components/`): Instant reload
- **API route changes** (`app/api/`): Instant reload
- **Library changes** (`lib/`): May need manual refresh

### Testing Changes

**1. Test API Endpoints:**
```bash
# Collection
curl -X POST http://localhost:3000/api/collect

# Status
curl http://localhost:3000/api/status

# Advice
curl -X POST http://localhost:3000/api/advice \
  -H "Content-Type: application/json" \
  -d '{"description": "Dinner with friends"}'

# Search
curl "http://localhost:3000/api/search?q=technology"

# Graph data
curl "http://localhost:3000/api/graph?minRelevance=0.1"
```

**2. Test UI Changes:**
- Navigate to http://localhost:3000
- Interact with the interface
- Check browser console for errors (F12)

**3. Test Database Changes:**
```bash
# With Postgres configured
npm run dev

# Trigger collection
curl http://localhost:3000/api/collect

# Verify data persisted
# Restart server
# Check status - vibes should still be there
curl http://localhost:3000/api/status
```

## How to Make Changes

### Adding a New Feature

**Example: Add Twitter Collector**

**1. Create the collector file:** `lib/collectors/twitter.ts`
```typescript
import { BaseCollector } from './base';
import { CollectorOptions, RawContent } from '@/lib/types';

export class TwitterCollector extends BaseCollector {
  readonly name = 'twitter';
  readonly description = 'Collects trending tweets';

  async isAvailable(): Promise<boolean> {
    return !!process.env.TWITTER_API_KEY;
  }

  async collect(options?: CollectorOptions): Promise<RawContent[]> {
    const apiKey = process.env.TWITTER_API_KEY;
    if (!apiKey) return [];

    // Fetch from Twitter API
    const tweets = await fetchTweets(apiKey, options?.limit || 20);

    // Transform to RawContent
    return tweets.map(tweet => this.createRawContent({
      source: this.name,
      url: tweet.url,
      title: tweet.text.slice(0, 100),
      body: tweet.text,
      timestamp: new Date(tweet.created_at),
      author: tweet.user.username,
      engagement: {
        likes: tweet.favorite_count,
        shares: tweet.retweet_count,
      },
    }));
  }
}
```

**2. Register the collector:** `lib/collectors/index.ts`
```typescript
import { TwitterCollector } from './twitter';

export function initializeCollectors() {
  collectorRegistry.register(new NewsCollector());
  collectorRegistry.register(new RedditCollector());
  collectorRegistry.register(new TwitterCollector()); // ADD THIS
}
```

**3. Add environment variable:** `.env.local`
```bash
TWITTER_API_KEY=your_key_here
```

**4. Test it:**
```bash
# Restart server
npm run dev

# Trigger collection
curl http://localhost:3000/api/collect

# Check console logs - should see Twitter collector running
```

**5. Commit:**
```bash
git add lib/collectors/twitter.ts lib/collectors/index.ts
git commit -m "feat: add Twitter collector for real-time trends"
```

### Modifying Existing Features

**Example: Change Decay Formula**

**1. Find the file:** `lib/temporal-decay.ts`

**2. Locate the function:** `calculateDecay()`

**3. Make your change:**
```typescript
export function calculateDecay(vibe: Vibe, now: Date = new Date()): number {
  const daysSince = (now.getTime() - vibe.lastSeen.getTime()) / (1000 * 60 * 60 * 24);
  const halfLife = vibe.halfLife || DEFAULT_HALF_LIVES[vibe.category] || 14;

  // BEFORE: Exponential decay
  // const decayFactor = Math.pow(0.5, daysSince / halfLife);

  // AFTER: Linear decay (your change)
  const decayFactor = Math.max(0, 1 - (daysSince / (halfLife * 2)));

  return vibe.strength * decayFactor;
}
```

**4. Test it:**
```bash
# Collect data
curl http://localhost:3000/api/collect

# Wait a bit, collect again
# Check if decay behaves differently
curl http://localhost:3000/api/status
```

**5. Commit:**
```bash
git add lib/temporal-decay.ts
git commit -m "feat: change decay from exponential to linear"
```

### Fixing a Bug

**Example: Fix search returning no results**

**1. Reproduce the bug:**
```bash
curl "http://localhost:3000/api/search?q=test"
# Returns: {"vibes": []}
```

**2. Add logging to debug:**
```typescript
// app/api/search/route.ts
export async function GET(request: NextRequest) {
  const query = searchParams.get('q');
  console.log('[DEBUG] Search query:', query);

  const vibes = await zeitgeist.searchVibes(query, limit);
  console.log('[DEBUG] Found vibes:', vibes.length);

  return NextResponse.json({ vibes });
}
```

**3. Identify the issue:**
- Check console: "Found vibes: 0"
- Investigate `zeitgeist.searchVibes()`
- Discover: embeddings not generated

**4. Fix the bug:**
```typescript
// lib/zeitgeist-service.ts
async searchVibes(query: string, limit = 20): Promise<Vibe[]> {
  // FIX: Check if embedding provider available before searching
  const embeddingProvider = await getEmbeddingProvider();
  if (!embeddingProvider) {
    console.warn('No embedding provider configured');
    return [];
  }

  const embedding = await embeddingProvider.generateEmbedding(query);
  return this.store.findVibesByEmbedding(embedding, limit);
}
```

**5. Test the fix:**
```bash
curl "http://localhost:3000/api/search?q=technology"
# Should return vibes now
```

**6. Remove debug logging:**
```typescript
// Remove console.log statements added for debugging
```

**7. Commit:**
```bash
git add lib/zeitgeist-service.ts
git commit -m "fix: return empty array when embedding provider not configured"
```

## Code Conventions

### File Naming
- **Components:** `PascalCase.tsx` (e.g., `ForceGraph.tsx`)
- **Libraries:** `kebab-case.ts` (e.g., `temporal-decay.ts`)
- **Types:** `index.ts` in types folder
- **API Routes:** `route.ts` in named folder (e.g., `api/advice/route.ts`)

### TypeScript
```typescript
// Use interfaces for objects
interface User {
  name: string;
  age: number;
}

// Use types for unions
type Status = 'active' | 'inactive';

// Always type function parameters and return values
function processVibe(vibe: Vibe): number {
  return vibe.strength;
}

// Use async/await, not promises
async function fetchData() {
  const data = await api.get();
  return data;
}

// Prefer const over let
const value = 42;
```

### Imports
```typescript
// Order: External, Internal, Types
import { useState } from 'react';           // External
import { zeitgeist } from '@/lib';          // Internal
import type { Vibe } from '@/lib/types';    // Types

// Use @/ for absolute imports from project root
import { ZeitgeistService } from '@/lib/zeitgeist-service';
```

### Comments
```typescript
// Use JSDoc for functions
/**
 * Calculate decay for a vibe based on time since last seen
 * @param vibe - The vibe to calculate decay for
 * @param now - Current time (defaults to now)
 * @returns Current relevance score (0-1)
 */
export function calculateDecay(vibe: Vibe, now: Date = new Date()): number {
  // Implementation comments explain WHY, not WHAT
  // Bad: "Calculate days since last seen"
  // Good: "We use days instead of hours to avoid over-penalizing recent content"
  const daysSince = (now.getTime() - vibe.lastSeen.getTime()) / (1000 * 60 * 60 * 24);
}
```

### Error Handling
```typescript
// Always handle errors in API routes
export async function POST(request: NextRequest) {
  try {
    const result = await doSomething();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Operation failed:', error);
    return NextResponse.json(
      {
        error: 'Operation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Log warnings for non-critical errors
try {
  await collectFromSource();
} catch (error) {
  console.warn('Source unavailable, continuing with others:', error);
  // Continue execution
}
```

### Async Patterns
```typescript
// Prefer Promise.all for parallel operations
const [vibes, embeddings, metadata] = await Promise.all([
  getVibes(),
  getEmbeddings(),
  getMetadata(),
]);

// Use sequential when operations depend on each other
const vibes = await getVibes();
const enriched = await enrichVibes(vibes);
const saved = await saveVibes(enriched);
```

## Commit Message Guidelines

We follow conventional commits:

### Format
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types
- **feat:** New feature
- **fix:** Bug fix
- **docs:** Documentation only
- **style:** Code style (formatting, no logic change)
- **refactor:** Code restructuring (no behavior change)
- **perf:** Performance improvement
- **test:** Adding tests
- **chore:** Maintenance (dependencies, config)

### Examples
```bash
# Feature
git commit -m "feat: add Twitter collector for real-time trends"

# Bug fix
git commit -m "fix: prevent duplicate vibes in graph"

# Documentation
git commit -m "docs: add testing guide for developers"

# Refactor
git commit -m "refactor: extract embedding logic to separate module"

# With scope
git commit -m "feat(collectors): add Instagram collector"
git commit -m "fix(temporal): correct half-life calculation for memes"

# With body
git commit -m "feat: add regional filtering to graph API

Allows filtering vibes by geographic region for more
relevant cultural advice. Supports all defined regions
including US-West, US-East, EU-UK, etc."

# Breaking change
git commit -m "feat!: change vibe schema to include geography

BREAKING CHANGE: Vibe interface now requires geography field.
Existing vibes without geography will default to 'Global'."
```

## Common Tasks (10+ Examples)

### 1. Add a Console Log for Debugging
```typescript
// lib/zeitgeist-service.ts
async updateGraph() {
  console.log('[DEBUG] Starting update at:', new Date().toISOString());
  const result = await collectorRegistry.collectAll();
  console.log('[DEBUG] Collected:', result.length, 'items');
  // ... rest of method
}
```

### 2. Change Number of Vibes Returned
```typescript
// lib/matchers/llm.ts
async match(scenario: Scenario, graph: CulturalGraph): Promise<VibeMatch[]> {
  // ... matching logic
  return matches.slice(0, 20); // Change from 10 to 20
}
```

### 3. Add a New Environment Variable
```bash
# .env.local
NEW_FEATURE_ENABLED=true
```

```typescript
// lib/your-file.ts
const featureEnabled = process.env.NEW_FEATURE_ENABLED === 'true';
if (featureEnabled) {
  // Your feature code
}
```

### 4. Change Default Half-Life
```typescript
// lib/temporal-decay.ts
export const DEFAULT_HALF_LIVES: Record<VibeCategory, number> = {
  'meme': 1,    // Changed from 3 to 1 day
  'trend': 21,  // Changed from 14 to 21 days
  // ... rest
};
```

### 5. Add a New Field to Vibe Type
```typescript
// lib/types/index.ts
export interface Vibe {
  // ... existing fields
  customScore?: number;  // ADD THIS
}

// lib/analyzers/llm.ts
const vibe = this.createVibe({
  // ... other fields
  customScore: 0.8,  // SET IT
});
```

### 6. Change LLM Temperature
```typescript
// lib/zeitgeist-service.ts
const response = await llm.complete(messages, {
  maxTokens: 3000,
  temperature: 0.9,  // Changed from 0.7 to 0.9 (more creative)
});
```

### 7. Add Validation to API Route
```typescript
// app/api/advice/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json();

  // ADD VALIDATION
  if (!body.description || body.description.length < 10) {
    return NextResponse.json(
      { error: 'Description must be at least 10 characters' },
      { status: 400 }
    );
  }

  // ... rest of route
}
```

### 8. Modify Graph Visualization Colors
```typescript
// components/graph/ForceGraph.tsx
const getColor = (category: string) => {
  const colors = {
    trend: '#FF6B6B',     // Changed to red
    topic: '#4ECDC4',     // Changed to teal
    aesthetic: '#FFE66D', // Changed to yellow
    // ... rest
  };
  return colors[category] || '#95A5A6';
};
```

### 9. Add Timeout to LLM Calls
```typescript
// lib/llm/ollama.ts
async complete(messages: LLMMessage[], options?: any): Promise<LLMResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      // ... other options
    });
    return processResponse(response);
  } finally {
    clearTimeout(timeout);
  }
}
```

### 10. Change Batch Size for LLM Analysis
```typescript
// lib/analyzers/llm.ts
async analyze(content: RawContent[]): Promise<Vibe[]> {
  const batches = this.batchContent(content, 5); // Changed from 10 to 5
  // ... rest
}
```

### 11. Add New Graph Filter
```typescript
// app/api/graph/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sentiment = searchParams.get('sentiment'); // ADD THIS

  let vibes = await store.getAllVibes();

  // ADD FILTER
  if (sentiment) {
    vibes = vibes.filter(v => v.sentiment === sentiment);
  }

  // ... rest
}
```

### 12. Change Collection Schedule
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "0 */3 * * *"  // Every 3 hours (was every hour)
    }
  ]
}
```

## Project Structure Deep Dive

```
vibes/
├── app/                    # Next.js App Router
│   ├── api/                # Backend API (serverless functions)
│   ├── graph/              # Graph visualization page
│   ├── page.tsx            # Home page (chat interface)
│   ├── layout.tsx          # Root layout (wraps all pages)
│   └── globals.css         # Global styles
│
├── lib/                    # Core business logic
│   ├── types/              # TypeScript definitions
│   ├── collectors/         # Data source plugins
│   ├── analyzers/          # Vibe extraction plugins
│   ├── matchers/           # Scenario matching plugins
│   ├── llm/                # LLM provider abstraction
│   ├── embeddings/         # Embedding provider abstraction
│   ├── graph/              # Storage layer
│   ├── zeitgeist-service.ts # Main orchestrator
│   ├── temporal-decay.ts   # Time-based calculations
│   └── regional-utils.ts   # Geographic detection
│
├── components/             # React components
│   └── graph/              # Graph visualization components
│
├── docs/                   # Project documentation
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT.md
│   ├── DEVELOPER_GUIDE.md  # This file
│   └── ...
│
├── claude_docs/            # AI-generated guides
│
├── public/                 # Static assets
│
├── .env.local              # Your local configuration (gitignored)
├── .env.example            # Example configuration
├── vercel.json             # Deployment config
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
└── next.config.ts          # Next.js config
```

## Debugging Tips

### Enable Verbose Logging
```typescript
// lib/zeitgeist-service.ts
async updateGraph() {
  console.log('[ZEITGEIST] Update started');
  console.log('[ZEITGEIST] Collecting content...');

  const rawContent = await collectorRegistry.collectAll();
  console.log('[ZEITGEIST] Collected', rawContent.length, 'items');
  console.log('[ZEITGEIST] Sample:', rawContent[0]);

  // ... more logging
}
```

### Check Environment Variables
```typescript
// Add to any file
console.log('Environment check:', {
  LLM_PROVIDER: process.env.LLM_PROVIDER,
  EMBEDDING_PROVIDER: process.env.EMBEDDING_PROVIDER,
  HAS_NEWS_KEY: !!process.env.NEWS_API_KEY,
  HAS_POSTGRES: !!process.env.POSTGRES_URL,
});
```

### Test LLM Connection
```bash
# LM Studio
curl http://localhost:1234/v1/models

# Ollama
curl http://localhost:11434/api/tags
```

### Inspect Database
```typescript
// lib/zeitgeist-service.ts
async debugDatabase() {
  const vibes = await this.store.getAllVibes();
  console.log('Total vibes:', vibes.length);
  console.log('Sample vibe:', vibes[0]);
  console.log('Categories:', [...new Set(vibes.map(v => v.category))]);
}
```

### Browser DevTools
1. Open http://localhost:3000
2. Press F12 (open DevTools)
3. Go to Console tab
4. Interact with app
5. Watch for errors/logs

### Network Tab
1. Open DevTools (F12)
2. Go to Network tab
3. Trigger an action (e.g., "Get Advice")
4. Click on request to see:
   - Request payload
   - Response data
   - Timing information

## Performance Tips

### 1. Use In-Memory Store for Development
Postgres adds latency. For development, omit `POSTGRES_URL` to use in-memory store.

### 2. Reduce LLM Calls
```typescript
// Cache LLM results during development
const cache = new Map();

async function callLLM(prompt: string) {
  if (cache.has(prompt)) {
    return cache.get(prompt);
  }
  const result = await llm.complete(prompt);
  cache.set(prompt, result);
  return result;
}
```

### 3. Limit Collection Size
```bash
curl -X POST http://localhost:3000/api/collect \
  -H "Content-Type: application/json" \
  -d '{"options": {"limit": 5}}'
```

### 4. Use Smaller Models
- Development: llama2:7b or mistral:7b
- Production: mixtral:8x7b or larger

## Common Errors and Solutions

### "Failed to connect to LLM"
- Check LM Studio/Ollama is running
- Verify port matches `.env.local`
- Try `curl http://localhost:1234/v1/models` (or :11434)

### "No embedding provider configured"
- Add `EMBEDDING_PROVIDER=ollama` to `.env.local`
- Pull embedding model: `ollama pull nomic-embed-text`

### "Module not found"
- Run `npm install`
- Restart dev server

### "Type error in build"
- Fix TypeScript errors
- Check imports are correct
- Verify types are exported

### "Cannot find module '@/lib/...'"
- Check `tsconfig.json` has `"@/*": ["./"]`
- Restart TypeScript server in VSCode

## Next Steps

1. Read the [Testing Guide](../claude_docs/*_testing-guide_*.md)
2. Read the [Navigation Guide](../claude_docs/*_navigation-guide_*.md)
3. Explore [ARCHITECTURE.md](./ARCHITECTURE.md) for technical details
4. Try building a simple collector
5. Deploy to Vercel (see [DEPLOYMENT.md](./DEPLOYMENT.md))

## Getting Help

- Check inline code comments
- Review existing similar implementations
- Read type definitions for interfaces
- Check console logs
- Open an issue with details

Happy coding!

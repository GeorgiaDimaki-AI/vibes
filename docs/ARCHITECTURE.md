# Architecture Documentation

## System Architecture

### Updated Architecture: Global Graph Model

```
┌─────────────────────────────────────────────┐
│         Next.js App (Vercel)                 │
│  ┌─────────────────────────────────────┐   │
│  │  UI Layer (React + Tailwind)         │   │
│  │  - Chat interface                    │   │
│  │  - Advice display                    │   │
│  │  - Graph visualization (NEW)         │   │
│  │  - Status dashboard                  │   │
│  └─────────────┬───────────────────────┘   │
│                │                             │
│  ┌─────────────▼───────────────────────┐   │
│  │  API Routes (Next.js)                │   │
│  │  - POST /api/advice                  │   │
│  │  - GET/POST /api/collect             │   │
│  │  - GET /api/status                   │   │
│  │  - GET /api/search                   │   │
│  │  - GET /api/graph (NEW)              │   │
│  │  - GET /api/cron (Vercel Cron)       │   │
│  └─────────────┬───────────────────────┘   │
└────────────────┼─────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────┐
│      ZeitgeistService (Orchestration)        │
│  - Coordinates collectors/analyzers/matchers │
│  - Manages GLOBAL GRAPH (shared by all)     │
│  - Applies temporal decay                    │
│  - Handles halo effects                      │
│  - Regional filtering (NEW)                  │
│  - Personalized matching (NEW)               │
└────┬────────────┬────────────────┬───────────┘
     │            │                │
┌────▼─────┐ ┌───▼────────┐  ┌───▼──────────┐
│COLLECTORS│ │ ANALYZERS  │  │   MATCHERS   │
│(Registry)│ │ (Registry) │  │  (Registry)  │
└────┬─────┘ └───┬────────┘  └───┬──────────┘
     │           │                │
     │           │                │
┌────▼───────────▼────────────────▼───────────┐
│    GLOBAL CULTURAL GRAPH                    │
│    (Postgres/Memory/SQLite)                 │
│  - Vibes with embeddings                    │
│  - Regional metadata (NEW)                  │
│  - Temporal metadata (firstSeen, lastSeen)  │
│  - Halo connections (edges)                 │
│  - Shared by ALL users                      │
└────────────────┬────────────────────────────┘
                 │
         ┌───────┴────────┐
         │                │
    ┌────▼─────┐    ┌────▼──────┐
    │ Postgres │    │ Memory/   │
    │ +pgvector│    │ SQLite    │
    └──────────┘    └───────────┘
```

### Key Architecture Changes (2025)

1. **Global Graph**: Single shared cultural graph for all users (not per-user)
2. **Regional Metadata**: Vibes tagged with geographic relevance
3. **Personalization Layer**: Users get filtered/boosted views of global graph
4. **Local Embeddings**: Ollama support for $0 embedding costs
5. **Graph Visualization**: Interactive D3.js visualization of cultural graph

## Technology Stack

### Frontend
- **Next.js 14**: App Router, Server Components, API Routes
- **React 18**: UI components
- **Tailwind CSS**: Styling
- **TypeScript**: Type safety throughout

**Why Next.js?**
- Server-side rendering for better UX
- API routes co-located with frontend
- Vercel deployment is seamless
- Server Components reduce client bundle

### Backend
- **Next.js API Routes**: RESTful endpoints
- **Vercel Cron**: Scheduled data collection
- **TypeScript**: End-to-end type safety

**Why API Routes?**
- No separate backend server needed
- Edge function support for global distribution
- Built-in serverless scaling

### LLM Layer
- **LM Studio** (OpenAI-compatible API)
- **Ollama** (Native API)
- **Unified Interface**: Provider factory pattern

**Why Local LLMs?**
- Zero API costs
- Privacy (no data leaves machine)
- Full control over models
- Works offline

### Embedding Layer (NEW)
- **Ollama** (Local, Free): nomic-embed-text, mxbai-embed-large
- **OpenAI** (Cloud, Paid): text-embedding-3-small
- **Unified Interface**: Provider factory pattern

**Why Support Both?**
- **Ollama**: $0 cost, privacy, works offline (free tier)
- **OpenAI**: Higher quality, faster (paid tier option)
- **Factory Pattern**: Easy switching based on environment/tier

### Database
- **Vercel Postgres** (Production): PostgreSQL with pgvector
- **In-Memory Store** (Development): Fast, no setup

**Why Postgres + pgvector?**
- Vector similarity search (essential for embeddings)
- Mature, reliable, well-documented
- Free tier on Vercel
- Can handle temporal queries efficiently

**Schema Design** (Updated):
```sql
CREATE TABLE vibes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  keywords TEXT[],
  embedding vector(768),   -- pgvector (768 for nomic-embed, 1536 for OpenAI)
  strength REAL,
  sentiment TEXT,
  timestamp TIMESTAMPTZ,
  first_seen TIMESTAMPTZ,  -- Temporal decay
  last_seen TIMESTAMPTZ,   -- Temporal decay
  current_relevance REAL,  -- Temporal decay
  half_life REAL,          -- Temporal decay
  geography JSONB,         -- NEW: Regional metadata
  -- geography: {
  --   primary: "US-West",
  --   relevance: {"US-West": 0.9, "US-East": 0.4, "Global": 0.5},
  --   detectedFrom: ["url1", "url2"]
  -- }
  -- ... other fields
);
```

### Dependencies
```json
{
  "next": "Latest",
  "react": "18.x",
  "typescript": "5.x",
  "@anthropic-ai/sdk": "For Anthropic (optional)",
  "openai": "For embeddings + LM Studio",
  "@vercel/postgres": "Database",
  "zod": "Runtime validation"
}
```

## Code Structure

```
vibes/
├── app/                      # Next.js App Router
│   ├── api/                  # API Routes
│   │   ├── advice/           # POST - Get advice
│   │   ├── collect/          # GET/POST - Trigger collection
│   │   ├── status/           # GET - Graph status
│   │   ├── search/           # GET - Search vibes
│   │   └── cron/             # GET - Scheduled collection
│   ├── page.tsx              # Main UI
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
│
├── lib/                      # Core logic (can run anywhere)
│   ├── types/
│   │   └── index.ts          # TypeScript interfaces
│   │
│   ├── llm/                  # LLM abstraction layer
│   │   ├── types.ts          # LLM interfaces
│   │   ├── lmstudio.ts       # LM Studio provider
│   │   ├── ollama.ts         # Ollama provider
│   │   ├── factory.ts        # Provider factory
│   │   └── index.ts          # Exports
│   │
│   ├── temporal-decay.ts     # Decay & halo logic
│   │
│   ├── collectors/           # Data collection plugins
│   │   ├── base.ts           # Base class + registry
│   │   ├── news.ts           # NewsAPI collector
│   │   ├── reddit.ts         # Reddit collector
│   │   └── index.ts          # Initialization
│   │
│   ├── analyzers/            # Vibe extraction plugins
│   │   ├── base.ts           # Base class + registry
│   │   ├── llm.ts            # LLM-based analyzer
│   │   ├── embedding.ts      # Embedding-based clustering
│   │   └── index.ts          # Initialization
│   │
│   ├── matchers/             # Scenario matching plugins
│   │   ├── base.ts           # Base class + registry
│   │   ├── llm.ts            # LLM reasoning matcher
│   │   ├── semantic.ts       # Embedding similarity matcher
│   │   └── index.ts          # Initialization
│   │
│   ├── graph/                # Storage layer
│   │   ├── store.ts          # Storage interface
│   │   ├── postgres.ts       # Postgres implementation
│   │   ├── memory.ts         # In-memory implementation
│   │   └── index.ts          # Factory
│   │
│   ├── zeitgeist-service.ts  # Main orchestration
│   └── index.ts              # Library exports
│
├── docs/                     # Documentation
│   ├── PROJECT_OVERVIEW.md   # This file
│   ├── ARCHITECTURE.md       # Technical details
│   ├── DEPLOYMENT.md         # How to deploy
│   └── FUTURE_DIRECTIONS.md  # Roadmap
│
├── public/                   # Static assets
├── .env.example              # Environment template
├── .env.local                # Your config (gitignored)
├── vercel.json               # Vercel configuration
├── package.json              # Dependencies
└── tsconfig.json             # TypeScript config
```

## Core Modules Explained

### 1. Collectors (`lib/collectors/`)

**Purpose**: Fetch raw data from external sources.

**Interface**:
```typescript
interface Collector {
  name: string;
  collect(options?: CollectorOptions): Promise<RawContent[]>;
  isAvailable(): Promise<boolean>;
}
```

**Current Implementations**:
- `NewsCollector`: Fetches from NewsAPI
- `RedditCollector`: Scrapes Reddit hot posts

**Registry Pattern**:
- All collectors register themselves
- Service can call `collectAll()` or `collectFrom(['news', 'reddit'])`
- Easy to add new sources

**Example**:
```typescript
class TwitterCollector extends BaseCollector {
  async collect() {
    // Fetch from Twitter API
    return rawTweets.map(t => this.createRawContent({
      source: 'twitter',
      title: t.text,
      // ...
    }));
  }
}

collectorRegistry.register(new TwitterCollector());
```

### 2. Analyzers (`lib/analyzers/`)

**Purpose**: Transform raw content → vibes.

**Interface**:
```typescript
interface Analyzer {
  name: string;
  analyze(content: RawContent[]): Promise<Vibe[]>;
  update(existing: Vibe[], new: RawContent[]): Promise<Vibe[]>;
}
```

**Current Implementations**:
- `LLMAnalyzer`: Uses local LLM to extract vibes
- `EmbeddingAnalyzer`: Clusters by semantic similarity

**Key Features**:
- Batching for efficiency
- Automatic deduplication
- Temporal field initialization
- Halo effect application on merge

**Update Flow**:
```
1. Analyze new content → extract vibes
2. Compare with existing vibes
3. Merge matches (boost + halo effect)
4. Add new vibes
5. Return merged set
```

### 3. Matchers (`lib/matchers/`)

**Purpose**: Find relevant vibes for a scenario.

**Interface**:
```typescript
interface Matcher {
  name: string;
  match(scenario: Scenario, graph: CulturalGraph): Promise<VibeMatch[]>;
}
```

**Current Implementations**:
- `LLMMatcher`: Deep reasoning about relevance
- `SemanticMatcher`: Embedding similarity

**Strategy**:
- Can combine multiple matchers (ensemble)
- Weighted averaging of scores
- Filters by temporal relevance first

### 4. Graph Store (`lib/graph/`)

**Purpose**: Persist and query vibes.

**Interface**:
```typescript
interface GraphStore {
  saveVibe(vibe: Vibe): Promise<void>;
  getAllVibes(): Promise<Vibe[]>;
  findVibesByEmbedding(emb: number[], k: number): Promise<Vibe[]>;
  // ... more methods
}
```

**Implementations**:
- `PostgresGraphStore`: Production with pgvector
- `MemoryGraphStore`: Development/testing

**Auto-fallback**: If no Postgres, uses memory automatically.

### 5. Zeitgeist Service (`lib/zeitgeist-service.ts`)

**Purpose**: Orchestrate everything.

**Key Methods**:
```typescript
class ZeitgeistService {
  async updateGraph(): Promise<{vibesAdded: number}>;
  async getAdvice(scenario: Scenario): Promise<Advice>;
  async getGraphStatus(): Promise<Stats>;
  async searchVibes(query: string): Promise<Vibe[]>;
}
```

**Update Graph Flow**:
```
1. Collect raw content (all collectors)
2. Analyze → extract vibes
3. Generate embeddings (if missing)
4. Merge with existing (w/ halo effects)
5. Apply temporal decay
6. Filter out decayed vibes (<5%)
7. Save to store
```

### 6. Temporal Decay (`lib/temporal-decay.ts`)

**Pure functions for time-based logic**:
- `calculateDecay()`: Exponential decay formula
- `mergeVibeOccurrence()`: Boost on reappearance
- `applyHaloEffect()`: Ripple to similar vibes
- `filterDecayedVibes()`: Remove dead trends
- `suggestHalfLife()`: Smart half-life calculation

**Key Insight**: Separating temporal logic makes it easy to experiment with different decay models.

### 7. LLM Layer (`lib/llm/`)

**Abstraction over LLM providers**:

```typescript
interface LLMProvider {
  name: string;
  complete(messages: LLMMessage[]): Promise<LLMResponse>;
  isAvailable(): Promise<boolean>;
}
```

**Factory Pattern**:
```typescript
const llm = await getLLM();  // Auto-detects available provider
const response = await llm.complete([
  { role: 'user', content: 'Extract vibes from...' }
]);
```

**Providers**:
- `LMStudioProvider`: OpenAI-compatible
- `OllamaProvider`: Native Ollama API

## Data Flow

### Collection → Storage
```
External Sources
  ↓ (Collectors)
RawContent[]
  ↓ (Analyzers)
Vibe[] (new)
  ↓ (Merge w/ existing)
Vibe[] (merged + halo)
  ↓ (Apply decay)
Vibe[] (decayed)
  ↓ (Filter)
Vibe[] (active)
  ↓ (Embeddings)
Vibe[] (with vectors)
  ↓ (Store)
Database
```

### Query → Advice
```
User Scenario
  ↓ (Load graph)
CulturalGraph
  ↓ (Apply decay)
CulturalGraph (current relevance)
  ↓ (Match)
VibeMatch[] (top matches)
  ↓ (Generate advice)
Advice (topics, behavior, style)
  ↓ (Return)
User
```

## Design Patterns

### 1. Registry Pattern
- Collectors, Analyzers, Matchers all use registries
- Decouple plugins from core logic
- Easy to add/remove/swap components

### 2. Strategy Pattern
- Multiple analyzers/matchers can coexist
- Choose at runtime which to use
- Ensemble methods combine strategies

### 3. Factory Pattern
- LLM provider selection
- Graph store selection
- Auto-detection and fallbacks

### 4. Plugin Architecture
- Base classes define contracts
- Extend to add functionality
- No core code changes needed

## Performance Considerations

### 1. Batching
- LLM calls process 10 items at once
- Embedding generation batched (10 at a time)
- Reduces API calls by 10x

### 2. Caching
- LLM provider cached after first use
- Graph store singleton
- Registries initialize once

### 3. Lazy Loading
- Only load vibes when needed
- Pagination in UI (not yet implemented)
- Limit matcher to top 50 vibes

### 4. Database Indexes
- Vector index on embeddings (ivfflat)
- Timestamp index for temporal queries
- Category index for filtering

## Error Handling

### 1. Graceful Degradation
- If collector fails, others continue
- If primary analyzer fails, try fallback
- If LLM unavailable, show clear error

### 2. Validation
- Zod schemas for API inputs (future)
- TypeScript prevents type errors
- Database constraints

### 3. Logging
- Console logs for debugging
- Track which collectors succeeded
- Monitor halo effect applications

## Security

### 1. API Keys
- Never commit to git (.env.local gitignored)
- Vercel environment variables for production
- Cron endpoint protected by secret

### 2. Input Validation
- Scenario descriptions limited
- SQL injection prevented (parameterized queries)
- No user file uploads

### 3. Rate Limiting
- Vercel provides DDoS protection
- Consider adding rate limits for public deployment

## Testing Strategy

### Current (Manual)
- `curl /api/collect` - Test collection
- `curl /api/status` - Check graph state
- UI for end-to-end testing

### Future
- Unit tests for temporal decay logic
- Integration tests for collectors
- Mock LLM for deterministic testing

## Deployment Architecture

### Development
```
Local Machine
  ├── Next.js Dev Server (localhost:3000)
  ├── LM Studio / Ollama (local)
  └── In-Memory Store (no database)
```

### Production (Vercel)
```
Vercel Edge Network
  ├── Next.js App (edge functions)
  ├── Vercel Cron (hourly)
  ├── Vercel Postgres (database)
  └── LM Studio/Ollama (your server, or VPS)
```

**Note**: For production, you'd deploy LM Studio/Ollama separately and point to it via env vars.

## Configuration

All config via environment variables:

```env
# LLM
LLM_PROVIDER=lmstudio
LMSTUDIO_BASE_URL=http://localhost:1234/v1
LMSTUDIO_MODEL=local-model

# Embeddings
OPENAI_API_KEY=sk-...

# Data sources
NEWS_API_KEY=...

# Database
POSTGRES_URL=postgres://...

# Security
CRON_SECRET=...
```

## Extension Points

Want to customize? Here's where:

1. **New data source**: Extend `BaseCollector`
2. **New analysis method**: Extend `BaseAnalyzer`
3. **New matching strategy**: Extend `BaseMatcher`
4. **Different decay model**: Modify `temporal-decay.ts`
5. **Custom LLM**: Implement `LLMProvider`
6. **UI changes**: Edit `app/page.tsx`

Every extension point has a clear interface and examples.

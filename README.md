# Zeitgeist - Cultural Graph & Vibe Advisor

An agentic app that maintains a cultural graph of trends, vibes, and zeitgeist moments. Describe any situation and get advice on topics to discuss, how to act, and what to wear based on current cultural trends.

## Features

- **Local LLM Support**: Works with LM Studio or Ollama - no API costs!
- **Temporal Decay System**: Trends naturally fade over time with configurable half-lives
- **Automated Hourly Collection**: Continuously updates cultural graph with fresh data
- **Smart Trend Retirement**: Old trends automatically decay based on category-specific timescales
- **Cultural Graph**: Maintains a semantic graph of cultural vibes with embeddings
- **Scenario Matching**: Uses LLM reasoning and semantic similarity to match situations to relevant vibes
- **Personalized Advice**: Generates specific recommendations for topics, behavior, and style
- **Modular Architecture**: Easily extensible with new collectors, analyzers, and matchers

## Architecture

```
┌─────────────────────────────────────────┐
│         Next.js App (Vercel)             │
│  - Chat UI for scenario input            │
│  - Advice display                        │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│           API Routes                     │
│  /api/advice  - Get advice               │
│  /api/collect - Trigger collection       │
│  /api/status  - Graph status             │
│  /api/cron    - Automated collection     │
└─────────────────┬───────────────────────┘
                  │
        ┌─────────┴──────────┐
        │                    │
┌───────▼─────────┐   ┌─────▼──────────┐
│  COLLECTORS     │   │  GRAPH STORE   │
│  (Pluggable)    │   │  - Vibes       │
│                 │   │  - Embeddings  │
│  - News         │───▶  - Connections │
│  - Reddit       │   │  (Postgres)    │
└────────┬────────┘   └─────▲──────────┘
         │                  │
    ┌────▼──────────────────┴─────┐
    │     ANALYZERS               │
    │     (Strategy Pattern)      │
    │  - LLM Extractor            │
    │  - Embedding Cluster        │
    └────────┬────────────────────┘
             │
    ┌────────▼────────────────────┐
    │     MATCHERS                │
    │  - Semantic similarity      │
    │  - LLM reasoning            │
    └─────────────────────────────┘
```

## Setup

### 1. Clone and Install

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` and configure your LLM provider:

```env
# LLM Provider (choose one: lmstudio or ollama)
LLM_PROVIDER=lmstudio

# LM Studio (default: http://localhost:1234/v1)
LMSTUDIO_BASE_URL=http://localhost:1234/v1
LMSTUDIO_MODEL=local-model

# OR Ollama (default: http://localhost:11434)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2

# Embeddings - Choose one:
# Option 1: Local (FREE) - Recommended for zero-cost operation
EMBEDDING_PROVIDER=ollama
OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# Option 2: Cloud (PAID) - Higher quality embeddings
# EMBEDDING_PROVIDER=openai
# OPENAI_API_KEY=sk-...

# Optional: News Collection
NEWS_API_KEY=...
```

**Important**: You must have either LM Studio or Ollama running locally with a model loaded before starting the app.

### 3. Database Setup

**Option A: Use In-Memory Store (Development)**
- No setup needed! The app will automatically use an in-memory store if no database is configured
- Data will be lost on restart

**Option B: Use Vercel Postgres (Production)**
- Create a Postgres database on Vercel
- Add the connection string to `.env.local`:
  ```env
  POSTGRES_URL=postgres://...
  ```
- The app will automatically create tables on first run

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Usage

### Getting Advice

1. Visit the homepage
2. Describe your situation (e.g., "Dinner with tech startup founders at a trendy restaurant")
3. Click "Get Advice"
4. Receive recommendations for:
   - Topics to discuss with talking points
   - How to behave and carry yourself
   - What to wear and style choices

### Collecting Data

**Manual Collection:**
```bash
curl http://localhost:3000/api/collect
```

**Automated Collection:**
- Deployed on Vercel, the app automatically collects data **every hour** via cron
- Configure the schedule in `vercel.json` (default: `0 * * * *`)

### Checking Status

```bash
curl http://localhost:3000/api/status
```

Returns current graph statistics, categories, temporal decay metrics, and top vibes ranked by current relevance.

## Temporal Decay System

Trends don't last forever! The app includes a sophisticated temporal decay system:

### How It Works

- **Automatic Decay**: Vibes lose relevance over time based on exponential decay
- **Category-Specific Half-Lives**: Different trend types decay at different rates
  - Memes: 3 days
  - Events: 7 days
  - Trends: 14 days
  - Topics: 21 days
  - Sentiments: 30 days
  - Aesthetics: 60 days
  - Movements: 90 days

### Continuous Evolution

- **Boosting**: When a vibe appears again in new data, it gets boosted
- **Smart Merging**: Re-detected vibes don't create duplicates but refresh existing ones
- **Automatic Cleanup**: Vibes below 5% relevance are automatically filtered out
- **Current Relevance**: All vibes have a time-adjusted relevance score

### Benefits

- Old trends don't pollute current advice
- Popular recurring trends stay relevant
- Natural transition between cultural moments
- Clear distinction between emerging and fading vibes

## Modular Architecture

The app is designed to be highly modular and extensible.

### Adding a New Collector

Create a file in `lib/collectors/`:

```typescript
import { BaseCollector } from './base';
import { CollectorOptions, RawContent } from '@/lib/types';

export class MyCollector extends BaseCollector {
  readonly name = 'my-collector';
  readonly description = 'Collects data from...';

  async collect(options?: CollectorOptions): Promise<RawContent[]> {
    // Your collection logic
  }
}
```

Register in `lib/collectors/index.ts`:

```typescript
import { MyCollector } from './my-collector';

export function initializeCollectors() {
  collectorRegistry.register(new MyCollector());
  // ...
}
```

### Adding a New Analyzer

Create a file in `lib/analyzers/`:

```typescript
import { BaseAnalyzer } from './base';
import { RawContent, Vibe } from '@/lib/types';

export class MyAnalyzer extends BaseAnalyzer {
  readonly name = 'my-analyzer';
  readonly description = 'Analyzes content using...';

  async analyze(content: RawContent[]): Promise<Vibe[]> {
    // Your analysis logic
  }
}
```

Register in `lib/analyzers/index.ts`.

### Adding a New Matcher

Create a file in `lib/matchers/`:

```typescript
import { BaseMatcher } from './base';
import { Scenario, CulturalGraph, VibeMatch } from '@/lib/types';

export class MyMatcher extends BaseMatcher {
  readonly name = 'my-matcher';
  readonly description = 'Matches scenarios using...';

  async match(scenario: Scenario, graph: CulturalGraph): Promise<VibeMatch[]> {
    // Your matching logic
  }
}
```

Register in `lib/matchers/index.ts`.

## API Endpoints

### POST /api/advice

Get advice for a scenario.

**Request:**
```json
{
  "description": "Dinner with tech friends at a trendy restaurant",
  "context": {
    "location": "San Francisco",
    "formality": "casual"
  }
}
```

**Response:**
```json
{
  "scenario": {...},
  "matchedVibes": [...],
  "recommendations": {
    "topics": [...],
    "behavior": [...],
    "style": [...]
  },
  "reasoning": "...",
  "confidence": 0.85
}
```

### POST /api/collect

Trigger data collection manually.

### GET /api/status

Get current graph status.

### GET /api/search?q=query

Search vibes by semantic similarity.

## Deployment

### Deploy to Vercel

1. Push to GitHub
2. Import in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

The cron job will automatically run every 6 hours to collect new data.

## Development

### Project Structure

```
lib/
  collectors/     - Data collection modules
  analyzers/      - Vibe extraction strategies
  matchers/       - Scenario matching strategies
  graph/          - Storage layer
  types/          - TypeScript definitions
  zeitgeist-service.ts - Main orchestration

app/
  api/            - API routes
  page.tsx        - Main UI
```

### Testing Locally

1. Start with in-memory store for quick iteration
2. Manually trigger collection: `curl http://localhost:3000/api/collect`
3. Check status: `curl http://localhost:3000/api/status`
4. Test advice on the UI

### Extending the System

The modular architecture makes it easy to experiment:

- **New data sources**: Add collectors for Twitter, Instagram, Spotify, etc.
- **New analysis methods**: Try clustering, graph algorithms, trend detection
- **New matching strategies**: Combine multiple approaches, add user preferences
- **Temporal analysis**: Track how vibes evolve over time

## License

MIT

## Documentation

Comprehensive guides for developers:

- **[Developer Guide](docs/DEVELOPER_GUIDE.md)** - Get started contributing in < 30 minutes
- **[Testing Guide](claude_docs/*_testing-guide_*.md)** - Complete manual testing procedures
- **[Code Navigation Guide](claude_docs/*_navigation-guide_*.md)** - Navigate and extend the codebase
- **[API Documentation](docs/API_DOCUMENTATION.md)** - Complete API reference
- **[Architecture](docs/ARCHITECTURE.md)** - Technical deep dive
- **[Deployment](docs/DEPLOYMENT.md)** - Deploy to production

## Contributing

Contributions welcome! The modular architecture makes it easy to add new features. See the [Developer Guide](docs/DEVELOPER_GUIDE.md) to get started.

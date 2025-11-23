# Zeitgeist Testing Guide

**Complete testing procedures for developers working on Zeitgeist.**

Version: 1.0
Date: 2025-11-23
Audience: Mid-level developers

---

## Table of Contents

1. [Quick Start Testing](#quick-start-testing)
2. [Manual Testing Procedures](#manual-testing-procedures)
3. [Automated Testing](#automated-testing)
4. [Test Scenarios](#test-scenarios)
5. [Troubleshooting Guide](#troubleshooting-guide)

---

## Quick Start Testing

**Goal:** Verify your local setup works in under 5 minutes.

### Prerequisites
- Node.js 18+ installed
- LM Studio or Ollama running locally
- Development server running (`npm run dev`)

### 1-Minute Smoke Test

```bash
# Terminal 1: Start dev server (if not running)
npm run dev

# Terminal 2: Quick tests
# Test 1: Health check
curl http://localhost:3000/api/status

# Test 2: Collection (may take 30-60 seconds)
curl -X POST http://localhost:3000/api/collect

# Test 3: UI test
# Open http://localhost:3000
# Type: "Coffee with a friend"
# Click "Get Advice"
# Should see recommendations appear
```

**Success Criteria:**
- `/api/status` returns JSON with vibe counts
- `/api/collect` completes without errors
- UI generates advice with topics, behavior, and style sections

---

## Manual Testing Procedures

### A. Setup Local LLM for Testing

#### Option 1: LM Studio (Easiest for testing)

**Step 1:** Install LM Studio
```bash
# Download from https://lmstudio.ai
# Install and launch the application
```

**Step 2:** Download a Model
1. Click "Search" tab
2. Search for "mistral 7b instruct"
3. Download "mistralai/Mistral-7B-Instruct-v0.2-GGUF"
4. Wait for download to complete

**Step 3:** Load and Start Server
1. Click on downloaded model
2. Click "Load in Server"
3. Click "Start Server" (port 1234)
4. Verify server is running: `curl http://localhost:1234/v1/models`

**Step 4:** Configure Zeitgeist
```bash
# .env.local
LLM_PROVIDER=lmstudio
LMSTUDIO_BASE_URL=http://localhost:1234/v1
LMSTUDIO_MODEL=local-model

EMBEDDING_PROVIDER=ollama
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
```

#### Option 2: Ollama (Faster for developers)

**Step 1:** Install Ollama
```bash
# macOS/Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Or download from https://ollama.ai
```

**Step 2:** Pull Models
```bash
# Main LLM (choose one)
ollama pull llama2          # Fast, good for testing
ollama pull mistral         # Better quality
ollama pull mixtral         # Best quality, slower

# Embeddings (required)
ollama pull nomic-embed-text
```

**Step 3:** Verify Models Loaded
```bash
ollama list
# Should show: llama2, nomic-embed-text

# Test LLM
ollama run llama2 "Say hello"

# Test embeddings
curl http://localhost:11434/api/embeddings -d '{
  "model": "nomic-embed-text",
  "prompt": "test"
}'
```

**Step 4:** Configure Zeitgeist
```bash
# .env.local
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2

EMBEDDING_PROVIDER=ollama
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
```

### B. Test Data Collection (/api/collect)

**Purpose:** Verify that Zeitgeist can collect raw data from sources and extract vibes.

#### Step 1: Configure Data Sources

```bash
# .env.local - Add at least one source

# Option 1: News API (requires free API key)
NEWS_API_KEY=your_key_from_newsapi.org

# Option 2: Reddit (no API key needed for basic scraping)
# Already works out of the box
```

#### Step 2: Trigger Collection

```bash
# Basic collection
curl -X POST http://localhost:3000/api/collect -v

# With options
curl -X POST http://localhost:3000/api/collect \
  -H "Content-Type: application/json" \
  -d '{
    "options": {
      "limit": 5,
      "keywords": ["technology", "AI"]
    }
  }'
```

#### Step 3: Verify Results

**Check Console Logs** (in terminal running `npm run dev`):
```
[Zeitgeist] Starting data collection...
[Zeitgeist] Available collectors: news, reddit
[NewsCollector] Collecting 5 articles...
[NewsCollector] Found 5 articles
[LLMAnalyzer] Analyzing batch 1 of 1...
[LLMAnalyzer] Extracted 3 vibes
[Zeitgeist] Added 3 new vibes, updated 0 existing
```

**Check API Response:**
```json
{
  "success": true,
  "vibesAdded": 3,
  "message": "Successfully collected and analyzed data. Added 3 vibes."
}
```

**Verify Vibes Stored:**
```bash
curl http://localhost:3000/api/status
# Should show totalVibes > 0
```

#### Step 4: Validate Vibe Quality

```bash
# Get graph data to inspect vibes
curl http://localhost:3000/api/graph | jq '.nodes[0]'

# Should show:
# - name (clear, descriptive)
# - description (meaningful summary)
# - category (trend, topic, aesthetic, etc.)
# - keywords (relevant terms)
# - strength (0.5 - 1.0 for good vibes)
# - currentRelevance (close to strength for fresh vibes)
```

**Expected Output:**
```json
{
  "id": "vibe-abc123",
  "name": "AI Safety Concerns",
  "description": "Growing discussion about risks and regulation of AI systems",
  "category": "topic",
  "keywords": ["AI", "safety", "regulation", "ethics"],
  "strength": 0.8,
  "sentiment": "mixed",
  "currentRelevance": 0.78,
  "timestamp": "2025-11-23T10:00:00.000Z"
}
```

### C. Test Advice Generation (/api/advice)

**Purpose:** Verify scenario matching and advice generation work correctly.

#### Step 1: Ensure Graph Has Data

```bash
# Check status
curl http://localhost:3000/api/status

# If totalVibes is 0, collect first
curl -X POST http://localhost:3000/api/collect
```

#### Step 2: Test Basic Scenario

```bash
curl -X POST http://localhost:3000/api/advice \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Coffee with a tech startup founder"
  }' | jq '.'
```

#### Step 3: Verify Response Structure

**Check for required fields:**
```json
{
  "scenario": {
    "description": "Coffee with a tech startup founder"
  },
  "matchedVibes": [
    {
      "vibe": { /* full vibe object */ },
      "relevanceScore": 0.85,
      "reasoning": "Highly relevant because..."
    }
  ],
  "recommendations": {
    "topics": [
      {
        "topic": "AI and Automation",
        "talking_points": ["Point 1", "Point 2"],
        "relevantVibes": ["vibe-123"],
        "priority": "high"
      }
    ],
    "behavior": [
      {
        "aspect": "conversation style",
        "suggestion": "Be curious and ask questions",
        "reasoning": "Founders appreciate engagement"
      }
    ],
    "style": [
      {
        "category": "clothing",
        "suggestions": ["Smart casual", "Clean sneakers"],
        "reasoning": "Tech culture values comfort"
      }
    ]
  },
  "reasoning": "Based on 5 relevant vibes...",
  "confidence": 0.82
}
```

#### Step 4: Test Edge Cases

**Empty description:**
```bash
curl -X POST http://localhost:3000/api/advice \
  -H "Content-Type: application/json" \
  -d '{"description": ""}'

# Expected: 400 Bad Request
# "Scenario description is required"
```

**Very short description:**
```bash
curl -X POST http://localhost:3000/api/advice \
  -H "Content-Type: application/json" \
  -d '{"description": "Hi"}'

# Expected: 400 Bad Request
# "Scenario description must be at least 5 characters"
```

**Complex scenario with context:**
```bash
curl -X POST http://localhost:3000/api/advice \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Dinner at a trendy restaurant with venture capitalists",
    "context": {
      "location": "San Francisco",
      "formality": "business-casual",
      "peopleTypes": ["investors", "tech executives"]
    },
    "preferences": {
      "topics": ["startups", "technology"],
      "avoid": ["politics", "religion"]
    }
  }' | jq '.recommendations.topics'
```

### D. Test Graph Visualization

**Purpose:** Verify graph endpoint returns correct data for visualization.

#### Step 1: Get Full Graph

```bash
curl "http://localhost:3000/api/graph" | jq '.metadata'

# Should show:
# - totalVibes (number of nodes)
# - filters applied
```

#### Step 2: Test Filters

**By relevance:**
```bash
# Only highly relevant vibes
curl "http://localhost:3000/api/graph?minRelevance=0.7" | jq '.nodes | length'
```

**By category:**
```bash
# Only trends
curl "http://localhost:3000/api/graph?category=trend" | jq '.nodes[].category' | sort | uniq

# Expected: only "trend"
```

**By region:**
```bash
# Only US-West vibes
curl "http://localhost:3000/api/graph?region=US-West" | jq '.nodes[].region' | sort | uniq
```

**Combined filters:**
```bash
curl "http://localhost:3000/api/graph?category=aesthetic&minRelevance=0.5" \
  | jq '{totalNodes: .nodes | length, categories: [.nodes[].category] | unique}'
```

#### Step 3: Verify Graph Structure

```bash
curl "http://localhost:3000/api/graph" | jq '{
  nodeCount: .nodes | length,
  edgeCount: .edges | length,
  sampleNode: .nodes[0] | {id, name, category, strength},
  sampleEdge: .edges[0]
}'
```

**Expected:**
- Nodes have: id, name, category, strength, currentRelevance
- Edges have: source, target, strength
- Edge source/target IDs match node IDs

### E. Verify Temporal Decay is Working

**Purpose:** Confirm vibes lose relevance over time.

#### Step 1: Collect Fresh Vibes

```bash
curl -X POST http://localhost:3000/api/collect
curl http://localhost:3000/api/status | jq '.temporal'
```

**Record initial values:**
```json
{
  "averageRelevance": 0.85,
  "highlyRelevant": 5,
  "averageDaysSinceLastSeen": 0
}
```

#### Step 2: Simulate Time Passage

**Option A: Wait (for real testing)**
Wait 1-2 days, then check status again.

**Option B: Manually adjust timestamps (for testing)**

1. Connect to database or use in-memory store
2. Modify vibe `lastSeen` dates to be older
3. Restart server
4. Check status

**Using Postgres:**
```sql
-- Make all vibes appear 7 days old
UPDATE vibes
SET last_seen = last_seen - INTERVAL '7 days',
    timestamp = timestamp - INTERVAL '7 days';
```

**Using code (temporary test file):**
```typescript
// lib/__tests__/temporal-manual-test.ts
import { zeitgeist } from '@/lib';

async function testDecay() {
  const store = zeitgeist.getStore();
  const vibes = await store.getAllVibes();

  // Age all vibes by 7 days
  for (const vibe of vibes) {
    const aged = {
      ...vibe,
      lastSeen: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    };
    await store.saveVibe(aged);
  }

  console.log('Vibes aged by 7 days');
}
```

#### Step 3: Verify Decay Applied

```bash
curl http://localhost:3000/api/status | jq '.temporal'
```

**Expected changes after 7 days:**
- `averageRelevance`: Lower (e.g., 0.65 instead of 0.85)
- `averageDaysSinceLastSeen`: Higher (e.g., 7 instead of 0)
- `highlyRelevant`: Fewer vibes
- `decayed`: More vibes (very low relevance)

#### Step 4: Verify Category-Specific Decay

```bash
# Get vibes by category and check decay rates
curl "http://localhost:3000/api/graph?minRelevance=0.01" | jq '.nodes | group_by(.category) | map({
  category: .[0].category,
  avgRelevance: (map(.currentRelevance) | add / length),
  count: length
})'
```

**Expected decay patterns (after 7 days):**
- Memes (3-day half-life): ~0.25 relevance
- Events (7-day half-life): ~0.50 relevance
- Trends (14-day half-life): ~0.75 relevance
- Movements (90-day half-life): ~0.95 relevance

---

## Automated Testing

### A. Running the Test Suite

**Run all tests:**
```bash
npm test
```

**Run tests in watch mode (for development):**
```bash
npm run test:watch
```

**Run tests with UI (interactive):**
```bash
npm run test:ui
# Opens browser with interactive test explorer
```

**Run specific test file:**
```bash
npm test lib/temporal-decay.test.ts
```

**Run specific test suite:**
```bash
npm test -- --grep "temporal decay"
```

### B. Test Coverage

**Generate coverage report:**
```bash
npm run test:coverage
```

**View coverage:**
```bash
# Terminal output shows summary
# Open coverage/index.html in browser for detailed report
```

**Coverage targets:**
- Lines: 80%
- Functions: 80%
- Branches: 80%
- Statements: 80%

**Check coverage for specific file:**
```bash
npm run test:coverage -- lib/temporal-decay.ts
```

### C. Writing New Tests

#### Test File Structure

Create tests in `__tests__` directory next to code:

```
lib/
  collectors/
    news.ts
    __tests__/
      news.test.ts
```

#### Example Unit Test

```typescript
// lib/temporal-decay.test.ts
import { describe, it, expect } from 'vitest';
import { calculateDecay, DEFAULT_HALF_LIVES } from '../temporal-decay';
import { Vibe } from '../types';

describe('calculateDecay', () => {
  it('should return full strength for fresh vibes', () => {
    const vibe: Vibe = {
      id: 'test',
      name: 'Test',
      category: 'trend',
      strength: 0.8,
      lastSeen: new Date(), // Just now
      // ... other required fields
    };

    const relevance = calculateDecay(vibe);
    expect(relevance).toBeCloseTo(0.8, 2);
  });

  it('should apply exponential decay based on half-life', () => {
    const vibe: Vibe = {
      id: 'test',
      name: 'Test',
      category: 'trend',
      strength: 0.8,
      lastSeen: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
      halfLife: 14,
      // ... other required fields
    };

    const relevance = calculateDecay(vibe);
    // After one half-life, should be ~50% of original
    expect(relevance).toBeCloseTo(0.4, 1);
  });
});
```

#### Example Integration Test

```typescript
// lib/__tests__/integration.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ZeitgeistService } from '../zeitgeist-service';
import { MemoryGraphStore } from '../graph/memory';

describe('End-to-End Flow', () => {
  let service: ZeitgeistService;

  beforeEach(() => {
    service = new ZeitgeistService({
      store: new MemoryGraphStore(),
    });
  });

  it('should collect, analyze, store, and retrieve vibes', async () => {
    // Collect data
    const result = await service.updateGraph({ limit: 5 });
    expect(result.vibesAdded).toBeGreaterThan(0);

    // Verify storage
    const status = await service.getGraphStatus();
    expect(status.totalVibes).toBe(result.vibesAdded);

    // Get advice
    const advice = await service.getAdvice({
      description: 'Coffee with a friend'
    });
    expect(advice.matchedVibes.length).toBeGreaterThan(0);
  });
});
```

#### Mocking LLM Calls

```typescript
import { vi } from 'vitest';

// Mock the LLM module
vi.mock('@/lib/llm', () => ({
  getLLM: vi.fn().mockResolvedValue({
    complete: vi.fn().mockResolvedValue({
      content: JSON.stringify([{
        name: 'Test Vibe',
        description: 'A test vibe',
        category: 'trend',
        keywords: ['test'],
        strength: 0.8,
        sentiment: 'positive'
      }])
    })
  })
}));

// Now tests won't make real LLM calls
```

### D. Test Organization

**Test Categories:**

1. **Unit Tests:** Test individual functions
   - `lib/temporal-decay.test.ts`
   - `lib/utils/*.test.ts`

2. **Integration Tests:** Test module interactions
   - `lib/__tests__/integration.test.ts`
   - `lib/graph/__tests__/postgres.test.ts`

3. **Component Tests:** Test specific components
   - `lib/collectors/__tests__/news.test.ts`
   - `lib/analyzers/__tests__/llm.test.ts`

---

## Test Scenarios

### Comprehensive Test Cases (10+ Scenarios)

#### 1. Fresh Installation Test

**Scenario:** New developer sets up project for first time

**Steps:**
1. Clone repository
2. Run `npm install`
3. Create `.env.local` with Ollama config
4. Run `npm run dev`
5. Test `/api/status` (should show 0 vibes)
6. Collect data: `curl -X POST http://localhost:3000/api/collect`
7. Test `/api/status` (should show vibes)

**Expected Result:**
- Setup completes in < 10 minutes
- Collection succeeds
- Graph has 5+ vibes

#### 2. Empty Graph Handling

**Scenario:** User requests advice when graph is empty

**Steps:**
1. Clear graph (restart with in-memory store)
2. Request advice without collecting first
```bash
curl -X POST http://localhost:3000/api/advice \
  -H "Content-Type: application/json" \
  -d '{"description": "Dinner with friends"}'
```

**Expected Result:**
- Should return advice (may use defaults/fallbacks)
- OR return helpful error: "No vibes in graph, collect data first"

#### 3. LLM Connection Failure

**Scenario:** LLM service is down

**Steps:**
1. Stop Ollama/LM Studio
2. Try to collect: `curl -X POST http://localhost:3000/api/collect`

**Expected Result:**
- Collection fails gracefully
- Error message: "Failed to collect data"
- Details: "Could not connect to LLM"
- Server doesn't crash

#### 4. Embedding Dimension Mismatch

**Scenario:** Different embedding models with different dimensions

**Steps:**
1. Collect vibes with `nomic-embed-text` (384 dimensions)
2. Change to `mxbai-embed-large` in `.env.local` (1024 dimensions)
3. Collect more vibes
4. Try semantic search

**Expected Result:**
- System handles different dimensions gracefully
- OR throws clear error about dimension mismatch

#### 5. Multiple Concurrent Collections

**Scenario:** Two collection requests at same time

**Steps:**
```bash
# Terminal 1
curl -X POST http://localhost:3000/api/collect &

# Terminal 2 (immediately)
curl -X POST http://localhost:3000/api/collect &
```

**Expected Result:**
- Both complete without errors
- No duplicate vibes created
- OR second request waits for first to complete

#### 6. Large Graph Performance

**Scenario:** Graph with 1000+ vibes

**Steps:**
1. Collect data multiple times (or import test data)
2. Build graph with 1000+ vibes
3. Test advice generation
4. Test graph visualization
5. Measure response times

**Expected Result:**
- `/api/advice`: < 30 seconds
- `/api/graph`: < 5 seconds
- `/api/status`: < 1 second
- No memory issues

#### 7. Temporal Decay Accuracy

**Scenario:** Verify decay math is correct

**Steps:**
1. Create vibe with known properties:
   - strength: 0.8
   - category: "trend" (14-day half-life)
   - lastSeen: 14 days ago
2. Calculate currentRelevance
3. Verify: 0.8 * 0.5 = 0.4

**Test:**
```typescript
const vibe = {
  strength: 0.8,
  category: 'trend',
  lastSeen: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
  halfLife: 14
};
const relevance = calculateDecay(vibe);
expect(relevance).toBeCloseTo(0.4, 2);
```

#### 8. Regional Filtering

**Scenario:** Filter vibes by region

**Steps:**
1. Collect vibes (should have mixed regions)
2. Get US-West vibes: `curl "http://localhost:3000/api/graph?region=US-West"`
3. Verify all vibes have region "US-West" or "Global"

**Expected Result:**
- Only relevant regional vibes returned
- Global vibes included in all regions

#### 9. Category-Specific Half-Lives

**Scenario:** Different categories decay at different rates

**Steps:**
1. Create vibes of different categories, all 7 days old
2. Calculate relevance for each
3. Verify memes (3-day half-life) decayed more than movements (90-day half-life)

**Expected:**
- Meme (7 days old, 3-day half-life): ~18% relevance
- Movement (7 days old, 90-day half-life): ~95% relevance

#### 10. Duplicate Vibe Prevention

**Scenario:** Same vibe collected twice

**Steps:**
1. Collect data from news
2. Immediately collect again
3. Check vibe count

**Expected Result:**
- Duplicate vibes merged (same name/description)
- `lastSeen` updated to newer date
- Strength potentially boosted
- Total vibe count doesn't double

#### 11. Search with No Results

**Scenario:** Search for non-existent topic

**Steps:**
```bash
curl "http://localhost:3000/api/search?q=quantum%20physics%20breakthrough"
```

**Expected Result:**
```json
{
  "vibes": []
}
```
- No error
- Empty array returned

#### 12. Malformed Input Handling

**Scenario:** Invalid JSON in request

**Steps:**
```bash
curl -X POST http://localhost:3000/api/advice \
  -H "Content-Type: application/json" \
  -d '{invalid json}'
```

**Expected Result:**
- 400 Bad Request
- Error message about invalid JSON
- Server doesn't crash

### Edge Cases to Verify

**Data Edge Cases:**
- Empty description
- Very long description (5000+ chars)
- Special characters in description
- Non-English text
- Emoji-only description

**System Edge Cases:**
- No internet connection (for APIs)
- API key invalid/expired
- Database connection lost
- Out of memory
- Disk full

**Temporal Edge Cases:**
- Vibe from far future (bad timestamp)
- Vibe from 1970 (epoch time)
- Negative half-life
- Zero strength vibes
- NaN/Infinity in calculations

### Performance Testing

**Load Test Collection:**
```bash
# Run 10 collections in parallel
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/collect &
done
wait
```

**Load Test Advice:**
```bash
# Run 50 advice requests
for i in {1..50}; do
  curl -X POST http://localhost:3000/api/advice \
    -H "Content-Type: application/json" \
    -d '{"description": "Test scenario '$i'"}' > /dev/null &
done
wait
```

**Measure Response Times:**
```bash
# Time collection
time curl -X POST http://localhost:3000/api/collect

# Time advice
time curl -X POST http://localhost:3000/api/advice \
  -H "Content-Type: application/json" \
  -d '{"description": "Coffee meeting"}'
```

---

## Troubleshooting Guide

### Common Issues and Solutions

#### Issue 1: "Failed to connect to LLM"

**Symptoms:**
```
Error: Failed to collect data
Details: ECONNREFUSED localhost:1234
```

**Diagnosis:**
```bash
# Test LM Studio
curl http://localhost:1234/v1/models

# Test Ollama
curl http://localhost:11434/api/tags
```

**Solutions:**

**For LM Studio:**
1. Open LM Studio application
2. Load a model in the server tab
3. Click "Start Server"
4. Verify port is 1234
5. Check firewall isn't blocking

**For Ollama:**
```bash
# Check if running
ps aux | grep ollama

# Start if not running
ollama serve

# Verify models available
ollama list

# Pull model if missing
ollama pull llama2
```

**For Both:**
```bash
# Check .env.local
cat .env.local | grep LLM_PROVIDER
cat .env.local | grep BASE_URL

# Verify URLs match running services
```

#### Issue 2: "No embedding provider configured"

**Symptoms:**
```
Error: Search failed
Details: No embedding provider configured
```

**Diagnosis:**
```bash
# Check config
cat .env.local | grep EMBEDDING

# Test embedding endpoint
curl http://localhost:11434/api/embeddings -d '{
  "model": "nomic-embed-text",
  "prompt": "test"
}'
```

**Solutions:**
```bash
# Pull embedding model
ollama pull nomic-embed-text

# Add to .env.local
EMBEDDING_PROVIDER=ollama
OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# Restart dev server
# Ctrl+C, then npm run dev
```

#### Issue 3: Embedding Dimension Mismatch

**Symptoms:**
```
Error: Dimension mismatch
Details: Expected 384, got 1024
```

**Diagnosis:**
- Changed embedding model
- Existing vibes have different dimensions
- Attempting to compare incompatible embeddings

**Solutions:**

**Option 1: Clear and rebuild (development)**
```bash
# If using in-memory store
# Just restart server

# If using Postgres
# Connect to database and clear
psql $POSTGRES_URL -c "DELETE FROM vibes;"
psql $POSTGRES_URL -c "DELETE FROM graph_edges;"
```

**Option 2: Migrate embeddings (production)**
```typescript
// Create migration script
// Re-generate embeddings for all vibes with new model
```

**Option 3: Use consistent model**
```bash
# Stick with one model
EMBEDDING_PROVIDER=ollama
OLLAMA_EMBEDDING_MODEL=nomic-embed-text  # Always 384 dimensions
```

#### Issue 4: Tests Failing Locally

**Symptoms:**
```bash
npm test
# FAIL lib/analyzers/__tests__/llm.test.ts
```

**Diagnosis:**
```bash
# Check test output for specific error
npm test -- --reporter=verbose

# Check if mocks are working
# Check if environment variables set
```

**Solutions:**

**Mock not working:**
```typescript
// Ensure mocks are defined before imports
vi.mock('@/lib/llm', () => ({...}));

import { something } from '@/lib/something';
```

**Environment variables:**
```bash
# Tests may need .env.test or .env.local
cp .env.local .env.test

# Or set inline
LLM_PROVIDER=ollama npm test
```

**Test timeout:**
```typescript
// Increase timeout for slow tests
import { describe, it, expect } from 'vitest';

describe('Slow tests', () => {
  it('should complete eventually', async () => {
    // ...
  }, 30000); // 30 second timeout
});
```

#### Issue 5: Collection Takes Too Long

**Symptoms:**
- Collection takes > 5 minutes
- Requests time out

**Diagnosis:**
```bash
# Check console logs
# Look for slow LLM calls
# Check number of items being processed
```

**Solutions:**

**Reduce batch size:**
```typescript
// lib/analyzers/llm.ts
async analyze(content: RawContent[]): Promise<Vibe[]> {
  const batches = this.batchContent(content, 3); // Reduce from 10 to 3
  // ...
}
```

**Limit collection:**
```bash
curl -X POST http://localhost:3000/api/collect \
  -H "Content-Type: application/json" \
  -d '{"options": {"limit": 5}}'  # Collect fewer items
```

**Use faster model:**
```bash
# Switch to smaller/faster model
ollama pull llama2:7b  # Instead of mixtral:8x7b
```

#### Issue 6: Graph Visualization Not Loading

**Symptoms:**
- `/api/graph` returns data
- But UI shows blank/spinning

**Diagnosis:**
```bash
# Check browser console (F12)
# Look for JavaScript errors

# Check network tab
# Verify /api/graph succeeds
```

**Solutions:**

**CORS issue:**
- Should not happen in Next.js
- But verify API and UI on same origin

**Too many nodes:**
```bash
# Limit nodes returned
curl "http://localhost:3000/api/graph?minRelevance=0.5"
```

**D3.js error:**
- Check browser console
- Verify D3 version matches
- Check for null/undefined data

#### Issue 7: Vibes Not Decaying

**Symptoms:**
- Old vibes still at full relevance
- Temporal stats show 0 decay

**Diagnosis:**
```bash
# Check vibe timestamps
curl http://localhost:3000/api/graph | jq '.nodes[0] | {
  name,
  lastSeen,
  currentRelevance,
  strength
}'

# Should see lastSeen in past
# currentRelevance < strength
```

**Solutions:**

**Verify decay calculation:**
```typescript
// Check lib/temporal-decay.ts
// Ensure calculateDecay() being called

// Check zeitgeist-service.ts
// Ensure applyDecayToVibes() called before returning
```

**Check timestamps:**
```bash
# Vibes should have valid dates
# If lastSeen is "now", decay won't apply

# Verify collection updates lastSeen
```

#### Issue 8: Database Connection Errors (Postgres)

**Symptoms:**
```
Error: Failed to connect to Postgres
Details: ECONNREFUSED
```

**Diagnosis:**
```bash
# Check env var
echo $POSTGRES_URL

# Test connection
psql $POSTGRES_URL -c "SELECT 1;"
```

**Solutions:**

**Use in-memory store (development):**
```bash
# Remove POSTGRES_URL from .env.local
# Restart server
# Will use memory store
```

**Fix Postgres connection:**
```bash
# Verify connection string format
POSTGRES_URL=postgres://user:pass@host:port/database

# Check network access
# Verify credentials
# Check database exists
```

#### Issue 9: News API Errors

**Symptoms:**
```
[NewsCollector] NewsAPI error: Unauthorized
```

**Diagnosis:**
```bash
# Check API key
echo $NEWS_API_KEY

# Test API key
curl "https://newsapi.org/v2/top-headlines?country=us&apiKey=$NEWS_API_KEY"
```

**Solutions:**
```bash
# Get new API key from https://newsapi.org
# Free tier: 100 requests/day

# Add to .env.local
NEWS_API_KEY=your_new_key_here

# Or skip news collection
# Remove NEWS_API_KEY
# Reddit collector will still work
```

#### Issue 10: Out of Memory

**Symptoms:**
- Process crashes
- "JavaScript heap out of memory"

**Diagnosis:**
```bash
# Check node memory usage
node --max-old-space-size=4096  # Increase to 4GB

# Check graph size
curl http://localhost:3000/api/status | jq '.totalVibes'
```

**Solutions:**

**Increase memory:**
```json
// package.json
{
  "scripts": {
    "dev": "NODE_OPTIONS='--max-old-space-size=4096' next dev"
  }
}
```

**Reduce graph size:**
```bash
# Clear old vibes
# Implement automatic cleanup
# Filter out low-relevance vibes
```

**Optimize code:**
- Avoid loading all vibes at once
- Use pagination
- Stream large results

### Debug LLM Issues

**Enable LLM logging:**
```typescript
// lib/llm/ollama.ts or lmstudio.ts
async complete(messages: LLMMessage[], options?: any): Promise<LLMResponse> {
  console.log('[LLM] Request:', JSON.stringify(messages, null, 2));

  const response = await fetch(url, {...});
  const data = await response.json();

  console.log('[LLM] Response:', JSON.stringify(data, null, 2));

  return processResponse(data);
}
```

**Test LLM directly:**
```bash
# Ollama
curl http://localhost:11434/api/generate -d '{
  "model": "llama2",
  "prompt": "Say hello",
  "stream": false
}'

# LM Studio
curl http://localhost:1234/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Say hello"}],
    "temperature": 0.7
  }'
```

**Check LLM performance:**
```bash
# Time a request
time curl http://localhost:11434/api/generate -d '{
  "model": "llama2",
  "prompt": "Write a short story",
  "stream": false
}'

# Should complete in < 30 seconds for short prompts
```

---

## Test Checklist (Complete System Test)

Use this checklist for full system validation:

### Setup Phase
- [ ] Node.js 18+ installed
- [ ] LM Studio or Ollama running
- [ ] Models downloaded (LLM + embeddings)
- [ ] `.env.local` configured
- [ ] Dependencies installed (`npm install`)
- [ ] Dev server starts (`npm run dev`)

### Data Collection
- [ ] `/api/status` returns 200 OK
- [ ] `/api/collect` completes successfully
- [ ] Console shows vibes extracted
- [ ] `/api/status` shows vibes > 0
- [ ] Vibes have valid structure (name, category, keywords)

### Advice Generation
- [ ] `/api/advice` accepts scenario
- [ ] Returns matchedVibes
- [ ] Returns topics with talking points
- [ ] Returns behavior recommendations
- [ ] Returns style suggestions
- [ ] Reasoning explains selections
- [ ] Confidence score present

### Graph Visualization
- [ ] `/api/graph` returns nodes and edges
- [ ] Filters work (region, category, minRelevance)
- [ ] Nodes have required fields
- [ ] Edges connect existing nodes
- [ ] UI renders graph (if testing frontend)

### Temporal Decay
- [ ] Fresh vibes have high currentRelevance
- [ ] Old vibes have lower currentRelevance
- [ ] Different categories decay at different rates
- [ ] Temporal stats show accurate averages

### Error Handling
- [ ] Invalid input returns 400 errors
- [ ] LLM down returns 500 with helpful message
- [ ] Empty graph handled gracefully
- [ ] Server doesn't crash on errors

### Automated Tests
- [ ] `npm test` passes all tests
- [ ] Coverage meets targets (80%)
- [ ] No failing tests

### Performance
- [ ] `/api/advice` completes in < 30 seconds
- [ ] `/api/collect` completes in < 2 minutes
- [ ] `/api/graph` returns in < 5 seconds
- [ ] UI responsive

---

## Continuous Testing During Development

**Before every commit:**
```bash
# 1. Run tests
npm test

# 2. Check types
npx tsc --noEmit

# 3. Lint code
npm run lint

# 4. Quick smoke test
curl http://localhost:3000/api/status
```

**After major changes:**
```bash
# Full test suite
npm run test:coverage

# Manual integration test
curl -X POST http://localhost:3000/api/collect
curl -X POST http://localhost:3000/api/advice \
  -H "Content-Type: application/json" \
  -d '{"description": "Test scenario"}'
```

**Before deployment:**
```bash
# Build succeeds
npm run build

# All tests pass
npm run test:run

# Start production build
npm start

# Test production endpoints
curl http://localhost:3000/api/status
```

---

## Next Steps

After completing testing:
1. Read [Code Navigation Guide](./20251123_*_navigation-guide_*.md)
2. Read [Developer Guide](/docs/DEVELOPER_GUIDE.md)
3. Review [Architecture Documentation](/docs/ARCHITECTURE.md)
4. Start contributing!

---

**Questions or issues?**
- Check inline code comments
- Review test files for examples
- Check console logs for errors
- Open an issue with reproduction steps

Happy testing!

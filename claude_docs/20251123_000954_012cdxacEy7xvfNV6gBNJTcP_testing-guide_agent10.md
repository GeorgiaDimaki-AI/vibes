# Zeitgeist Testing Guide

Complete guide for manually testing all components of the Zeitgeist cultural graph system.

## Prerequisites Checklist

Before you begin testing, ensure you have:

- [ ] Node.js 18+ installed
- [ ] npm or yarn package manager
- [ ] Either LM Studio OR Ollama running locally
- [ ] (Optional) NewsAPI key for data collection
- [ ] (Optional) Vercel Postgres database for persistence

## Quick Start (5 Minutes)

### 1. Clone and Install
```bash
git clone <repository-url>
cd vibes
npm install
```

### 2. Configure Environment

Create `.env.local`:
```bash
# Option A: LM Studio (recommended for beginners)
LLM_PROVIDER=lmstudio
LMSTUDIO_BASE_URL=http://localhost:1234/v1
LMSTUDIO_MODEL=local-model

# Option B: Ollama
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2

# Embeddings - Choose one:
# Option 1: Local (FREE) - Recommended
EMBEDDING_PROVIDER=ollama
OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# Option 2: Cloud (PAID) - Higher quality
# EMBEDDING_PROVIDER=openai
# OPENAI_API_KEY=sk-...

# Optional: For news collection
NEWS_API_KEY=your_newsapi_key_here

# Optional: For production persistence
# POSTGRES_URL=postgres://...
```

### 3. Start Your LLM Server

**LM Studio:**
1. Open LM Studio
2. Download a model (e.g., `mistral-7b-instruct`)
3. Load the model
4. Start the server on port 1234

**Ollama:**
```bash
# Install Ollama first (https://ollama.ai)
ollama pull llama2
ollama pull nomic-embed-text  # For embeddings
ollama serve
```

### 4. Start Development Server
```bash
npm run dev
```

Open http://localhost:3000 - You should see the Zeitgeist interface!

## Step-by-Step Component Testing

### Test 1: Verify LLM Integration

**What it tests:** Connection to local LLM provider

**Steps:**
1. Start your LLM server (LM Studio or Ollama)
2. Run the dev server: `npm run dev`
3. Open http://localhost:3000
4. In the scenario input, type: "Coffee with friends"
5. Click "Get Advice"

**Expected Result:**
- Loading indicator appears
- After 5-30 seconds, you see advice sections:
  - Topics to Discuss
  - How to Behave
  - Style Recommendations
- Console shows: "Matching scenario to vibes..."

**Troubleshooting:**
- **Error: "Failed to connect to LLM"**
  - Check LM Studio/Ollama is running
  - Verify `LLM_PROVIDER` in `.env.local`
  - Check port numbers match (1234 for LM Studio, 11434 for Ollama)

- **Error: "No model loaded"**
  - LM Studio: Load a model in the UI first
  - Ollama: Run `ollama pull llama2`

- **Very slow response (>1 minute)**
  - Normal for first request (model loading)
  - Try a smaller model if your machine is slow
  - Check CPU/RAM usage

### Test 2: Verify Embeddings

**What it tests:** Semantic similarity and embedding generation

**Steps:**
1. Ensure embedding provider is configured in `.env.local`
2. Trigger collection (creates vibes with embeddings):
   ```bash
   curl http://localhost:3000/api/collect
   ```
3. Wait for completion (check console logs)
4. Test search:
   ```bash
   curl "http://localhost:3000/api/search?q=technology&limit=5"
   ```

**Expected Result:**
```json
{
  "vibes": [
    {
      "id": "...",
      "name": "AI Acceleration",
      "description": "...",
      "embedding": [0.123, -0.456, ...],
      "currentRelevance": 0.85
    }
  ]
}
```

**Troubleshooting:**
- **No embeddings generated:**
  - Check `EMBEDDING_PROVIDER` is set
  - Ollama: Ensure `nomic-embed-text` is pulled: `ollama pull nomic-embed-text`
  - OpenAI: Verify API key is valid

- **Search returns no results:**
  - Run collection first: `curl http://localhost:3000/api/collect`
  - Check graph has vibes: `curl http://localhost:3000/api/status`

### Test 3: Trigger Collection

**What it tests:** Data collection from external sources

**Steps:**

1. **Configure a collector** (add to `.env.local`):
   ```bash
   NEWS_API_KEY=your_key_here
   ```

2. **Manually trigger collection:**
   ```bash
   curl -X POST http://localhost:3000/api/collect
   ```

3. **Watch console output:**
   ```
   Collecting content...
   Collected 20 pieces of content
   Analyzing content...
   [llm] Generating embeddings for 7 vibes...
   Extracted 7 vibes
   Applied temporal decay...
   Filtered 0 decayed vibes
   ```

4. **Verify collection succeeded:**
   ```bash
   curl http://localhost:3000/api/status
   ```

**Expected Result:**
```json
{
  "totalVibes": 7,
  "totalEdges": 0,
  "lastUpdated": "2025-11-23T...",
  "categories": {
    "trend": 3,
    "topic": 2,
    "sentiment": 2
  },
  "topVibes": [...]
}
```

**Troubleshooting:**
- **"Collected 0 pieces of content":**
  - NewsAPI: Check API key is valid
  - Reddit: Should work without API key (uses RSS)
  - Check internet connection

- **"Failed to generate embeddings":**
  - Non-critical - collection continues without embeddings
  - Configure embedding provider to enable semantic search

- **"Extracted 0 vibes":**
  - LLM failed to analyze content
  - Check LLM is running and responding
  - Check LLM has enough context window

### Test 4: Verify Temporal Decay

**What it tests:** Vibes lose relevance over time

**Steps:**

1. **Collect data to populate graph:**
   ```bash
   curl http://localhost:3000/api/collect
   ```

2. **Check initial relevance:**
   ```bash
   curl http://localhost:3000/api/status | jq '.topVibes[0]'
   ```
   Note the `currentRelevance` value (should be ~0.8-1.0)

3. **Manually set a vibe's lastSeen to 7 days ago:**
   - This requires database access or code modification
   - For testing, we'll verify decay calculation:

4. **Open Node.js REPL:**
   ```bash
   node
   ```

5. **Test decay calculation:**
   ```javascript
   const { calculateDecay } = require('./lib/temporal-decay.ts');

   const testVibe = {
     strength: 1.0,
     category: 'meme',
     lastSeen: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
     halfLife: 3
   };

   calculateDecay(testVibe); // Should return ~0.5 (50% after 1 half-life)
   ```

**Expected Result:**
- Meme after 3 days: ~50% relevance (half-life = 3 days)
- Trend after 7 days: ~75% relevance (half-life = 14 days)
- Aesthetic after 30 days: ~75% relevance (half-life = 60 days)

**Visual Test:**
1. Collect data: `curl http://localhost:3000/api/collect`
2. Wait 1 hour
3. Collect again: `curl http://localhost:3000/api/collect`
4. Check status: Vibes should have boosted `lastSeen` timestamps
5. Old vibes not re-detected should have lower `currentRelevance`

### Test 5: Test Advice Generation

**What it tests:** End-to-end advice generation pipeline

**Steps:**

1. **Ensure graph has data:**
   ```bash
   curl http://localhost:3000/api/collect
   ```

2. **Get advice via API:**
   ```bash
   curl -X POST http://localhost:3000/api/advice \
     -H "Content-Type: application/json" \
     -d '{
       "description": "Dinner with tech startup founders at a trendy restaurant in San Francisco",
       "context": {
         "location": "San Francisco",
         "formality": "casual",
         "peopleTypes": ["tech founders", "investors"]
       }
     }'
   ```

3. **Verify response structure:**
   ```json
   {
     "scenario": { "description": "..." },
     "matchedVibes": [
       {
         "vibe": { "name": "...", "category": "..." },
         "relevanceScore": 0.85,
         "reasoning": "..."
       }
     ],
     "recommendations": {
       "topics": [
         {
           "topic": "AI and Automation",
           "talking_points": ["...", "..."],
           "priority": "high"
         }
       ],
       "behavior": [
         {
           "aspect": "conversation style",
           "suggestion": "...",
           "reasoning": "..."
         }
       ],
       "style": [
         {
           "category": "clothing",
           "suggestions": ["Smart casual", "..."],
           "reasoning": "..."
         }
       ]
     },
     "reasoning": "...",
     "confidence": 0.85
   }
   ```

**Troubleshooting:**
- **"No matched vibes":**
  - Graph is empty - run collection first
  - Embeddings missing - configure embedding provider

- **Generic/poor advice:**
  - Graph needs more vibes - run collection multiple times
  - Try different/better LLM model
  - Check if matched vibes are actually relevant

### Test 6: Inspect the Graph

**What it tests:** Graph visualization and structure

**Steps:**

1. **Navigate to graph page:**
   - Open http://localhost:3000/graph

2. **You should see:**
   - Interactive D3.js force-directed graph
   - Nodes representing vibes (colored by category)
   - Edges connecting related vibes
   - Controls to filter by region/category/relevance

3. **Test filters:**
   - Change "Min Relevance" slider - nodes disappear/appear
   - Select category - graph filters to that category
   - Select region - graph shows regional vibes

4. **Test interactivity:**
   - Hover over node - see vibe details
   - Click and drag - move nodes
   - Zoom in/out - graph scales

**Expected Result:**
- Graph displays vibes as colored circles
- Size correlates with relevance
- Connections show relationships
- Smooth animations

**Troubleshooting:**
- **Empty graph:**
  - Run collection first
  - Lower minimum relevance slider

- **No connections:**
  - Need more vibes with shared keywords/categories
  - Run collection multiple times

- **Graph visualization not loading:**
  - Check browser console for errors
  - Ensure D3.js loaded (check Network tab)

### Test 7: Test Halo Effect

**What it tests:** Boosting related vibes when one reappears

**Steps:**

1. **Collect initial data:**
   ```bash
   curl http://localhost:3000/api/collect
   ```

2. **Note vibes and their relationships:**
   ```bash
   curl http://localhost:3000/api/status | jq '.topVibes'
   ```

3. **Collect again after some time:**
   ```bash
   # Wait 1-2 hours or manually adjust timestamps in database
   curl http://localhost:3000/api/collect
   ```

4. **Check for halo metadata:**
   - Vibes that reappeared should have updated `lastSeen`
   - Similar vibes should show `metadata.lastHaloBoost`

**Expected Behavior:**
- When "AI Development" vibe reappears, similar vibes like "Tech Innovation" get boosted
- Boost amount proportional to semantic similarity
- Only affects vibes above similarity threshold (0.6)

**Verification:**
Check console during collection for logs like:
```
Applied halo effect from vibe-123 to 3 similar vibes
```

### Test 8: Test Database Persistence

**What it tests:** Data persists across restarts

**Without Postgres (In-Memory):**
1. Collect data: `curl http://localhost:3000/api/collect`
2. Check status: `curl http://localhost:3000/api/status` (note vibe count)
3. Restart server: `Ctrl+C` then `npm run dev`
4. Check status again: **Vibes should be GONE** (in-memory only)

**With Postgres:**
1. Configure `POSTGRES_URL` in `.env.local`
2. Collect data: `curl http://localhost:3000/api/collect`
3. Check status: `curl http://localhost:3000/api/status` (note vibe count)
4. Restart server: `Ctrl+C` then `npm run dev`
5. Check status again: **Vibes should PERSIST** (loaded from DB)

**Troubleshooting:**
- **"Failed to connect to database":**
  - Check Postgres connection string
  - Verify database exists and is accessible
  - Falls back to in-memory store (check logs)

## Common Issues and Troubleshooting

### Issue: LLM Not Responding

**Symptoms:**
- Requests timeout
- Error: "Failed to complete request"

**Solutions:**
1. Check LLM server is running:
   - LM Studio: Look for green indicator
   - Ollama: `curl http://localhost:11434/api/tags`
2. Verify model is loaded:
   - LM Studio: Model shown in UI
   - Ollama: `ollama list`
3. Check port in `.env.local` matches server
4. Try simpler/smaller model
5. Increase timeout in code if needed

### Issue: Embeddings Not Generated

**Symptoms:**
- `embedding` field is null/undefined
- Search returns no results
- Console: "Continuing without embeddings"

**Solutions:**
1. Configure `EMBEDDING_PROVIDER`:
   ```bash
   # For local (free)
   EMBEDDING_PROVIDER=ollama
   OLLAMA_EMBEDDING_MODEL=nomic-embed-text

   # OR for cloud (paid)
   EMBEDDING_PROVIDER=openai
   OPENAI_API_KEY=sk-...
   ```
2. Ollama: Pull embedding model:
   ```bash
   ollama pull nomic-embed-text
   # OR
   ollama pull mxbai-embed-large
   ```
3. Test embedding generation:
   ```bash
   curl http://localhost:11434/api/embeddings -d '{
     "model": "nomic-embed-text",
     "prompt": "test"
   }'
   ```

### Issue: No Data Collected

**Symptoms:**
- "Collected 0 pieces of content"
- Graph remains empty

**Solutions:**
1. Check API keys are configured:
   - NewsAPI: `NEWS_API_KEY` in `.env.local`
2. Verify internet connection
3. Try Reddit collector (no API key needed):
   - Should automatically fetch from Reddit RSS
4. Check console for specific errors:
   ```
   News collection failed: Invalid API key
   ```
5. Manually test NewsAPI:
   ```bash
   curl "https://newsapi.org/v2/top-headlines?country=us&apiKey=YOUR_KEY"
   ```

### Issue: Advice Too Generic

**Symptoms:**
- Advice not specific to scenario
- Recommendations seem random

**Solutions:**
1. Collect more data:
   ```bash
   curl http://localhost:3000/api/collect
   # Wait 1 hour
   curl http://localhost:3000/api/collect
   # Repeat several times
   ```
2. Configure embeddings for better matching
3. Try better LLM model:
   - Mistral 7B Instruct (good balance)
   - Mixtral 8x7B (better quality, slower)
   - Llama 2 13B (good for advice generation)
4. Provide more context in scenario:
   ```json
   {
     "description": "Detailed scenario description",
     "context": {
       "location": "San Francisco",
       "formality": "casual",
       "peopleTypes": ["tech workers"],
       "duration": "2 hours"
     },
     "preferences": {
       "conversationStyle": "curious and engaged",
       "topics": ["tech", "startups"],
       "avoid": ["politics"]
     }
   }
   ```

### Issue: Server Crashes or Freezes

**Symptoms:**
- Server stops responding
- High CPU/memory usage
- Process killed

**Solutions:**
1. Use smaller LLM model
2. Reduce batch sizes in collectors/analyzers
3. Limit collection size:
   ```bash
   curl -X POST http://localhost:3000/api/collect \
     -H "Content-Type: application/json" \
     -d '{"options": {"limit": 10}}'
   ```
4. Check system resources:
   ```bash
   top
   # Look for node process
   ```
5. Increase Node.js memory:
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" npm run dev
   ```

## Environment Variable Checklist

Use this checklist to verify your `.env.local` configuration:

### Required (choose one LLM provider):
- [ ] `LLM_PROVIDER` (lmstudio or ollama)
- [ ] `LMSTUDIO_BASE_URL` (if using LM Studio)
- [ ] `LMSTUDIO_MODEL` (if using LM Studio)
- [ ] `OLLAMA_BASE_URL` (if using Ollama)
- [ ] `OLLAMA_MODEL` (if using Ollama)

### Required (choose one embedding provider):
- [ ] `EMBEDDING_PROVIDER` (ollama or openai)
- [ ] `OLLAMA_EMBEDDING_MODEL` (if using Ollama embeddings)
- [ ] `OPENAI_API_KEY` (if using OpenAI embeddings)

### Optional:
- [ ] `NEWS_API_KEY` (for news collection)
- [ ] `POSTGRES_URL` (for persistence, otherwise uses in-memory)
- [ ] `CRON_SECRET` (for production cron job security)

### Example Complete Configuration:

**Option 1: Fully Local (FREE)**
```bash
# LLM
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2

# Embeddings
EMBEDDING_PROVIDER=ollama
OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# Collection (optional)
NEWS_API_KEY=your_key_here
```

**Option 2: Hybrid (LM Studio + OpenAI Embeddings)**
```bash
# LLM
LLM_PROVIDER=lmstudio
LMSTUDIO_BASE_URL=http://localhost:1234/v1
LMSTUDIO_MODEL=mistral-7b-instruct

# Embeddings
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=sk-...

# Collection (optional)
NEWS_API_KEY=your_key_here

# Persistence (optional)
POSTGRES_URL=postgres://...
```

## Testing Best Practices

1. **Start Simple:** Test with in-memory store and Ollama first
2. **One Component at a Time:** Verify LLM, then embeddings, then collection
3. **Check Logs:** Console output shows what's happening
4. **Use curl:** Easier to test API endpoints than UI during development
5. **Small Batches:** Test with small data sets first
6. **Monitor Resources:** Watch CPU/RAM during LLM calls
7. **Save Configs:** Keep working `.env.local` configurations for reference

## Next Steps

Once all tests pass:
1. Run collection multiple times to build graph
2. Experiment with different scenarios
3. Try the graph visualization
4. Deploy to Vercel (see DEPLOYMENT.md)
5. Set up cron job for automated collection

## Getting Help

If you encounter issues not covered here:
1. Check existing documentation in `/docs`
2. Review code comments in key files:
   - `lib/zeitgeist-service.ts`
   - `lib/temporal-decay.ts`
   - `lib/llm/factory.ts`
3. Open an issue with:
   - Your `.env.local` configuration (redact keys!)
   - Console output/error messages
   - Steps to reproduce

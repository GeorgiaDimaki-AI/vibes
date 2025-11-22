# Deployment & Testing Guide

## Local Development Setup

### Prerequisites
- Node.js 18+ installed
- One of: LM Studio OR Ollama
- (Optional) NewsAPI key for data collection

### Step 1: Install Dependencies

```bash
cd vibes
npm install
```

### Step 2: Set Up Local LLM

#### Option A: LM Studio
1. Download from [lmstudio.ai](https://lmstudio.ai/)
2. Install and open LM Studio
3. Download a model (recommended: Llama 3, Mistral 7B, or similar)
4. Start the local server:
   - Click "Local Server" tab
   - Click "Start Server"
   - Default URL: `http://localhost:1234/v1`

#### Option B: Ollama
1. Install Ollama: [ollama.com](https://ollama.com/)
2. Pull a model:
   ```bash
   ollama pull llama2
   # or
   ollama pull mistral
   ```
3. Start Ollama (runs automatically on install)
4. Default URL: `http://localhost:11434`

### Step 3: Configure Environment

Create `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Choose your LLM provider
LLM_PROVIDER=lmstudio  # or ollama

# LM Studio Configuration
LMSTUDIO_BASE_URL=http://localhost:1234/v1
LMSTUDIO_MODEL=local-model
LMSTUDIO_API_KEY=lm-studio

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2

# Required: OpenAI for embeddings
OPENAI_API_KEY=sk-your-key-here

# Optional: News Collection
NEWS_API_KEY=your-newsapi-key

# Leave these for now (in-memory store will be used)
# POSTGRES_URL=
# CRON_SECRET=
```

### Step 4: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Step 5: Test Data Collection

```bash
# Trigger manual collection
curl http://localhost:3000/api/collect

# Check status
curl http://localhost:3000/api/status

# Search for a vibe
curl "http://localhost:3000/api/search?q=technology"
```

### Step 6: Test the UI

1. Go to http://localhost:3000
2. Enter a scenario: "Dinner with tech friends at a trendy restaurant"
3. Click "Get Advice"
4. Review the recommendations

**First run will be slow** as it needs to:
- Collect initial data
- Extract vibes
- Generate embeddings
- This can take 2-5 minutes

**Subsequent runs** are much faster (seconds).

## Testing

### Manual Testing Checklist

#### 1. **Data Collection**
```bash
curl http://localhost:3000/api/collect
```

Expected output:
```json
{
  "success": true,
  "vibesAdded": 15,
  "message": "Successfully collected..."
}
```

#### 2. **Graph Status**
```bash
curl http://localhost:3000/api/status
```

Expected output:
```json
{
  "totalVibes": 15,
  "categories": {
    "trend": 8,
    "topic": 5,
    "sentiment": 2
  },
  "temporal": {
    "averageAge": 0.01,
    "highlyRelevant": 15
  }
}
```

#### 3. **Advice Generation**
```bash
curl -X POST http://localhost:3000/api/advice \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Casual coffee with fashion industry people"
  }'
```

Expected: JSON with topics, behavior, and style recommendations.

#### 4. **Temporal Decay** (Test After 1 Day)
```bash
# Collect on Day 1
curl http://localhost:3000/api/collect

# Check status
curl http://localhost:3000/api/status
# Note vibes and their relevance

# Wait 24 hours

# Check status again
curl http://localhost:3000/api/status
# Relevance should have decayed for memes/events
```

#### 5. **Halo Effect** (Test After Re-collection)
```bash
# Collect data twice with same trending topic
curl http://localhost:3000/api/collect
# Wait 1 hour
curl http://localhost:3000/api/collect

# Check logs for "Applying halo effect"
# Related vibes should have been boosted
```

### Debugging

#### LLM Not Working
```bash
# Test LM Studio is running
curl http://localhost:1234/v1/models

# Or for Ollama
curl http://localhost:11434/api/tags

# Check environment variables
echo $LLM_PROVIDER
```

#### No Data Collected
- Check News API key is valid
- Check Reddit isn't rate limiting
- Look at console logs for errors

#### Embeddings Failing
- Verify OpenAI API key
- Check API usage limits
- Try with fewer vibes

## Production Deployment (Vercel)

### Step 1: Prepare Repository

Ensure `.env.local` is gitignored (it should be by default):

```bash
# .gitignore should include:
.env.local
```

Commit and push:

```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### Step 2: Create Vercel Project

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will auto-detect Next.js

### Step 3: Configure Environment Variables

In Vercel dashboard → Settings → Environment Variables:

```
# LLM Configuration
LLM_PROVIDER = lmstudio
LMSTUDIO_BASE_URL = https://your-llm-server.com/v1
LMSTUDIO_MODEL = your-model
OPENAI_API_KEY = sk-your-real-key

# Data Sources
NEWS_API_KEY = your-newsapi-key

# Cron Security
CRON_SECRET = generate-random-string-here
```

**Important**: For production, you need to deploy your own LLM server (see below).

### Step 4: Add Vercel Postgres

1. In Vercel dashboard → Storage → Create Database
2. Choose "Postgres"
3. It will automatically set `POSTGRES_URL` environment variable
4. Tables will be created on first run

### Step 5: Deploy

```bash
# Vercel will auto-deploy on git push
git push origin main

# Or deploy manually
npx vercel --prod
```

### Step 6: Test Production

```bash
# Replace with your Vercel URL
export SITE=https://your-app.vercel.app

# Test collection
curl $SITE/api/collect

# Test status
curl $SITE/api/status

# Test UI
open $SITE
```

### Step 7: Verify Cron

1. Go to Vercel dashboard → Cron Jobs
2. You should see `/api/cron` scheduled hourly (`0 * * * *`)
3. Check logs after first hour to verify it ran

## LLM Server for Production

Since Vercel is serverless, you can't run LLM locally in production. Options:

### Option 1: Self-Hosted VPS

Deploy LM Studio/Ollama on a VPS:

```bash
# Example with Ollama on Ubuntu
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama2
ollama serve

# Expose via nginx with SSL
# Set LMSTUDIO_BASE_URL to https://your-vps.com
```

### Option 2: Modal/Replicate

Use a serverless GPU provider:

```typescript
// Create a wrapper collector that calls Modal
class ModalLLMProvider implements LLMProvider {
  async complete(messages) {
    const response = await fetch('https://your-modal-endpoint', {
      method: 'POST',
      body: JSON.stringify({ messages })
    });
    return response.json();
  }
}
```

### Option 3: Keep It Local-Only

Don't deploy to Vercel - run on your own machine:

```bash
# Use ngrok for external access
ngrok http 3000

# Or deploy to your home server with Caddy/Nginx
```

## Monitoring

### Logs

```bash
# View Vercel logs
vercel logs

# Or in dashboard
# Vercel Dashboard → Logs
```

### Metrics to Track

1. **Collection success rate**: Check `/api/status` regularly
2. **Vibe count growth**: Should increase hourly
3. **Temporal decay**: Old vibes should fade
4. **Halo effects**: Check logs for "Applying halo effect"
5. **Response times**: Advice should be <5 seconds

### Alerts

Set up Vercel alerts for:
- Failed deployments
- High error rates
- Slow API responses

## Scaling Considerations

### Current Limits
- ~1000 vibes before query slowdown
- Hourly collection might hit rate limits
- LLM calls can be slow (30s+)

### If You Need to Scale

1. **Add pagination**: Don't load all vibes at once
   ```typescript
   // In graph store
   async getVibesPaginated(offset: number, limit: number)
   ```

2. **Cache frequent queries**: Add Redis
   ```typescript
   // Cache embeddings
   const cached = await redis.get(`emb:${query}`);
   ```

3. **Parallelize LLM calls**: Use worker threads
   ```typescript
   // Process batches in parallel
   await Promise.all(batches.map(b => analyze(b)));
   ```

4. **Reduce collection frequency**: Change from hourly to every 6 hours
   ```json
   // vercel.json
   "schedule": "0 */6 * * *"
   ```

5. **Use vector database**: Switch to Pinecone or Weaviate for better similarity search at scale

## Backup & Recovery

### Backup Database

```bash
# Vercel Postgres backup (automatic daily)
# Or manual:
pg_dump $POSTGRES_URL > backup.sql
```

### Restore

```bash
psql $POSTGRES_URL < backup.sql
```

### Export Vibes as JSON

```bash
# Create an export endpoint
curl http://localhost:3000/api/export > vibes-backup.json
```

## Troubleshooting

### "No LLM provider available"
- Check LM Studio/Ollama is running
- Verify `LLM_PROVIDER` environment variable
- Test provider URL manually: `curl $LMSTUDIO_BASE_URL/v1/models`

### "Failed to generate embeddings"
- Check OpenAI API key
- Verify API quota
- Try reducing batch size

### "Collection returns 0 vibes"
- Check collector API keys
- Look for rate limiting (403/429 errors)
- Try collecting from one source at a time

### "Temporal decay not working"
- Check `firstSeen` and `lastSeen` dates in database
- Verify temporal decay functions are being called
- Look for console logs: "Applying temporal decay..."

### "Halo effect not triggering"
- Ensure vibes have embeddings
- Check similarity threshold (default 0.6)
- Look for logs: "Applying halo effect for X boosted vibe(s)"
- Verify that vibes are actually reappearing (same name)

### "Advice is generic/bad"
- Not enough vibes in graph (collect more data)
- Vibes have decayed too much (check currentRelevance)
- LLM model is too small (try larger model)
- Scenario description is too vague

### "Vercel deployment fails"
- Check build logs for TypeScript errors
- Verify all environment variables are set
- Make sure `POSTGRES_URL` is configured if not using memory store

### "Cron job not running"
- Verify `vercel.json` has correct schedule
- Check Vercel dashboard → Cron Jobs
- Ensure `CRON_SECRET` environment variable is set
- Look at function logs for errors

## Performance Optimization

### For Faster LLM Responses

1. Use smaller models (Llama 2 7B vs 13B)
2. Reduce `maxTokens` in prompts
3. Batch multiple requests
4. Cache common scenarios

### For Faster Embeddings

1. Generate embeddings in background
2. Cache embeddings for scenarios
3. Use smaller embedding models

### For Faster Database Queries

1. Add indexes:
   ```sql
   CREATE INDEX idx_vibes_relevance ON vibes(current_relevance DESC);
   CREATE INDEX idx_vibes_category ON vibes(category);
   ```

2. Limit query results:
   ```typescript
   // Only get top 50 most relevant
   const vibes = await store.findVibesByEmbedding(emb, 50);
   ```

3. Use connection pooling (Vercel Postgres does this automatically)

## Cost Estimates

### Development (Local)
- LLM: $0 (local)
- Embeddings: ~$0.10/month (10K vibes × $0.0001 per 1K tokens)
- Database: $0 (in-memory)
- **Total: ~$0.10/month**

### Production (Vercel)
- LLM: $5-50/month (VPS) or $0 (keep local)
- Embeddings: ~$1/month (hourly collection)
- Database: $0 (Vercel free tier up to 256MB)
- Vercel hosting: $0 (Hobby tier)
- **Total: $1-51/month**

### Production (High Traffic)
- LLM: $50-200/month (better VPS)
- Embeddings: ~$10/month (more collections)
- Database: $20/month (Vercel Pro, >256MB)
- Vercel hosting: $20/month (Pro tier)
- **Total: $100-250/month**

## Next Steps After Deployment

1. **Monitor for 24 hours**: Check logs, verify cron runs
2. **Collect initial data**: Trigger manual collection 3-4 times
3. **Test decay**: Wait 1 week, verify old trends fade
4. **Test halo**: Manually trigger collection twice, check for halo effects
5. **Tune parameters**: Adjust decay rates, halo thresholds based on results
6. **Add more collectors**: Twitter, Instagram, etc.
7. **Improve prompts**: Refine LLM prompts for better vibe extraction
8. **Add analytics**: Track which vibes are most popular
9. **User feedback**: Ask friends to test, iterate based on feedback

## Support

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Docs**: `/docs` folder
- **Examples**: `README.md`

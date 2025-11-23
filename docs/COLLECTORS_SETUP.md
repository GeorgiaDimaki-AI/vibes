# Multi-Modal Collectors Setup Guide

This guide shows you how to set up API keys for all available collectors. Each collector is **optional** - enable only the ones you want to use.

---

## Quick Start (Zero-Cost Setup)

Want to get started without any API keys? Use these **free, no-signup collectors**:

```bash
# .env.local
LLM_PROVIDER=ollama
OLLAMA_MODEL=llama3
EMBEDDING_PROVIDER=ollama
OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# Reddit works without API key!
# News requires free API key (see below)
```

**Reddit collector** works out of the box with no configuration!

---

## Available Collectors

| Collector | Media Type | Cost | Setup Time | Free Tier |
|-----------|------------|------|------------|-----------|
| **Reddit** | Text + Images | FREE | 0 min | Unlimited |
| **News** | Text | FREE | 2 min | 100 requests/day |
| **Spotify** | Audio | FREE | 5 min | Unlimited public data |
| **YouTube** | Video | FREE | 5 min | 10,000 quota units/day |
| **Unsplash** | Images | FREE | 2 min | 50 requests/hour |
| **Pexels** | Video | FREE | 2 min | 200 requests/hour |

**All collectors have generous free tiers!**

---

## 1. Reddit Collector ✅ (No Setup Needed)

**Already works!** Reddit's public JSON API doesn't require authentication.

```env
# No configuration needed
```

**What it collects:**
- Trending posts from popular subreddits
- Text content + images when available
- Engagement metrics (upvotes, comments)

---

## 2. News Collector

**Source:** [NewsAPI.org](https://newsapi.org/)

### Setup Steps:

1. Go to https://newsapi.org/
2. Click "Get API Key"
3. Sign up (free, instant approval)
4. Copy your API key
5. Add to `.env.local`:

```env
NEWS_API_KEY=your_api_key_here
```

### Free Tier:
- 100 requests/day
- Perfect for hourly collection (24 requests/day)

### What it collects:
- Trending news articles
- Headlines, descriptions, full content
- News images
- Multiple categories (tech, business, entertainment, etc.)

---

## 3. Spotify Collector

**Source:** [Spotify Web API](https://developer.spotify.com/dashboard)

### Setup Steps:

1. Go to https://developer.spotify.com/dashboard
2. Log in with Spotify (or create account)
3. Click "Create app"
   - App name: "Zeitgeist Collector"
   - App description: "Cultural trend analysis"
   - Redirect URI: `http://localhost:3000` (not used, but required)
   - Check "Web API"
4. Click "Settings"
5. Copy **Client ID** and **Client Secret**
6. Add to `.env.local`:

```env
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
```

### Free Tier:
- Unlimited requests (with rate limiting)
- Client Credentials flow (no user OAuth needed)

### What it collects:
- Trending music from Global Top 50, US Top 50
- Audio features (mood, energy, danceability, tempo)
- Artist, album, genre information
- Preview audio URLs (30-second clips)

---

## 4. YouTube Collector

**Source:** [Google Cloud Console](https://console.cloud.google.com/)

### Setup Steps:

1. Go to https://console.cloud.google.com/
2. Create a new project (or select existing)
   - Project name: "Zeitgeist"
3. Enable YouTube Data API v3:
   - Go to "APIs & Services" → "Library"
   - Search for "YouTube Data API v3"
   - Click "Enable"
4. Create credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy the API key
   - (Optional) Click "Restrict Key" and select "YouTube Data API v3"
5. Add to `.env.local`:

```env
YOUTUBE_API_KEY=your_api_key_here
```

### Free Tier:
- 10,000 quota units/day
- Each video = ~3 units
- ~3,000 videos/day capacity

### What it collects:
- Trending videos (general + category-specific)
- Video metadata (title, description, duration)
- Engagement (views, likes, comments)
- Thumbnails
- Categories: music, tech, news, entertainment

---

## 5. Unsplash Collector

**Source:** [Unsplash API](https://unsplash.com/developers)

### Setup Steps:

1. Go to https://unsplash.com/developers
2. Click "Register as a developer"
3. Create new application:
   - Application name: "Zeitgeist Cultural Trends"
   - Description: "Analyzing visual trends in photography"
   - Accept terms
4. Copy your **Access Key**
5. Add to `.env.local`:

```env
UNSPLASH_ACCESS_KEY=your_access_key_here
```

### Free Tier:
- 50 requests/hour (demo mode)
- For production: Apply for higher limits (free)

### What it collects:
- Trending professional photos
- Visual aesthetics and styles
- Color palettes
- Photo tags (indicate visual trends)
- EXIF data (camera settings, lighting style)
- Geographic location of photos

---

## 6. Pexels Collector

**Source:** [Pexels API](https://www.pexels.com/api/)

### Setup Steps:

1. Go to https://www.pexels.com/api/
2. Click "Get Started"
3. Sign up (instant approval)
4. Copy your **API Key**
5. Add to `.env.local`:

```env
PEXELS_API_KEY=your_api_key_here
```

### Free Tier:
- 200 requests/hour
- Very generous for video content
- Unlimited downloads

### What it collects:
- Trending stock videos
- Video metadata (duration, resolution, aspect ratio)
- Preview images/thumbnails
- Multiple quality levels (HD, SD)
- Inferred contexts (social media, presentations, ads)

---

## Testing Your Setup

After configuring API keys, test each collector:

### Option 1: Test via API

```bash
# Start the dev server
npm run dev

# Test collection (triggers all enabled collectors)
curl http://localhost:3000/api/collect
```

### Option 2: Test Specific Collector

```typescript
// In your code or test file
import { SpotifyCollector } from '@/lib/collectors/spotify';

const collector = new SpotifyCollector();

// Check if configured
const available = await collector.isAvailable();
console.log('Spotify available:', available);

// Collect data
const content = await collector.collect({ limit: 5 });
console.log('Collected:', content.length, 'tracks');
```

### Option 3: Check Status Endpoint

```bash
curl http://localhost:3000/api/status
```

This will show which collectors are active and how many vibes are in the graph.

---

## Troubleshooting

### "Collector not available"

**Cause:** API key not configured or incorrect

**Fix:**
1. Check `.env.local` has the correct key name
2. Restart dev server (`npm run dev`)
3. Verify API key is valid (test in browser/Postman)

### "Rate limit exceeded"

**Cause:** Too many requests to API

**Fix:**
1. Reduce collection frequency (edit `vercel.json` cron schedule)
2. Reduce `limit` parameter in collector calls
3. Upgrade to higher tier (if available)

### "API key invalid"

**Cause:** Incorrect API key or expired credentials

**Fix:**
1. Regenerate API key from provider dashboard
2. For Spotify: Check both Client ID AND Client Secret are correct
3. For YouTube: Ensure API is enabled in Google Cloud Console

### "No data collected"

**Cause:** API returned empty results or filtering too aggressive

**Fix:**
1. Check API status page of provider
2. Try different search terms or categories
3. Increase `limit` parameter
4. Check console logs for errors

---

## Cost Optimization

### Free Tier Recommendations

**For minimal costs:**
- Reddit (unlimited, free)
- Pexels (200/hr, very generous)
- Spotify (unlimited, free)

**For development:**
- YouTube (10,000/day is plenty)
- Unsplash (50/hr works for testing)
- News (100/day for hourly collection)

### Staying Within Free Limits

**Collection frequency:**
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron",
    "schedule": "0 */6 * * *"  // Every 6 hours = 4 collections/day
  }]
}
```

**Limit per collection:**
```typescript
// Collect 10 items per collector = ~60 total
await collector.collect({ limit: 10 });
```

**Math:**
- 4 collections/day × 10 items × 6 collectors = 240 items/day
- Well within all free tiers!

---

## Production Deployment

### Environment Variables in Vercel

1. Go to Vercel dashboard
2. Select your project
3. Go to "Settings" → "Environment Variables"
4. Add each API key:
   - Name: `SPOTIFY_CLIENT_ID`
   - Value: `your_actual_value`
   - Environment: Production, Preview, Development

### Security Best Practices

✅ **Do:**
- Use environment variables (never hardcode keys)
- Add `.env.local` to `.gitignore`
- Rotate keys periodically
- Use separate keys for dev/prod

❌ **Don't:**
- Commit API keys to git
- Share keys publicly
- Use production keys in development
- Expose keys in client-side code

---

## Next Steps

1. **Start simple:** Enable Reddit + News (both free, quick setup)
2. **Add media:** Enable Spotify for audio, YouTube for video
3. **Add visuals:** Enable Unsplash or Pexels for images/video
4. **Iterate:** Monitor which collectors provide the best vibes

**Pro tip:** You don't need all collectors! Start with 2-3 and expand based on what cultural trends you want to track.

---

## Collector Comparison

### Best for Different Use Cases

| Use Case | Recommended Collectors |
|----------|------------------------|
| **Tech trends** | Reddit (r/technology), News, YouTube |
| **Music trends** | Spotify, YouTube |
| **Visual aesthetics** | Unsplash, Pexels, Reddit |
| **Pop culture** | Reddit, YouTube, News |
| **Fashion trends** | Unsplash, Reddit, YouTube |
| **Video trends** | YouTube, Pexels, Reddit |
| **Cost-free setup** | Reddit, Spotify, Pexels |

### Data Quality Comparison

| Collector | Quality | Freshness | Diversity | Engagement Data |
|-----------|---------|-----------|-----------|-----------------|
| Reddit | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| News | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| Spotify | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| YouTube | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Unsplash | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Pexels | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐ |

---

## Support

**Issues with setup?**
- Check provider's status page
- Review API documentation links above
- Search provider's community forums
- Open an issue in this repo

**API limits too restrictive?**
- Most providers offer higher free tiers with approval
- Contact provider support for increases
- Consider paid tiers (usually very affordable)

# Zeitgeist API Documentation

Complete reference for all API endpoints in the Zeitgeist system.

## Base URL

**Development:** `http://localhost:3000`
**Production:** `https://your-app.vercel.app`

## Authentication

Currently, the API is open (no authentication required). For production deployments, consider adding:
- API keys for public endpoints
- Cron secret for scheduled jobs (already implemented)

## Endpoints

### POST /api/advice

Generate personalized advice for a social scenario.

**Description:** Matches the scenario to relevant cultural vibes and generates recommendations for topics to discuss, behavior, and style.

**Request:**
```json
{
  "description": "string (required)",
  "context": {
    "location": "string (optional)",
    "timeOfDay": "string (optional)",
    "peopleTypes": ["string"] (optional),
    "formality": "casual | business-casual | formal (optional)",
    "duration": "string (optional)"
  },
  "preferences": {
    "conversationStyle": "string (optional)",
    "topics": ["string"] (optional),
    "avoid": ["string"] (optional)
  }
}
```

**Response:**
```json
{
  "scenario": {
    "description": "Dinner with tech startup founders at a trendy restaurant in SF",
    "context": {
      "location": "San Francisco",
      "formality": "casual",
      "peopleTypes": ["tech founders", "investors"]
    }
  },
  "matchedVibes": [
    {
      "vibe": {
        "id": "vibe-123",
        "name": "AI Acceleration",
        "description": "Rapid advancement in AI technology and its societal impact",
        "category": "trend",
        "keywords": ["AI", "artificial intelligence", "automation"],
        "strength": 0.9,
        "sentiment": "mixed",
        "currentRelevance": 0.85,
        "timestamp": "2025-11-23T10:30:00Z"
      },
      "relevanceScore": 0.92,
      "reasoning": "Highly relevant to tech founders in San Francisco"
    }
  ],
  "recommendations": {
    "topics": [
      {
        "topic": "AI and Automation",
        "talking_points": [
          "Latest developments in generative AI",
          "Impact on startup ecosystem",
          "Ethical considerations and regulation"
        ],
        "relevantVibes": ["vibe-123", "vibe-456"],
        "priority": "high"
      }
    ],
    "behavior": [
      {
        "aspect": "conversation style",
        "suggestion": "Be curious and ask thoughtful questions about their work. Show genuine interest in technical details.",
        "reasoning": "Tech founders appreciate deep engagement with their work"
      }
    ],
    "style": [
      {
        "category": "clothing",
        "suggestions": [
          "Smart casual - dark jeans and button-down",
          "Clean sneakers or casual boots",
          "Optional: subtle tech accessories (smartwatch, etc.)"
        ],
        "reasoning": "SF tech culture values comfort and authenticity over formality"
      }
    ]
  },
  "reasoning": "Based on 15 relevant vibes from tech, startup, and SF cultural trends...",
  "confidence": 0.87,
  "timestamp": "2025-11-23T12:00:00Z"
}
```

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Invalid request (missing description)
- `500 Internal Server Error` - Server error (LLM unavailable, etc.)

**Error Response:**
```json
{
  "error": "Failed to generate advice",
  "details": "LLM service unavailable"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/advice \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Coffee meeting with a potential investor",
    "context": {
      "location": "San Francisco",
      "formality": "business-casual",
      "duration": "30 minutes"
    },
    "preferences": {
      "topics": ["startups", "technology"],
      "avoid": ["politics"]
    }
  }'
```

---

### GET /api/collect
### POST /api/collect

Manually trigger data collection and graph update.

**Description:** Fetches new content from all available collectors, analyzes it to extract vibes, merges with existing graph, and applies temporal decay.

**Request (POST):**
```json
{
  "options": {
    "limit": 20 (optional, default: 20),
    "since": "2025-11-23T00:00:00Z" (optional),
    "keywords": ["AI", "technology"] (optional)
  }
}
```

**Request (GET):**
No body required. Uses default options.

**Response:**
```json
{
  "success": true,
  "vibesAdded": 7,
  "message": "Successfully collected and analyzed data. Added 7 vibes."
}
```

**Status Codes:**
- `200 OK` - Success (even if 0 vibes added)
- `500 Internal Server Error` - Collection failed

**Error Response:**
```json
{
  "success": false,
  "error": "Failed to collect data",
  "details": "NewsAPI key invalid"
}
```

**Example:**
```bash
# Simple GET
curl http://localhost:3000/api/collect

# POST with options
curl -X POST http://localhost:3000/api/collect \
  -H "Content-Type: application/json" \
  -d '{
    "options": {
      "limit": 10,
      "keywords": ["AI", "startups"]
    }
  }'
```

**Notes:**
- Collection can take 30-120 seconds depending on data sources and LLM speed
- Runs automatically via cron in production (every hour by default)
- Safe to call multiple times - handles deduplication

---

### GET /api/status

Get current state and statistics of the cultural graph.

**Description:** Returns comprehensive information about the graph including vibe counts, categories, temporal statistics, and top vibes.

**Request:**
No parameters required.

**Response:**
```json
{
  "totalVibes": 42,
  "totalEdges": 18,
  "lastUpdated": "2025-11-23T11:30:00Z",
  "categories": {
    "trend": 12,
    "topic": 8,
    "aesthetic": 5,
    "sentiment": 7,
    "event": 4,
    "movement": 3,
    "meme": 3
  },
  "domains": {
    "tech": 15,
    "fashion": 8,
    "politics": 6,
    "music": 5
  },
  "temporal": {
    "totalVibes": 42,
    "averageAge": 3.5,
    "averageDaysSinceLastSeen": 1.2,
    "averageRelevance": 0.68,
    "highlyRelevant": 12,
    "moderatelyRelevant": 20,
    "lowRelevance": 8,
    "decayed": 2
  },
  "topVibes": [
    {
      "name": "AI Acceleration",
      "category": "trend",
      "strength": 0.9,
      "currentRelevance": 0.87,
      "daysSinceLastSeen": 0,
      "timestamp": "2025-11-23T10:00:00Z"
    },
    {
      "name": "Quiet Luxury",
      "category": "aesthetic",
      "strength": 0.85,
      "currentRelevance": 0.78,
      "daysSinceLastSeen": 2,
      "timestamp": "2025-11-21T14:00:00Z"
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Success
- `500 Internal Server Error` - Failed to get status

**Example:**
```bash
curl http://localhost:3000/api/status
```

**Notes:**
- Temporal stats calculated in real-time (includes decay)
- Top vibes sorted by currentRelevance (not original strength)
- Useful for monitoring graph health

---

### GET /api/search

Search vibes by semantic similarity.

**Description:** Finds vibes similar to the query text using embedding-based similarity search.

**Request:**
```
GET /api/search?q=<query>&limit=<number>
```

**Query Parameters:**
- `q` (required) - Search query text
- `limit` (optional) - Number of results to return (default: 20)

**Response:**
```json
{
  "vibes": [
    {
      "id": "vibe-123",
      "name": "AI Ethics Debate",
      "description": "Growing discussion about ethical implications of AI",
      "category": "topic",
      "keywords": ["AI", "ethics", "regulation", "bias"],
      "strength": 0.8,
      "sentiment": "mixed",
      "currentRelevance": 0.75,
      "embedding": [0.123, -0.456, ...],
      "sources": ["https://..."],
      "timestamp": "2025-11-23T10:00:00Z"
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Missing query parameter
- `500 Internal Server Error` - Search failed

**Error Response:**
```json
{
  "error": "Query parameter \"q\" is required"
}
```

**Example:**
```bash
# Basic search
curl "http://localhost:3000/api/search?q=artificial%20intelligence"

# With limit
curl "http://localhost:3000/api/search?q=fashion&limit=5"
```

**Notes:**
- Requires embeddings to be configured (Ollama or OpenAI)
- Returns vibes sorted by similarity to query
- Uses cosine similarity on embedding vectors

---

### GET /api/graph

Get graph data for visualization.

**Description:** Returns nodes and edges for D3.js force-directed graph visualization, with optional filtering.

**Request:**
```
GET /api/graph?region=<region>&category=<category>&minRelevance=<number>
```

**Query Parameters:**
- `region` (optional) - Filter by region (e.g., "US-West", "EU-UK", "Global")
- `category` (optional) - Filter by category (e.g., "trend", "aesthetic")
- `minRelevance` (optional) - Minimum relevance threshold (default: 0.1)

**Response:**
```json
{
  "nodes": [
    {
      "id": "vibe-123",
      "name": "AI Acceleration",
      "category": "trend",
      "strength": 0.9,
      "currentRelevance": 0.87,
      "sentiment": "mixed",
      "region": "Global",
      "keywords": ["AI", "technology", "automation"],
      "description": "Rapid advancement in AI technology"
    }
  ],
  "edges": [
    {
      "source": "vibe-123",
      "target": "vibe-456",
      "strength": 0.8
    }
  ],
  "metadata": {
    "totalVibes": 42,
    "filters": {
      "region": "US-West",
      "minRelevance": 0.1,
      "category": null
    }
  }
}
```

**Status Codes:**
- `200 OK` - Success
- `500 Internal Server Error` - Failed to get graph data

**Example:**
```bash
# All vibes
curl "http://localhost:3000/api/graph"

# Filter by region
curl "http://localhost:3000/api/graph?region=US-West"

# Filter by category and relevance
curl "http://localhost:3000/api/graph?category=trend&minRelevance=0.5"

# Multiple filters
curl "http://localhost:3000/api/graph?region=Global&category=aesthetic&minRelevance=0.3"
```

**Notes:**
- Edges created based on shared keywords, categories, or regions
- Limited to 3 edges per node on average to prevent clutter
- Applies temporal decay before returning nodes
- Perfect for feeding into D3.js force-directed graph

---

### GET /api/cron

Automated collection endpoint (called by Vercel Cron).

**Description:** Same as `/api/collect` but protected by CRON_SECRET for security.

**Request:**
```
GET /api/cron?secret=<CRON_SECRET>
```

**Query Parameters:**
- `secret` (required in production) - Cron secret from environment

**Response:**
Same as `/api/collect`

**Status Codes:**
- `200 OK` - Success
- `401 Unauthorized` - Invalid or missing secret
- `500 Internal Server Error` - Collection failed

**Example:**
```bash
# Production (with secret)
curl "https://your-app.vercel.app/api/cron?secret=your-secret"
```

**Notes:**
- Only needed in production (Vercel Cron calls this)
- Set `CRON_SECRET` in Vercel environment variables
- Schedule configured in `vercel.json` (default: hourly)
- Development: Just use `/api/collect` directly

---

## Data Models

### Vibe
```typescript
{
  id: string;
  name: string;
  description: string;
  category: "trend" | "topic" | "aesthetic" | "sentiment" | "event" | "movement" | "meme" | "custom";
  keywords: string[];
  embedding?: number[];
  strength: number; // 0-1
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  timestamp: Date;
  sources: string[];
  firstSeen: Date;
  lastSeen: Date;
  currentRelevance: number; // 0-1, time-adjusted
  halfLife?: number; // Days
  relatedVibes?: string[];
  demographics?: string[];
  locations?: string[];
  domains?: string[];
  geography?: {
    primary: string;
    relevance: Record<string, number>;
    detectedFrom: string[];
  };
  metadata?: Record<string, any>;
}
```

### Scenario
```typescript
{
  description: string;
  context?: {
    location?: string;
    timeOfDay?: string;
    peopleTypes?: string[];
    formality?: "casual" | "business-casual" | "formal";
    duration?: string;
  };
  preferences?: {
    conversationStyle?: string;
    topics?: string[];
    avoid?: string[];
  };
}
```

### Advice
```typescript
{
  scenario: Scenario;
  matchedVibes: Array<{
    vibe: Vibe;
    relevanceScore: number;
    reasoning: string;
  }>;
  recommendations: {
    topics: Array<{
      topic: string;
      talking_points: string[];
      relevantVibes: string[];
      priority: "high" | "medium" | "low";
    }>;
    behavior: Array<{
      aspect: string;
      suggestion: string;
      reasoning: string;
    }>;
    style: Array<{
      category: "clothing" | "accessories" | "grooming" | "overall";
      suggestions: string[];
      reasoning: string;
    }>;
  };
  reasoning: string;
  confidence: number; // 0-1
  timestamp: Date;
}
```

## Rate Limits

Currently no rate limits are implemented. For production, consider:

- **Advice endpoint:** 10 requests/minute per IP
- **Collection endpoint:** 1 request/minute per IP (it's expensive)
- **Search endpoint:** 20 requests/minute per IP
- **Status/Graph endpoints:** 30 requests/minute per IP

## Error Handling

All endpoints follow consistent error response format:

```json
{
  "error": "Human-readable error message",
  "details": "Technical details for debugging"
}
```

Common error scenarios:

### LLM Unavailable
```json
{
  "error": "Failed to generate advice",
  "details": "Could not connect to LLM service at http://localhost:1234"
}
```

### Missing Embeddings
```json
{
  "error": "Search failed",
  "details": "No embedding provider configured"
}
```

### Empty Graph
```json
{
  "error": "No vibes found",
  "details": "Graph is empty. Run collection first."
}
```

### Invalid Input
```json
{
  "error": "Scenario description is required",
  "details": "Request body must include 'description' field"
}
```

## Webhooks

Not currently implemented. Future consideration: notify when collection completes.

## Versioning

Current version: `v1` (implicit, no version in URL)

Future: May add `/api/v2/...` for breaking changes while maintaining v1 compatibility.

## SDK / Client Libraries

Currently none. Example usage with fetch:

```javascript
// JavaScript/TypeScript client
async function getAdvice(scenario) {
  const response = await fetch('http://localhost:3000/api/advice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scenario),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details);
  }

  return response.json();
}

// Usage
const advice = await getAdvice({
  description: 'Dinner with friends',
  context: { location: 'San Francisco' }
});
```

## Testing

### Postman Collection

Create a Postman collection with these endpoints:

1. **Health Check**
   - GET `/api/status`

2. **Trigger Collection**
   - POST `/api/collect`

3. **Search Vibes**
   - GET `/api/search?q=technology&limit=5`

4. **Get Advice**
   - POST `/api/advice`
   - Body: `{"description": "Coffee with a friend"}`

5. **Graph Data**
   - GET `/api/graph?minRelevance=0.3`

### cURL Examples

See examples throughout this document.

### Integration Testing

```bash
#!/bin/bash
# Test script

BASE_URL="http://localhost:3000"

# 1. Check status
echo "Testing status endpoint..."
curl -s "$BASE_URL/api/status" | jq .

# 2. Trigger collection
echo "Testing collection..."
curl -s -X POST "$BASE_URL/api/collect" | jq .

# 3. Search
echo "Testing search..."
curl -s "$BASE_URL/api/search?q=technology&limit=3" | jq .

# 4. Get advice
echo "Testing advice..."
curl -s -X POST "$BASE_URL/api/advice" \
  -H "Content-Type: application/json" \
  -d '{"description": "Lunch with colleagues"}' | jq .

echo "All tests completed!"
```

## Security Considerations

### Production Deployment

1. **Add Authentication:**
   - API keys for public endpoints
   - JWT tokens for user-specific requests

2. **Enable Rate Limiting:**
   - Vercel Edge Config or Redis
   - Block abusive IPs

3. **Validate Input:**
   - Max description length (1000 chars)
   - Sanitize user input
   - Prevent injection attacks

4. **Secure Cron:**
   - Already uses `CRON_SECRET`
   - Don't expose secret in logs

5. **HTTPS Only:**
   - Vercel enforces this automatically

### Environment Variables

Never expose in responses:
- `NEWS_API_KEY`
- `OPENAI_API_KEY`
- `POSTGRES_URL`
- `CRON_SECRET`

## Performance

### Response Times (Typical)

- **GET /api/status:** 50-200ms
- **GET /api/search:** 100-500ms (depends on DB size)
- **GET /api/graph:** 200-800ms (depends on filters)
- **POST /api/collect:** 30-120 seconds (LLM-dependent)
- **POST /api/advice:** 5-30 seconds (LLM-dependent)

### Optimization Tips

1. **Enable caching** for status/graph endpoints
2. **Use in-memory store** for development
3. **Batch LLM calls** (already implemented)
4. **Limit graph nodes** via minRelevance filter
5. **Use faster LLM models** for development

## Changelog

### v1.0.0 (2025-11-23)
- Initial API release
- All core endpoints implemented
- Temporal decay system
- Regional filtering
- Graph visualization support

## Support

For API support:
- Check this documentation first
- Review code comments in `/app/api/*`
- Check console logs for detailed errors
- Open an issue with request/response examples

## Future Endpoints (Planned)

### POST /api/vibes
Manually add a vibe to the graph

### DELETE /api/vibes/:id
Remove a specific vibe

### PUT /api/vibes/:id
Update vibe metadata

### GET /api/trends
Get trending vibes over time

### GET /api/analytics
Detailed analytics and insights

### POST /api/feedback
Submit feedback on advice quality

Stay tuned for updates!

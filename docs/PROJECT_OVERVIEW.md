# Zeitgeist - Project Overview

## Vision & Goals

**Core Idea**: Create an AI-powered cultural advisor that maintains a living, breathing graph of cultural trends, vibes, and zeitgeist moments. Users describe any social situation and receive contextually-aware advice on topics, behavior, and style.

### Primary Goals

1. **Cultural Intelligence**: Build a system that truly understands current cultural moments
2. **Temporal Awareness**: Trends should naturally emerge, peak, and fade like in real culture
3. **Local-First**: Run entirely on local hardware (except embeddings) - no API costs
4. **Modular & Experimental**: Easy to swap components and try new ideas
5. **Self-Maintaining**: Graph should evolve automatically without manual curation

## Key Design Decisions & Reasoning

### 1. **Temporal Decay System**

**Problem**: Cultural trends don't last forever, but traditional databases treat all data equally regardless of age.

**Solution**: Exponential decay with category-specific half-lives.

**Reasoning**:
- Memes die in days, movements last months → different decay rates
- Exponential decay mirrors how humans actually forget
- Boosting on reappearance prevents good trends from dying
- Auto-cleanup keeps graph fresh without manual intervention

**Formula**:
```
currentRelevance = strength × (0.5 ^ (daysSinceLastSeen / halfLife))
```

**Half-Lives**:
- Memes: 3 days (viral content burns bright and fast)
- Events: 7 days (news cycles move on)
- Trends: 14 days (the "two-week rule")
- Topics: 21 days (conversation subjects evolve)
- Sentiments: 30 days (cultural moods shift slowly)
- Aesthetics: 60 days (style changes take time)
- Movements: 90 days (social movements have staying power)

### 2. **Halo Effect / Ripple Boosting**

**Problem**: Vibes don't exist in isolation. If "AI Ethics" reappears, related vibes like "AI Regulation" and "Tech Accountability" are probably also trending.

**Solution**: When a vibe gets boosted, semantically similar vibes (based on embedding similarity) also receive proportional boosts.

**Reasoning**:
- Cultural trends cluster together
- One signal can predict nearby signals
- Makes the graph more predictive and organic
- Prevents related vibes from decaying prematurely

**Implementation**:
```typescript
// If vibe reappears with 60%+ similarity to existing vibe:
haloBoost = (similarity - 0.6) / 0.4 × maxBoost
// Similar vibes get boosted proportionally
```

### 3. **Local LLM Support**

**Problem**: Cloud API costs add up fast with hourly data collection.

**Solution**: Support for LM Studio and Ollama - completely local inference.

**Reasoning**:
- Cost: $0 vs $$$ for cloud APIs
- Privacy: No data leaves your machine
- Speed: No network latency
- Control: Choose your own models
- Future-proof: Works even if APIs change

**Trade-off**: Still use OpenAI for embeddings (high-quality, cheap, and hard to replicate locally).

### 4. **Modular Plugin Architecture**

**Problem**: Cultural analysis is experimental - no one knows the "right" way.

**Solution**: Everything is pluggable via registries (collectors, analyzers, matchers).

**Reasoning**:
- Easy to A/B test different strategies
- Add new data sources without touching core code
- Swap LLM providers trivially
- Community can contribute modules
- Perfect for research and iteration

**Pattern**:
```typescript
// Want to try a new analyzer?
class MyAnalyzer extends BaseAnalyzer {
  async analyze(content) { /* your logic */ }
}
analyzerRegistry.register(new MyAnalyzer());
```

### 5. **Semantic Embeddings + LLM Reasoning**

**Problem**: Pure keyword matching misses nuance. Pure LLM is slow and expensive.

**Solution**: Hybrid approach.

**Reasoning**:
- Embeddings: Fast, cheap, capture semantic similarity
- LLM: Deep reasoning, context-aware extraction
- Best of both worlds
- Embeddings for matching, LLM for analysis and advice

## User Journey

### Setup (One-time)
1. Install LM Studio or Ollama
2. Load a model (e.g., Llama 2, Mistral)
3. Configure environment variables
4. Run `npm run dev`

### Daily Use
1. **Background**: Hourly cron collects news, Reddit, etc.
2. **Analysis**: LLM extracts 3-7 vibes per batch
3. **Decay**: Old vibes naturally fade
4. **Halo**: Reappearing vibes boost related ones
5. **Query**: User describes scenario
6. **Match**: Find relevant vibes (embedding similarity + LLM)
7. **Advise**: Generate contextual recommendations

### Example Flow

**8am**: Cron collects 30 news articles
- Extracts: "AI Regulation Debate" (trend, strength 0.7)
- Halo boosts: "Tech Policy" (similar, +0.1), "AI Ethics" (+0.12)

**2pm**: User asks about dinner with tech friends
- Matches: "AI Regulation Debate" (0.85 relevance)
- Advice: Talk about recent bills, avoid hype, informed but balanced

**7 days later**: "AI Regulation Debate" decayed to 0.5
- Still relevant but not as urgent
- New trends taking prominence

## Success Metrics

### Technical
- ✅ Hourly data collection working
- ✅ Temporal decay functioning correctly
- ✅ Halo effects propagating
- ✅ Local LLM integration smooth
- ✅ Zero cloud API costs (except embeddings)

### Quality
- ✅ Advice feels current and relevant
- ✅ Old trends don't pollute results
- ✅ Related vibes cluster naturally
- ✅ Graph reflects actual cultural shifts

### Usability
- ✅ Simple setup (<10 minutes)
- ✅ No manual curation needed
- ✅ Easy to experiment with parameters
- ✅ Clear documentation

## Design Philosophy

### 1. **Living System**
The graph should feel alive - trends emerge, peak, interact, and fade naturally.

### 2. **Explainability**
Every boost, decay, and match should be traceable. No black boxes.

### 3. **Composability**
Small, focused modules that combine in powerful ways.

### 4. **Practicality Over Perfection**
Ship working prototypes. Iterate based on usage.

### 5. **Local-First, Cloud-Optional**
Should work entirely offline. Cloud enhances but isn't required.

## Why This Matters

**Problem**: Culture moves fast. By the time you Google "what's trending", it's old news.

**Solution**: An AI that lives in the cultural stream, constantly updating its understanding.

**Impact**:
- Never feel out of touch in social situations
- Understand what's happening in different communities
- Bridge generational/cultural gaps
- Make informed decisions about what to wear, discuss, etc.

**Bigger Vision**: This is a prototype for "living knowledge graphs" - systems that naturally evolve with their domain.

## Non-Goals (Intentional Limitations)

1. **Not a social media aggregator**: We extract vibes, not raw posts
2. **Not personalized (yet)**: Single-user focused for MVP
3. **Not real-time**: Hourly is good enough
4. **Not comprehensive**: We sample the cultural stream, not capture everything
5. **Not prescriptive**: Advice is suggestions, not rules

## What Makes This Different

### vs. Social Listening Tools
- They track brands/keywords
- We extract abstract cultural vibes
- They're for marketing
- We're for personal cultural intelligence

### vs. Trend Reports
- They're monthly snapshots
- We're continuous and self-updating
- They're human-curated
- We're algorithmic with LLM intelligence

### vs. ChatGPT "What's trending?"
- ChatGPT's knowledge cutoff is old
- We're always current (hourly updates)
- ChatGPT doesn't understand decay
- We model trend lifecycles

## Core Principles

1. **Temporal First**: Time is a first-class citizen in our data model
2. **Graph Thinking**: Culture is interconnected, not siloed
3. **Continuous Learning**: The system gets smarter with each collection
4. **Humble AI**: Use LLMs where they excel, algorithms where they're better
5. **Open Core**: Architecture encourages community contributions

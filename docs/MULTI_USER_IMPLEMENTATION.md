# Multi-User Support Implementation Plan

## Executive Summary

This document outlines the implementation strategy for adding multi-user support to the Zeitgeist cultural graph application. The implementation follows a **global graph + personalized views** architecture, enabling cost-efficient operation while providing value through personalization.

## Vision & Value Proposition

### Core Concept
Single shared global cultural graph with personalized filtering and recommendations per user.

### Key Value Additions Through Personalization

1. **Regional Relevance**: Filter vibes by user's geographic location
2. **Interest Alignment**: Boost vibes matching user's declared interests
3. **Topic Avoidance**: Filter out user-specified topics
4. **Conversation Style**: Adjust advice tone to user preferences
5. **Historical Learning**: Track what advice worked for user
6. **Usage Analytics**: Show users their cultural journey
7. **Collaborative Features**: Share favorite vibes/advice with others

### Pricing Tiers (Accessible Model)

| Tier | Price | Queries/Month | Features |
|------|-------|---------------|----------|
| **Free** | $0 | 5 | Global graph, basic advice |
| **Light** | $3/month | 25 | Regional filtering, interests |
| **Regular** | $7/month | 100 | History, analytics, learning |
| **Unlimited** | $12/month | Unlimited | API access, priority support |

## Architecture Overview

### Current State
- ✅ Global cultural graph (Postgres/Memory)
- ✅ Regional metadata on vibes
- ✅ LLM and embedding providers
- ✅ Collector/Analyzer/Matcher registries
- ✅ API routes for advice/collect/status
- ✅ Temporal decay system
- ✅ Graph visualization

### Target State
```
┌─────────────────────────────────────────────┐
│         Frontend (Next.js + Auth)            │
│  - User login/signup                         │
│  - Profile management                        │
│  - Usage dashboard                           │
│  - Advice history                            │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│      Protected API Routes (Middleware)       │
│  - Authentication check                      │
│  - Rate limiting by tier                     │
│  - Usage tracking                            │
└─────────────────┬───────────────────────────┘
                  │
        ┌─────────┴──────────┐
        │                    │
┌───────▼─────────┐   ┌─────▼──────────┐
│  USER STORE     │   │  GLOBAL GRAPH  │
│  (Vercel PG)    │   │  (Existing)    │
│  - Profiles     │   │  - Vibes       │
│  - Preferences  │   │  - Embeddings  │
│  - History      │   │  - Temporal    │
│  - Usage        │   │  - Regional    │
└─────────────────┘   └────────────────┘
```

## Data Models

### User Profile
```typescript
interface UserProfile {
  id: string;                      // UUID
  email: string;                   // From auth provider
  displayName?: string;
  avatarUrl?: string;

  // Tier & Usage
  tier: 'free' | 'light' | 'regular' | 'unlimited';
  queriesThisMonth: number;
  queryLimit: number;              // Based on tier

  // Preferences
  region?: Region;                 // Primary region for filtering
  interests: string[];             // ["tech", "fashion", "music"]
  avoidTopics: string[];           // ["politics", "crypto"]
  conversationStyle: 'casual' | 'professional' | 'academic' | 'friendly';

  // Settings
  emailNotifications: boolean;
  shareDataForResearch: boolean;

  // Metadata
  createdAt: Date;
  lastActive: Date;
  onboardingCompleted: boolean;
}
```

### User Advice History
```typescript
interface AdviceHistory {
  id: string;
  userId: string;
  timestamp: Date;

  // Request
  scenario: Scenario;
  matchedVibes: string[];          // Vibe IDs

  // Response
  advice: Advice;

  // Feedback
  rating?: 1 | 2 | 3 | 4 | 5;
  feedback?: string;
  wasHelpful?: boolean;

  // Analytics
  regionFilterApplied?: string;
  interestBoostsApplied: string[];
}
```

### User Favorites
```typescript
interface UserFavorite {
  id: string;
  userId: string;
  type: 'vibe' | 'advice';
  referenceId: string;             // Vibe ID or Advice ID
  timestamp: Date;
  note?: string;
}
```

### Usage Metrics
```typescript
interface UsageMetrics {
  userId: string;
  month: string;                   // "2025-01"
  queriesCount: number;
  topRegionsQueried: Record<string, number>;
  topInterestMatches: Record<string, number>;
  averageRating?: number;
}
```

## Implementation Phases

### Phase 1: Authentication & User Management (Week 1)

**Goal**: User signup, login, profile management

#### 1.1 Authentication Setup
- **Technology**: Clerk (Next.js native, generous free tier)
- **Reasoning**:
  - Best Next.js integration
  - Free tier: 10k MAU
  - Built-in UI components
  - Social login support
  - Webhook support for Postgres sync

**Tasks**:
- [ ] Install and configure Clerk
- [ ] Create sign-up/sign-in pages
- [ ] Add middleware for route protection
- [ ] Set up Clerk webhook for user sync
- [ ] Create user profile page

#### 1.2 Database Schema
```sql
-- Users table (synced from Clerk)
CREATE TABLE users (
  id TEXT PRIMARY KEY,              -- Clerk user ID
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  tier TEXT DEFAULT 'free',
  queries_this_month INTEGER DEFAULT 0,
  query_limit INTEGER DEFAULT 5,
  region TEXT,
  interests TEXT[],
  avoid_topics TEXT[],
  conversation_style TEXT DEFAULT 'casual',
  email_notifications BOOLEAN DEFAULT true,
  share_data_for_research BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW(),
  onboarding_completed BOOLEAN DEFAULT false
);

-- Advice history
CREATE TABLE advice_history (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  scenario JSONB NOT NULL,
  matched_vibes TEXT[],
  advice JSONB NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  was_helpful BOOLEAN,
  region_filter_applied TEXT,
  interest_boosts_applied TEXT[]
);

-- User favorites
CREATE TABLE user_favorites (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('vibe', 'advice')),
  reference_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  note TEXT
);

-- Usage metrics (aggregated)
CREATE TABLE usage_metrics (
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  queries_count INTEGER DEFAULT 0,
  top_regions_queried JSONB,
  top_interest_matches JSONB,
  average_rating REAL,
  PRIMARY KEY (user_id, month)
);

-- Indexes
CREATE INDEX idx_advice_history_user ON advice_history(user_id, timestamp DESC);
CREATE INDEX idx_user_favorites_user ON user_favorites(user_id, timestamp DESC);
CREATE INDEX idx_users_tier ON users(tier);
CREATE INDEX idx_users_last_active ON users(last_active);
```

#### 1.3 User Service Layer
```typescript
// lib/users/user-service.ts
class UserService {
  async getUserProfile(userId: string): Promise<UserProfile | null>;
  async createUserProfile(data: Partial<UserProfile>): Promise<UserProfile>;
  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile>;
  async deleteUser(userId: string): Promise<void>;

  // Usage tracking
  async incrementQueryCount(userId: string): Promise<void>;
  async getUsageThisMonth(userId: string): Promise<UsageMetrics>;
  async canMakeQuery(userId: string): Promise<boolean>;
  async resetMonthlyQueries(): Promise<void>;  // Cron job
}
```

**Agent Assignment**: `agent-1-auth-setup`

---

### Phase 2: Personalized Matching & Filtering (Week 1-2)

**Goal**: Use user preferences to personalize vibe matching

#### 2.1 Personalized Matcher
```typescript
// lib/matchers/personalized.ts
export class PersonalizedMatcher extends BaseMatcher {
  readonly name = 'personalized';
  readonly description = 'Personalized vibe matching with user preferences';

  async match(
    scenario: Scenario,
    graph: CulturalGraph,
    userProfile?: UserProfile
  ): Promise<VibeMatch[]> {
    let vibes = Array.from(graph.vibes.values());

    // Apply temporal decay
    vibes = applyDecayToVibes(vibes);

    // Filter by region (if user has preference)
    if (userProfile?.region) {
      vibes = this.filterByRegion(vibes, userProfile.region);
    }

    // Filter out avoided topics
    if (userProfile?.avoidTopics?.length) {
      vibes = this.filterOutTopics(vibes, userProfile.avoidTopics);
    }

    // Boost by interests
    if (userProfile?.interests?.length) {
      vibes = this.boostByInterests(vibes, userProfile.interests);
    }

    // Semantic matching (existing logic)
    const matches = await this.semanticMatch(scenario, vibes);

    return matches;
  }

  private filterByRegion(vibes: Vibe[], region: Region): Vibe[] {
    // Implementation details...
  }

  private filterOutTopics(vibes: Vibe[], avoidTopics: string[]): Vibe[] {
    // Implementation details...
  }

  private boostByInterests(vibes: Vibe[], interests: string[]): Vibe[] {
    // Implementation details...
  }
}
```

#### 2.2 Update ZeitgeistService
```typescript
// lib/zeitgeist-service.ts
export class ZeitgeistService {
  // Add userProfile parameter to existing methods
  async getAdvice(
    scenario: Scenario,
    userProfile?: UserProfile
  ): Promise<Advice> {
    // Use personalized matcher if profile provided
    const matcher = userProfile
      ? this.matchers.get('personalized')
      : this.matchers.get('semantic');

    // Pass userProfile to matcher
    const matches = await matcher.match(scenario, graph, userProfile);

    // Generate advice with user's conversation style
    const advice = await this.generateAdvice(matches, scenario, userProfile);

    return advice;
  }
}
```

**Agent Assignment**: `agent-2-personalized-matching`

---

### Phase 3: Protected API Routes & Rate Limiting (Week 2)

**Goal**: Add authentication and rate limiting to API routes

#### 3.1 Middleware
```typescript
// lib/middleware/auth.ts
export async function requireAuth(request: Request): Promise<UserProfile> {
  const { userId } = auth();  // Clerk

  if (!userId) {
    throw new Error('Unauthorized');
  }

  const userService = new UserService();
  const profile = await userService.getUserProfile(userId);

  if (!profile) {
    throw new Error('User not found');
  }

  return profile;
}

// lib/middleware/rate-limit.ts
export async function checkRateLimit(userId: string): Promise<void> {
  const userService = new UserService();
  const canQuery = await userService.canMakeQuery(userId);

  if (!canQuery) {
    throw new Error('Rate limit exceeded');
  }

  await userService.incrementQueryCount(userId);
}
```

#### 3.2 Update API Routes
```typescript
// app/api/advice/route.ts
import { requireAuth, checkRateLimit } from '@/lib/middleware';

export async function POST(request: Request) {
  try {
    // Authenticate
    const userProfile = await requireAuth(request);

    // Check rate limit
    await checkRateLimit(userProfile.id);

    // Get advice with personalization
    const { scenario } = await request.json();
    const advice = await zeitgeist.getAdvice(scenario, userProfile);

    // Save to history
    await saveAdviceHistory(userProfile.id, scenario, advice);

    return Response.json({ advice });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error.message === 'Rate limit exceeded') {
      return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
    throw error;
  }
}
```

**Protected Routes**:
- ✅ `/api/advice` - Requires auth, rate limited
- ✅ `/api/search` - Requires auth, rate limited
- ✅ `/api/history` - Requires auth
- ✅ `/api/favorites` - Requires auth
- ⚠️ `/api/status` - Public (read-only)
- ⚠️ `/api/graph` - Public (read-only)
- 🔒 `/api/collect` - Admin only
- 🔒 `/api/cron` - Vercel Cron only

**Agent Assignment**: `agent-3-api-protection`

---

### Phase 4: User History & Favorites (Week 2)

**Goal**: Track user interactions and allow favoriting

#### 4.1 History Service
```typescript
// lib/users/history-service.ts
class HistoryService {
  async saveAdvice(
    userId: string,
    scenario: Scenario,
    advice: Advice,
    metadata: AdviceMetadata
  ): Promise<string>;

  async getHistory(
    userId: string,
    limit?: number,
    offset?: number
  ): Promise<AdviceHistory[]>;

  async rateAdvice(
    adviceId: string,
    userId: string,
    rating: number,
    feedback?: string
  ): Promise<void>;

  async deleteHistory(
    adviceId: string,
    userId: string
  ): Promise<void>;
}
```

#### 4.2 Favorites Service
```typescript
// lib/users/favorites-service.ts
class FavoritesService {
  async addFavorite(
    userId: string,
    type: 'vibe' | 'advice',
    referenceId: string,
    note?: string
  ): Promise<string>;

  async removeFavorite(
    favoriteId: string,
    userId: string
  ): Promise<void>;

  async getFavorites(
    userId: string,
    type?: 'vibe' | 'advice'
  ): Promise<UserFavorite[]>;
}
```

#### 4.3 API Routes
```typescript
// app/api/history/route.ts
export async function GET(request: Request) {
  const userProfile = await requireAuth(request);
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  const historyService = new HistoryService();
  const history = await historyService.getHistory(userProfile.id, limit, offset);

  return Response.json({ history });
}

// app/api/favorites/route.ts
export async function POST(request: Request) {
  const userProfile = await requireAuth(request);
  const { type, referenceId, note } = await request.json();

  const favoritesService = new FavoritesService();
  const favoriteId = await favoritesService.addFavorite(
    userProfile.id,
    type,
    referenceId,
    note
  );

  return Response.json({ favoriteId });
}
```

**Agent Assignment**: `agent-4-history-favorites`

---

### Phase 5: Frontend Components (Week 2-3)

**Goal**: Build user-facing UI components

#### 5.1 Components to Build
```
components/
├── auth/
│   ├── SignInButton.tsx
│   ├── SignOutButton.tsx
│   └── UserMenu.tsx
├── profile/
│   ├── ProfileForm.tsx
│   ├── PreferencesForm.tsx
│   ├── UsageDashboard.tsx
│   └── TierDisplay.tsx
├── history/
│   ├── AdviceHistoryList.tsx
│   ├── AdviceHistoryItem.tsx
│   └── RatingWidget.tsx
└── favorites/
    ├── FavoritesList.tsx
    └── FavoriteButton.tsx
```

#### 5.2 Pages to Create/Update
```
app/
├── profile/page.tsx          # User profile & preferences
├── history/page.tsx          # Advice history
├── favorites/page.tsx        # Saved favorites
├── dashboard/page.tsx        # Usage analytics
└── page.tsx (update)         # Add auth context
```

#### 5.3 Key Features
- User menu in header (avatar, tier badge, logout)
- Onboarding flow for new users
- Profile editing with real-time validation
- Interest tags (multi-select)
- Regional preference dropdown
- Usage progress bar (queries used/limit)
- History timeline with filtering
- Export history as JSON/CSV
- Favorite button on vibes/advice
- Analytics charts (usage over time, top interests)

**Agent Assignment**: `agent-5-frontend-components`

---

### Phase 6: Analytics & Learning (Week 3)

**Goal**: Track user behavior and improve recommendations

#### 6.1 Analytics Service
```typescript
// lib/users/analytics-service.ts
class AnalyticsService {
  async trackQuery(
    userId: string,
    scenario: Scenario,
    matchedVibes: Vibe[],
    regionFilter?: string,
    interestBoosts?: string[]
  ): Promise<void>;

  async getMonthlyMetrics(
    userId: string,
    month: string
  ): Promise<UsageMetrics>;

  async getUserInsights(
    userId: string
  ): Promise<UserInsights>;
}

interface UserInsights {
  topInterests: Array<{ interest: string; count: number }>;
  topRegions: Array<{ region: string; count: number }>;
  queryPatterns: {
    busyDays: string[];
    busyHours: number[];
  };
  satisfaction: {
    averageRating: number;
    totalRatings: number;
  };
}
```

#### 6.2 Learning System (Future)
```typescript
// lib/users/learning-service.ts
class LearningService {
  // Learn from user feedback to adjust future recommendations
  async updatePreferencesFromFeedback(
    userId: string,
    adviceHistory: AdviceHistory[]
  ): Promise<void>;

  // Suggest new interests based on positive ratings
  async suggestInterests(userId: string): Promise<string[]>;
}
```

**Agent Assignment**: `agent-6-analytics`

---

### Phase 7: Onboarding & UX Polish (Week 3)

**Goal**: Smooth user experience from signup to first advice

#### 7.1 Onboarding Flow
1. Sign up (Clerk)
2. Welcome message
3. Set region (with auto-detect option)
4. Select interests (predefined tags + custom)
5. Set conversation style
6. Example scenario with immediate advice
7. Tour of features

#### 7.2 UI/UX Improvements
- Loading states for all API calls
- Error boundaries with helpful messages
- Toast notifications for actions
- Skeleton loaders
- Empty states with CTAs
- Keyboard shortcuts
- Mobile responsive design
- Dark mode support (inherit from system)

**Agent Assignment**: `agent-7-onboarding-ux`

---

## Security Considerations

### Authentication
- ✅ Use Clerk for industry-standard auth
- ✅ Never expose user tokens to client
- ✅ Validate Clerk JWT on every protected route
- ✅ Use CSRF protection (Next.js built-in)

### Authorization
- ✅ Always verify userId matches resource owner
- ✅ Check tier limits server-side (never trust client)
- ✅ Admin routes require special claims

### Data Privacy
- ✅ Hash/encrypt sensitive user data
- ✅ GDPR compliance (data export, right to deletion)
- ✅ Opt-in for data sharing
- ✅ Clear privacy policy

### Rate Limiting
- ✅ Per-user rate limiting based on tier
- ✅ Global rate limiting to prevent abuse
- ✅ Exponential backoff for repeated failures

**Agent Assignment**: Integrated into all agents

---

## Testing Strategy

### Unit Tests
- User service CRUD operations
- Personalized matcher logic
- Rate limiting logic
- History/favorites services
- Analytics calculations

### Integration Tests
- Full auth flow (signup → advice → history)
- Rate limit enforcement
- Tier upgrades/downgrades
- Multi-user isolation

### E2E Tests
- User journey: signup → onboarding → first advice → rate → favorite
- Different tiers have different limits
- Regional filtering works correctly
- Interest boosting affects results

**Agent Assignment**: `agent-8-testing`

---

## Deployment Checklist

### Environment Variables
```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
CLERK_WEBHOOK_SECRET=whsec_...

# Database (Vercel Postgres)
POSTGRES_URL=postgres://...
POSTGRES_URL_NON_POOLING=postgres://...

# Existing vars
LLM_PROVIDER=ollama
EMBEDDING_PROVIDER=ollama
# ... etc
```

### Vercel Configuration
```json
{
  "crons": [
    {
      "path": "/api/cron/collect",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/reset-monthly-queries",
      "schedule": "0 0 1 * *"
    }
  ]
}
```

### Database Migration
1. Run schema migrations
2. Seed with default data
3. Backfill existing vibes (if any)
4. Test on staging first

### Monitoring
- Track API response times
- Monitor error rates
- Alert on high query volumes
- Usage analytics dashboard

---

## Success Metrics

### Technical Metrics
- [ ] Auth flow completes in <3 seconds
- [ ] Personalized matching adds <500ms overhead
- [ ] API routes return in <2 seconds (p95)
- [ ] Zero auth-related security issues
- [ ] 99.9% uptime

### User Metrics
- [ ] 80%+ onboarding completion rate
- [ ] 60%+ of users set preferences
- [ ] 40%+ return for 2nd query
- [ ] Average rating >4/5 stars
- [ ] 10%+ save favorites

### Business Metrics (Future)
- [ ] 10 active users within 1 month
- [ ] 20% free → paid conversion within 2 months
- [ ] <5% churn rate
- [ ] Breakeven within 3 months

---

## Agent Swarm Deployment Strategy

### 8 Specialized Agents (<10 as requested)

| Agent | Focus | Priority | Dependencies |
|-------|-------|----------|--------------|
| agent-1 | Auth & User Management | 🔴 Critical | None |
| agent-2 | Personalized Matching | 🔴 Critical | agent-1 schema |
| agent-3 | API Protection & Rate Limiting | 🟡 High | agent-1 |
| agent-4 | History & Favorites | 🟡 High | agent-1 |
| agent-5 | Frontend Components | 🟢 Medium | agent-1,2,3,4 |
| agent-6 | Analytics & Insights | 🟢 Medium | agent-4 |
| agent-7 | Onboarding & UX | 🟢 Medium | agent-5 |
| agent-8 | Testing & Validation | 🟡 High | All agents |

### Coordination Strategy
1. **Phase 1** (Parallel): agent-1, agent-2 (independent)
2. **Phase 2** (Sequential): agent-3, agent-4 (depend on agent-1)
3. **Phase 3** (Parallel): agent-5, agent-6 (independent)
4. **Phase 4** (Final): agent-7, agent-8 (integrate & test)

### Integration Agent
- **agent-integration**: Coordinates merges, resolves conflicts, ensures consistency

---

## Timeline

| Week | Milestone | Agents Active |
|------|-----------|---------------|
| 1 | Auth + Personalization | 1, 2 |
| 2 | API Protection + History | 3, 4 |
| 2-3 | Frontend + Analytics | 5, 6 |
| 3 | Onboarding + Testing | 7, 8 |

**Total Estimated Time**: 3 weeks with agent swarm parallelization

---

## Risk Mitigation

### Technical Risks
1. **Clerk integration issues**: Use official Next.js SDK, follow docs closely
2. **Rate limit bypass**: Implement server-side, never trust client
3. **Data migration**: Test on staging, have rollback plan
4. **Performance degradation**: Monitor, optimize personalized matcher

### UX Risks
1. **Onboarding friction**: Keep it <2 minutes, allow skip
2. **Value unclear**: Show immediate benefit in first query
3. **Tier limits too restrictive**: Monitor usage, adjust if needed

### Business Risks
1. **Low adoption**: Focus on free tier quality first
2. **High churn**: Gather feedback early, iterate quickly
3. **Support burden**: Excellent documentation, FAQ

---

## Post-Launch Roadmap

### Immediate (Month 1)
- Monitor usage patterns
- Fix critical bugs
- Gather user feedback
- Adjust tier limits if needed

### Near-term (Month 2-3)
- Payment integration (Stripe)
- Learning from feedback
- More interests/regions
- Export features

### Long-term (Month 4+)
- Team features
- API access
- Mobile app
- Advanced analytics

---

## Conclusion

This multi-user implementation transforms Zeitgeist from a single-user prototype to a scalable, commercial-ready application while maintaining the core value proposition of cost-efficient cultural intelligence.

**Key Success Factors**:
1. ✅ Preserve existing functionality (backwards compatible)
2. ✅ Add clear value through personalization
3. ✅ Maintain low operational costs
4. ✅ Excellent user experience
5. ✅ Modular, testable code
6. ✅ Clear path to monetization

**Next Steps**: Deploy agent swarm to execute this plan systematically.

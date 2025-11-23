/**
 * Core type definitions for the Zeitgeist app
 *
 * This is the foundation of our modular architecture.
 * All collectors, analyzers, and matchers conform to these interfaces.
 */

/**
 * A "Vibe" is the fundamental unit of cultural information
 * It represents a trend, sentiment, topic, or cultural moment
 */
export interface Vibe {
  id: string;

  // Core properties
  name: string;
  description: string;
  category: VibeCategory;

  // Semantic representation
  keywords: string[];
  embedding?: number[]; // Vector representation for similarity search

  // Metadata
  strength: number; // 0-1, how strong/prevalent this vibe is
  sentiment: Sentiment; // positive, negative, neutral
  timestamp: Date;
  sources: string[]; // URLs or identifiers of source content

  // Temporal decay fields
  firstSeen: Date; // When this vibe was first detected
  lastSeen: Date; // When this vibe was last observed
  decayRate?: number; // Custom decay rate (0-1), higher = faster decay
  currentRelevance: number; // 0-1, time-adjusted relevance score
  halfLife?: number; // Days until relevance drops to 50% (default varies by category)

  // Relationships
  relatedVibes?: string[]; // IDs of related vibes
  influences?: string[]; // IDs of vibes this one influences

  // Contextual data
  demographics?: string[]; // Who is this vibe relevant to?
  locations?: string[]; // Geographic relevance (legacy - use geography instead)
  domains?: string[]; // fashion, tech, politics, etc.

  // Regional metadata (NEW - 2025)
  geography?: {
    primary: string; // Primary region: "US-West", "US-East", "EU-UK", "Global", etc.
    relevance: Record<string, number>; // Region-specific relevance scores (0-1)
    detectedFrom: string[]; // Source URLs that indicate regional relevance
  };

  // Raw metadata for extensibility
  metadata?: Record<string, any>;
}

export type VibeCategory =
  | 'trend'        // Something gaining popularity
  | 'topic'        // Discussion subject
  | 'aesthetic'    // Visual/style vibe
  | 'sentiment'    // Mood or feeling
  | 'event'        // Specific happening
  | 'movement'     // Social/cultural movement
  | 'meme'         // Internet culture
  | 'custom';      // For experimentation

export type Sentiment = 'positive' | 'negative' | 'neutral' | 'mixed';

/**
 * Geographic regions for vibe filtering (NEW - 2025)
 */
export type Region =
  | 'Global'       // Worldwide relevance
  | 'US-West'      // California, Oregon, Washington
  | 'US-East'      // NYC, Boston, DC area
  | 'US-Central'   // Midwest + Texas
  | 'US-South'     // Southeast
  | 'EU-UK'        // United Kingdom
  | 'EU-Central'   // France, Germany, etc.
  | 'EU-North'     // Scandinavia
  | 'Asia-Pacific' // General Asia-Pacific
  | 'Latin-America'// Latin America
  | 'Africa'       // Africa
  | 'Middle-East'; // Middle East

/**
 * Raw content collected from sources
 * This is what collectors output before analysis
 */
export interface RawContent {
  id: string;
  source: string; // 'news', 'reddit', 'spotify', etc.
  url?: string;

  // Content
  title?: string;
  body?: string;
  imageUrls?: string[];
  audioUrl?: string;
  videoUrl?: string;

  // Metadata
  timestamp: Date;
  author?: string;
  engagement?: {
    views?: number;
    likes?: number;
    shares?: number;
    comments?: number;
  };

  // Raw data for custom processing
  raw?: Record<string, any>;
}

/**
 * User scenario input
 */
export interface Scenario {
  description: string; // "Dinner with tech friends at a trendy restaurant"
  context?: {
    location?: string;
    timeOfDay?: string;
    peopleTypes?: string[]; // "tech workers", "artists", etc.
    formality?: 'casual' | 'business-casual' | 'formal';
    duration?: string;
  };
  preferences?: {
    conversationStyle?: string;
    topics?: string[];
    avoid?: string[];
  };
}

/**
 * Advice generated for a scenario
 */
export interface Advice {
  scenario: Scenario;
  matchedVibes: VibeMatch[];

  recommendations: {
    topics: TopicRecommendation[];
    behavior: BehaviorRecommendation[];
    style: StyleRecommendation[];
  };

  reasoning: string; // Why these recommendations?
  confidence: number; // 0-1
  timestamp: Date;
}

export interface VibeMatch {
  vibe: Vibe;
  relevanceScore: number; // 0-1
  reasoning: string;
}

export interface TopicRecommendation {
  topic: string;
  talking_points: string[];
  relevantVibes: string[]; // Vibe IDs
  priority: 'high' | 'medium' | 'low';
}

export interface BehaviorRecommendation {
  aspect: string; // "conversation style", "energy level", etc.
  suggestion: string;
  reasoning: string;
}

export interface StyleRecommendation {
  category: 'clothing' | 'accessories' | 'grooming' | 'overall';
  suggestions: string[];
  reasoning: string;
}

/**
 * Graph structure
 */
export interface CulturalGraph {
  vibes: Map<string, Vibe>;
  edges: GraphEdge[];
  metadata: {
    lastUpdated: Date;
    vibeCount: number;
    version: string;
  };
}

export interface GraphEdge {
  from: string; // Vibe ID
  to: string;   // Vibe ID
  type: EdgeType;
  strength: number; // 0-1
}

export type EdgeType =
  | 'related'     // Generally related
  | 'influences'  // One influences another
  | 'evolves_to'  // Temporal evolution
  | 'conflicts'   // Opposing vibes
  | 'amplifies';  // One amplifies another

/**
 * Base Collector interface
 * Collectors fetch raw data from various sources
 */
export interface Collector {
  readonly name: string;
  readonly description: string;

  // Collect raw content
  collect(options?: CollectorOptions): Promise<RawContent[]>;

  // Check if collector is available (API keys configured, etc.)
  isAvailable(): Promise<boolean>;
}

export interface CollectorOptions {
  limit?: number;
  since?: Date;
  keywords?: string[];
  [key: string]: any; // Allow collector-specific options
}

/**
 * Base Analyzer interface
 * Analyzers transform raw content into vibes
 */
export interface Analyzer {
  readonly name: string;
  readonly description: string;

  // Analyze raw content and extract vibes
  analyze(content: RawContent[]): Promise<Vibe[]>;

  // Optional: Update existing vibes based on new content
  update?(existingVibes: Vibe[], newContent: RawContent[]): Promise<Vibe[]>;
}

/**
 * Base Matcher interface
 * Matchers find relevant vibes for a given scenario
 */
export interface Matcher {
  readonly name: string;
  readonly description: string;

  // Match a scenario to relevant vibes
  // userProfile is optional for personalized matching
  match(scenario: Scenario, graph: CulturalGraph, userProfile?: UserProfile): Promise<VibeMatch[]>;
}

/**
 * Configuration for the app
 */
export interface Config {
  collectors: {
    enabled: string[]; // Which collectors to run
    schedule: string;  // Cron schedule
  };
  analyzers: {
    primary: string;   // Which analyzer to use by default
    fallback?: string; // Fallback if primary fails
  };
  matchers: {
    strategies: string[]; // Which matching strategies to combine
  };
  llm: {
    provider: 'anthropic' | 'openai';
    model: string;
  };
  embeddings: {
    provider: 'openai' | 'custom';
    model: string;
  };
}

/**
 * User Profile for personalized matching (Multi-User Support)
 */
export interface UserProfile {
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

/**
 * User's advice history tracking
 */
export interface AdviceHistory {
  id: string;
  userId: string;
  timestamp: Date;
  scenario: Scenario;
  matchedVibes: string[];  // Vibe IDs
  advice: Advice;
  rating?: 1 | 2 | 3 | 4 | 5;
  feedback?: string;
  wasHelpful?: boolean;
  regionFilterApplied?: string;
  interestBoostsApplied: string[];
}

/**
 * User favorites for vibes and advice
 */
export interface UserFavorite {
  id: string;
  userId: string;
  type: 'vibe' | 'advice';
  referenceId: string;
  timestamp: Date;
  note?: string;
  // Denormalized data for quick access
  metadata?: {
    vibeName?: string;
    scenarioDescription?: string;
  };
}

/**
 * Statistics about user's advice history
 */
export interface HistoryStats {
  totalQueries: number;
  averageRating?: number;
  totalRatings: number;
  helpfulCount: number;
  mostCommonScenarios: Array<{ description: string; count: number }>;
  topMatchedVibes: Array<{ vibeName: string; count: number }>;
}

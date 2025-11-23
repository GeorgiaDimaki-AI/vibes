-- Multi-User Support Database Schema
-- This schema defines tables for user management, preferences, and tracking

-- ============================================================================
-- USERS TABLE
-- ============================================================================
-- Users table (synced from Clerk authentication)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,              -- Clerk user ID
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'light', 'regular', 'unlimited')),
  queries_this_month INTEGER DEFAULT 0,
  query_limit INTEGER DEFAULT 5,
  region TEXT,
  interests TEXT[],
  avoid_topics TEXT[],
  conversation_style TEXT DEFAULT 'casual' CHECK (conversation_style IN ('casual', 'professional', 'academic', 'friendly')),
  email_notifications BOOLEAN DEFAULT true,
  share_data_for_research BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW(),
  onboarding_completed BOOLEAN DEFAULT false
);

-- Indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active);

-- ============================================================================
-- ADVICE HISTORY TABLE
-- ============================================================================
-- Advice history for tracking user interactions
CREATE TABLE IF NOT EXISTS advice_history (
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

-- Index for advice history
CREATE INDEX IF NOT EXISTS idx_advice_history_user ON advice_history(user_id, timestamp DESC);

-- ============================================================================
-- USER FAVORITES TABLE
-- ============================================================================
-- User favorites for vibes and advice
CREATE TABLE IF NOT EXISTS user_favorites (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('vibe', 'advice')),
  reference_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  note TEXT
);

-- Index for user favorites
CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites(user_id, timestamp DESC);

-- ============================================================================
-- USAGE METRICS TABLE
-- ============================================================================
-- Aggregated usage metrics per user per month
CREATE TABLE IF NOT EXISTS usage_metrics (
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  queries_count INTEGER DEFAULT 0,
  top_regions_queried JSONB,
  top_interest_matches JSONB,
  average_rating REAL,
  PRIMARY KEY (user_id, month)
);

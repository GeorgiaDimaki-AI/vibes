# Quick Start Guide - Multi-User Zeitgeist

Get the app running in **5 minutes**!

## Prerequisites

- Node.js 18+ installed
- Ollama installed (for local LLM)

## Step 1: Install Ollama & Models (2 minutes)

```bash
# Install Ollama from https://ollama.com/download
# Or on Mac:
brew install ollama

# Pull required models
ollama pull llama3
ollama pull nomic-embed-text

# Verify it's running
curl http://localhost:11434/api/tags
```

## Step 2: Set Up Clerk (2 minutes)

1. Go to https://clerk.com/sign-up (free account)
2. Create a new application
3. Copy your API keys

## Step 3: Configure Environment (1 minute)

```bash
# Copy the example
cp .env.example .env.local

# Edit .env.local and add:
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...  # From Clerk dashboard
CLERK_SECRET_KEY=sk_test_...                    # From Clerk dashboard

# LLM is already configured for Ollama (no changes needed if using defaults)
```

## Step 4: Install & Run (1 minute)

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Visit **http://localhost:3000** and you're done! 🎉

## First Use

1. Click **Sign Up** or **Sign In**
2. Complete the 6-step onboarding (takes <2 minutes)
3. Try the example scenario or create your own
4. Get personalized cultural advice!

## What Works Out of the Box

✅ User authentication (Clerk)
✅ Personalized vibe matching
✅ Rate limiting by tier (Free: 5 queries/month)
✅ Advice history with ratings
✅ Favorites
✅ Analytics dashboard
✅ Keyboard shortcuts (Cmd+K, Cmd+H, Cmd+F, Cmd+P)
✅ Mobile responsive
✅ Dark mode

## Using In-Memory Mode (No Database)

The app automatically uses in-memory storage if no Postgres is configured. This is perfect for:
- Development
- Testing
- Demo purposes

**Note**: Data is lost on restart in memory mode.

## Optional: Set Up Postgres (Production)

For persistent data:

```bash
# Option 1: Vercel Postgres (recommended)
# 1. Deploy to Vercel
# 2. Add Vercel Postgres from dashboard
# 3. Copy POSTGRES_URL to .env.local

# Option 2: Local Postgres
# Set POSTGRES_URL in .env.local:
POSTGRES_URL=postgres://user:pass@localhost:5432/zeitgeist

# Tables are created automatically on first run!
```

## Troubleshooting

### "Authentication required" error
→ Make sure you've added Clerk API keys to `.env.local`

### "Rate limit exceeded"
→ You've used your 5 free queries this month. Upgrade tier or wait for reset.

### "Failed to connect to Ollama"
→ Make sure Ollama is running: `ollama serve`

### Build errors with Google Fonts
→ This only happens in sandboxed environments. Works fine normally.

## Next Steps

- **Customize your profile**: `/profile`
- **View your history**: `/history`
- **Check analytics**: `/dashboard`
- **Read the docs**: `docs/MULTI_USER_IMPLEMENTATION.md`
- **Get help**: `/help`

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Focus search |
| `Cmd/Ctrl + H` | History |
| `Cmd/Ctrl + F` | Favorites |
| `Cmd/Ctrl + P` | Profile |
| `Cmd/Ctrl + D` | Dashboard |
| `/` | Home |

## Tier Limits

- **Free**: 5 queries/month
- **Light**: 25 queries/month ($3/mo)
- **Regular**: 100 queries/month ($7/mo)
- **Unlimited**: Unlimited queries ($12/mo)

*Payment integration coming soon!*

## Questions?

- Check `/help` page in the app
- Read `docs/RUNTIME_FIXES_REQUIRED.md` for detailed setup
- See `docs/TESTING_GUIDE.md` for testing procedures

---

**Enjoy using Zeitgeist!** 🚀

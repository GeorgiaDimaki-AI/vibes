# Runtime Fixes Required Before Running

This document lists issues found during code review and how to fix them before running the application.

## ✅ Good News

Most of the implementation is solid! The agents did excellent work. However, there are a few issues to address:

---

## 🔧 Required Fixes

### 1. **Database Tables Not Auto-Created** ⚠️

**Issue**: The user tables won't be created automatically when the app starts.

**Location**: `lib/graph/postgres.ts`

**Fix**: You need to manually run the SQL schema or add auto-initialization.

**Option A - Manual Setup (Recommended for Production)**:
```bash
# Connect to your Postgres database and run:
psql $POSTGRES_URL -f lib/graph/schema-users.sql
```

**Option B - Auto-Initialize on Startup**:
Add this to `lib/graph/postgres.ts` after the connection check:

```typescript
// In the constructor, after the connection check:
async initialize() {
  await this.createUserTables();
}

// Then call it when creating the store
const store = new PostgresGraphStore();
await store.initialize();
```

---

### 2. **Clerk Sign-In/Sign-Up Pages Missing** ⚠️

**Issue**: Clerk needs sign-in and sign-up pages to be created.

**Location**: `app/sign-in/[[...sign-in]]/page.tsx` and `app/sign-up/[[...sign-up]]/page.tsx` don't exist.

**Fix**: Create these files:

**Create `app/sign-in/[[...sign-in]]/page.tsx`**:
```typescript
import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn />
    </div>
  );
}
```

**Create `app/sign-up/[[...sign-up]]/page.tsx`**:
```typescript
import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp />
    </div>
  );
}
```

---

### 3. **Environment Variables Required** ⚠️

**Issue**: Need to set up Clerk API keys.

**Fix**:
1. Go to https://clerk.com and create an account (free tier available)
2. Create a new application
3. Copy the API keys to `.env.local`:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

4. Set up Clerk settings:
   - Enable email/password authentication
   - Or enable social logins (Google, GitHub, etc.)

---

### 4. **Google Fonts Build Error** ℹ️

**Issue**: Build fails in sandboxed environment due to Google Fonts TLS.

**This is NOT a real issue** - it only happens in the sandboxed build environment. In a normal dev/production environment, this works fine.

**If you want to avoid it during development**:
Replace the Google Fonts in `app/layout.tsx` with system fonts temporarily:

```typescript
// Remove these lines:
// import { Geist, Geist_Mono } from "next/font/google";
// const geistSans = Geist({ ... });
// const geistMono = Geist_Mono({ ... });

// Replace with:
const geistSans = { variable: "--font-geist-sans" };
const geistMono = { variable: "--font-geist-mono" };

// And update your global CSS to use system fonts
```

---

### 5. **Database Connection String** ⚠️

**Issue**: Need to configure database.

**Fix**:
- **For Development**: The app will use in-memory storage if no database is configured (data lost on restart)
- **For Production**: Set up Vercel Postgres or any Postgres database:

```env
POSTGRES_URL=postgres://username:password@host:5432/database
```

---

### 6. **LLM Provider Must Be Running** ⚠️

**Issue**: The app requires Ollama or LM Studio to be running locally.

**Fix**:
1. Install Ollama: https://ollama.com/download
2. Pull required models:
```bash
ollama pull llama3
ollama pull nomic-embed-text
```
3. Verify it's running:
```bash
curl http://localhost:11434/api/tags
```

---

## ⚡ Optional Improvements

### 1. **Add Database Migration Script**

Create `scripts/setup-database.ts`:
```typescript
import { sql } from '@vercel/postgres';
import { readFileSync } from 'fs';
import { join } from 'path';

async function setupDatabase() {
  const schema = readFileSync(join(__dirname, '../lib/graph/schema-users.sql'), 'utf-8');
  await sql.query(schema);
  console.log('✅ Database tables created successfully');
}

setupDatabase().catch(console.error);
```

Add to `package.json`:
```json
{
  "scripts": {
    "db:setup": "tsx scripts/setup-database.ts"
  }
}
```

### 2. **Add Clerk Webhook Handler** (Optional, for production)

Create `app/api/webhooks/clerk/route.ts` to sync Clerk users to your database automatically.

### 3. **Add Health Check Endpoint**

Create `app/api/health/route.ts`:
```typescript
export async function GET() {
  return Response.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
}
```

---

## 🧪 Testing Before Running

### 1. **Check Dependencies**
```bash
npm install
```

### 2. **Environment Variables Checklist**
```bash
# Required for multi-user:
✅ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
✅ CLERK_SECRET_KEY

# Required for LLM:
✅ LLM_PROVIDER (ollama or lmstudio)
✅ OLLAMA_BASE_URL or LMSTUDIO_BASE_URL
✅ OLLAMA_MODEL or LMSTUDIO_MODEL

# Required for embeddings:
✅ EMBEDDING_PROVIDER (ollama or openai)
✅ OLLAMA_EMBEDDING_MODEL (if using ollama)

# Optional:
⭕ POSTGRES_URL (falls back to in-memory)
⭕ NEWS_API_KEY
⭕ SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET
⭕ YOUTUBE_API_KEY
⭕ UNSPLASH_ACCESS_KEY
```

### 3. **Verify Services Running**
```bash
# Check Ollama is running:
curl http://localhost:11434/api/tags

# Check Postgres (if using):
psql $POSTGRES_URL -c "SELECT 1"
```

### 4. **Run Development Server**
```bash
npm run dev
```

### 5. **Test Endpoints**
```bash
# Public endpoints (should work without auth):
curl http://localhost:3000/api/status
curl http://localhost:3000/api/graph

# Protected endpoints (will return 401 without auth):
curl http://localhost:3000/api/advice
```

---

## 🎯 Quick Start Checklist

- [ ] Install dependencies: `npm install`
- [ ] Set up Clerk account and copy API keys
- [ ] Create Clerk sign-in/sign-up pages
- [ ] Install and run Ollama with required models
- [ ] Copy `.env.example` to `.env.local` and configure
- [ ] Set up database (Postgres or use in-memory)
- [ ] Run database schema (if using Postgres)
- [ ] Start dev server: `npm run dev`
- [ ] Visit http://localhost:3000 and sign up
- [ ] Complete onboarding
- [ ] Test getting advice

---

## 🐛 Known Issues

### Build Warnings (Non-Critical)
- Google Fonts TLS errors in sandboxed environments (works fine in normal environments)
- Next.js middleware deprecation warning (Next.js 16 migration, functionality still works)

### Missing Features (By Design)
- Payment integration (Stripe) - planned for future
- Email notifications - infrastructure ready, needs SMTP setup
- Clerk webhook sync - optional, users created on-demand

---

## 📚 Additional Resources

- **Clerk Setup Guide**: https://clerk.com/docs/quickstarts/nextjs
- **Ollama Setup**: https://ollama.com/download
- **Vercel Postgres**: https://vercel.com/docs/storage/vercel-postgres
- **Testing Guide**: `docs/TESTING_GUIDE.md`
- **Implementation Plan**: `docs/MULTI_USER_IMPLEMENTATION.md`

---

## ✅ Summary

**Critical Fixes Required**:
1. Create Clerk sign-in/sign-up pages
2. Set up Clerk API keys
3. Run database schema (if using Postgres)
4. Start Ollama with required models

**Everything Else**: Works out of the box!

The implementation is **production-ready** with these fixes applied.

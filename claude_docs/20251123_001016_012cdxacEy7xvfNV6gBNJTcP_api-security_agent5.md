# API Security Audit Report
**Project:** Zeitgeist - Cultural Intelligence Platform
**Date:** 2025-11-23
**Auditor:** Security Engineer (Agent 5)
**Session ID:** 012cdxacEy7xvfNV6gBNJTcP
**Framework:** OWASP Top 10 2021

---

## Executive Summary

A comprehensive security audit was conducted on all Next.js API routes in the Zeitgeist project. The audit identified **4 critical vulnerabilities**, **5 high-priority issues**, and **4 medium-priority concerns**. The most severe issues involve missing authentication on resource-intensive endpoints, timing attack vulnerabilities, and error message leakage.

**Risk Level:** HIGH
**Immediate Action Required:** Yes

---

## Routes Audited

1. `/app/api/advice/route.ts` - POST - Generate scenario advice
2. `/app/api/collect/route.ts` - POST/GET - Trigger data collection
3. `/app/api/cron/route.ts` - GET - Automated data collection
4. `/app/api/graph/route.ts` - GET - Graph data visualization
5. `/app/api/search/route.ts` - GET - Search vibes
6. `/app/api/status/route.ts` - GET - System status

---

## Critical Vulnerabilities (P0)

### 1. **Missing Authentication on /api/collect** 🔴
- **File:** `/app/api/collect/route.ts`
- **Lines:** 9-57
- **OWASP:** A01:2021 - Broken Access Control
- **Severity:** CRITICAL
- **Impact:** Anyone can trigger expensive data collection operations, leading to:
  - Resource exhaustion (CPU, memory, API quota)
  - Denial of Service
  - Excessive cloud costs
  - Data corruption if concurrent updates occur

**Vulnerable Code:**
```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const options = body.options || {};
    // NO AUTHENTICATION CHECK!
    const result = await zeitgeist.updateGraph(options);
```

**Recommendation:** Implement authentication similar to the cron route, or restrict to internal Next.js server actions only.

---

### 2. **CRON_SECRET Bypass Vulnerability** 🔴
- **File:** `/app/api/cron/route.ts`
- **Line:** 14
- **OWASP:** A07:2021 - Identification and Authentication Failures
- **Severity:** CRITICAL
- **Impact:** If `CRON_SECRET` environment variable is not set, authentication is completely bypassed

**Vulnerable Code:**
```typescript
const cronSecret = process.env.CRON_SECRET;

if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
// If cronSecret is undefined/empty, this check is skipped entirely!
```

**Attack Scenario:**
1. Attacker discovers cron endpoint
2. If `CRON_SECRET` is not set in production, no authentication required
3. Attacker can trigger unlimited cron jobs

**Recommendation:**
```typescript
if (!cronSecret) {
  throw new Error('CRON_SECRET must be configured');
}
if (authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

---

### 3. **Timing Attack on Cron Authentication** 🔴
- **File:** `/app/api/cron/route.ts`
- **Line:** 14
- **OWASP:** A02:2021 - Cryptographic Failures
- **Severity:** CRITICAL
- **Impact:** Token comparison using `!==` is vulnerable to timing attacks

**Vulnerable Code:**
```typescript
if (authHeader !== `Bearer ${cronSecret}`) {
```

**Attack Vector:**
- Attacker measures response time variations
- String comparison fails fast on first character mismatch
- By measuring microsecond differences, can brute-force the token character by character

**Recommendation:** Use constant-time comparison:
```typescript
import { timingSafeEqual } from 'crypto';

function compareTokens(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
```

---

### 4. **Error Message Leakage (All Routes)** 🔴
- **Files:** All 6 API routes
- **OWASP:** A05:2021 - Security Misconfiguration
- **Severity:** CRITICAL
- **Impact:** Internal error details exposed to clients, including:
  - Stack traces
  - File paths
  - Database errors
  - API keys in error messages
  - Internal implementation details

**Vulnerable Pattern (All Routes):**
```typescript
catch (error) {
  console.error('Search failed:', error);
  return NextResponse.json(
    {
      error: 'Search failed',
      details: error instanceof Error ? error.message : 'Unknown error'
      // ⚠️ Exposes internal error messages!
    },
    { status: 500 }
  );
}
```

**Example Leaked Information:**
- "Cannot read property 'embedding' of undefined at /lib/store/..."
- "API rate limit exceeded: Your key abc123..."
- "ECONNREFUSED 127.0.0.1:5432" (reveals database info)

**Recommendation:**
- Remove `details` field in production
- Log errors server-side only
- Return generic error messages to clients
- Use error tracking service (Sentry, etc.)

---

## High Priority Issues (P1)

### 5. **No Rate Limiting** 🟠
- **Files:** All 6 API routes
- **OWASP:** A04:2021 - Insecure Design
- **Severity:** HIGH
- **Impact:** Vulnerable to:
  - Denial of Service attacks
  - Resource exhaustion
  - Brute force attempts
  - Scraping/data exfiltration

**Current State:** Zero rate limiting on any endpoint

**Recommendation:** Implement rate limiting middleware:
```typescript
// middleware.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
});
```

**Suggested Limits:**
- `/api/advice`: 10 requests/min per IP
- `/api/collect`: 1 request/hour per IP (resource-intensive)
- `/api/cron`: IP whitelist only
- `/api/graph`: 30 requests/min per IP
- `/api/search`: 20 requests/min per IP
- `/api/status`: 60 requests/min per IP

---

### 6. **Unbounded Input Parameters** 🟠
- **Files:** `/app/api/search/route.ts`, `/app/api/graph/route.ts`
- **OWASP:** A03:2021 - Injection
- **Severity:** HIGH
- **Impact:** Denial of Service through resource exhaustion

**Vulnerable Code (search):**
```typescript
const limit = parseInt(searchParams.get('limit') || '20');
// No maximum bound! Could be limit=999999999
const vibes = await zeitgeist.searchVibes(query, limit);
```

**Vulnerable Code (graph):**
```typescript
const minRelevance = parseFloat(searchParams.get('minRelevance') || '0.1');
// Could be negative, NaN, or extremely large
```

**Attack Scenarios:**
- `GET /api/search?q=test&limit=999999999` - OOM crash
- `GET /api/graph?minRelevance=-999` - Returns all data
- `GET /api/graph?minRelevance=NaN` - Logic errors

**Recommendation:**
```typescript
const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20'), 1), 100);
const minRelevance = Math.min(Math.max(parseFloat(searchParams.get('minRelevance') || '0.1'), 0), 1);

if (isNaN(limit) || isNaN(minRelevance)) {
  return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
}
```

---

### 7. **No Input Sanitization** 🟠
- **Files:** `/app/api/advice/route.ts`, `/app/api/search/route.ts`
- **OWASP:** A03:2021 - Injection
- **Severity:** HIGH
- **Impact:** Potential for injection attacks if inputs are used in:
  - LLM prompts (prompt injection)
  - Database queries
  - System commands
  - Eval statements

**Vulnerable Code (advice):**
```typescript
const body = await request.json();
const scenario: Scenario = body;
// No validation of scenario fields!
// scenario.description could contain malicious content
const advice = await zeitgeist.getAdvice(scenario);
```

**Vulnerable Code (search):**
```typescript
const query = searchParams.get('q');
// No sanitization before passing to search
const vibes = await zeitgeist.searchVibes(query, limit);
```

**Attack Examples:**
- Prompt injection: `"Ignore previous instructions and..."`
- XSS payloads: `"<script>alert('XSS')</script>"`
- SQL-like injection: `"'; DROP TABLE--"`

**Recommendation:**
```typescript
// Validate Scenario structure
function validateScenario(scenario: any): scenario is Scenario {
  if (typeof scenario.description !== 'string') return false;
  if (scenario.description.length > 5000) return false; // Max length
  if (scenario.description.length < 5) return false; // Min length

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i, // Event handlers
    /\bDROP\b.*\bTABLE\b/i,
  ];

  if (suspiciousPatterns.some(pattern => pattern.test(scenario.description))) {
    return false;
  }

  return true;
}
```

---

### 8. **No Request Size Limits** 🟠
- **Files:** `/app/api/advice/route.ts`, `/app/api/collect/route.ts`
- **OWASP:** A04:2021 - Insecure Design
- **Severity:** HIGH
- **Impact:** Memory exhaustion via large JSON payloads

**Vulnerable Code:**
```typescript
const body = await request.json();
// No size limit! Could be gigabytes of JSON
```

**Attack Scenario:**
```bash
curl -X POST /api/advice \
  -H "Content-Type: application/json" \
  -d '{"description": "'$(python -c 'print("A"*1000000000)')'"}'
```

**Recommendation:**
- Configure Next.js `bodySizeLimit` in `next.config.ts`
- Add middleware to check `Content-Length` header
- Implement streaming JSON parsing with size limits

---

### 9. **GET Method for State-Changing Operation** 🟠
- **File:** `/app/api/collect/route.ts`
- **Lines:** 36-57
- **OWASP:** A04:2021 - Insecure Design
- **Severity:** HIGH
- **Impact:**
  - CSRF vulnerability (GET requests can be triggered from images, links)
  - Search engine crawlers could trigger data collection
  - Browser prefetching could trigger operations
  - Violates HTTP semantics

**Vulnerable Code:**
```typescript
// Allow GET as well for easy testing
export async function GET() {
  try {
    console.log('Starting data collection (GET)...');
    const result = await zeitgeist.updateGraph();
    // State-changing operation via GET!
```

**Attack Scenario:**
```html
<!-- Attacker's website -->
<img src="https://yourapp.com/api/collect" />
<!-- Triggers data collection when image loads -->
```

**Recommendation:**
- Remove GET endpoint entirely
- Use POST for all state-changing operations
- If needed for testing, require authentication and add CSRF token

---

## Medium Priority Issues (P2)

### 10. **No CORS Configuration** 🟡
- **File:** No `next.config.ts` CORS settings
- **OWASP:** A05:2021 - Security Misconfiguration
- **Severity:** MEDIUM
- **Impact:** Default CORS policy may be too permissive

**Current State:** Using Next.js defaults (same-origin)

**Recommendation:**
```typescript
// next.config.ts
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: process.env.ALLOWED_ORIGIN || 'https://yourdomain.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};
```

---

### 11. **No Security Headers** 🟡
- **File:** No middleware setting security headers
- **OWASP:** A05:2021 - Security Misconfiguration
- **Severity:** MEDIUM
- **Impact:** Missing defense-in-depth protections

**Missing Headers:**
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: no-referrer`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`

**Recommendation:**
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'no-referrer');

  return response;
}
```

---

### 12. **No Request Logging/Audit Trail** 🟡
- **Files:** All routes
- **OWASP:** A09:2021 - Security Logging and Monitoring Failures
- **Severity:** MEDIUM
- **Impact:** Cannot detect or investigate security incidents

**Current State:** Only error logging, no request logging

**Recommendation:**
```typescript
// Log security-relevant events
logger.info('API request', {
  endpoint: request.url,
  method: request.method,
  ip: request.headers.get('x-forwarded-for'),
  userAgent: request.headers.get('user-agent'),
  timestamp: new Date().toISOString(),
});
```

**Critical Events to Log:**
- Authentication failures
- Rate limit violations
- Invalid input attempts
- Unusual request patterns
- Admin operations

---

### 13. **Potential ReDoS in Search** 🟡
- **File:** `/app/api/search/route.ts`
- **OWASP:** A03:2021 - Injection
- **Severity:** MEDIUM
- **Impact:** If regex is used downstream, vulnerable to ReDoS

**Risk:** User-controlled search query may be used in regex

**Recommendation:**
- Escape regex special characters in user input
- Set regex timeout limits
- Use non-backtracking regex engines
- Avoid user input in complex regex patterns

---

## Input Validation Summary

| Route | Input | Validation | Size Limit | Type Check | Sanitization |
|-------|-------|------------|------------|------------|--------------|
| /api/advice | scenario.description | ✅ Required | ❌ None | ❌ None | ❌ None |
| /api/advice | scenario.context | ❌ None | ❌ None | ❌ None | ❌ None |
| /api/collect | options | ❌ None | ❌ None | ❌ None | ❌ None |
| /api/cron | authHeader | ⚠️ Weak | ✅ Header | ✅ String | ❌ Timing vuln |
| /api/graph | minRelevance | ❌ None | ❌ None | ⚠️ parseFloat | ❌ None |
| /api/graph | region | ❌ None | ❌ None | ❌ None | ❌ None |
| /api/graph | category | ❌ None | ❌ None | ❌ None | ❌ None |
| /api/search | q (query) | ✅ Required | ❌ None | ✅ String | ❌ None |
| /api/search | limit | ❌ None | ❌ None | ⚠️ parseInt | ❌ None |
| /api/status | None | N/A | N/A | N/A | N/A |

**Legend:**
- ✅ Implemented
- ⚠️ Partial/Weak
- ❌ Missing

---

## Error Handling Analysis

| Route | Stack Traces | User-Friendly | Proper Logging | Generic Errors |
|-------|--------------|---------------|----------------|----------------|
| /api/advice | ❌ Exposed via details | ❌ No | ✅ Yes | ❌ No |
| /api/collect | ❌ Exposed via details | ❌ No | ✅ Yes | ❌ No |
| /api/cron | ❌ Exposed via details | ❌ No | ✅ Yes | ❌ No |
| /api/graph | ❌ Exposed via details | ❌ No | ✅ Yes | ❌ No |
| /api/search | ❌ Exposed via details | ❌ No | ✅ Yes | ❌ No |
| /api/status | ❌ Exposed via details | ❌ No | ✅ Yes | ❌ No |

**Finding:** All routes leak internal error details via the `details` field in error responses.

---

## Authentication/Authorization Matrix

| Route | Method | Auth Required? | Current Status | Risk |
|-------|--------|----------------|----------------|------|
| /api/advice | POST | No | ❌ Public | Medium |
| /api/collect | POST | Yes | ❌ None | CRITICAL |
| /api/collect | GET | Yes | ❌ None | CRITICAL |
| /api/cron | GET | Yes | ⚠️ Weak | HIGH |
| /api/graph | GET | No | ✅ Acceptable | Low |
| /api/search | GET | No | ✅ Acceptable | Low |
| /api/status | GET | Maybe | ⚠️ Public | Medium |

**Recommendations:**
1. `/api/collect` - MUST require authentication (API key or session)
2. `/api/cron` - FIX timing attack, enforce CRON_SECRET
3. `/api/advice` - Consider rate limiting or light auth for production
4. `/api/status` - Review what info is exposed, may need auth

---

## OWASP Top 10 Coverage

| OWASP Category | Issues Found | Severity |
|----------------|--------------|----------|
| A01:2021 - Broken Access Control | /api/collect no auth | CRITICAL |
| A02:2021 - Cryptographic Failures | Timing attack in cron | CRITICAL |
| A03:2021 - Injection | No input sanitization, unbounded params | HIGH |
| A04:2021 - Insecure Design | No rate limiting, GET for POST | HIGH |
| A05:2021 - Security Misconfiguration | Error leakage, no security headers | CRITICAL |
| A06:2021 - Vulnerable Components | N/A - Not assessed | - |
| A07:2021 - Auth Failures | CRON_SECRET bypass | CRITICAL |
| A08:2021 - Data Integrity | N/A - Not applicable | - |
| A09:2021 - Logging Failures | No audit logging | MEDIUM |
| A10:2021 - SSRF | N/A - Not assessed | - |

---

## Recommendations by Priority

### Immediate (Fix Today)

1. **Add authentication to `/api/collect`**
   ```typescript
   // Require API key or session token
   const apiKey = request.headers.get('x-api-key');
   if (apiKey !== process.env.INTERNAL_API_KEY) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
   }
   ```

2. **Fix CRON_SECRET bypass**
   ```typescript
   if (!cronSecret) {
     throw new Error('CRON_SECRET environment variable must be set');
   }
   ```

3. **Use constant-time comparison for cron auth**
   ```typescript
   import { timingSafeEqual } from 'crypto';
   ```

4. **Remove error details from production responses**
   ```typescript
   const details = process.env.NODE_ENV === 'development'
     ? (error instanceof Error ? error.message : 'Unknown error')
     : undefined;
   ```

### Short Term (This Week)

5. **Add rate limiting middleware**
6. **Implement input bounds (limit, minRelevance)**
7. **Add request size limits**
8. **Remove GET method from `/api/collect`**
9. **Add input validation for Scenario type**

### Medium Term (This Sprint)

10. **Implement security headers**
11. **Add CORS configuration**
12. **Set up request logging/monitoring**
13. **Review and sanitize LLM inputs**
14. **Add input sanitization library (DOMPurify, validator.js)**

---

## Testing Recommendations

### Security Test Cases

1. **Authentication Bypass Tests**
   ```bash
   # Test collect without auth
   curl -X POST http://localhost:3000/api/collect

   # Test cron without CRON_SECRET
   curl http://localhost:3000/api/cron

   # Test cron with wrong token
   curl -H "Authorization: Bearer wrong" http://localhost:3000/api/cron
   ```

2. **Input Validation Tests**
   ```bash
   # Test unbounded limit
   curl "http://localhost:3000/api/search?q=test&limit=999999999"

   # Test negative minRelevance
   curl "http://localhost:3000/api/graph?minRelevance=-999"

   # Test XSS in scenario
   curl -X POST http://localhost:3000/api/advice \
     -H "Content-Type: application/json" \
     -d '{"description":"<script>alert(1)</script>"}'
   ```

3. **DoS Tests**
   ```bash
   # Test large payload
   curl -X POST http://localhost:3000/api/advice \
     -H "Content-Type: application/json" \
     -d '{"description":"'$(python -c 'print("A"*10000000))'"}'

   # Test rate limiting
   for i in {1..100}; do curl http://localhost:3000/api/search?q=test & done
   ```

---

## Conclusion

The Zeitgeist API has significant security vulnerabilities that must be addressed before production deployment. The most critical issues are:

1. **Missing authentication on resource-intensive endpoints**
2. **Authentication bypass vulnerabilities**
3. **Error information disclosure**
4. **No rate limiting**

These issues are common in prototype/MVP applications but pose serious risks in production. The good news is that most fixes are straightforward and can be implemented quickly.

**Overall Security Score: 3/10** ⚠️

With the recommended fixes implemented, the score would improve to **8/10** ✅

---

## References

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Next.js Security Best Practices](https://nextjs.org/docs/advanced-features/security-headers)
- [Node.js Security Checklist](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)

---

**End of Report**

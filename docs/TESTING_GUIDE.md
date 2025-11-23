# Testing Guide

Comprehensive guide for testing the Zeitgeist multi-user cultural graph application.

## Table of Contents

1. [Overview](#overview)
2. [Running Tests](#running-tests)
3. [Test Structure](#test-structure)
4. [Writing Tests](#writing-tests)
5. [Mocking Strategies](#mocking-strategies)
6. [Testing Patterns](#testing-patterns)
7. [CI/CD Integration](#cicd-integration)
8. [Troubleshooting](#troubleshooting)

## Overview

This project uses **Vitest** as the testing framework with the following characteristics:

- **Fast**: Powered by Vite's transformation pipeline
- **TypeScript**: Full TypeScript support
- **Happy DOM**: Lightweight DOM environment for component testing
- **Coverage**: V8 code coverage provider

### Test Categories

```
tests/
├── Unit Tests           # Individual function/class testing
├── Integration Tests    # Multi-component interaction testing
├── Service Tests        # Service layer testing
├── API Tests           # API endpoint testing
├── Database Tests      # Data persistence testing
├── Security Tests      # Security validation testing
├── Performance Tests   # Performance benchmarking
└── Regression Tests    # Backwards compatibility testing
```

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests once (CI mode)
npm run test:run

# Generate coverage report
npm run test:coverage
```

### Running Specific Tests

```bash
# Run a specific test file
npx vitest lib/users/__tests__/user-service.test.ts

# Run tests matching a pattern
npx vitest --grep "UserService"

# Run tests in a specific directory
npx vitest lib/users/__tests__/
```

### Coverage Reports

```bash
# Generate and view coverage
npm run test:coverage

# Coverage report will be in:
# - Terminal: Text summary
# - coverage/index.html: Interactive HTML report
# - coverage/lcov.info: LCOV format for CI
```

## Test Structure

### Test File Organization

```
lib/
├── users/
│   ├── user-service.ts
│   └── __tests__/
│       └── user-service.test.ts
app/
├── api/
│   ├── advice/
│   │   └── route.ts
│   └── __tests__/
│       └── advice.test.ts
__tests__/
├── integration.test.ts
├── security.test.ts
└── performance.test.ts
```

### Test File Template

```typescript
/**
 * [Feature] Tests
 *
 * Brief description of what this test suite covers.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Feature Name', () => {
  // Setup
  beforeEach(() => {
    // Initialize test state
  });

  afterEach(() => {
    // Cleanup
  });

  describe('Specific Functionality', () => {
    it('should do something specific', async () => {
      // Arrange
      const input = 'test';

      // Act
      const result = await functionUnderTest(input);

      // Assert
      expect(result).toBe('expected');
    });

    it('should handle edge cases', async () => {
      // Test edge cases
    });

    it('should throw errors for invalid input', async () => {
      await expect(functionUnderTest(null)).rejects.toThrow();
    });
  });
});
```

## Writing Tests

### Best Practices

#### 1. Follow AAA Pattern

```typescript
it('should create a user', async () => {
  // Arrange - Set up test data
  const userData = {
    email: 'test@example.com',
    tier: 'free',
  };

  // Act - Execute the function
  const user = await userService.createUser(userData);

  // Assert - Verify the result
  expect(user.email).toBe('test@example.com');
  expect(user.tier).toBe('free');
});
```

#### 2. Use Descriptive Test Names

```typescript
// ❌ Bad
it('test user creation', async () => { ... });

// ✅ Good
it('should create a user with default free tier when tier not specified', async () => { ... });
```

#### 3. Test One Thing Per Test

```typescript
// ❌ Bad - Testing multiple things
it('should handle user operations', async () => {
  await userService.createUser(...);
  await userService.updateUser(...);
  await userService.deleteUser(...);
});

// ✅ Good - Separate tests
it('should create a user', async () => { ... });
it('should update a user', async () => { ... });
it('should delete a user', async () => { ... });
```

#### 4. Test Edge Cases and Errors

```typescript
describe('UserService.createUser', () => {
  it('should create user with valid data', async () => { ... });

  it('should throw error for invalid email', async () => {
    await expect(
      userService.createUser({ email: 'invalid' })
    ).rejects.toThrow('Invalid email');
  });

  it('should handle duplicate email', async () => { ... });

  it('should sanitize malicious input', async () => { ... });
});
```

### Testing Async Code

```typescript
// Using async/await
it('should fetch user data', async () => {
  const user = await userService.getUserProfile('user-123');
  expect(user).toBeDefined();
});

// Testing promises
it('should reject invalid user ID', () => {
  return expect(userService.getUserProfile(null))
    .rejects
    .toThrow();
});
```

### Testing Errors

```typescript
it('should throw specific error', async () => {
  await expect(
    userService.createUser({ email: 'bad' })
  ).rejects.toThrow('Invalid email format');
});

it('should throw custom error class', async () => {
  await expect(
    userService.getUserProfile('missing')
  ).rejects.toThrow(UserNotFoundError);
});
```

## Mocking Strategies

### Mocking Modules

```typescript
import { vi } from 'vitest';

// Mock entire module
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Use mocked module
const mockAuth = require('@clerk/nextjs/server').auth;
mockAuth.mockResolvedValue({ userId: 'test-user' });
```

### Mocking Functions

```typescript
import { vi } from 'vitest';

// Create a mock function
const mockFn = vi.fn();

// Set return value
mockFn.mockReturnValue('mocked');

// Set async return value
mockFn.mockResolvedValue({ data: 'async mocked' });

// Verify calls
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
expect(mockFn).toHaveBeenCalledTimes(2);
```

### Mocking Fetch

```typescript
// Already mocked globally in vitest.setup.ts
global.fetch = vi.fn();

// In your test
beforeEach(() => {
  (global.fetch as any).mockResolvedValue({
    ok: true,
    json: async () => ({ data: 'mocked' }),
  });
});
```

### Mocking Database

```typescript
// Use MemoryGraphStore for tests
import { MemoryGraphStore } from '@/lib/graph/memory';

let store: MemoryGraphStore;

beforeEach(() => {
  store = new MemoryGraphStore();
  // Store is isolated per test
});
```

### Mocking Time

```typescript
import { vi } from 'vitest';

it('should handle time-based logic', () => {
  // Mock Date.now()
  const now = new Date('2025-01-01');
  vi.setSystemTime(now);

  // Your test code
  const timestamp = new Date();
  expect(timestamp.toISOString()).toBe('2025-01-01T00:00:00.000Z');

  // Restore real time
  vi.useRealTimers();
});
```

## Testing Patterns

### Testing Services

```typescript
describe('UserService', () => {
  let store: MemoryGraphStore;
  let service: UserService;

  beforeEach(() => {
    store = new MemoryGraphStore();
    service = new UserService(store);
  });

  it('should create and retrieve user', async () => {
    const created = await service.createUser({ email: 'test@example.com' });
    const retrieved = await service.getUserProfile(created.id);

    expect(retrieved).toEqual(created);
  });
});
```

### Testing API Routes

```typescript
describe('POST /api/advice', () => {
  it('should return 401 without auth', async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const request = new Request('http://localhost/api/advice');

    // Test would call route handler
    // Verify 401 response
  });

  it('should return advice with valid auth', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-123' });
    mockUsers.set('user-123', testUser);

    const request = new Request('http://localhost/api/advice', {
      method: 'POST',
      body: JSON.stringify({ scenario: { description: 'Test' } }),
    });

    // Test route handler
    // Verify 200 response with advice
  });
});
```

### Testing Middleware

```typescript
describe('requireAuth middleware', () => {
  it('should allow authenticated users', async () => {
    mockAuth.mockResolvedValue({ userId: 'user-123' });
    mockUsers.set('user-123', testUser);

    const request = new Request('http://localhost/api/protected');
    const user = await requireAuth(request);

    expect(user).toEqual(testUser);
  });

  it('should throw for unauthenticated users', async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const request = new Request('http://localhost/api/protected');

    await expect(requireAuth(request)).rejects.toThrow(AuthenticationError);
  });
});
```

### Testing Matchers

```typescript
describe('PersonalizedMatcher', () => {
  let store: MemoryGraphStore;
  let matcher: PersonalizedMatcher;

  beforeEach(async () => {
    store = new MemoryGraphStore();
    matcher = new PersonalizedMatcher(store);

    // Seed test vibes
    await seedVibes(store);
  });

  it('should filter by region', async () => {
    const user: UserProfile = {
      // ... user with region: 'US-West'
    };

    const scenario: Scenario = { description: 'Test' };
    const matches = await matcher.match(scenario, store, user);

    // Verify regional filtering
    expect(matches.every(m => m.vibe.region === 'US-West')).toBe(true);
  });
});
```

### Integration Testing

```typescript
describe('Complete User Journey', () => {
  let store: MemoryGraphStore;
  let userService: UserService;
  let historyService: HistoryService;
  let zeitgeist: ZeitgeistService;

  beforeEach(() => {
    store = new MemoryGraphStore();
    userService = new UserService(store);
    historyService = new HistoryService(store);
    zeitgeist = new ZeitgeistService(store);
  });

  it('should support signup -> advice -> history flow', async () => {
    // 1. Create user
    const user = await userService.createUser({ email: 'test@example.com' });

    // 2. Get advice
    const scenario: Scenario = { description: 'Test' };
    const advice = await zeitgeist.getAdvice(scenario, user);

    // 3. Save to history
    await historyService.saveAdvice(user.id, scenario, advice, {});

    // 4. Retrieve history
    const history = await historyService.getHistory(user.id);

    expect(history.length).toBe(1);
  });
});
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:run

      - name: Generate coverage
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### Vercel Build Integration

```json
// package.json
{
  "scripts": {
    "build": "next build",
    "test:ci": "vitest run --reporter=verbose",
    "vercel-build": "npm run test:ci && npm run build"
  }
}
```

## Troubleshooting

### Common Issues

#### Tests Timing Out

```typescript
// Increase timeout for slow tests
it('should handle slow operation', async () => {
  // ...
}, { timeout: 10000 }); // 10 second timeout
```

#### Mocks Not Working

```typescript
// Clear mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});

// Reset mock state
afterEach(() => {
  vi.resetAllMocks();
});
```

#### Database State Issues

```typescript
// Always use fresh store per test
beforeEach(() => {
  store = new MemoryGraphStore();
});

// Don't share state between tests
```

#### Type Errors in Tests

```typescript
// Cast mocked modules when needed
const mockAuth = require('@clerk/nextjs/server').auth as jest.Mock;

// Use type guards
if (user) {
  expect(user.email).toBe('test@example.com');
}
```

### Debug Mode

```typescript
// Add debugging output
it('should debug something', () => {
  console.log('Debug info:', data);

  // Use snapshots for complex objects
  expect(complexObject).toMatchSnapshot();
});
```

## Test Coverage Goals

### Overall Targets
- **Overall**: >80%
- **Critical Paths**: >90%
- **Service Layer**: >85%
- **Frontend Components**: >70%

### Viewing Coverage

```bash
# Generate coverage
npm run test:coverage

# Open HTML report
open coverage/index.html
```

### Excluding Files from Coverage

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      exclude: [
        'node_modules/',
        '__tests__/**',
        '*.config.*',
        'types/*',
      ],
    },
  },
});
```

## Resources

- [Vitest Documentation](https://vitest.dev)
- [Testing Library](https://testing-library.com)
- [Happy DOM](https://github.com/capricorn86/happy-dom)
- [Test-Driven Development](https://martinfowler.com/bliki/TestDrivenDevelopment.html)

---

**Last Updated**: 2025-11-23
**Maintainer**: Agent 8 - Testing & Integration Validation Specialist

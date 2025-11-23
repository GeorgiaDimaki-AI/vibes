import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '../collect/route';
import { NextRequest } from 'next/server';

// Mock the zeitgeist service
vi.mock('@/lib', () => ({
  zeitgeist: {
    updateGraph: vi.fn(),
  },
}));

describe('POST /api/collect', () => {
  let mockRequest: Partial<NextRequest>;

  beforeEach(() => {
    mockRequest = {
      headers: new Headers(),
      json: vi.fn().mockResolvedValue({}),
    };

    vi.clearAllMocks();
    process.env.NODE_ENV = 'production';
  });

  it('should require API key in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.INTERNAL_API_KEY = 'test-key';
    delete mockRequest.headers;
    mockRequest.headers = new Headers();

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('Unauthorized');
  });

  it('should accept valid API key in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.INTERNAL_API_KEY = 'test-key';

    const headers = new Headers();
    headers.set('x-api-key', 'test-key');
    mockRequest.headers = headers;

    const { zeitgeist } = await import('@/lib');
    (zeitgeist.updateGraph as any).mockResolvedValueOnce({ vibesAdded: 5 });

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.vibesAdded).toBe(5);
  });

  it('should allow requests without API key in development', async () => {
    process.env.NODE_ENV = 'development';

    const { zeitgeist } = await import('@/lib');
    (zeitgeist.updateGraph as any).mockResolvedValueOnce({ vibesAdded: 3 });

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should reject invalid API key', async () => {
    process.env.NODE_ENV = 'production';
    process.env.INTERNAL_API_KEY = 'correct-key';

    const headers = new Headers();
    headers.set('x-api-key', 'wrong-key');
    mockRequest.headers = headers;

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('Unauthorized');
  });

  it('should handle collection errors gracefully', async () => {
    process.env.NODE_ENV = 'development';

    const { zeitgeist } = await import('@/lib');
    (zeitgeist.updateGraph as any).mockRejectedValueOnce(new Error('Collection failed'));

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Failed to collect data');
  });

  it('should pass options to updateGraph', async () => {
    process.env.NODE_ENV = 'development';

    mockRequest.json = vi.fn().mockResolvedValue({
      options: { limit: 50 },
    });

    const { zeitgeist } = await import('@/lib');
    (zeitgeist.updateGraph as any).mockResolvedValueOnce({ vibesAdded: 10 });

    await POST(mockRequest as NextRequest);

    expect(zeitgeist.updateGraph).toHaveBeenCalledWith({ limit: 50 });
  });

  it('should return 500 if INTERNAL_API_KEY is not set in production', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.INTERNAL_API_KEY;

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Server misconfiguration');
  });

  it('should hide error details in production', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.INTERNAL_API_KEY;

    const { zeitgeist } = await import('@/lib');
    (zeitgeist.updateGraph as any).mockRejectedValueOnce(new Error('Sensitive error'));

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(data.details).toBeUndefined();
  });

  it('should show error details in development', async () => {
    process.env.NODE_ENV = 'development';

    const { zeitgeist } = await import('@/lib');
    (zeitgeist.updateGraph as any).mockRejectedValueOnce(new Error('Debug error'));

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(data.details).toBe('Debug error');
  });
});

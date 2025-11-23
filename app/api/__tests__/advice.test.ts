import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '../advice/route';
import { NextRequest } from 'next/server';
import { mockScenario, mockAdvice } from '../../../lib/__fixtures__/scenarios';

// Mock the zeitgeist service
vi.mock('@/lib', () => ({
  zeitgeist: {
    getAdvice: vi.fn(),
  },
}));

describe('POST /api/advice', () => {
  let mockRequest: Partial<NextRequest>;

  beforeEach(() => {
    mockRequest = {
      json: vi.fn(),
    };

    vi.clearAllMocks();
  });

  it('should return advice for valid scenario', async () => {
    mockRequest.json = vi.fn().mockResolvedValue(mockScenario);

    const { zeitgeist } = await import('@/lib');
    (zeitgeist.getAdvice as any).mockResolvedValueOnce(mockAdvice);

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.scenario).toBeDefined();
    expect(data.recommendations).toBeDefined();
  });

  it('should reject request without description', async () => {
    mockRequest.json = vi.fn().mockResolvedValue({});

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('description is required');
  });

  it('should reject non-string description', async () => {
    mockRequest.json = vi.fn().mockResolvedValue({
      description: 123,
    });

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('must be a string');
  });

  it('should reject description that is too short', async () => {
    mockRequest.json = vi.fn().mockResolvedValue({
      description: 'Hi',
    });

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('at least 5 characters');
  });

  it('should reject description that is too long', async () => {
    mockRequest.json = vi.fn().mockResolvedValue({
      description: 'a'.repeat(5001),
    });

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('less than 5000 characters');
  });

  it('should handle errors gracefully', async () => {
    mockRequest.json = vi.fn().mockResolvedValue(mockScenario);

    const { zeitgeist } = await import('@/lib');
    (zeitgeist.getAdvice as any).mockRejectedValueOnce(new Error('Service error'));

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to generate advice');
  });

  it('should hide error details in production', async () => {
    process.env.NODE_ENV = 'production';
    mockRequest.json = vi.fn().mockResolvedValue(mockScenario);

    const { zeitgeist } = await import('@/lib');
    (zeitgeist.getAdvice as any).mockRejectedValueOnce(new Error('Sensitive error'));

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(data.details).toBeUndefined();
  });

  it('should show error details in development', async () => {
    process.env.NODE_ENV = 'development';
    mockRequest.json = vi.fn().mockResolvedValue(mockScenario);

    const { zeitgeist } = await import('@/lib');
    (zeitgeist.getAdvice as any).mockRejectedValueOnce(new Error('Debug error'));

    const response = await POST(mockRequest as NextRequest);
    const data = await response.json();

    expect(data.details).toBe('Debug error');
  });

  it('should accept scenario with optional context', async () => {
    const scenarioWithContext = {
      ...mockScenario,
      context: {
        location: 'San Francisco',
        formality: 'casual' as const,
      },
    };

    mockRequest.json = vi.fn().mockResolvedValue(scenarioWithContext);

    const { zeitgeist } = await import('@/lib');
    (zeitgeist.getAdvice as any).mockResolvedValueOnce(mockAdvice);

    const response = await POST(mockRequest as NextRequest);

    expect(response.status).toBe(200);
    expect(zeitgeist.getAdvice).toHaveBeenCalledWith(scenarioWithContext);
  });

  it('should accept scenario with optional preferences', async () => {
    const scenarioWithPrefs = {
      ...mockScenario,
      preferences: {
        topics: ['technology', 'culture'],
        avoid: ['politics'],
      },
    };

    mockRequest.json = vi.fn().mockResolvedValue(scenarioWithPrefs);

    const { zeitgeist } = await import('@/lib');
    (zeitgeist.getAdvice as any).mockResolvedValueOnce(mockAdvice);

    const response = await POST(mockRequest as NextRequest);

    expect(response.status).toBe(200);
    expect(zeitgeist.getAdvice).toHaveBeenCalledWith(scenarioWithPrefs);
  });
});

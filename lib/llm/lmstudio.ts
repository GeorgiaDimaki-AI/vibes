/**
 * LM Studio Provider
 * Uses OpenAI-compatible API (default: http://localhost:1234/v1)
 */

import OpenAI from 'openai';
import { LLMProvider, LLMMessage, LLMResponse } from './types';

export class LMStudioProvider implements LLMProvider {
  readonly name = 'lmstudio';
  private client: OpenAI;
  private defaultModel: string;

  constructor(config?: {
    baseUrl?: string;
    apiKey?: string;
    model?: string;
  }) {
    this.client = new OpenAI({
      baseURL: config?.baseUrl || process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234/v1',
      apiKey: config?.apiKey || process.env.LMSTUDIO_API_KEY || 'lm-studio', // LM Studio doesn't require real API key
    });
    this.defaultModel = config?.model || process.env.LMSTUDIO_MODEL || 'local-model';
  }

  async complete(
    messages: LLMMessage[],
    options?: {
      maxTokens?: number;
      temperature?: number;
      model?: string;
    }
  ): Promise<LLMResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: options?.model || this.defaultModel,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        max_tokens: options?.maxTokens || 2000,
        temperature: options?.temperature ?? 0.7,
      });

      const choice = response.choices[0];
      if (!choice || !choice.message.content) {
        throw new Error('No response from LM Studio');
      }

      return {
        content: choice.message.content,
        usage: response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        } : undefined,
      };
    } catch (error) {
      console.error('LM Studio completion failed:', error);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch (error) {
      console.warn('LM Studio not available:', error);
      return false;
    }
  }
}

/**
 * Ollama Provider
 * Uses Ollama's native API (default: http://localhost:11434)
 */

import { LLMProvider, LLMMessage, LLMResponse } from './types';

interface OllamaMessage {
  role: string;
  content: string;
}

interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export class OllamaProvider implements LLMProvider {
  readonly name = 'ollama';
  private baseUrl: string;
  private defaultModel: string;

  constructor(config?: {
    baseUrl?: string;
    model?: string;
  }) {
    this.baseUrl = config?.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.defaultModel = config?.model || process.env.OLLAMA_MODEL || 'llama2';
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
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options?.model || this.defaultModel,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          stream: false,
          options: {
            temperature: options?.temperature ?? 0.7,
            num_predict: options?.maxTokens || 2000,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data: OllamaResponse = await response.json();

      return {
        content: data.message.content,
        usage: {
          promptTokens: data.prompt_eval_count,
          completionTokens: data.eval_count,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
        },
      };
    } catch (error) {
      console.error('Ollama completion failed:', error);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch (error) {
      console.warn('Ollama not available:', error);
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) return [];

      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch (error) {
      console.error('Failed to list Ollama models:', error);
      return [];
    }
  }
}

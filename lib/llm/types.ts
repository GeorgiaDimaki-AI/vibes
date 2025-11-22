/**
 * Unified LLM interface for different providers
 */

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface LLMProvider {
  readonly name: string;

  complete(messages: LLMMessage[], options?: {
    maxTokens?: number;
    temperature?: number;
    model?: string;
  }): Promise<LLMResponse>;

  isAvailable(): Promise<boolean>;
}

export interface LLMConfig {
  provider: 'anthropic' | 'openai' | 'lmstudio' | 'ollama';
  model?: string;
  baseUrl?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
}

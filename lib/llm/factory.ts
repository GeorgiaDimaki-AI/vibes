/**
 * LLM Provider Factory
 * Creates and manages LLM providers based on configuration
 */

import { LLMProvider, LLMConfig } from './types';
import { LMStudioProvider } from './lmstudio';
import { OllamaProvider } from './ollama';

export class LLMFactory {
  private static instance?: LLMProvider;

  static getProvider(config?: LLMConfig): LLMProvider {
    // Return cached instance if available and config matches
    if (this.instance) {
      return this.instance;
    }

    const providerType = config?.provider ||
      process.env.LLM_PROVIDER as LLMConfig['provider'] ||
      'lmstudio'; // Default to LM Studio

    console.log(`Initializing LLM provider: ${providerType}`);

    switch (providerType) {
      case 'lmstudio':
        this.instance = new LMStudioProvider({
          baseUrl: config?.baseUrl,
          apiKey: config?.apiKey,
          model: config?.model,
        });
        break;

      case 'ollama':
        this.instance = new OllamaProvider({
          baseUrl: config?.baseUrl,
          model: config?.model,
        });
        break;

      case 'anthropic':
      case 'openai':
        throw new Error(`Cloud providers not yet implemented in factory. Provider: ${providerType}`);

      default:
        throw new Error(`Unknown LLM provider: ${providerType}`);
    }

    return this.instance;
  }

  static async getAvailableProvider(): Promise<LLMProvider | null> {
    // Try providers in order of preference
    const providers = [
      () => new LMStudioProvider(),
      () => new OllamaProvider(),
    ];

    for (const createProvider of providers) {
      try {
        const provider = createProvider();
        if (await provider.isAvailable()) {
          console.log(`Using available provider: ${provider.name}`);
          this.instance = provider;
          return provider;
        }
      } catch (error) {
        console.warn(`Provider unavailable:`, error);
      }
    }

    console.warn('No LLM providers available');
    return null;
  }

  static reset(): void {
    this.instance = undefined;
  }
}

// Helper to get LLM provider
export async function getLLM(): Promise<LLMProvider> {
  const provider = LLMFactory.getProvider();

  if (!(await provider.isAvailable())) {
    // Try to find an available provider
    const available = await LLMFactory.getAvailableProvider();
    if (!available) {
      throw new Error('No LLM provider available. Please start LM Studio or Ollama.');
    }
    return available;
  }

  return provider;
}

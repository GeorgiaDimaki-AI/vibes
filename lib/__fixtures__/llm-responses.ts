/**
 * Mock LLM responses for testing
 */

export const mockLLMAnalysisResponse = {
  vibes: [
    {
      name: 'AI Productivity Tools',
      description: 'Growing trend of AI-powered productivity software',
      category: 'trend',
      keywords: ['ai', 'productivity', 'automation', 'tools'],
      strength: 0.8,
      sentiment: 'positive',
    },
    {
      name: 'Remote Work Evolution',
      description: 'Changing attitudes toward remote and hybrid work',
      category: 'topic',
      keywords: ['remote work', 'hybrid', 'workplace', 'flexibility'],
      strength: 0.6,
      sentiment: 'mixed',
    },
  ],
};

export const mockLLMMatchResponse = {
  matches: [
    {
      vibeId: 'vibe-1',
      relevanceScore: 0.85,
      reasoning: 'This vibe is highly relevant because it aligns with the tech-focused nature of the scenario',
    },
    {
      vibeId: 'vibe-2',
      relevanceScore: 0.65,
      reasoning: 'Moderately relevant due to professional context',
    },
  ],
};

export const mockLLMAdviceResponse = {
  topics: [
    {
      topic: 'AI and Productivity',
      talking_points: [
        'Recent advances in large language models',
        'How AI tools are changing daily workflows',
        'The balance between automation and creativity',
      ],
      priority: 'high',
    },
  ],
  behavior: [
    {
      aspect: 'conversation style',
      suggestion: 'Be enthusiastic about tech topics but also listen actively',
      reasoning: 'Tech dinners value both knowledge sharing and collaborative discussion',
    },
  ],
  style: [
    {
      category: 'overall',
      suggestions: ['Smart casual', 'Clean tech aesthetic'],
      reasoning: 'Trendy SF restaurants call for polished but relaxed style',
    },
  ],
  confidence: 0.8,
};

export const mockEmbeddingResponse = Array(1536).fill(0).map((_, i) => Math.sin(i * 0.1));

export const mockOpenAIResponse = {
  choices: [
    {
      message: {
        content: JSON.stringify(mockLLMAnalysisResponse),
      },
    },
  ],
};

export const mockAnthropicResponse = {
  content: [
    {
      type: 'text',
      text: JSON.stringify(mockLLMAnalysisResponse),
    },
  ],
};

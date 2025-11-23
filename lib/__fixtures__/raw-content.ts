import { RawContent } from '../types';

/**
 * Test fixtures for RawContent
 */

export const createMockRawContent = (overrides?: Partial<RawContent>): RawContent => {
  return {
    id: 'content-1',
    source: 'news',
    url: 'https://techcrunch.com/2025/11/23/ai-tools',
    title: 'New AI Tools Revolutionize Productivity',
    body: 'Artificial intelligence is transforming how we work. New productivity tools are emerging that leverage AI to automate tasks and boost efficiency. Companies in Silicon Valley are leading the charge.',
    timestamp: new Date('2025-11-23T10:00:00Z'),
    author: 'Jane Doe',
    engagement: {
      views: 1000,
      likes: 50,
      shares: 20,
      comments: 10,
    },
    ...overrides,
  };
};

export const mockRawContentList: RawContent[] = [
  createMockRawContent({
    id: 'content-1',
    source: 'news',
    title: 'AI Productivity Tools Gain Traction',
    body: 'The latest AI productivity tools are changing the workplace...',
  }),
  createMockRawContent({
    id: 'content-2',
    source: 'reddit',
    url: 'https://reddit.com/r/technology/abc123',
    title: 'Discussion: Best AI tools for 2025',
    body: 'What are everyone\'s favorite AI productivity tools this year?',
    engagement: {
      views: 5000,
      likes: 200,
      comments: 50,
    },
  }),
  createMockRawContent({
    id: 'content-3',
    source: 'news',
    url: 'https://bbc.co.uk/news/tech-123',
    title: 'UK Tech Scene Embraces AI',
    body: 'London startups are building innovative AI tools...',
  }),
];

export const mockRedditContent = createMockRawContent({
  id: 'reddit-1',
  source: 'reddit',
  url: 'https://reddit.com/r/sanfrancisco/post123',
  title: 'SF Bay Area tech scene thoughts',
  body: 'The tech scene in San Francisco is really heating up again...',
  raw: {
    subreddit: 'sanfrancisco',
    score: 150,
    num_comments: 30,
  },
});

export const mockNewsContent = createMockRawContent({
  id: 'news-1',
  source: 'news',
  url: 'https://techcrunch.com/article-123',
  title: 'Silicon Valley\'s AI Boom',
  body: 'Tech companies in Silicon Valley are investing heavily in AI...',
});

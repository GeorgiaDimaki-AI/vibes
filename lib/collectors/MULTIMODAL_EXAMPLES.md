# Multi-Modal Collector Examples

This document demonstrates how to add collectors for images, videos, audio, and other media types to the Zeitgeist system.

## Architecture Support for Multi-Modal Data

### ✅ Current Support

The `RawContent` interface already supports multi-modal data:

```typescript
export interface RawContent {
  // Text content
  title?: string;
  body?: string;

  // Multi-modal URLs
  imageUrls?: string[];    // ✅ Images supported
  audioUrl?: string;       // ✅ Audio supported
  videoUrl?: string;       // ✅ Video supported (needs to be added)

  // Extensibility for any media type
  raw?: Record<string, any>;  // ✅ Store any additional data
}
```

### How It Works

**Collection Pipeline:**
1. **Collector** fetches media (images/video/audio)
2. **Preprocessing** converts media → text (transcription, OCR, vision models)
3. **Analyzer** extracts vibes from text representation
4. **Rest of pipeline** works unchanged (embeddings, matching, etc.)

---

## Example 1: Instagram Image Collector

Collects images and uses vision models to generate text descriptions.

```typescript
// lib/collectors/instagram.ts

import { BaseCollector } from './base';
import { CollectorOptions, RawContent } from '@/lib/types';
import { analyzeImage } from '@/lib/utils/vision'; // You'd implement this

export class InstagramCollector extends BaseCollector {
  readonly name = 'instagram';
  readonly description = 'Collects trending Instagram posts with image analysis';

  private apiKey = process.env.INSTAGRAM_API_KEY;

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async collect(options?: CollectorOptions): Promise<RawContent[]> {
    if (!this.apiKey) return [];

    try {
      // 1. Fetch trending Instagram posts
      const posts = await this.fetchTrendingPosts(options?.limit || 20);

      // 2. Convert each post to RawContent
      const rawContent: RawContent[] = [];

      for (const post of posts) {
        // 3. Analyze images using vision model (CLIP, GPT-4V, LLaVA, etc.)
        const imageDescriptions = await Promise.all(
          post.imageUrls.map(url => analyzeImage(url))
        );

        // 4. Combine text caption + image descriptions
        const fullText = [
          post.caption,
          ...imageDescriptions.map((desc, i) => `Image ${i + 1}: ${desc}`)
        ].join('\n\n');

        rawContent.push(this.createRawContent({
          source: 'instagram',
          url: post.url,
          title: post.caption?.substring(0, 100),
          body: fullText,  // ← Text representation of images!
          imageUrls: post.imageUrls,
          engagement: {
            likes: post.likes,
            comments: post.comments,
            shares: post.shares,
          },
          raw: {
            imageAnalysis: imageDescriptions,
            hashtags: post.hashtags,
          },
        }));
      }

      return rawContent;
    } catch (error) {
      console.error('Instagram collection failed:', error);
      return [];
    }
  }

  private async fetchTrendingPosts(limit: number) {
    // Implement Instagram API call
    // Return: Array<{url, caption, imageUrls, likes, comments, shares, hashtags}>
    throw new Error('Not implemented - add Instagram API integration');
  }
}
```

**Register it:**
```typescript
// lib/collectors/index.ts
import { InstagramCollector } from './instagram';

collectorRegistry.register(new InstagramCollector());
```

---

## Example 2: TikTok Video Collector

Collects videos and transcribes them to text.

```typescript
// lib/collectors/tiktok.ts

import { BaseCollector } from './base';
import { CollectorOptions, RawContent } from '@/lib/types';
import { transcribeVideo } from '@/lib/utils/transcription'; // You'd implement this
import { analyzeVideoFrames } from '@/lib/utils/vision';

export class TikTokCollector extends BaseCollector {
  readonly name = 'tiktok';
  readonly description = 'Collects trending TikTok videos with transcription';

  async collect(options?: CollectorOptions): Promise<RawContent[]> {
    try {
      // 1. Fetch trending TikTok videos (public API or web scraping)
      const videos = await this.fetchTrendingVideos(options?.limit || 10);

      const rawContent: RawContent[] = [];

      for (const video of videos) {
        // 2. Transcribe audio to text (Whisper, AssemblyAI, etc.)
        const transcription = await transcribeVideo(video.videoUrl);

        // 3. Analyze key frames for visual trends (optional)
        const visualAnalysis = await analyzeVideoFrames(video.videoUrl, {
          frameCount: 5 // Sample 5 frames
        });

        // 4. Combine text + transcription + visual analysis
        const fullText = [
          `Caption: ${video.caption}`,
          `Transcription: ${transcription}`,
          `Visual elements: ${visualAnalysis.join(', ')}`,
        ].join('\n\n');

        rawContent.push(this.createRawContent({
          source: 'tiktok',
          url: video.url,
          title: video.caption?.substring(0, 100),
          body: fullText,
          videoUrl: video.videoUrl,
          audioUrl: video.audioUrl, // If separate
          engagement: {
            likes: video.likes,
            views: video.views,
            shares: video.shares,
          },
          raw: {
            transcription,
            visualAnalysis,
            hashtags: video.hashtags,
            sounds: video.soundId,
          },
        }));
      }

      return rawContent;
    } catch (error) {
      console.error('TikTok collection failed:', error);
      return [];
    }
  }

  private async fetchTrendingVideos(limit: number) {
    // Implement TikTok API/scraping
    throw new Error('Not implemented');
  }
}
```

---

## Example 3: Spotify Audio Trends Collector

Analyzes trending music for cultural vibes.

```typescript
// lib/collectors/spotify.ts

import { BaseCollector } from './base';
import { CollectorOptions, RawContent } from '@/lib/types';

export class SpotifyCollector extends BaseCollector {
  readonly name = 'spotify';
  readonly description = 'Collects trending music and audio trends from Spotify';

  private clientId = process.env.SPOTIFY_CLIENT_ID;
  private clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  async isAvailable(): Promise<boolean> {
    return !!(this.clientId && this.clientSecret);
  }

  async collect(options?: CollectorOptions): Promise<RawContent[]> {
    if (!this.isAvailable()) return [];

    try {
      // 1. Get trending playlists/tracks
      const trending = await this.getTrendingPlaylists(options?.limit || 50);

      const rawContent: RawContent[] = [];

      for (const track of trending) {
        // 2. Extract text representation from audio metadata
        const textRepresentation = [
          `Track: ${track.name} by ${track.artist}`,
          `Genre: ${track.genres.join(', ')}`,
          `Mood: ${track.audioFeatures.valence > 0.5 ? 'Upbeat' : 'Melancholy'}`,
          `Energy: ${track.audioFeatures.energy > 0.7 ? 'High' : 'Low'}`,
          `Danceability: ${track.audioFeatures.danceability}`,
          track.lyrics ? `Lyrics themes: ${this.extractThemes(track.lyrics)}` : '',
        ].filter(Boolean).join('\n');

        rawContent.push(this.createRawContent({
          source: 'spotify',
          url: track.url,
          title: `${track.name} - ${track.artist}`,
          body: textRepresentation,
          audioUrl: track.previewUrl,
          engagement: {
            views: track.playCount,
          },
          raw: {
            audioFeatures: track.audioFeatures,
            genres: track.genres,
            releaseDate: track.releaseDate,
          },
        }));
      }

      return rawContent;
    } catch (error) {
      console.error('Spotify collection failed:', error);
      return [];
    }
  }

  private async getTrendingPlaylists(limit: number) {
    // Implement Spotify API calls
    throw new Error('Not implemented');
  }

  private extractThemes(lyrics: string): string {
    // Simple keyword extraction or use LLM
    return 'love, freedom, celebration'; // Example
  }
}
```

---

## Example 4: Pinterest Visual Trends Collector

```typescript
// lib/collectors/pinterest.ts

import { BaseCollector } from './base';
import { CollectorOptions, RawContent } from '@/lib/types';
import { analyzeImage, extractColors, detectStyles } from '@/lib/utils/vision';

export class PinterestCollector extends BaseCollector {
  readonly name = 'pinterest';
  readonly description = 'Collects trending visual aesthetics from Pinterest';

  async collect(options?: CollectorOptions): Promise<RawContent[]> {
    try {
      const pins = await this.getTrendingPins(options?.limit || 30);
      const rawContent: RawContent[] = [];

      for (const pin of pins) {
        // Analyze visual content
        const imageAnalysis = await analyzeImage(pin.imageUrl);
        const colors = await extractColors(pin.imageUrl);
        const styles = await detectStyles(pin.imageUrl);

        // Convert visual data to text
        const textRepresentation = [
          `Title: ${pin.title}`,
          `Description: ${pin.description}`,
          `Visual analysis: ${imageAnalysis}`,
          `Color palette: ${colors.join(', ')}`,
          `Styles detected: ${styles.join(', ')}`,
          `Board: ${pin.board}`,
        ].join('\n');

        rawContent.push(this.createRawContent({
          source: 'pinterest',
          url: pin.url,
          title: pin.title,
          body: textRepresentation,
          imageUrls: [pin.imageUrl],
          engagement: {
            likes: pin.saves,
            shares: pin.repins,
          },
          raw: {
            colors,
            styles,
            board: pin.board,
          },
        }));
      }

      return rawContent;
    } catch (error) {
      console.error('Pinterest collection failed:', error);
      return [];
    }
  }

  private async getTrendingPins(limit: number) {
    throw new Error('Not implemented');
  }
}
```

---

## Media Processing Utilities

Create reusable utilities for media processing:

### lib/utils/vision.ts

```typescript
/**
 * Vision processing utilities for image/video analysis
 */

// Option 1: Use GPT-4 Vision (cloud)
export async function analyzeImageWithGPT4V(imageUrl: string): Promise<string> {
  const openai = await import('openai');
  const client = new openai.OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.chat.completions.create({
    model: "gpt-4-vision-preview",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Describe the cultural trends, aesthetics, and vibes in this image. Focus on fashion, mood, activities, and visual style."
          },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
    max_tokens: 300,
  });

  return response.choices[0].message.content || '';
}

// Option 2: Use LLaVA (local, free)
export async function analyzeImageWithLLaVA(imageUrl: string): Promise<string> {
  // Ollama supports vision models like llava
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llava',
      prompt: 'Describe the cultural trends and aesthetics in this image.',
      images: [imageUrl],
    }),
  });

  const data = await response.json();
  return data.response;
}

// Option 3: Use CLIP for similarity (local, free)
export async function getImageEmbedding(imageUrl: string): Promise<number[]> {
  // Use CLIP via Ollama or transformers.js
  // Returns embedding that can be compared with text embeddings
  throw new Error('Not implemented - use Ollama CLIP model');
}

export async function extractColors(imageUrl: string): Promise<string[]> {
  // Use image processing library (sharp, canvas, etc.)
  // Return dominant color palette
  return ['#FF5733', '#33FF57', '#3357FF']; // Example
}

export async function detectStyles(imageUrl: string): Promise<string[]> {
  // Use vision model or style classifier
  return ['minimalist', 'modern', 'bohemian']; // Example
}
```

### lib/utils/transcription.ts

```typescript
/**
 * Audio/video transcription utilities
 */

// Option 1: Whisper via OpenAI (cloud)
export async function transcribeWithWhisperAPI(audioUrl: string): Promise<string> {
  const openai = await import('openai');
  const client = new openai.OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const transcription = await client.audio.transcriptions.create({
    file: await fetchAudioFile(audioUrl),
    model: "whisper-1",
  });

  return transcription.text;
}

// Option 2: Whisper via Ollama (local, free)
export async function transcribeWithWhisperLocal(audioUrl: string): Promise<string> {
  // Use whisper.cpp or similar local transcription
  throw new Error('Not implemented - install whisper.cpp');
}

// Option 3: AssemblyAI (cloud)
export async function transcribeWithAssemblyAI(audioUrl: string): Promise<string> {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  // Implement AssemblyAI transcription
  throw new Error('Not implemented');
}

async function fetchAudioFile(url: string): Promise<File> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new File([blob], 'audio.mp3');
}
```

---

## Adding Multi-Modal Support: Step-by-Step

### Step 1: Add videoUrl to RawContent type

```typescript
// lib/types/index.ts

export interface RawContent {
  // ... existing fields
  imageUrls?: string[];
  audioUrl?: string;
  videoUrl?: string;  // ← ADD THIS
}
```

### Step 2: Create vision utility

```typescript
// lib/utils/vision.ts
export async function analyzeImage(imageUrl: string): Promise<string> {
  // Choose: GPT-4V (paid) or LLaVA (free local)
  return analyzeImageWithLLaVA(imageUrl);
}
```

### Step 3: Create your collector

```typescript
// lib/collectors/instagram.ts
export class InstagramCollector extends BaseCollector {
  // ... implementation from Example 1 above
}
```

### Step 4: Register the collector

```typescript
// lib/collectors/index.ts
import { InstagramCollector } from './instagram';

export function initializeCollectors() {
  collectorRegistry.register(new NewsCollector());
  collectorRegistry.register(new RedditCollector());
  collectorRegistry.register(new InstagramCollector()); // ← ADD THIS
}
```

### Step 5: Done! The rest of the pipeline works automatically

The analyzer will process the text representation, extract vibes, and everything else (embeddings, matching, temporal decay) works unchanged.

---

## Multi-Modal Processing Strategies

### Strategy 1: Pre-process to Text (Recommended)

**Pros:**
- Works with existing pipeline
- Reuses all analyzers/matchers
- Simpler architecture

**Cons:**
- Lossy (some visual/audio nuance lost)

**When to use:** Most cases

### Strategy 2: Multi-Modal Embeddings (Advanced)

**Pros:**
- Preserves visual/audio semantics
- Better for purely visual trends

**Cons:**
- Requires CLIP or similar models
- More complex pipeline
- Harder to explain to users

**When to use:** Fashion, art, design trends

### Strategy 3: Hybrid Approach

**Pros:**
- Best of both worlds
- Most accurate

**Cons:**
- Most complex

**Implementation:**
```typescript
interface RawContent {
  body?: string;           // Text representation
  imageUrls?: string[];
  imageEmbeddings?: number[][]; // CLIP embeddings

  // Combine both in analysis:
  // - Text → LLM analyzer → vibes
  // - Images → CLIP → visual vibes
  // - Merge both sets of vibes
}
```

---

## Recommended Tools

### Vision Models
- **GPT-4 Vision** - Best quality, paid ($0.01-0.03 per image)
- **LLaVA via Ollama** - Free, local, good quality
- **CLIP** - Free, local, fast for embeddings

### Transcription
- **Whisper API** - Best quality, paid ($0.006 per minute)
- **whisper.cpp** - Free, local, same model
- **AssemblyAI** - Good quality, paid, extra features

### Image Processing
- **sharp** - Fast image manipulation (Node.js)
- **canvas** - Drawing and color extraction
- **colorthief** - Color palette extraction

---

## Environment Variables

Add to `.env.local`:

```bash
# Vision (choose one)
OPENAI_API_KEY=sk-...           # For GPT-4V
# or use LLaVA via Ollama (free)

# Transcription (choose one)
OPENAI_API_KEY=sk-...           # For Whisper API
ASSEMBLYAI_API_KEY=...
# or use whisper.cpp (free)

# Data Sources
INSTAGRAM_API_KEY=...
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
PINTEREST_API_KEY=...
```

---

## Testing Multi-Modal Collectors

```typescript
// lib/collectors/__tests__/instagram.test.ts

import { describe, it, expect, vi } from 'vitest';
import { InstagramCollector } from '../instagram';
import * as vision from '@/lib/utils/vision';

describe('InstagramCollector', () => {
  it('should convert images to text descriptions', async () => {
    // Mock vision analysis
    vi.spyOn(vision, 'analyzeImage').mockResolvedValue(
      'A minimalist interior with plants and natural light'
    );

    const collector = new InstagramCollector();
    const result = await collector.collect({ limit: 1 });

    expect(result[0].body).toContain('minimalist');
    expect(result[0].imageUrls).toBeDefined();
  });
});
```

---

## Performance Considerations

### Image Processing
- **Batch processing**: Analyze 5-10 images in parallel
- **Caching**: Store analysis results (don't re-analyze same image)
- **Sampling**: Don't analyze every image (1 per post is enough)

### Video Processing
- **Frame sampling**: Analyze 3-5 key frames instead of entire video
- **Transcription caching**: Store transcripts in `raw.transcription`
- **Lazy processing**: Only process when needed

### Cost Optimization
- **Use local models** (LLaVA, Whisper.cpp) for free processing
- **Fallback to cloud** only for high-priority content
- **Rate limiting**: Don't process 1000s of images per hour

---

## Architecture Validation: ✅ EXCELLENT

**Is the system extensible for multi-modal data?**

✅ **YES - Architecture is perfectly designed for this:**

1. **RawContent interface** already has `imageUrls`, `audioUrl`, `videoUrl` (just add)
2. **Collector pattern** is media-agnostic (fetch anything → return RawContent)
3. **Preprocessing strategy** (media → text) works with existing pipeline
4. **No changes needed** to analyzers, matchers, temporal decay, etc.
5. **Extensible via `raw` field** for custom metadata

**Time to add a new multi-modal collector:** 2-4 hours (mostly API integration)

---

## Summary

The Zeitgeist architecture is **excellently positioned** for multi-modal data:

- ✅ **Text collectors** - Already working (News, Reddit)
- ✅ **Image collectors** - Easy to add (Instagram, Pinterest)
- ✅ **Video collectors** - Easy to add (TikTok, YouTube)
- ✅ **Audio collectors** - Easy to add (Spotify, podcasts)
- ✅ **Hybrid collectors** - Combine multiple modalities

**Key insight:** Convert everything to text (via vision models, transcription) and the rest of the pipeline "just works."

No architectural changes needed - the modular design already supports this!

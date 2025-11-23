/**
 * Spotify Collector
 * Collects trending music and audio trends from Spotify
 * Uses official Spotify Web API with Client Credentials flow
 *
 * Setup:
 * 1. Create app at: https://developer.spotify.com/dashboard
 * 2. Get Client ID and Client Secret
 * 3. Add to .env.local:
 *    SPOTIFY_CLIENT_ID=your_client_id
 *    SPOTIFY_CLIENT_SECRET=your_client_secret
 */

import { BaseCollector } from './base';
import { CollectorOptions, RawContent } from '@/lib/types';

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
    release_date: string;
  };
  external_urls: { spotify: string };
  preview_url: string | null;
  popularity: number;
}

interface SpotifyAudioFeatures {
  valence: number;       // 0-1: musical positiveness
  energy: number;        // 0-1: intensity
  danceability: number;  // 0-1: how suitable for dancing
  tempo: number;         // BPM
  acousticness: number;  // 0-1: acoustic vs electronic
  instrumentalness: number; // 0-1: likelihood of no vocals
}

export class SpotifyCollector extends BaseCollector {
  readonly name = 'spotify';
  readonly description = 'Collects trending music and audio trends from Spotify';

  private clientId = process.env.SPOTIFY_CLIENT_ID;
  private clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  private baseUrl = 'https://api.spotify.com/v1';
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  async isAvailable(): Promise<boolean> {
    return !!(this.clientId && this.clientSecret);
  }

  async collect(options?: CollectorOptions): Promise<RawContent[]> {
    if (!await this.isAvailable()) {
      console.warn('Spotify API credentials not configured');
      return [];
    }

    try {
      await this.ensureAccessToken();

      const limit = options?.limit || 30;

      // Collect from multiple trending playlists for diverse music trends
      const playlists = [
        '37i9dQZEVXbMDoHDwVN2tF', // Global Top 50
        '37i9dQZEVXbLRQDuF5jeBp', // US Top 50
        '37i9dQZEVXbNG2KDcFcKOF', // Top Songs - Global (by streams)
      ];

      const allTracks: RawContent[] = [];
      const tracksPerPlaylist = Math.ceil(limit / playlists.length);

      for (const playlistId of playlists) {
        const tracks = await this.fetchPlaylistTracks(playlistId, tracksPerPlaylist);
        allTracks.push(...tracks);
      }

      // Deduplicate by track ID
      const uniqueTracks = this.deduplicateTracks(allTracks);

      return uniqueTracks.slice(0, limit);
    } catch (error) {
      console.error('Spotify collection failed:', error);
      return [];
    }
  }

  private async ensureAccessToken(): Promise<void> {
    // Check if token is still valid (with 5 min buffer)
    if (this.accessToken && Date.now() < this.tokenExpiry - 300000) {
      return;
    }

    // Get new access token using Client Credentials flow
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error(`Spotify auth failed: ${response.statusText}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000);
  }

  private async fetchPlaylistTracks(playlistId: string, limit: number): Promise<RawContent[]> {
    const url = `${this.baseUrl}/playlists/${playlistId}/tracks?limit=${limit}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.statusText}`);
    }

    const data = await response.json();
    const tracks: SpotifyTrack[] = data.items.map((item: any) => item.track).filter(Boolean);

    // Get audio features for all tracks (for mood/vibe analysis)
    const trackIds = tracks.map(t => t.id).join(',');
    const audioFeatures = await this.fetchAudioFeatures(trackIds);

    return tracks.map((track, index) => this.transformTrack(track, audioFeatures[index]));
  }

  private async fetchAudioFeatures(trackIds: string): Promise<SpotifyAudioFeatures[]> {
    const url = `${this.baseUrl}/audio-features?ids=${trackIds}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      console.warn('Failed to fetch audio features, using defaults');
      return [];
    }

    const data = await response.json();
    return data.audio_features || [];
  }

  private transformTrack(track: SpotifyTrack, audioFeatures?: SpotifyAudioFeatures): RawContent {
    const artistNames = track.artists.map(a => a.name).join(', ');

    // Convert audio metadata to text representation for LLM analysis
    const textRepresentation = this.createTextRepresentation(track, audioFeatures);

    return this.createRawContent({
      source: this.name,
      url: track.external_urls.spotify,
      title: `${track.name} - ${artistNames}`,
      body: textRepresentation,
      audioUrl: track.preview_url || undefined,
      imageUrls: track.album.images.length > 0 ? [track.album.images[0].url] : [],
      engagement: {
        views: track.popularity, // Spotify popularity score (0-100)
      },
      raw: {
        trackId: track.id,
        album: track.album.name,
        releaseDate: track.album.release_date,
        audioFeatures,
        artists: track.artists.map(a => a.name),
      },
    });
  }

  private createTextRepresentation(track: SpotifyTrack, audioFeatures?: SpotifyAudioFeatures): string {
    const artistNames = track.artists.map(a => a.name).join(', ');
    const parts: string[] = [
      `Track: ${track.name}`,
      `Artist(s): ${artistNames}`,
      `Album: ${track.album.name}`,
      `Popularity: ${track.popularity}/100`,
      `Release: ${track.album.release_date}`,
    ];

    if (audioFeatures) {
      // Interpret audio features as cultural vibes
      const mood = audioFeatures.valence > 0.6 ? 'upbeat and positive' :
                   audioFeatures.valence < 0.4 ? 'melancholic or serious' :
                   'neutral or balanced';

      const energy = audioFeatures.energy > 0.7 ? 'high-energy and intense' :
                     audioFeatures.energy < 0.4 ? 'calm and relaxed' :
                     'moderate energy';

      const style = audioFeatures.acousticness > 0.6 ? 'acoustic and organic' :
                    audioFeatures.acousticness < 0.3 ? 'electronic and produced' :
                    'mixed acoustic/electronic';

      const danceability = audioFeatures.danceability > 0.7 ? 'very danceable' :
                          audioFeatures.danceability < 0.4 ? 'not meant for dancing' :
                          'moderately danceable';

      parts.push('');
      parts.push('Audio Characteristics:');
      parts.push(`Mood: ${mood} (valence: ${(audioFeatures.valence * 100).toFixed(0)}%)`);
      parts.push(`Energy: ${energy} (${(audioFeatures.energy * 100).toFixed(0)}%)`);
      parts.push(`Style: ${style}`);
      parts.push(`Danceability: ${danceability}`);
      parts.push(`Tempo: ${Math.round(audioFeatures.tempo)} BPM`);

      if (audioFeatures.instrumentalness > 0.5) {
        parts.push('Likely instrumental (no vocals)');
      }
    }

    return parts.join('\n');
  }

  private deduplicateTracks(tracks: RawContent[]): RawContent[] {
    const seen = new Set<string>();
    return tracks.filter(track => {
      const trackId = track.raw?.trackId;
      if (!trackId || seen.has(trackId)) {
        return false;
      }
      seen.add(trackId);
      return true;
    });
  }
}

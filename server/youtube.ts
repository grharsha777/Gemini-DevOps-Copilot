import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

interface YouTubeVideoInfo {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  duration?: string;
  thumbnailUrl?: string;
  channelTitle?: string;
}

interface YouTubeTranscript {
  text: string;
  language?: string;
}

export class YouTubeService {
  private youtube;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.youtube = google.youtube({
      version: 'v3',
      auth: apiKey,
    });
  }

  /**
   * Extract video ID from YouTube URL
   */
  static extractVideoId(url: string): string | null {
    // Handle various YouTube URL formats
    const patterns = [
      /youtube\.com\/watch\?v=([^&]+)/,
      /youtube\.com\/shorts\/([^&]+)/,
      /youtu\.be\/([^&]+)/,
      /youtube\.com\/embed\/([^&]+)/,
      /youtube\.com\/v\/([^&]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    // If it looks like just an ID
    if (url.length === 11 && !url.includes(' ')) {
      return url;
    }

    return null;
  }

  /**
   * Get video information
   */
  async getVideoInfo(videoId: string): Promise<YouTubeVideoInfo> {
    try {
      const response = await this.youtube.videos.list({
        part: ['snippet', 'contentDetails'],
        id: [videoId],
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error('Video not found');
      }

      const video = response.data.items[0];
      const duration = video.contentDetails?.duration;

      // Convert ISO 8601 duration to readable format
      let readableDuration = '';
      if (duration) {
        readableDuration = this.parseDuration(duration);
      }

      return {
        id: video.id || '',
        title: video.snippet?.title || 'Untitled Video',
        description: video.snippet?.description || '',
        publishedAt: video.snippet?.publishedAt || '',
        duration: readableDuration,
        thumbnailUrl: video.snippet?.thumbnails?.high?.url || undefined,
        channelTitle: video.snippet?.channelTitle || undefined,
      };
    } catch (error) {
      console.error('Error fetching YouTube video info:', error);
      throw new Error('Failed to fetch YouTube video information');
    }
  }

  /**
   * Parse ISO 8601 duration to readable format
   */
  private parseDuration(duration: string): string {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return duration;

    const hours = match[1] ? parseInt(match[1].replace('H', '')) : 0;
    const minutes = match[2] ? parseInt(match[2].replace('M', '')) : 0;
    const seconds = match[3] ? parseInt(match[3].replace('S', '')) : 0;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Get video transcript (caption track)
   */
  async getVideoTranscript(videoId: string, language: string = 'en'): Promise<YouTubeTranscript> {
    try {
      // Note: YouTube captions API requires additional setup
      // This is a simplified approach - in production you might need to use
      // the YouTube Data API v3 captions endpoint or a third-party service

      // For now, we'll return a basic transcript structure
      // In a real implementation, you would fetch from:
      // https://www.googleapis.com/youtube/v3/captions

      return {
        text: `Transcript for video ${videoId} (this would be fetched from YouTube API in a full implementation)`,
        language: language,
      };
    } catch (error) {
      console.error('Error fetching YouTube transcript:', error);
      throw new Error('Failed to fetch YouTube video transcript');
    }
  }

  /**
   * Search for videos by topic
   */
  async searchVideos(query: string, maxResults: number = 5): Promise<YouTubeVideoInfo[]> {
    try {
      const response = await this.youtube.search.list({
        part: ['snippet'],
        q: query,
        maxResults,
        type: ['video'],
        videoEmbeddable: 'true',
      });

      return (response.data.items || []).map((item) => ({
        id: item.id?.videoId || '',
        title: item.snippet?.title || 'Untitled Video',
        description: item.snippet?.description || '',
        publishedAt: item.snippet?.publishedAt || '',
        thumbnailUrl: item.snippet?.thumbnails?.high?.url || undefined,
        channelTitle: item.snippet?.channelTitle || undefined,
      }));
    } catch (error) {
      console.error('Error searching YouTube videos:', error);
      throw new Error('Failed to search YouTube videos');
    }
  }

  /**
   * Get video chapters (if available)
   */
}

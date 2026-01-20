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
  static async getVideoInfo(videoUrl: string, apiKey?: string): Promise<YouTubeVideoInfo> {
    try {
      const params = new URLSearchParams({
        url: videoUrl,
        ...(apiKey && { apiKey })
      });

      const response = await fetch(`/api/youtube/video-info?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch YouTube video information');
      }

      const data = await response.json();
      return data.videoInfo;
    } catch (error) {
      console.error('YouTube video info error:', error);
      throw new Error('Failed to fetch YouTube video information');
    }
  }

  static async searchVideos(query: string): Promise<YouTubeVideoInfo[]> {
    try {
      const params = new URLSearchParams({ q: query });
      const response = await fetch(`/api/learning/videos/search?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to search YouTube videos');
      }

      const data = await response.json();
      return data.videos;
    } catch (error) {
      console.error('YouTube search error:', error);
      throw new Error('Failed to search YouTube videos');
    }
  }

  static async getVideoTranscript(videoUrl: string, apiKey?: string, language: string = 'en'): Promise<YouTubeTranscript> {
    try {
      const params = new URLSearchParams({
        url: videoUrl,
        language,
        ...(apiKey && { apiKey })
      });

      const response = await fetch(`/api/youtube/transcript?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch YouTube video transcript');
      }

      const data = await response.json();
      return data.transcript;
    } catch (error) {
      console.error('YouTube transcript error:', error);
      throw new Error('Failed to fetch YouTube video transcript');
    }
  }

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
}

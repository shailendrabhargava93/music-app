// Saavn API Types

export type AnyRecord = Record<string, unknown>;

export interface Song {
  id: string;
  name: string;
  album?: {
    id: string;
    name: string;
    url: string;
  };
  year: string;
  releaseDate: string;
  duration: number;
  label: string;
  primaryArtists: string;
  primaryArtistsId: string;
  featuredArtists: string;
  featuredArtistsId: string;
  explicitContent: number;
  playCount: number;
  language: string;
  hasLyrics: boolean;
  url: string;
  copyright: string;
  image: Array<{
    quality: string;
    link: string;
  }>;
  downloadUrl: Array<{
    quality: string;
    link: string;
  }>;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  year: number;
  playCount: number;
  language: string;
  explicitContent: boolean;
  songCount: number;
  url: string;
  image: Array<{
    quality: string;
    link: string;
  }>;
}

export interface SearchResponse {
  success: boolean;
  data: {
    topQuery: {
      results: Array<{
        id: string;
        title: string;
        image: Array<{
          quality: string;
          link: string;
        }>;
        url: string;
        type: string;
        description: string;
      }>;
      position: number;
    };
    songs: {
      results: Song[];
      position: number;
    };
    albums: {
      results: AnyRecord[];
      position: number;
    };
    playlists: {
      results: Playlist[];
      position: number;
    };
    artists: {
      results: AnyRecord[];
      position: number;
    };
  };
}

export interface CurrentSong {
  id: string;
  title: string;
  artist: string;
  albumArt: string;
  duration: number;
  downloadUrl?: string;
  remoteDownloadUrl?: string;
  // Additional details for info popup
  albumId?: string;
  albumName?: string;
  label?: string;
  copyright?: string;
  year?: string;
  language?: string;
  explicitContent?: boolean;
  source?: string; // Album or playlist name where song is being played from
}

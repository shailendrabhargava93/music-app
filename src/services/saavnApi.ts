import { SearchResponse } from '../types/api';

const BASE_URL = 'https://saavn.sumit.co/api';

export const saavnApi = {
  searchSongs: async (query: string, limit: number = 10): Promise<any> => {
    try {
      const response = await fetch(`${BASE_URL}/search/songs?query=${encodeURIComponent(query)}&page=0&limit=${limit}`);
      if (!response.ok) {
        throw new Error('Songs search failed');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error searching songs:', error);
      throw error;
    }
  },

  searchPlaylists: async (query: string, limit: number = 10): Promise<any> => {
    try {
      const response = await fetch(`${BASE_URL}/search/playlists?query=${encodeURIComponent(query)}&page=0&limit=${limit}`);
      if (!response.ok) {
        throw new Error('Playlists search failed');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error searching playlists:', error);
      throw error;
    }
  },

  search: async (query: string, limit: number = 5): Promise<SearchResponse> => {
    try {
      const response = await fetch(`${BASE_URL}/search?query=${encodeURIComponent(query)}&limit=${limit}`);
      if (!response.ok) {
        throw new Error('Search failed');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error searching:', error);
      throw error;
    }
  },

  getSongById: async (songId: string) => {
    try {
      const response = await fetch(`${BASE_URL}/songs/${songId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch song');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching song:', error);
      throw error;
    }
  },

  getSongsByIds: async (ids: string[]) => {
    try {
      const idsParam = ids.join('%2C');
      const response = await fetch(`${BASE_URL}/songs?ids=${idsParam}`);
      if (!response.ok) {
        throw new Error('Failed to fetch songs');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching songs by IDs:', error);
      throw error;
    }
  },

  searchArtists: async (query: string, limit: number = 10): Promise<any> => {
    try {
      const response = await fetch(`${BASE_URL}/search/artists?query=${encodeURIComponent(query)}&page=0&limit=${limit}`);
      if (!response.ok) {
        throw new Error('Artists search failed');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error searching artists:', error);
      throw error;
    }
  },

  getArtistSongs: async (artistId: string, page: number = 0, sortBy: string = 'popularity', sortOrder: string = 'desc'): Promise<any> => {
    try {
      const response = await fetch(`${BASE_URL}/artists/${artistId}/songs?page=${page}&sortBy=${sortBy}&sortOrder=${sortOrder}`);
      if (!response.ok) {
        throw new Error('Failed to fetch artist songs');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching artist songs:', error);
      throw error;
    }
  },

  getPlaylistById: async (playlistId: string): Promise<any> => {
    try {
      const response = await fetch(`${BASE_URL}/playlists?id=${playlistId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch playlist');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching playlist:', error);
      throw error;
    }
  },

  getAlbumById: async (albumId: string): Promise<any> => {
    try {
      const response = await fetch(`${BASE_URL}/albums?id=${albumId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch album');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching album:', error);
      throw error;
    }
  },

  searchAlbums: async (query: string, limit: number = 10): Promise<any> => {
    try {
      const response = await fetch(`${BASE_URL}/search/albums?query=${encodeURIComponent(query)}&page=0&limit=${limit}`);
      if (!response.ok) {
        throw new Error('Albums search failed');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error searching albums:', error);
      throw error;
    }
  },

  getSongSuggestions: async (songId: string, limit: number = 5): Promise<any> => {
    try {
      // Make sure songId doesn't have any encoding issues
      const cleanSongId = encodeURIComponent(songId.trim());
      const url = `${BASE_URL}/songs/${cleanSongId}/suggestions?limit=${limit}`;
      console.log('Fetching suggestions from:', url);
      console.log('Song ID:', songId);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`Failed to fetch song suggestions: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Suggestions response:', data);
      return data;
    } catch (error) {
      console.error('Error fetching song suggestions:', error);
      throw error;
    }
  },
};

import { SearchResponse } from '../types/api';
import { setLastFetchFailed } from './networkStatus';
import { getBestImage } from '../utils/normalize';
import { fetchJson as _fetchJson, withInflight as _withInflight } from '../utils/fetch';

type AnyRecord = Record<string, unknown>;

const getInflight = () => {
  if (!(saavnApi as unknown as AnyRecord)._inflight) (saavnApi as unknown as AnyRecord)._inflight = {} as unknown as AnyRecord;
  const root = (saavnApi as unknown as AnyRecord)._inflight as Record<string, Map<string, Promise<unknown>>>;
  root.playlists = root.playlists ?? new Map<string, Promise<unknown>>();
  root.albums = root.albums ?? new Map<string, Promise<unknown>>();
  root.artists = root.artists ?? new Map<string, Promise<unknown>>();
  root.searches = root.searches ?? new Map<string, Promise<unknown>>();
  root.songsByIds = root.songsByIds ?? new Map<string, Promise<unknown>>();
  root.launches = root.launches ?? new Map<string, Promise<unknown>>();
  return root as {
    playlists: Map<string, Promise<unknown>>;
    albums: Map<string, Promise<unknown>>;
    artists: Map<string, Promise<unknown>>;
    searches: Map<string, Promise<unknown>>;
    songsByIds: Map<string, Promise<unknown>>;
    launches: Map<string, Promise<unknown>>;
  };
};

const markFetchFailed = (message?: string) => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    setLastFetchFailed(true, message ?? 'Network offline');
  } else {
    // Don't mark fetch failure when online; banner reserved for offline state
    setLastFetchFailed(false);
  }
};

// Wrap shared helpers to ensure we keep setting fetch failure state here
async function fetchJson(url: string, errorMessage?: string) {
  const data = await _fetchJson(url, errorMessage);
  setLastFetchFailed(false);
  return data;
}

async function withInflight<T>(map: Map<string, Promise<T>>, key: string, fn: () => Promise<T>) {
  return await _withInflight(map, key, fn);
}

const BASE_URL = 'https://saavn-api-client.vercel.app/api';

export const saavnApi = {
  searchSongs: async (query: string, limit: number = 20): Promise<unknown> => {
    try {
      const inflight = getInflight().searches;
      const key = `${query}::${limit}`;
      return await withInflight(inflight, key, () => fetchJson(`${BASE_URL}/search/songs?query=${encodeURIComponent(query)}&page=0&limit=${limit}`, 'Songs search failed'));
    } catch (error) {
      console.error('Error searching songs:', error);
      markFetchFailed();
      throw error;
    }
  },

  searchPlaylists: async (query: string, limit: number = 20): Promise<unknown> => {
    try {
      return await fetchJson(`${BASE_URL}/search/playlists?query=${encodeURIComponent(query)}&page=0&limit=${limit}`, 'Playlists search failed');
    } catch (error) {
      console.error('Error searching playlists:', error);
      markFetchFailed();
      throw error;
    }
  },

  search: async (query: string, limit: number = 5): Promise<SearchResponse> => {
    try {
      return await fetchJson(`${BASE_URL}/search?query=${encodeURIComponent(query)}&limit=${limit}`, 'Search failed');
    } catch (error) {
      console.error('Error searching:', error);
      markFetchFailed();
      throw error;
    }
  },

  getSongById: async (songId: string): Promise<unknown> => {
    try {
      return await fetchJson(`${BASE_URL}/songs/${songId}`, `Failed to fetch song: ${songId}`);
    } catch (error) {
      console.error('Error fetching song:', error);
      markFetchFailed(`Failed to fetch song: ${songId}`);
      throw error;
    }
  },

  getSongsByIds: async (ids: string[]): Promise<unknown> => {
    try {
      const inflight = getInflight().songsByIds;
      const key = ids.join(',');
      return await withInflight(inflight, key, () => {
        const idsParam = ids.join('%2C');
        return fetchJson(`${BASE_URL}/songs?ids=${idsParam}`, 'Failed to fetch songs');
      });
    } catch (error) {
      console.error('Error fetching songs by IDs:', error);
      markFetchFailed();
      throw error;
    }
  },

  searchArtists: async (query: string, limit: number = 10): Promise<unknown> => {
    try {
      return await fetchJson(`${BASE_URL}/search/artists?query=${encodeURIComponent(query)}&page=0&limit=${limit}`, 'Artists search failed');
    } catch (error) {
      console.error('Error searching artists:', error);
      markFetchFailed();
      throw error;
    }
  },
  // List popular/recommended artists with pagination. `excludeIds` can be provided
  // to skip artists already displayed on the client.
  listArtists: async (page: number = 0, limit: number = 24, excludeIds: string[] = []): Promise<unknown> => {
    try {
      // The upstream API doesn't directly support exclude; we request a page and filter client-side.
      const data = await fetchJson(`${BASE_URL}/artists?page=${page}&limit=${limit}`, 'Failed to fetch artists');
      // Filter out excluded ids if provided
      if (Array.isArray(data?.data)) {
        data.data = (data.data as AnyRecord[]).filter(a => !excludeIds.includes(String(a.id)));
      }
      return data;
    } catch (error) {
      console.error('Error listing artists:', error);
      markFetchFailed();
      throw error;
    }
  },
  // Fetch 'new' artists via the search endpoint (query=new) with given page/limit.
  // Filters out any excludeIds client-side.
  fetchNewArtists: async (page: number = 0, limit: number = 10, excludeIds: string[] = []): Promise<unknown> => {
    try {
      const data = await fetchJson(`${BASE_URL}/search/artists?query=new&page=${page}&limit=${limit}`, 'Failed to fetch new artists');

      // Possible shapes: { data: [...] } or { data: { artists: [...] } } or { data: { results: [...] } }
      const rawItems = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.data?.artists)
        ? data.data.artists
        : Array.isArray(data?.data?.results)
        ? data.data.results
        : Array.isArray(data?.results)
        ? data.results
        : [];

      // Use shared getBestImage helper for image selection

      // Normalize each artist object to { id, name, image }
      const normalized = rawItems.map((a: AnyRecord) => {
        const id = (a['id'] as string) || (a['artist_id'] as string) || (a['artistId'] as string) || (a['sid'] as string) || (a['id_str'] as string) || 'unknown-' + Math.random().toString(36).slice(2, 9);
        const name = (a['name'] as string) || (a['artistName'] as string) || (a['title'] as string) || (a['displayName'] as string) || '';
        const image = getBestImage(a['image'] ?? a['images'] ?? a['thumbnail'] ?? a['img'] ?? a['image_url'] ?? a['cover']);
        return { id, name, image };
      }).filter((it) => it && it.id && it.name);

      const filtered = normalized.filter((a) => !excludeIds.includes(String(a.id)));
      if (import.meta.env.MODE !== 'production') {
         
        console.debug('fetchNewArtists:', { page, limit, requested: rawItems.length, normalized: normalized.length, returned: filtered.length, sample: filtered[0] });
      }
      return { items: filtered, raw: data, rawItems: rawItems };
    } catch (err) {
      markFetchFailed();
      throw err;
    }
  },

  getArtistSongs: async (artistId: string, page: number = 0, sortBy: string = 'popularity', sortOrder: string = 'desc'): Promise<unknown> => {
    try {
      const inflight = getInflight().artists;
      const key = `${artistId}::${page}::${sortBy}::${sortOrder}`;
      return await withInflight(inflight, key, () => fetchJson(`${BASE_URL}/artists/${artistId}/songs?page=${page}&sortBy=${sortBy}&sortOrder=${sortOrder}`, 'Failed to fetch artist songs'));
    } catch (error) {
      console.error('Error fetching artist songs:', error);
      markFetchFailed();
      throw error;
    }
  },

  getPlaylistById: async (playlistId: string, limit: number = 100): Promise<unknown> => {
    // Dedupe in-flight playlist requests so multiple callers share the same Promise
    try {
      const inflight = getInflight().playlists;
      return await withInflight(inflight, playlistId, () => fetchJson(`${BASE_URL}/playlists?id=${playlistId}&limit=${limit}&page=0`, 'Failed to fetch playlist'));
    } catch (error) {
      console.error('Error fetching playlist:', error);
      markFetchFailed();
      throw error;
    }
  },

  getAlbumById: async (albumId: string, limit: number = 100): Promise<unknown> => {
    // Dedupe in-flight album requests so multiple callers share the same Promise
    try {
      const inflight = getInflight().albums;
      if (inflight.has(albumId)) return inflight.get(albumId)!;

      return await withInflight(inflight, albumId, async () => {
        const data = await fetchJson(`${BASE_URL}/albums?id=${albumId}&limit=${limit}&page=0`, 'Failed to fetch album');

        try {
          const songsFromData = Array.isArray(data?.data?.songs) ? data.data.songs :
            Array.isArray(data?.songs) ? data.songs :
            Array.isArray(data?.data) ? data.data : [];

          if (!Array.isArray(data?.data?.songs) && songsFromData.length > 0) {
            data.data = data.data || {};
            data.data.songs = songsFromData;
          }
        } catch {
          // ignore normalization errors and return raw data
        }

        return data;
      });
    } catch (error) {
      console.error('Error fetching album:', error);
      markFetchFailed();
      throw error;
    }
  },

  getArtistById: async (artistId: string): Promise<unknown> => {
    try {
      const inflight = getInflight().artists;
      const key = `artist_meta::${artistId}`;
      return await withInflight(inflight, key, () => fetchJson(`${BASE_URL}/artists/${artistId}`, 'Failed to fetch artist'));
    } catch (error) {
      console.error('Error fetching artist:', error);
      markFetchFailed();
      throw error;
    }
  },

  searchAlbums: async (query: string, limit: number = 20): Promise<unknown> => {
    try {
      return await fetchJson(`${BASE_URL}/search/albums?query=${encodeURIComponent(query)}&page=0&limit=${limit}`, 'Albums search failed');
    } catch (error) {
      console.error('Error searching albums:', error);
      markFetchFailed();
      throw error;
    }
  },

  // Fetch top/trending searches
  fetchTopSearches: async (limit: number = 12): Promise<{ items: AnyRecord[] }> => {
    try {
      // Simple in-memory inflight / memo to avoid duplicate calls (React StrictMode double-invoke)
      const key = `top::${limit}`;
      if (!(saavnApi as unknown as AnyRecord)._cache) (saavnApi as unknown as AnyRecord)._cache = {} as unknown as AnyRecord;
      const cache = (saavnApi as unknown as AnyRecord)._cache as Record<string, Promise<{ items: AnyRecord[] }> | undefined>;
      if (cache[key]) return cache[key]!;

      const promise = (async () => {
        const data = await fetchJson(`${BASE_URL}/search/top?limit=${limit}`, 'Failed to fetch top searches');

        // Normalize response. Upstream returns { data: { results: [...] } }
        const raw = Array.isArray(data?.data?.results) ? data.data.results : Array.isArray(data?.results) ? data.results : Array.isArray(data?.data) ? data.data : [];

        const items = (raw as AnyRecord[]).map((it: AnyRecord) => {
          if (!it) return null;
          if (typeof it === 'string') return { type: 'query', name: it, payload: it };

          const payload = it;
          const type = (it.type || '').toLowerCase();
          const title = it.title || it.name || '';
          // image may be an array of {quality,url}
          const image = getBestImage(it.image || it.images || it.cover || it.thumbnail);

          // id fallbacks
          const id = it.id || it.albumId || it.album_id || it.artistId || it.artist_id || it.sid || it.songId;

          if (type === 'song') return { type: 'song', id: id ? id.toString() : undefined, name: title, image, payload };
          if (type === 'album') return { type: 'album', id: id ? id.toString() : undefined, name: title, image, payload };
          if (type === 'artist') return { type: 'artist', id: id ? id.toString() : undefined, name: title, image, payload };

          // fallback: if the item has a url pointing to album/song/artist, infer type from URL path
          if (it.url && typeof it.url === 'string') {
            if (it.url.includes('/album/')) return { type: 'album', id: id ? id.toString() : undefined, name: title, image, payload };
            if (it.url.includes('/song/')) return { type: 'song', id: id ? id.toString() : undefined, name: title, image, payload };
            if (it.url.includes('/artist/')) return { type: 'artist', id: id ? id.toString() : undefined, name: title, image, payload };
          }

          return { type: 'query', name: title, payload };
        }).filter(Boolean);

        return { items };
      })();

      cache[key] = promise;
      try {
        const res = await promise;
        return res;
      } finally {
        // keep the cache to prevent refetch; if you'd prefer to expire, implement TTL
      }
    } catch (err) {
      markFetchFailed();
      throw err;
    }
  },

  getSongSuggestions: async (songId: string, limit: number = 5): Promise<unknown> => {
    try {
      // Make sure songId doesn't have any encoding issues
      const cleanSongId = encodeURIComponent(songId.trim());
      const url = `${BASE_URL}/songs/${cleanSongId}/suggestions?limit=${limit}`;
      
      return await fetchJson(url, `Failed to fetch song suggestions for ${songId}`);
    } catch (error) {
      console.error('Error fetching song suggestions:', error);
      markFetchFailed();
      throw error;
    }
  },
  // Calls the client-provided /launch endpoint which returns a rich
  // payload containing multiple modules (new_albums, new_trending,
  // top_playlists, etc.). Home page consumes `new_albums` and
  // `top_playlists` / `new_trending` for latest albums and trending
  // playlists. The response shape can vary, so callers should access
  // nested properties defensively.
  launch: async (): Promise<unknown> => {
    try {
      const inflight = getInflight().launches;
      const key = 'launch';
      if (inflight.has(key)) return inflight.get(key)!;

      const promise = (async () => {
        const response = await fetch(`${BASE_URL}/launch`);
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Launch API Error:', response.status, errorText);
          throw new Error('Launch API failed');
        }
        const data = await response.json();
        setLastFetchFailed(false);
        return data;
      })();

      inflight.set(key, promise);
      try {
        const res = await promise;
        return res;
      } finally {
        inflight.delete(key);
      }
    } catch (error) {
      console.error('Error calling launch API:', error);
      markFetchFailed('Failed to call launch API');
      throw error;
    }
  },
};

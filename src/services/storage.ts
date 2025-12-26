import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Song } from '../types/api';

const DB_NAME = 'wave-music-db';
const DB_VERSION = 1;

export type FavouriteKey = 'favouriteSongs' | 'favouriteAlbums' | 'favouritePlaylists' | 'favouriteArtists';

export const FAVOURITE_SONGS_KEY: FavouriteKey = 'favouriteSongs';
export const FAVOURITE_ALBUMS_KEY: FavouriteKey = 'favouriteAlbums';
export const FAVOURITE_PLAYLISTS_KEY: FavouriteKey = 'favouritePlaylists';
export const FAVOURITE_ARTISTS_KEY: FavouriteKey = 'favouriteArtists';

interface WaveDbSchema extends DBSchema {
  songs: {
    key: string;
    value: Song;
  };
  playlists: {
    key: string;
    value: { id: string; name: string; image?: string; type?: 'playlist' | 'album'; createdAt: number };
  };
  downloads: {
    key: string;
    value: {
      id: string;
      blob?: Blob;
      url?: string;
      savedAt: number;
    };
  };
  meta: {
    key: string;
    value: Record<string, any>;
  };
}

let dbPromise: Promise<IDBPDatabase<WaveDbSchema>> | null = null;

function initDb() {
  if (!dbPromise) {
    dbPromise = openDB<WaveDbSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('songs', { keyPath: 'id' });
        db.createObjectStore('playlists', { keyPath: 'id' });
        db.createObjectStore('downloads', { keyPath: 'id' });
        db.createObjectStore('meta');
      },
    });
  }
  return dbPromise;
}

export async function getDb() {
  return initDb();
}

export async function saveSongMetadata(song: Song) {
  const db = await getDb();
  await db.put('songs', song);
}

export async function getSongMetadata(id: string) {
  const db = await getDb();
  return db.get('songs', id);
}

export async function saveDownloadRecord(id: string, payload: { blob?: Blob; url?: string }) {
  const db = await getDb();
  const existing = await db.get('downloads', id);
  await db.put('downloads', {
    id,
    savedAt: Date.now(),
    ...(existing ?? {}),
    ...payload,
  });
}

export async function getDownloadRecord(id: string) {
  const db = await getDb();
  return db.get('downloads', id);
}

export async function listDownloads() {
  const db = await getDb();
  return db.getAll('downloads');
}

export async function deleteDownload(id: string) {
  const db = await getDb();
  await db.delete('downloads', id);
}

export async function setMeta(key: string, value: any) {
  const db = await getDb();
  const tx = db.transaction('meta', 'readwrite');
  const store = tx.objectStore('meta');
  if (store.keyPath) {
    await store.put({ key, value });
  } else {
    await store.put(value, key);
  }
  await tx.done;
}

export async function getMeta(key: string) {
  const db = await getDb();
  const result = await db.get('meta', key);
  if (
    result &&
    typeof result === 'object' &&
    'key' in result &&
    'value' in result &&
    (result as { key?: string }).key === key
  ) {
    return (result as { value: unknown }).value;
  }
  return result;
}

export async function readFavourites(key: FavouriteKey) {
  const stored = await getMeta(key);
  return Array.isArray(stored) ? stored : [];
}

export async function persistFavourites(key: FavouriteKey, items: any[]) {
  await setMeta(key, items);
}

export async function migrateLocalStorage() {
  const migratedFlag = localStorage.getItem('indexedDbMigrated');
  if (migratedFlag === 'true') return;

  const db = await getDb();
  // migrate favourites
  try {
    const favourites = JSON.parse(localStorage.getItem('favouriteSongs') || '[]');
    if (Array.isArray(favourites)) {
      for (const fav of favourites) {
        if (fav?.id) {
          await db.put('songs', fav);
        }
      }
      await persistFavourites(FAVOURITE_SONGS_KEY, favourites);
    }
  } catch (error) {
    console.warn('Storage migration - favourites failed', error);
  }

  try {
    const recentlyPlayed = JSON.parse(localStorage.getItem('recentlyPlayed') || '[]');
    if (Array.isArray(recentlyPlayed)) {
      await setMeta('recentlyPlayed', recentlyPlayed);
    }
  } catch (error) {}

  try {
    const favouriteAlbums = JSON.parse(localStorage.getItem('favouriteAlbums') || '[]');
    if (Array.isArray(favouriteAlbums)) {
      await persistFavourites(FAVOURITE_ALBUMS_KEY, favouriteAlbums);
    }
  } catch (error) {
    console.warn('Storage migration - favourite albums failed', error);
  }

  try {
    const favouritePlaylists = JSON.parse(localStorage.getItem('favouritePlaylists') || '[]');
    if (Array.isArray(favouritePlaylists)) {
      await persistFavourites(FAVOURITE_PLAYLISTS_KEY, favouritePlaylists);
    }
  } catch (error) {
    console.warn('Storage migration - favourite playlists failed', error);
  }

  const quality = localStorage.getItem('streamQuality');
  if (quality) {
    await setMeta('streamQuality', quality);
  }

  const cacheMigrations: Array<{
    localKey: string;
    metaKey: string;
    parser: (value: string) => unknown | null;
  }> = [
    {
      localKey: 'chartSongs',
      metaKey: 'chartSongs',
      parser: value => {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : null;
        } catch (error) {
          console.warn('Failed to migrate chartSongs cache', error);
          return null;
        }
      },
    },
    {
      localKey: 'chartSongsTimestamp',
      metaKey: 'chartSongsTimestamp',
      parser: value => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
      },
    },
    {
      localKey: 'latestAlbums',
      metaKey: 'latestAlbums',
      parser: value => {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : null;
        } catch (error) {
          console.warn('Failed to migrate latestAlbums cache', error);
          return null;
        }
      },
    },
    {
      localKey: 'latestAlbumsTimestamp',
      metaKey: 'latestAlbumsTimestamp',
      parser: value => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
      },
    },
    {
      localKey: 'trendingPlaylists',
      metaKey: 'trendingPlaylists',
      parser: value => {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : null;
        } catch (error) {
          console.warn('Failed to migrate trendingPlaylists cache', error);
          return null;
        }
      },
    },
    {
      localKey: 'trendingPlaylistsTimestamp',
      metaKey: 'trendingPlaylistsTimestamp',
      parser: value => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
      },
    },
  ];

  for (const { localKey, metaKey, parser } of cacheMigrations) {
    const stored = localStorage.getItem(localKey);
    if (!stored) continue;
    const parsed = parser(stored);
    if (parsed === null || parsed === undefined) continue;
    await setMeta(metaKey, parsed);
    localStorage.removeItem(localKey);
  }

  localStorage.setItem('indexedDbMigrated', 'true');
}

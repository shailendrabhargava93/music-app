import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Typography,
  Avatar,
  IconButton,
  Skeleton,
} from '@mui/material';
import TrackList from '../components/TrackList';
import { MusicNote, PlayArrow, FavoriteBorder, Favorite, Shuffle, MoreVertical } from '../icons';
import PageHeader from '../components/PageHeader';
import SongItem from '../components/SongItem';
import SongContextMenu from '../components/SongContextMenu';
// SongItemSkeleton intentionally unused here
import FavouriteToggle from '../components/FavouriteToggle';
import { saavnApi } from '../services/saavnApi';
  
import {
  FAVOURITE_ALBUMS_KEY,
  FAVOURITE_PLAYLISTS_KEY,
  FAVOURITE_SONGS_KEY,
  FAVOURITE_ARTISTS_KEY,
  persistFavourites,
  readFavourites,
} from '../services/storage';
import { decodeHtmlEntities, getBestImage } from '../utils/normalize';
import type { Theme } from '@mui/material/styles';

type AnyRecord = Record<string, unknown>;

const extractSongsFromArtistResponse = (response: unknown): AnyRecord[] => {
  if (!response) return [];
  const r = response as AnyRecord;
  const candidates = [
    (r.data as AnyRecord)?.results,
    (r as AnyRecord).results,
    (r.data as AnyRecord)?.songs,
    (r as AnyRecord).songs,
    (r.data as AnyRecord)?.tracks,
    (r as AnyRecord).tracks,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) return candidate as AnyRecord[];
  }
  if (Array.isArray((r.data as unknown))) return (r.data as unknown) as AnyRecord[];
  return [];
};

const getArtistNames = (song: AnyRecord | undefined): string => {
  if (!song) return 'Unknown Artist';
  const artists = song.artists;
  if (artists) {
    if (typeof artists === 'string') return artists;
    if (Array.isArray(artists)) return (artists as AnyRecord[]).map(a => (a as AnyRecord).name as string || (a as string) || '').filter(Boolean).join(', ');
    if ((artists as AnyRecord).primary && Array.isArray((artists as AnyRecord).primary)) {
      return ((artists as AnyRecord).primary as AnyRecord[]).map(a => (a as AnyRecord).name as string || (a as string) || '').filter(Boolean).join(', ');
    }
  }
  if (song.artist) return song.artist as string;
  if (song.primaryArtists) return song.primaryArtists as string;
  return 'Unknown Artist';
};

const getHighQualityImage = (imageUrl: unknown): string => getBestImage(imageUrl);

interface PlaylistPageProps {
  playlistId: string;
  playlistName: string;
  playlistImage: string;
  onBack: () => void;
  onSongSelect: (song: AnyRecord, contextSongs?: AnyRecord[]) => void;
  type?: 'playlist' | 'album' | 'artist';
  onAddToQueue?: (song: AnyRecord) => void;
  onPlayNext?: (song: AnyRecord) => void;
  onShowSnackbar?: (message: string) => void;
}

const PlaylistPage: React.FC<PlaylistPageProps> = ({
  playlistId,
  playlistName,
  playlistImage,
  onBack,
  onSongSelect,
  type = 'playlist',
  onAddToQueue,
  onPlayNext,
  onShowSnackbar,
}) => {
  const [songs, setSongs] = useState<AnyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isFavourite, setIsFavourite] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedSong, setSelectedSong] = useState<AnyRecord | null>(null);
  const fetchAbortControllerRef = useRef<AbortController | null>(null);
  const lastFetchKeyRef = useRef<string>('');

  // Check if playlist/album/artist is in favourites
  useEffect(() => {
    const storageKey = type === 'album' ? FAVOURITE_ALBUMS_KEY : type === 'artist' ? FAVOURITE_ARTISTS_KEY : FAVOURITE_PLAYLISTS_KEY;
    const loadFavourites = async () => {
      try {
        const favourites = await readFavourites(storageKey);
        const exists = (favourites as unknown[]).some((item: AnyRecord) => (item['id'] as string) === playlistId);
        setIsFavourite(exists);
      } catch {
        console.warn('Unable to read favourites for playlist/artist');
      }
    };

    loadFavourites();
  }, [playlistId, type]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, song: AnyRecord) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedSong(song);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedSong(null);
  };

  const handleAddToQueue = () => {
    if (selectedSong && onAddToQueue) {
      onAddToQueue(selectedSong);
    }
    handleMenuClose();
  };

  const handlePlayNow = () => {
    if (selectedSong && onSongSelect) {
      onSongSelect(selectedSong, songs);
    }
    handleMenuClose();
  };

  const handlePlayNext = () => {
    if (selectedSong && onPlayNext) {
      onPlayNext(selectedSong);
    }
    handleMenuClose();
  };

  const handleAddToFavourites = async () => {
    if (selectedSong) {
      try {
        const favourites = await readFavourites(FAVOURITE_SONGS_KEY);
          const exists = (favourites as unknown[]).some((song: AnyRecord) => (song['id'] as string) === (selectedSong as AnyRecord)['id'] as string);
        if (!exists) {
          const newFavourite = {
            id: selectedSong.id,
            name: selectedSong.name,
            artist: getArtistNames(selectedSong),
            albumArt: getHighQualityImage(selectedSong.image),
            addedAt: Date.now(),
          };
          const updated = [...favourites, newFavourite];
          await persistFavourites(FAVOURITE_SONGS_KEY, updated);
        }
      } catch {
        console.warn('Unable to update favourite songs');
      }
    }
    handleMenuClose();
  };

  // Favourite toggle handled via `FavouriteToggle` component; local toggle removed.

  const handleShufflePlay = () => {
    if (!songs || songs.length === 0) return;
    // Fisher-Yates shuffle
    const shuffled = [...songs];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    // Start playback with the first song of shuffled list
    if (onSongSelect) {
      onSongSelect(shuffled[0], shuffled);
    }
  };

  // use shared `decodeHtmlEntities` from utils

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);

    // Create a unique key for this fetch request
    const fetchKey = `${playlistId}-${type}`;

    // Skip if we already have an active fetch for this exact data
    if (lastFetchKeyRef.current === fetchKey && fetchAbortControllerRef.current) {
      return;
    }

    // Cancel any previous request
    if (fetchAbortControllerRef.current) {
      fetchAbortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    fetchAbortControllerRef.current = abortController;
    lastFetchKeyRef.current = fetchKey;
    let isMounted = true;

    const fetchPlaylist = async () => {
      try {
        setLoading(true);
        setError(false);

        let response: unknown;
        if (type === 'album') {
          response = await saavnApi.getAlbumById(playlistId);
        } else if (type === 'artist') {
          response = await saavnApi.getArtistSongs(playlistId);
        } else {
          response = await saavnApi.getPlaylistById(playlistId);
        }

        if (!isMounted || abortController.signal.aborted) return;

        if (type === 'artist') {
          const artistSongs = extractSongsFromArtistResponse(response);
          setSongs(artistSongs);
        } else if (response?.success && response.data) {
          const playlistSongs = response.data.songs || [];
          setSongs(playlistSongs);
        } else {
          setError(true);
        }
      } catch {
        if (isMounted && !abortController.signal.aborted) {
          setError(true);
        }
      } finally {
        if (isMounted && !abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchPlaylist();
    return () => {
      isMounted = false;
      abortController.abort();
      fetchAbortControllerRef.current = null;
    };
  }, [playlistId, type]);
  return (
    <Box sx={{ pb: 14, px: 2, pt: 2 }}>
      <PageHeader title={decodeHtmlEntities(playlistName)} onBack={onBack} position="fixed" />

      {/* Playlist Header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          px: 1,
          pb: 0.5,
          mb: 1,
          pt: 1,
          background: 'transparent',
        }}
      >
        {loading ? (
          <Skeleton variant="rounded" width={160} height={160} sx={{ mb: 1.5, borderRadius: 1.5 }} />
        ) : (
          <Avatar
            src={playlistImage}
            variant="rounded"
            sx={{
              width: 160,
              height: 160,
              mb: 1.5,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
              borderRadius: 1.5,
            }}
          >
            <PlayArrow sx={{ fontSize: 80 }} />
          </Avatar>
        )}
        {loading ? (
          <Skeleton width={80} height={20} sx={{ mb: 1.5 }} />
        ) : (
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5, fontSize: '0.85rem' }}>
            {songs.length} songs
          </Typography>
        )}
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 0.5 }}>
          {loading ? (
            <>
              <Skeleton variant="circular" width={36} height={36} />
              <Skeleton variant="rounded" width={48} height={48} />
            </>
          ) : songs.length > 0 && (
            <>
              {/* shared lighter button style for shuffle and favourite */}
              <IconButton
                onClick={handleShufflePlay}
                sx={(theme: Theme) => ({
                  bgcolor: theme.palette.mode === 'dark' ? 'action.selected' : 'action.hover',
                  color: 'text.secondary',
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  '&:hover': {
                    bgcolor: theme.palette.action.selected,
                  },
                })}
                aria-label="shuffle"
                title="Shuffle Play"
              >
                <Shuffle fontSize="small" />
              </IconButton>
              <IconButton
                onClick={() => {
                  if (songs.length > 0) {
                    onSongSelect(songs[0], songs);
                  }
                }}
                sx={{
                  bgcolor: 'primary.main',
                  color: 'white',
                  width: 48,
                  height: 48,
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                }}
              >
                <PlayArrow sx={{ fontSize: 28 }} />
              </IconButton>
            </>
          )}
          <FavouriteToggle
            item={{ id: playlistId, name: playlistName, image: playlistImage }}
            type={type === 'album' ? 'album' : type === 'artist' ? 'artist' : 'playlist'}
            initial={isFavourite}
            onChange={(v: boolean) => setIsFavourite(Boolean(v))}
            onShowSnackbar={onShowSnackbar}
            icon={{
              fav: <Favorite fontSize="small" sx={{ color: 'error.main' }} />,
              notFav: <FavoriteBorder fontSize="small" />,
            }}
            iconButtonSx={(theme: Theme) => ({
              bgcolor: theme.palette.mode === 'dark' ? 'action.selected' : 'action.hover',
              color: 'text.secondary',
              width: 36,
              height: 36,
              borderRadius: '50%',
            })}
            activeIconButtonSx={{
              bgcolor: 'rgba(255, 82, 82, 0.08)',
              '&:hover': { bgcolor: 'rgba(255, 82, 82, 0.16)' },
            }}
          />
        </Box>
      </Box>

      {/* Loading state: header skeleton handled inline below; songs list skeletons rendered further down */}

      {/* Error State */}
      {error && !loading && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '40vh',
            gap: 2,
            px: 1,
          }}
        >
          <Typography variant="h6" sx={{ color: 'text.secondary' }}>
            Failed to load playlist
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.disabled' }}>
            Please try again later
          </Typography>
        </Box>
      )}

      {/* Songs List */}
      <TrackList
        items={songs}
        loading={loading}
        skeletonCount={6}
        keyExtractor={(s: AnyRecord, i: number) => (s.id as string) || i}
        renderItem={(song: AnyRecord) => (
          <SongItem
            key={song.id as string}
            title={decodeHtmlEntities(song.name as string)}
            artist={decodeHtmlEntities(getArtistNames(song))}
            imageSrc={getHighQualityImage(song.image)}
            onClick={() => onSongSelect(song, songs)}
            rightContent={
              <IconButton
                edge="end"
                onClick={(e) => handleMenuOpen(e, song)}
                sx={{ color: 'text.secondary' }}
              >
                <MoreVertical />
              </IconButton>
            }
          />
        )}
      />

      <SongContextMenu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onPlayNow={handlePlayNow}
        onPlayNext={handlePlayNext}
        onAddToQueue={handleAddToQueue}
        onAddToFavourites={handleAddToFavourites}
      />

      {/* Empty State */}
      {!loading && !error && songs.length === 0 && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '40vh',
            gap: 2,
          }}
        >
          <MusicNote sx={{ fontSize: 64, color: 'text.disabled' }} />
          <Typography variant="h6" sx={{ color: 'text.secondary' }}>
            No songs in this playlist
          </Typography>
        </Box>
      )}

    </Box>
  );
};

export default PlaylistPage;

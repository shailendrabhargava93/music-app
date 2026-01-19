import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Typography,
  Avatar,
  IconButton,
  List,
  Menu,
  MenuItem,
  ListItemIcon,
  Container,
  Skeleton,
} from '@mui/material';
import { ArrowBack, MusicNote, PlayArrow, FavoriteBorder, Favorite, QueueMusic, PlaylistAdd, Shuffle, MoreVertical } from '../icons';
import SongItem from '../components/SongItem';
import SongItemSkeleton from '../components/SongItemSkeleton';
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

const extractSongsFromArtistResponse = (response: any): any[] => {
  if (!response) return [];
  const candidates = [
    response.data?.results,
    response.results,
    response.data?.songs,
    response.songs,
    response.data?.tracks,
    response.tracks,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate;
    }
  }
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return [];
};

const getArtistNames = (song: any): string => {
  if (!song) return 'Unknown Artist';
  if (song.artists) {
    if (typeof song.artists === 'string') return song.artists;
    if (Array.isArray(song.artists)) {
      return song.artists.map((a: any) => a.name || a).join(', ');
    }
    if (song.artists.primary && Array.isArray(song.artists.primary)) {
      return song.artists.primary.map((a: any) => a.name || a).join(', ');
    }
  }
  if (song.artist) return song.artist;
  if (song.primaryArtists) return song.primaryArtists;
  return 'Unknown Artist';
};

const getHighQualityImage = (imageUrl: any): string => getBestImage(imageUrl);

interface PlaylistPageProps {
  playlistId: string;
  playlistName: string;
  playlistImage: string;
  onBack: () => void;
  onSongSelect: (song: any, contextSongs?: any[]) => void;
  type?: 'playlist' | 'album' | 'artist';
  onAddToQueue?: (song: any) => void;
  onPlayNext?: (song: any) => void;
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
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isFavourite, setIsFavourite] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedSong, setSelectedSong] = useState<any>(null);
  const fetchAbortControllerRef = useRef<AbortController | null>(null);
  const lastFetchKeyRef = useRef<string>('');

  // Check if playlist/album/artist is in favourites
  useEffect(() => {
    const storageKey = type === 'album' ? FAVOURITE_ALBUMS_KEY : type === 'artist' ? FAVOURITE_ARTISTS_KEY : FAVOURITE_PLAYLISTS_KEY;
    const loadFavourites = async () => {
      try {
        const favourites = await readFavourites(storageKey);
        const exists = favourites.some((item: any) => item.id === playlistId);
        setIsFavourite(exists);
      } catch (error) {
        console.warn('Unable to read favourites for playlist/artist', error);
      }
    };

    loadFavourites();
  }, [playlistId, type]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, song: any) => {
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
        const exists = favourites.some((song: any) => song.id === selectedSong.id);

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
          if (onShowSnackbar) {
            onShowSnackbar('Added to favourites ❤️');
          }
        }
      } catch (error) {
        console.warn('Unable to update favourite songs', error);
      }
    }
    handleMenuClose();
  };

  const toggleFavourite = async () => {
    const storageKey = type === 'album' ? FAVOURITE_ALBUMS_KEY : type === 'artist' ? FAVOURITE_ARTISTS_KEY : FAVOURITE_PLAYLISTS_KEY;
    try {
      const favourites = await readFavourites(storageKey);

      if (isFavourite) {
        const updated = favourites.filter((item: any) => item.id !== playlistId);
        setIsFavourite(false);
        try {
          await persistFavourites(storageKey, updated);
        } catch (error) {
          console.warn('Unable to persist favorite', error);
        }
      } else {
        const newFavourite = {
          id: playlistId,
          name: playlistName,
          image: playlistImage,
          artist: type === 'album' ? 'Various Artists' : type === 'artist' ? 'Artist' : '',
          description: type === 'playlist' ? playlistName : '',
          addedAt: Date.now(),
        };
        const updated = [...favourites, newFavourite];
        setIsFavourite(true);
        try {
          await persistFavourites(storageKey, updated);
        } catch (error) {
          console.warn('Unable to persist favorite', error);
        }
      }
    } catch (error) {
      console.warn('Unable to read favourites for playlist/artist', error);
    }
  };

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

        let response: any;
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
      } catch (err) {
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
      {/* Fixed header with back button and playlist name (aligned to app container) */}
      <Box
        sx={(theme) => ({
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: theme.zIndex.appBar,
          width: '100%',
          backgroundColor: theme.palette.background.default,
          boxShadow: `0 1px 6px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.1)'}`,
          mb: 1,
          py: 0.325,
        })}
      >
        <Container maxWidth="sm" sx={{ display: 'flex', alignItems: 'center', gap: 1, px: { xs: 1, sm: 1.25 } }}>
          <IconButton
            onClick={onBack}
            sx={{
              color: 'text.primary',
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600, flex: 1, pl: 0.5 }} noWrap>
            {decodeHtmlEntities(playlistName)}
          </Typography>
        </Container>
      </Box>

      {/* Spacer to offset fixed header height */}
      <Box sx={{ height: { xs: 56, sm: 64 }, width: '100%' }} />

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
                sx={(theme) => ({
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
          <IconButton
            onClick={toggleFavourite}
            sx={(theme) => ({
              bgcolor: isFavourite ? 'rgba(255, 82, 82, 0.08)' : (theme.palette.mode === 'dark' ? 'action.selected' : 'action.hover'),
              color: isFavourite ? 'error.main' : 'text.secondary',
              width: 36,
              height: 36,
              borderRadius: '50%',
              '&:hover': {
                bgcolor: isFavourite ? 'rgba(255, 82, 82, 0.16)' : theme.palette.action.selected,
              },
            })}
          >
            {isFavourite ? <Favorite fontSize="small" sx={{ color: 'error.main' }} /> : <FavoriteBorder fontSize="small" />}
          </IconButton>
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
      {loading && (
        <Box sx={{ px: 1 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SongItemSkeleton key={i} />
          ))}
        </Box>
      )}

      {!loading && !error && songs.length > 0 && (
        <Box sx={{ px: 1 }}>
          <List sx={{ bgcolor: 'transparent', p: 0 }}>
            {songs.map((song, index) => (
              <SongItem
                key={song.id || index}
                title={decodeHtmlEntities(song.name)}
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
            ))}
          </List>

          {/* Context Menu */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <MenuItem onClick={handlePlayNow}>
              <ListItemIcon>
                <PlayArrow fontSize="small" />
              </ListItemIcon>
              <Typography variant="body2">Play Now</Typography>
            </MenuItem>
            <MenuItem onClick={handlePlayNext}>
              <ListItemIcon>
                <QueueMusic fontSize="small" />
              </ListItemIcon>
              <Typography variant="body2">Play Next</Typography>
            </MenuItem>
            <MenuItem onClick={handleAddToQueue}>
              <ListItemIcon>
                <PlaylistAdd fontSize="small" />
              </ListItemIcon>
              <Typography variant="body2">Add to Queue</Typography>
            </MenuItem>
            <MenuItem onClick={handleAddToFavourites}>
              <ListItemIcon>
                <Favorite fontSize="small" />
              </ListItemIcon>
              <Typography variant="body2">Add to Favourites</Typography>
            </MenuItem>
          </Menu>
        </Box>
      )}

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

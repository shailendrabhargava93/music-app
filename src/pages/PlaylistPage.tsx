import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Typography,
  Avatar,
  IconButton,
  CircularProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Menu,
  MenuItem,
  ListItemIcon,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import { saavnApi } from '../services/saavnApi';
import {
  FAVOURITE_ALBUMS_KEY,
  FAVOURITE_PLAYLISTS_KEY,
  FAVOURITE_SONGS_KEY,
  FAVOURITE_ARTISTS_KEY,
  persistFavourites,
  readFavourites,
} from '../services/storage';

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

  // Decode HTML entities in strings
  const decodeHtmlEntities = (text: string): string => {
    if (!text) return text;
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    const decoded = textarea.value;
    // If still contains entities, try one more time
    if (decoded.includes('&')) {
      textarea.innerHTML = decoded;
      return textarea.value;
    }
    return decoded;
  };

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

  const getHighQualityImage = (images: Array<{ quality: string; url: string }>) => {
    if (!images || images.length === 0) return '';
    
    const qualities = ['500x500', '150x150', '50x50'];
    for (const quality of qualities) {
      const img = images.find(img => img.quality === quality);
      if (img?.url) return img.url;
    }
    
    return images[images.length - 1]?.url || '';
  };

  const getArtistNames = (song: any): string => {
    if (song.artists?.primary && Array.isArray(song.artists.primary)) {
      return song.artists.primary.map((artist: any) => artist.name).join(', ');
    }
    return 'Unknown Artist';
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Box sx={{ pb: 14, minHeight: '100vh', pt: 0 }}>
      {/* Sticky header with back button and playlist name */}
      <Box
        sx={(theme) => ({
          position: 'sticky',
          top: 0,
          zIndex: theme.zIndex.appBar,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.25,
          py: 0.325,
          justifyContent: 'flex-start',
          width: '100%',
          backgroundColor: theme.palette.background.default,
          boxShadow: `0 1px 6px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.1)'}`,
          mb: 1,
        })}
      >
        <IconButton
          onClick={onBack}
          sx={{
            color: 'text.primary',
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600, flex: 1, pl: 0.5 }} noWrap>
          {decodeHtmlEntities(playlistName)}
        </Typography>
      </Box>

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
        <Avatar
          src={playlistImage}
          variant="rounded"
          sx={{
            width: 160,
            height: 160,
            mb: 1.5,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
          }}
        >
          <PlayArrowIcon sx={{ fontSize: 80 }} />
        </Avatar>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5, fontSize: '0.85rem' }}>
          {songs.length} songs
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 0.5 }}>
          {songs.length > 0 && (
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
              <PlayArrowIcon sx={{ fontSize: 28 }} />
            </IconButton>
          )}
          <IconButton
            onClick={toggleFavourite}
            sx={{
              bgcolor: isFavourite ? 'rgba(255, 82, 82, 0.1)' : 'action.hover',
              color: isFavourite ? 'error.main' : 'text.secondary',
              width: 36,
              height: 36,
              '&:hover': {
                bgcolor: isFavourite ? 'rgba(255, 82, 82, 0.2)' : 'action.selected',
              },
            }}
          >
            {isFavourite ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
          </IconButton>
        </Box>
      </Box>

      {/* Loading State */}
      {loading && (
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
          <CircularProgress size={48} sx={{ color: 'primary.main' }} />
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Loading playlist...
          </Typography>
        </Box>
      )}

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
      {!loading && !error && songs.length > 0 && (
        <Box sx={{ px: 1 }}>
          <List sx={{ bgcolor: 'transparent', p: 0 }}>
            {songs.map((song, index) => (
              <ListItem
                key={song.id || index}
                sx={{
                  cursor: 'pointer',
                  borderRadius: 1,
                  px: 1,
                  py: 0.5,
                  mb: 0.5,
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
                secondaryAction={
                  <IconButton
                    edge="end"
                    onClick={(e) => handleMenuOpen(e, song)}
                    sx={{ color: 'text.secondary' }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                }
              >
                <ListItemAvatar 
                  sx={{ minWidth: 72, cursor: 'pointer' }}
                  onClick={() => onSongSelect(song, songs)}
                >
                  <Avatar
                    src={getHighQualityImage(song.image)}
                    variant="rounded"
                    sx={{ width: 56, height: 56 }}
                  >
                    <MusicNoteIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  onClick={() => onSongSelect(song, songs)}
                  sx={{ 
                    cursor: 'pointer',
                    mr: 1.5,
                    pr: 0.5,
                    minWidth: 0,
                    flex: 1
                  }}
                  primary={
                    <Typography
                      sx={{
                        color: 'text.primary',
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {decodeHtmlEntities(song.name)}
                    </Typography>
                  }
                  secondary={
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'text.secondary',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {decodeHtmlEntities(getArtistNames(song))}
                      </Typography>
                      {song.duration && (
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                          {formatDuration(song.duration)}
                        </Typography>
                      )}
                    </Box>
                  }
                  secondaryTypographyProps={{ component: 'div' }}
                />
              </ListItem>
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
            <MenuItem onClick={handlePlayNext}>
              <ListItemIcon>
                <PlayArrowIcon fontSize="small" />
              </ListItemIcon>
              <Typography variant="body2">Play Now</Typography>
            </MenuItem>
            <MenuItem onClick={handlePlayNext}>
              <ListItemIcon>
                <QueueMusicIcon fontSize="small" />
              </ListItemIcon>
              <Typography variant="body2">Play Next</Typography>
            </MenuItem>
            <MenuItem onClick={handleAddToQueue}>
              <ListItemIcon>
                <PlaylistAddIcon fontSize="small" />
              </ListItemIcon>
              <Typography variant="body2">Add to Queue</Typography>
            </MenuItem>
            <MenuItem onClick={handleAddToFavourites}>
              <ListItemIcon>
                <FavoriteIcon fontSize="small" />
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
          <MusicNoteIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
          <Typography variant="h6" sx={{ color: 'text.secondary' }}>
            No songs in this playlist
          </Typography>
        </Box>
      )}

    </Box>
  );
};

export default PlaylistPage;

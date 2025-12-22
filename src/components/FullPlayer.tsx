import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  IconButton, 
  Slider,
  Drawer,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  Snackbar,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CloseIcon from '@mui/icons-material/Close';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import UpNextDrawer from './UpNextDrawer';
import { saavnApi } from '../services/saavnApi';
import { Song } from '../types/api';

interface FullPlayerProps {
  open: boolean;
  onClose: () => void;
  songId?: string;
  songTitle?: string;
  artist?: string;
  albumArt?: string;
  duration?: number;
  audioUrl?: string;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onNextSong?: () => void;
  onPreviousSong?: () => void;
  onSongSelect?: (song: Song) => void;
  songQueue?: Song[];
  progress?: number;
  onProgressChange?: (progress: number) => void;
  // Song details for info popup
  albumId?: string;
  albumName?: string;
  label?: string;
  copyright?: string;
  year?: string;
  language?: string;
  explicitContent?: boolean;
  source?: string; // Album or playlist name
}

const FullPlayer: React.FC<FullPlayerProps> = ({ 
  open, 
  onClose,
  songId,
  songTitle = 'Freefall (feat. Oliver Tree)', 
  artist = 'Whethan',
  albumArt,
  duration = 151,
  audioUrl,
  isPlaying = false,
  onTogglePlay,
  onNextSong,
  onPreviousSong,
  onSongSelect,
  songQueue = [],
  progress: externalProgress = 0,
  onProgressChange,
  albumId,
  albumName,
  label,
  copyright,
  year,
  language,
  source
}) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [progress, setProgress] = useState(externalProgress);
  const [audio] = useState(() => new Audio());
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [upNextOpen, setUpNextOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Song[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // Merge queue with suggestions for Up Next display
  const upNextSongs = [...songQueue, ...suggestions];

  // Sync external progress
  React.useEffect(() => {
    setProgress(externalProgress);
  }, [externalProgress]);
  const totalDuration = duration;

  // Decode HTML entities in strings
  const decodeHtmlEntities = (text: string): string => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  };

  // Check if current song is in favourites
  useEffect(() => {
    if (!songId) return;
    
    const saved = localStorage.getItem('favouriteSongs');
    if (saved) {
      try {
        const favourites = JSON.parse(saved);
        const isFav = favourites.some((song: any) => song.id === songId);
        setIsFavorite(isFav);
      } catch (e) {
        // Error checking favourites
      }
    }
  }, [songId, songTitle]);

  // Fetch album songs when song changes (for Up Next)
  useEffect(() => {
    const fetchAlbumSongs = async () => {
      if (!albumId || !songId) {
        setSuggestions([]);
        return;
      }
      
      try {
        setSuggestionsLoading(true);
        const response = await saavnApi.getAlbumById(albumId);
        
        if (response?.success && response.data?.songs && Array.isArray(response.data.songs)) {
          const albumSongs = response.data.songs;
          // Filter out current song and take up to 5 songs
          const otherSongs = albumSongs
            .filter((song: any) => song && song.id && song.name && song.id !== songId)
            .slice(0, 5);
          
          setSuggestions(otherSongs);
        } else {
          setSuggestions([]);
        }
      } catch (error) {
        setSuggestions([]);
      } finally {
        setSuggestionsLoading(false);
      }
    };

    fetchAlbumSongs();
  }, [albumId, songId]);

  // Toggle favourite status
  const toggleFavorite = () => {
    if (!songId) return;

    const saved = localStorage.getItem('favouriteSongs');
    let favourites = saved ? JSON.parse(saved) : [];

    const existingIndex = favourites.findIndex((song: any) => song.id === songId);

    if (existingIndex >= 0) {
      // Remove from favourites
      favourites.splice(existingIndex, 1);
      setIsFavorite(false);
      setSnackbarMessage('Removed from favourites');
      setSnackbarOpen(true);
    } else {
      // Add to favourites
      const newFavourite = {
        id: songId,
        name: songTitle,
        artist: artist,
        albumArt: albumArt || '',
        addedAt: Date.now(),
      };
      favourites.unshift(newFavourite); // Add to beginning
      setIsFavorite(true);
      setSnackbarMessage('Added to favourites ❤️');
      setSnackbarOpen(true);
    }

    localStorage.setItem('favouriteSongs', JSON.stringify(favourites));
  };

  // Reset progress and load new song when it changes
  useEffect(() => {
    setProgress(0);
    
    if (audioUrl) {
      audio.src = audioUrl;
      audio.load();
    }
  }, [songTitle, duration, audioUrl, audio]);

  // Handle audio playback
  useEffect(() => {
    if (!audioUrl) return;

    if (isPlaying) {
      audio.play().catch(() => {
        if (onTogglePlay) {
          onTogglePlay();
        }
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, audioUrl, audio, onTogglePlay]);

  // Update progress as audio plays
  useEffect(() => {
    const updateProgress = () => {
      if (audio.currentTime) {
        const currentProgress = Math.floor(audio.currentTime);
        setProgress(currentProgress);
        if (onProgressChange) {
          onProgressChange(currentProgress);
        }
      }
    };

    const handleEnded = () => {
      setProgress(0);
      // Automatically play next song
      if (onNextSong) {
        onNextSong();
      }
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audio, onTogglePlay]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [audio]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSliderChange = (_event: Event, newValue: number | number[]) => {
    const newTime = newValue as number;
    setProgress(newTime);
    audio.currentTime = newTime;
  };

  const togglePlay = () => {
    if (onTogglePlay) {
      onTogglePlay();
    }
  };

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          height: '100%',
          bgcolor: 'background.default',
          backgroundImage: (theme) => 
            theme.palette.mode === 'dark'
              ? 'linear-gradient(to bottom, rgba(40, 40, 40, 0.9), rgba(10, 25, 41, 1))'
              : 'linear-gradient(to bottom, rgba(245, 245, 245, 0.95), rgba(245, 245, 245, 1))',
        },
      }}
    >
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          px: 3,
          py: 2,
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
          }}
        >
          <IconButton
            onClick={onClose}
            sx={{ color: 'text.primary' }}
            aria-label="close player"
          >
            <KeyboardArrowDownIcon fontSize="large" />
          </IconButton>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: 1 }}>
              NOW PLAYING
            </Typography>
            {source && (
              <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem', display: 'block' }}>
                {source}
              </Typography>
            )}
          </Box>
          <IconButton 
            sx={{ color: 'text.primary' }} 
            aria-label="song information"
            onClick={() => setInfoDialogOpen(true)}
          >
            <InfoOutlinedIcon />
          </IconButton>
        </Box>

        {/* Album Art */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            my: 3,
          }}
        >
          <Avatar
            src={albumArt}
            variant="rounded"
            sx={{
              width: '100%',
              height: 'auto',
              maxWidth: 360,
              maxHeight: 360,
              aspectRatio: '1',
              bgcolor: 'action.hover',
              fontSize: '4rem',
            }}
          >
            🎵
          </Avatar>
        </Box>

        {/* Song Info */}
        <Box sx={{ mb: 2, maxWidth: 360, mx: 'auto', width: '100%' }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 1,
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="h5"
                sx={{
                  color: 'text.primary',
                  fontWeight: 'bold',
                  mb: 0.5,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {songTitle}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {artist}
              </Typography>
            </Box>
            <IconButton
              onClick={toggleFavorite}
              sx={{ 
                color: isFavorite ? 'primary.main' : 'text.secondary',
                mt: -0.5,
              }}
              aria-label="favorite"
            >
              {isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
            </IconButton>
          </Box>
        </Box>

        {/* Progress Bar */}
        <Box sx={{ mb: 1, maxWidth: 360, mx: 'auto', width: '100%' }}>
          <Slider
            value={progress}
            min={0}
            max={totalDuration}
            onChange={handleSliderChange}
            sx={{
              color: 'primary.main',
              height: 4,
              '& .MuiSlider-thumb': {
                width: 12,
                height: 12,
                '&:hover, &.Mui-focusVisible': {
                  boxShadow: '0 0 0 8px rgba(0, 188, 212, 0.16)',
                },
              },
              '& .MuiSlider-track': {
                border: 'none',
              },
              '& .MuiSlider-rail': {
                opacity: 0.3,
                bgcolor: 'text.secondary',
              },
            }}
          />
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              mt: -0.5,
            }}
          >
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {formatTime(progress)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {formatTime(totalDuration)}
            </Typography>
          </Box>
        </Box>

        {/* Playback Controls */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 2,
            mb: 3,
          }}
        >
          <IconButton
            onClick={onPreviousSong}
            sx={{ color: 'text.primary' }}
            aria-label="previous track"
          >
            <SkipPreviousIcon sx={{ fontSize: 40 }} />
          </IconButton>
          <IconButton
            onClick={togglePlay}
            sx={{
              bgcolor: 'primary.main',
              color: theme => theme.palette.mode === 'dark' ? '#000' : '#fff',
              width: 64,
              height: 64,
              '&:hover': {
                bgcolor: 'primary.light',
                transform: 'scale(1.06)',
              },
            }}
            aria-label={isPlaying ? 'pause' : 'play'}
          >
            {isPlaying ? (
              <PauseIcon sx={{ fontSize: 36 }} />
            ) : (
              <PlayArrowIcon sx={{ fontSize: 36 }} />
            )}
          </IconButton>
          <IconButton
            onClick={onNextSong}
            sx={{ color: 'text.primary' }}
            aria-label="next track"
          >
            <SkipNextIcon sx={{ fontSize: 40 }} />
          </IconButton>
        </Box>

        {/* Up Next Button */}
        <Box
          onClick={() => setUpNextOpen(true)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            mt: 3,
            py: 1.5,
            px: 3,
            borderRadius: 2,
            cursor: 'pointer',
            bgcolor: (theme) =>
              theme.palette.mode === 'light'
                ? 'rgba(0, 188, 212, 0.08)'
                : 'rgba(255, 255, 255, 0.05)',
            transition: 'all 0.2s',
            '&:hover': {
              bgcolor: (theme) =>
                theme.palette.mode === 'light'
                  ? 'rgba(0, 188, 212, 0.15)'
                  : 'rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          <QueueMusicIcon sx={{ color: 'primary.main' }} />
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
            Up Next
          </Typography>
        </Box>
      </Box>

      {/* Up Next Drawer */}
      <UpNextDrawer
        open={upNextOpen}
        onClose={() => setUpNextOpen(false)}
        suggestions={upNextSongs}
        loading={suggestionsLoading}
        onSongSelect={(song) => {
          if (onSongSelect) {
            onSongSelect(song);
          }
        }}
      />

      {/* Song Info Drawer */}
      <Drawer
        open={infoDialogOpen}
        onClose={() => setInfoDialogOpen(false)}
        anchor="bottom"
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            borderRadius: '16px 16px 0 0',
          }
        }}
      >
        <Box sx={{ 
          bgcolor: 'background.default',
          color: 'text.primary',
          fontWeight: 'bold',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Details</Typography>
          <IconButton
            onClick={() => setInfoDialogOpen(false)}
            size="small"
            sx={{ color: 'text.secondary' }}
            aria-label="close"
          >
            <CloseIcon />
          </IconButton>
        </Box>
        <Box sx={{ bgcolor: 'background.paper', p: 2, maxHeight: '60vh', overflowY: 'auto' }}>
          <List sx={{ p: 0 }}>
            <ListItem sx={{ px: 0, py: 0.5 }}>
              <ListItemText
                primary={
                  <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontWeight: 600 }}>
                    Song Name
                  </Typography>
                }
                secondary={
                  <Typography variant="body2" sx={{ color: 'text.primary', mt: 0.3 }}>
                    {decodeHtmlEntities(songTitle)}
                  </Typography>
                }
              />
            </ListItem>
            <Divider sx={{ my: 0.3 }} />
            <ListItem sx={{ px: 0, py: 0.5 }}>
              <ListItemText
                primary={
                  <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontWeight: 600 }}>
                    Artist(s)
                  </Typography>
                }
                secondary={
                  <Typography variant="body2" sx={{ color: 'text.primary', mt: 0.3 }}>
                    {decodeHtmlEntities(artist)}
                  </Typography>
                }
              />
            </ListItem>
            <Divider sx={{ my: 0.3 }} />
            <ListItem sx={{ px: 0, py: 0.5 }}>
              <ListItemText
                primary={
                  <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontWeight: 600 }}>
                    Album
                  </Typography>
                }
                secondary={
                  <Typography variant="body2" sx={{ color: 'text.primary', mt: 0.3 }}>
                    {albumName ? decodeHtmlEntities(albumName) : 'Unknown Album'}
                  </Typography>
                }
              />
            </ListItem>
            <Divider sx={{ my: 0.3 }} />
            <ListItem sx={{ px: 0, py: 0.5 }}>
              <ListItemText
                primary={
                  <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontWeight: 600 }}>
                    Label
                  </Typography>
                }
                secondary={
                  <Typography variant="body2" sx={{ color: 'text.primary', mt: 0.3 }}>
                    {label || 'Unknown Label'}
                  </Typography>
                }
              />
            </ListItem>
            <Divider sx={{ my: 0.3 }} />
            <ListItem sx={{ px: 0, py: 0.5 }}>
              <ListItemText
                primary={
                  <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontWeight: 600 }}>
                    Year
                  </Typography>
                }
                secondary={
                  <Typography variant="body2" sx={{ color: 'text.primary', mt: 0.3 }}>
                    {year || 'Unknown Year'}
                  </Typography>
                }
              />
            </ListItem>
            <Divider sx={{ my: 0.3 }} />
            <ListItem sx={{ px: 0, py: 0.5 }}>
              <ListItemText
                primary={
                  <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontWeight: 600 }}>
                    Language
                  </Typography>
                }
                secondary={
                  <Typography variant="body2" sx={{ color: 'text.primary', mt: 0.3 }}>
                    {language || 'Unknown Language'}
                  </Typography>
                }
              />
            </ListItem>
            <Divider sx={{ my: 0.3 }} />
            <ListItem sx={{ px: 0, py: 0.5 }}>
              <ListItemText
                primary={
                  <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontWeight: 600 }}>
                    Copyright
                  </Typography>
                }
                secondary={
                  <Typography variant="body2" sx={{ color: 'text.primary', mt: 0.3 }}>
                    {copyright || 'Copyright information not available'}
                  </Typography>
                }
              />
            </ListItem>
          </List>
        </Box>
      </Drawer>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Box
          sx={{
            bgcolor: 'background.paper',
            color: 'text.primary',
            px: 3,
            py: 1.5,
            borderRadius: 2,
            boxShadow: 3,
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {snackbarMessage}
          </Typography>
        </Box>
      </Snackbar>
    </Drawer>
  );
};

export default FullPlayer;

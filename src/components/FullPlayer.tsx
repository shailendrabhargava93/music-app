import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
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
} from '@mui/material';
import { KeyboardArrowDown, Favorite, FavoriteBorder, SkipPrevious, PlayArrow, Pause, SkipNext, Repeat, RepeatOne, Shuffle, MoreHoriz, Close, QueueMusic } from '../icons';
const UpNextDrawer = lazy(() => import('./UpNextDrawer'));
import { saavnApi } from '../services/saavnApi';
import { Song } from '../types/api';
import FavouriteToggle from './FavouriteToggle';
import { decodeHtmlEntities } from '../utils/normalize';

interface FullPlayerProps {
  open: boolean;
  onClose: () => void;
  songId?: string;
  songTitle?: string;
  artist?: string;
  albumArt?: string;
  duration?: number;
  isPlaying?: boolean;
  isFavorite?: boolean;
  onTogglePlay?: () => void;
  onNextSong?: () => void;
  onPreviousSong?: () => void;
  onSongSelect?: (song: Song, contextSongs?: Song[]) => void;
  songQueue?: Song[];
  currentContextSongs?: Song[];
  progress?: number;
  onProgressChange?: (progress: number) => void;
  repeatMode?: 'off' | 'all' | 'one';
  onRepeatModeChange?: (mode: 'off' | 'all' | 'one') => void;
  shuffleMode?: boolean;
  onShuffleModeChange?: (shuffle: boolean) => void;
  onReorder?: (newOrder: Song[]) => void;
  // Song details for info popup
  albumId?: string;
  albumName?: string;
  label?: string;
  copyright?: string;
  year?: string;
  language?: string;
  explicitContent?: boolean;
  source?: string; // Album or playlist name
  onShowSnackbar?: (msg: string) => void;
  onFavouriteChange?: (isFav: boolean) => void;
}

const FullPlayer: React.FC<FullPlayerProps> = ({ 
  open, 
  onClose,
  songId,
  songTitle = 'Freefall (feat. Oliver Tree)', 
  artist = 'Whethan',
  albumArt,
  isFavorite = false,
  duration = 151,
  isPlaying = false,
  onTogglePlay,
  onNextSong,
  onPreviousSong,
  onSongSelect,
  songQueue = [],
  currentContextSongs = [],
  progress: externalProgress = 0,
  onProgressChange,
  repeatMode = 'off',
  onRepeatModeChange,
  shuffleMode = false,
  onShuffleModeChange,
  albumId,
  albumName,
  label,
  copyright,
  year,
  language,
  source,
  onShowSnackbar,
  onFavouriteChange,
  onReorder
}) => {
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [upNextOpen, setUpNextOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Song[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  // Info drawer resize state (match UpNext behavior)
  const [infoMaxHeight, setInfoMaxHeight] = useState<number>(60); // percent of viewport
  const infoDraggingRef = useRef(false);
  const infoStartYRef = useRef<number>(0);
  const infoStartHeightRef = useRef<number>(60);

  // Merge queue with suggestions for Up Next display
  // Merge queue with suggestions for Up Next display and dedupe by id (keep first occurrence)
  const upNextSongs = (() => {
    const mergedSource = (currentContextSongs && currentContextSongs.length > 0) ? currentContextSongs : [...songQueue, ...suggestions];
    const merged = [...mergedSource];
    const seen = new Set<string>();
    const out: Song[] = [];
    for (const s of merged) {
      if (!s || !s.id) continue;
      if (seen.has(s.id)) continue;
      seen.add(s.id);
      out.push(s);
    }
    return out;
  })();
  const currentProgress = Math.min(externalProgress ?? 0, duration ?? 0);

  // use shared `decodeHtmlEntities` from utils

  // (Favourite state is managed by `FavouriteToggle`)

  // Fetch album songs when song changes (for Up Next)
  useEffect(() => {
    const isMounted = true;
    const lastFetchedAlbumRef: { current?: string | undefined } = { current: undefined };

    const fetchAlbumSongs = async () => {
      if (!albumId || !songId) {
        setSuggestions([]);
        return;
      }

      // If we've already fetched for this albumId, skip to avoid duplicate requests
      if (lastFetchedAlbumRef.current === albumId) return;
      lastFetchedAlbumRef.current = albumId;

      try {
        setSuggestionsLoading(true);
        const response = await saavnApi.getAlbumById(albumId);

        if (!isMounted) return;

        if (response?.success && response.data?.songs && Array.isArray(response.data.songs)) {
          const albumSongs = response.data.songs;
          // Filter out current song and take up to 5 songs
          const otherSongs = albumSongs
            .filter((song: Song) => song && song.id && song.name && song.id !== songId)
            .slice(0, 5);

          setSuggestions(otherSongs);
        } else {
          setSuggestions([]);
        }
      } catch {
        setSuggestions([]);
      } finally {
        if (isMounted) setSuggestionsLoading(false);
      }
    };

    fetchAlbumSongs();
  }, [albumId, songId]);

  // Info Drawer drag handlers (mirror UpNext behavior)
  useEffect(() => {
    let rafId: number | null = null;
    const handleTouchMove = (ev: TouchEvent) => {
      if (!infoDraggingRef.current) return;
      const touch = ev.touches[0];
      const dy = infoStartYRef.current - touch.clientY;
      const compute = () => {
        const newHeight = Math.min(90, Math.max(30, infoStartHeightRef.current + (dy / window.innerHeight) * 100));
        setInfoMaxHeight(newHeight);
        rafId = null;
      };
      if (rafId == null) rafId = requestAnimationFrame(compute);
    };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!infoDraggingRef.current) return;
      const dy = infoStartYRef.current - ev.clientY;
      const compute = () => {
        const newHeight = Math.min(90, Math.max(30, infoStartHeightRef.current + (dy / window.innerHeight) * 100));
        setInfoMaxHeight(newHeight);
        rafId = null;
      };
      if (rafId == null) rafId = requestAnimationFrame(compute);
    };

    const stopDrag = () => {
      infoDraggingRef.current = false;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      setInfoMaxHeight(prev => {
        if (prev >= 75) return 100;
        if (prev <= 35) return 35;
        return prev;
      });
    };

    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchend', stopDrag);
    window.addEventListener('mouseup', stopDrag);

    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchend', stopDrag);
      window.removeEventListener('mouseup', stopDrag);
    };
  }, []);

  // Favourite toggling is delegated to `FavouriteToggle` (persistence + snackbar)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSliderChange = (_event: Event, newValue: number | number[]) => {
    const newTime = Array.isArray(newValue) ? newValue[0] : newValue;
    if (onProgressChange) {
      onProgressChange(newTime as number);
    }
  };

  const togglePlay = () => {
    if (onTogglePlay) {
      onTogglePlay();
    }
  };

  const startInfoDragTouch = (clientY: number) => {
    infoDraggingRef.current = true;
    infoStartYRef.current = clientY;
    infoStartHeightRef.current = infoMaxHeight;
  };

  const handleInfoTouchStart = (e: React.TouchEvent) => {
    startInfoDragTouch(e.touches[0].clientY);
  };

  const handleInfoMouseDown = (e: React.MouseEvent) => {
    startInfoDragTouch(e.clientY);
  };

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: (theme) => ({
          height: '100%',
          backgroundColor: theme.palette.background.default,
        }),
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
            <KeyboardArrowDown fontSize="large" />
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
            <MoreHoriz />
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
            imgProps={{ loading: 'lazy' }}
            variant="rounded"
            sx={{
              width: '100%',
              height: 'auto',
              maxWidth: 360,
              maxHeight: 360,
              aspectRatio: '1',
              bgcolor: 'action.hover',
              fontSize: '4rem',
              borderRadius: 1.5,
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
                variant="h6"
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
            <FavouriteToggle
              item={{ id: songId, name: songTitle, image: albumArt }}
              initial={isFavorite}
              onChange={(v: boolean) => {
                // FavouriteToggle handles snackbar messaging centrally; just notify parent state
                if (typeof onFavouriteChange === 'function') onFavouriteChange(v);
              }}
              onShowSnackbar={onShowSnackbar}
              icon={{ fav: <Favorite sx={{ color: 'error.main' }} />, notFav: <FavoriteBorder /> }}
              iconButtonSx={{ mt: -0.5 }}
            />
          </Box>
        </Box>

        {/* Progress Bar */}
        <Box sx={{ mb: 1, maxWidth: 360, mx: 'auto', width: '100%' }}>
          <Slider
            value={currentProgress}
            min={0}
            max={duration || 0}
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
                {formatTime(currentProgress)}
              </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {formatTime(duration ?? 0)}
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
            mb: 2,
          }}
        >
          <IconButton
            onClick={() => {
              if (onShuffleModeChange) {
                onShuffleModeChange(!shuffleMode);
              }
            }}
            size="small"
            sx={{ 
              color: shuffleMode ? 'primary.main' : 'text.secondary',
              p: 0.5,
              minWidth: 40,
            }}
            aria-label="shuffle"
          >
            <Shuffle sx={{ fontSize: 20 }} />
          </IconButton>
          <IconButton
            onClick={onPreviousSong}
            sx={{ color: 'text.primary' }}
            aria-label="previous track"
          >
            <SkipPrevious sx={{ fontSize: 40 }} />
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
              <Pause sx={{ fontSize: 36 }} />
            ) : (
              <PlayArrow sx={{ fontSize: 36 }} />
            )}
          </IconButton>
          <IconButton
            onClick={onNextSong}
            sx={{ color: 'text.primary' }}
            aria-label="next track"
          >
            <SkipNext sx={{ fontSize: 40 }} />
          </IconButton>
          <IconButton
            onClick={() => {
              if (onRepeatModeChange) {
                const nextMode = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
                onRepeatModeChange(nextMode);
              }
            }}
            size="small"
            sx={{ 
              color: repeatMode !== 'off' ? 'primary.main' : 'text.secondary',
              p: 0.5,
              minWidth: 40,
            }}
            aria-label="repeat"
          >
            {repeatMode === 'one' ? (
              <RepeatOne sx={{ fontSize: 20 }} />
            ) : (
              <Repeat sx={{ fontSize: 20 }} />
            )}
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
          <QueueMusic sx={{ color: 'primary.main' }} />
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
            Up Next
          </Typography>
        </Box>
      </Box>

      {/* Up Next Drawer */}
      <Suspense fallback={null}>
        <UpNextDrawer
          open={upNextOpen}
          onClose={() => setUpNextOpen(false)}
          items={upNextSongs}
          loading={suggestionsLoading}
          currentSongId={songId}
          onSongSelect={(song) => {
            if (onSongSelect) {
              const merged = [...songQueue, ...suggestions];
              const songIndex = merged.findIndex(s => s.id === song.id);
              const remainingSongs = songIndex >= 0 ? merged.slice(songIndex) : [song];
              onSongSelect(song, remainingSongs);
            }
          }}
          onReorder={(updated: Song[]) => {
            if (!onReorder) return;
            // Forward the full updated order to the app-level handler so it can
            // derive and persist the new queue/context ordering as needed.
            onReorder(updated);
          }}
        />
      </Suspense>

      {/* Song Info Drawer */}
      <Drawer
        open={infoDialogOpen}
        onClose={() => setInfoDialogOpen(false)}
        anchor="bottom"
        PaperProps={{
          sx: {
            borderRadius: '16px 16px 0 0',
            maxHeight: `${infoMaxHeight}vh`,
            bgcolor: 'background.paper',
            display: 'flex',
            flexDirection: 'column',
          }
        }}
      >
        {/* Drag handle for Info Drawer */}
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 0.75, cursor: 'ns-resize' }}>
          <Box
            onTouchStart={handleInfoTouchStart}
            onMouseDown={handleInfoMouseDown}
            sx={{ width: 48, height: 6, borderRadius: 3, bgcolor: 'divider' }}
          />
        </Box>

        <Box sx={{ 
          color: 'text.primary',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 2,
          py: 0.75,
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Details</Typography>
          <IconButton
            onClick={() => setInfoDialogOpen(false)}
            size="small"
            sx={{ color: 'text.secondary', p: 0.5 }}
            aria-label="close"
          >
            <Close fontSize="small" />
          </IconButton>
        </Box>
        <Box sx={{ p: 1, pl: 2, maxHeight: '60vh', overflowY: 'auto' }}>
          <List sx={{ p: 0 }}>
            <ListItem sx={{ px: 0, py: 0.25 }}>
              <ListItemText
                primary={
                  <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontWeight: 600 }}>
                    Song Name
                  </Typography>
                }
                secondary={
                  <Typography variant="body2" sx={{ color: 'text.primary', mt: 0.15 }}>
                    {decodeHtmlEntities(songTitle)}
                  </Typography>
                }
              />
            </ListItem>
            <Divider sx={{ my: 0.15 }} />
            <ListItem sx={{ px: 0, py: 0.25 }}>
              <ListItemText
                primary={
                  <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontWeight: 600 }}>
                    Artist(s)
                  </Typography>
                }
                secondary={
                  <Typography variant="body2" sx={{ color: 'text.primary', mt: 0.15 }}>
                    {decodeHtmlEntities(artist)}
                  </Typography>
                }
              />
            </ListItem>
            <Divider sx={{ my: 0.15 }} />
            <ListItem sx={{ px: 0, py: 0.25 }}>
              <ListItemText
                primary={
                  <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontWeight: 600 }}>
                    Album
                  </Typography>
                }
                secondary={
                  <Typography variant="body2" sx={{ color: 'text.primary', mt: 0.15 }}>
                    {albumName ? decodeHtmlEntities(albumName) : 'Unknown Album'}
                  </Typography>
                }
              />
            </ListItem>
            <Divider sx={{ my: 0.15 }} />
            <ListItem sx={{ px: 0, py: 0.25 }}>
              <ListItemText
                primary={
                  <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontWeight: 600 }}>
                    Label
                  </Typography>
                }
                secondary={
                  <Typography variant="body2" sx={{ color: 'text.primary', mt: 0.15 }}>
                    {label || 'Unknown Label'}
                  </Typography>
                }
              />
            </ListItem>
            <Divider sx={{ my: 0.15 }} />
            <ListItem sx={{ px: 0, py: 0.25 }}>
              <ListItemText
                primary={
                  <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontWeight: 600 }}>
                    Year
                  </Typography>
                }
                secondary={
                  <Typography variant="body2" sx={{ color: 'text.primary', mt: 0.15 }}>
                    {year || 'Unknown Year'}
                  </Typography>
                }
              />
            </ListItem>
            <Divider sx={{ my: 0.15 }} />
            <ListItem sx={{ px: 0, py: 0.25 }}>
              <ListItemText
                primary={
                  <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontWeight: 600 }}>
                    Language
                  </Typography>
                }
                secondary={
                  <Typography variant="body2" sx={{ color: 'text.primary', mt: 0.15 }}>
                    {language || 'Unknown Language'}
                  </Typography>
                }
              />
            </ListItem>
            <Divider sx={{ my: 0.15 }} />
            <ListItem sx={{ px: 0, py: 0.25 }}>
              <ListItemText
                primary={
                  <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontWeight: 600 }}>
                    Copyright
                  </Typography>
                }
                secondary={
                  <Typography variant="body2" sx={{ color: 'text.primary', mt: 0.15 }}>
                    {copyright || 'Copyright information not available'}
                  </Typography>
                }
              />
            </ListItem>
          </List>
        </Box>
      </Drawer>

      {/* Snackbars are handled by FavouriteToggle; no local snackbar needed */}
    </Drawer>
  );
};

export default FullPlayer;

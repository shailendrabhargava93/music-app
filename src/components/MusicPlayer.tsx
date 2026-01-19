import React, { useEffect, useState } from 'react';
import { Box, Avatar, Typography, IconButton, Paper, CircularProgress, useTheme } from '@mui/material';
import { PlayArrow, Pause, Favorite, FavoriteBorder } from '../icons';

interface MusicPlayerProps {
  songTitle?: string;
  artist?: string;
  albumArt?: string;
  isPlaying?: boolean;
  isLoading?: boolean;
  progress?: number;
  duration?: number;
  onTogglePlay?: () => void;
  onOpenFullPlayer?: () => void;
  onNextSong?: () => void;
  onPreviousSong?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({
  songTitle = 'Freefall (feat. Oliver Tree)',
  artist = 'Whethan',
  albumArt,
  isPlaying = false,
  isLoading = false,
  progress = 0,
  duration = 0,
  onTogglePlay,
  onOpenFullPlayer,
  isFavorite = false,
  onToggleFavorite
}) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  const togglePlay = () => {
    if (onTogglePlay) onTogglePlay();
  };

  const [bottomOffset, setBottomOffset] = useState(56);

  useEffect(() => {
    const computeOffset = () => {
      const nav = document.getElementById('bottom-nav-paper');
      let navHeight = 0;
      if (nav) {
        navHeight = nav.getBoundingClientRect().height;
      }
      // navHeight already includes the banner height (banner is a child), use it directly
      setBottomOffset(navHeight);
    };

    computeOffset();
    const ro = new ResizeObserver(() => computeOffset());
    const navEl = document.getElementById('bottom-nav-paper');
    if (navEl) ro.observe(navEl);
    window.addEventListener('resize', computeOffset);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', computeOffset);
    };
  }, []);

  const progressPercentage = duration > 0 ? (progress / duration) * 100 : 0;

  // Text colors based on theme
  const textColor = isDarkMode ? '#ffffff' : '#1A2027';
  const textSecondaryColor = isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(26, 32, 39, 0.7)';

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        position: 'fixed', 
        bottom: bottomOffset, 
        left: 0, 
        right: 0, 
        zIndex: 999, 
        bgcolor: 'transparent',
        borderRadius: 0,
        px: 2,
        pb: 1.5,
      }}
    >
      {/* Main player bar */}
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          bgcolor: 'background.paper',
          borderRadius: 3,
          px: 2,
          py: 1.5,
          background: isDarkMode 
            ? 'linear-gradient(135deg, #00BCD4 0%, #0097A7 100%)'
            : 'linear-gradient(135deg, #4DD0E1 0%, #00BCD4 100%)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Left section: Album art with circular progress + Song info */}
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1.5, 
            flex: 1, 
            minWidth: 0,
            cursor: 'pointer',
          }} 
          onClick={onOpenFullPlayer}
        >
          {/* Album art with circular progress */}
          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <CircularProgress
              variant="determinate"
              value={progressPercentage}
              size={56}
              thickness={2.5}
              sx={{
                color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(26, 32, 39, 0.8)',
                position: 'absolute',
                top: -4,
                left: -4,
              }}
            />
            <Avatar 
              src={albumArt} 
              variant="circular"
              imgProps={{ loading: 'lazy' }} 
              sx={{ 
                width: 48, 
                height: 48, 
                bgcolor: 'rgba(255, 255, 255, 0.2)',
              }}
            >
              🎵
            </Avatar>
          </Box>
          
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="body2"
              sx={{ 
                color: textColor, 
                fontWeight: 600, 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap',
                fontSize: '0.95rem',
              }}
            >
              {songTitle}
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                color: textSecondaryColor, 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap', 
                display: 'block',
                fontSize: '0.8rem',
              }}
            >
              {artist}
            </Typography>
          </Box>
        </Box>

        {/* Right section: Favorite + Play/Pause */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 1 }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', px: 1 }}>
              <CircularProgress size={28} sx={{ color: textColor }} />
            </Box>
          ) : (
            <>
              <IconButton 
                onClick={(e) => {
                  e.stopPropagation();
                  if (onToggleFavorite) onToggleFavorite();
                }}
                sx={{ 
                  color: textColor,
                  '&:hover': { 
                    bgcolor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                  },
                  width: 40,
                  height: 40,
                }} 
                aria-label="toggle favorite"
              >
                {isFavorite ? <Favorite /> : <FavoriteBorder />}
              </IconButton>
              <IconButton 
                onClick={togglePlay} 
                sx={{ 
                  color: textColor,
                  bgcolor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                  '&:hover': { 
                    bgcolor: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.15)',
                  },
                  width: 40,
                  height: 40,
                }} 
                aria-label={isPlaying ? 'pause' : 'play'}
              >
                {isPlaying ? <Pause /> : <PlayArrow />}
              </IconButton>
            </>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

export default MusicPlayer;

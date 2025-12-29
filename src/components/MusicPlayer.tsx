import React, { useEffect, useState } from 'react';
import { Box, Avatar, Typography, IconButton, Paper, CircularProgress, LinearProgress } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';

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
  onNextSong,
  onPreviousSong,
}) => {
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

  return (
    <Paper elevation={8} sx={{ position: 'fixed', bottom: bottomOffset, left: 0, right: 0, zIndex: 999, bgcolor: 'background.paper', borderRadius: 0 }}>
      <LinearProgress
        variant="determinate"
        value={progressPercentage}
        sx={{
          height: 3,
          bgcolor: 'rgba(0, 0, 0, 0.1)',
          '& .MuiLinearProgress-bar': {
            bgcolor: 'primary.main',
          },
        }}
      />

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={onOpenFullPlayer}>
          <Avatar src={albumArt} variant="rounded" sx={{ width: 48, height: 48, bgcolor: 'action.hover' }}>
            🎵
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="body2"
              sx={{ color: 'text.primary', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {songTitle}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
              {artist}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', px: 2 }}>
              <CircularProgress size={24} sx={{ color: 'primary.main' }} />
            </Box>
          ) : (
            <>
              <IconButton onClick={onPreviousSong} sx={{ color: 'text.primary', '&:hover': { bgcolor: 'action.hover' } }} aria-label="previous track">
                <SkipPreviousIcon />
              </IconButton>
              <IconButton onClick={togglePlay} sx={{ color: 'text.primary', '&:hover': { bgcolor: 'action.hover' }, mx: 0.5 }} aria-label={isPlaying ? 'pause' : 'play'}>
                {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
              </IconButton>
              <IconButton onClick={onNextSong} sx={{ color: 'text.primary', '&:hover': { bgcolor: 'action.hover' } }} aria-label="next track">
                <SkipNextIcon />
              </IconButton>
            </>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

export default MusicPlayer;

import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, CircularProgress, IconButton, Skeleton, Menu, MenuItem, ListItemIcon, Fab } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { Song } from '../types/api';
import { SoundChartsItem } from '../services/soundChartsApi';

interface AllSongsPageProps {
  onSongSelect: (song: Song) => void;
  chartSongs: ChartSongWithSaavn[];
  onBack: () => void;
  onAddToQueue?: (song: Song) => void;
  onPlayNext?: (song: Song) => void;
}

interface ChartSongWithSaavn extends SoundChartsItem {
  saavnData?: Song;
  isSearching?: boolean;
}

const AllSongsPage: React.FC<AllSongsPageProps> = ({ onSongSelect, chartSongs, onBack, onAddToQueue, onPlayNext }) => {
  const [displayedSongs, setDisplayedSongs] = useState<ChartSongWithSaavn[]>([]);
  const [displayCount, setDisplayCount] = useState(20);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedSong, setSelectedSong] = useState<ChartSongWithSaavn | null>(null);
  const [favouriteSongs, setFavouriteSongs] = useState<string[]>([]);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Load favourite songs
  useEffect(() => {
    const saved = localStorage.getItem('favouriteSongs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFavouriteSongs(parsed.map((song: any) => song.id));
      } catch (e) {
        setFavouriteSongs([]);
      }
    }
  }, []);

  // Update displayed songs when displayCount changes
  useEffect(() => {
    if (chartSongs.length > 0) {
      setDisplayedSongs(chartSongs.slice(0, displayCount));
    }
  }, [chartSongs, displayCount]);

  // Intersection Observer for infinite scroll - keep it stable
  useEffect(() => {
    const currentTarget = observerTarget.current;
    if (!currentTarget || chartSongs.length === 0) return;

    const observer = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          // Load more songs
          setDisplayCount(prev => Math.min(prev + 20, chartSongs.length));
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '200px'
      }
    );

    observer.observe(currentTarget);

    return () => {
      observer.disconnect();
    };
  }, [chartSongs.length]);

  // Scroll listener for scroll to top button
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Function to scroll to top
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const handleSongClick = (song: ChartSongWithSaavn) => {
    if (song.saavnData) {
      onSongSelect(song.saavnData);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, song: ChartSongWithSaavn) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedSong(song);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedSong(null);
  };

  const handlePlayNext = () => {
    if (selectedSong?.saavnData && onPlayNext) {
      onPlayNext(selectedSong.saavnData);
    }
    handleMenuClose();
  };

  const handleAddToQueue = () => {
    if (selectedSong?.saavnData && onAddToQueue) {
      onAddToQueue(selectedSong.saavnData);
    }
    handleMenuClose();
  };

  const handleAddToFavourites = () => {
    if (!selectedSong?.saavnData) return;

    const saved = localStorage.getItem('favouriteSongs');
    let favourites = [];
    
    try {
      favourites = saved ? JSON.parse(saved) : [];
    } catch (e) {
      favourites = [];
    }

    const isFavourite = favourites.some((song: any) => song.id === selectedSong.saavnData!.id);

    if (isFavourite) {
      // Remove from favourites
      favourites = favourites.filter((song: any) => song.id !== selectedSong.saavnData!.id);
      setFavouriteSongs(prev => prev.filter(id => id !== selectedSong.saavnData!.id));
    } else {
      // Add to favourites
      const newFavourite = {
        id: selectedSong.saavnData.id,
        name: selectedSong.saavnData.name,
        artist: selectedSong.saavnData.primaryArtists,
        albumArt: selectedSong.saavnData.image && selectedSong.saavnData.image.length > 0 
          ? selectedSong.saavnData.image[0].link || ''
          : '',
        addedAt: Date.now(),
      };
      favourites.push(newFavourite);
      setFavouriteSongs(prev => [...prev, selectedSong.saavnData!.id]);
    }

    localStorage.setItem('favouriteSongs', JSON.stringify(favourites));
    handleMenuClose();
  };

  const getImageUrl = (imageArray: any[]): string => {
    if (!Array.isArray(imageArray) || imageArray.length === 0) {
      return '';
    }

    const qualities = ['150x150', '500x500', '50x50'];
    
    for (const quality of qualities) {
      const img = imageArray.find((img: any) => img.quality === quality);
      if (img) {
        return img.url || img.link || '';
      }
    }
    
    const firstImg = imageArray[0];
    return firstImg?.url || firstImg?.link || '';
  };

  return (
    <Box 
      sx={{ 
        pb: 10, 
        minHeight: '100vh',
        position: 'relative',
        overflow: 'auto'
      }}
    >
      {/* Header with Back Button */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          pt: 1,
          mb: 1,
        }}
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
        <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600, fontSize: '1.1rem' }}>
          All Trending Songs
        </Typography>
      </Box>

      <Box sx={{ px: 2 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
          Top 100 Songs in India • Spotify Charts
        </Typography>

        {chartSongs.length === 0 && (
          <Box>
            {[...Array(20)].map((_, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  mb: 1,
                  p: 1.5,
                }}
              >
                <Skeleton variant="text" width={40} height={40} sx={{ flexShrink: 0 }} />
                <Skeleton variant="rounded" width={56} height={56} sx={{ flexShrink: 0 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Skeleton variant="text" width="70%" height={24} />
                  <Skeleton variant="text" width="50%" height={20} />
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {displayedSongs.length > 0 && (
          <Box>
            {displayedSongs.map((item) => (
              <Box
                key={item.position}
                onClick={() => handleSongClick(item)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  mb: 1,
                  p: 0.5,
                  borderRadius: 1,
                  cursor: item.saavnData ? 'pointer' : 'default',
                  opacity: item.saavnData ? 1 : 0.7,
                  transition: 'background-color 0.2s',
                  '&:hover': item.saavnData ? {
                    backgroundColor: (theme) => 
                      theme.palette.mode === 'light'
                        ? 'rgba(0, 188, 212, 0.08)'
                        : 'rgba(255, 255, 255, 0.05)',
                  } : {},
                }}
              >
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 1,
                    overflow: 'hidden',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {item.isSearching ? (
                    <CircularProgress size={24} sx={{ color: 'primary.main' }} />
                  ) : item.saavnData?.image && item.saavnData.image.length > 0 ? (
                    <img
                      src={getImageUrl(item.saavnData.image)}
                      alt={item.song.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : item.song.imageUrl ? (
                    <img
                      src={item.song.imageUrl}
                      alt={item.song.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Typography sx={{ color: 'text.disabled', fontSize: '1.5rem' }}>
                      ♪
                    </Typography>
                  )}
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.song.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.song.creditName}
                  </Typography>
                </Box>

                {item.isSearching && (
                  <Typography
                    variant="caption"
                    color="text.disabled"
                    sx={{ fontSize: '0.7rem' }}
                  >
                    Finding...
                  </Typography>
                )}
                {!item.isSearching && !item.saavnData && (
                  <Typography
                    variant="caption"
                    color="text.disabled"
                    sx={{ fontSize: '0.7rem' }}
                  >
                    Not available
                  </Typography>
                )}

                {item.saavnData && (
                  <IconButton
                    onClick={(e) => handleMenuOpen(e, item)}
                    size="small"
                    sx={{ color: 'text.secondary' }}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            ))}
            {/* Loading indicator and observer target */}
            {displayCount < chartSongs.length && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 2,
                  py: 4,
                  minHeight: 100,
                  width: '100%',
                }}
              >
                <Box ref={observerTarget} sx={{ height: 20, width: '100%' }} />
                <CircularProgress size={32} sx={{ color: 'primary.main' }} />
              </Box>
            )}
            
            {/* All songs loaded message */}
            {displayCount >= chartSongs.length && chartSongs.length > 0 && (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  py: 3,
                  width: '100%',
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  🎵 All {chartSongs.length} songs loaded!
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Box>

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
        <MenuItem onClick={() => selectedSong?.saavnData && onSongSelect(selectedSong.saavnData)}>
          <ListItemIcon>
            <PlayArrowIcon fontSize="small" />
          </ListItemIcon>
          Play
        </MenuItem>
        {onPlayNext && (
          <MenuItem onClick={handlePlayNext}>
            <ListItemIcon>
              <PlaylistAddIcon fontSize="small" />
            </ListItemIcon>
            Play Next
          </MenuItem>
        )}
        {onAddToQueue && (
          <MenuItem onClick={handleAddToQueue}>
            <ListItemIcon>
              <QueueMusicIcon fontSize="small" />
            </ListItemIcon>
            Add to Queue
          </MenuItem>
        )}
        <MenuItem onClick={handleAddToFavourites}>
          <ListItemIcon>
            {selectedSong?.saavnData && favouriteSongs.includes(selectedSong.saavnData.id) ? (
              <FavoriteIcon fontSize="small" />
            ) : (
              <FavoriteBorderIcon fontSize="small" />
            )}
          </ListItemIcon>
          {selectedSong?.saavnData && favouriteSongs.includes(selectedSong.saavnData.id) ? 'Remove from Favorites' : 'Add to Favorites'}
        </MenuItem>
      </Menu>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <Fab
          color="primary"
          aria-label="scroll to top"
          onClick={scrollToTop}
          sx={{
            position: 'fixed',
            bottom: 80,
            right: 16,
            zIndex: 1000,
          }}
        >
          <KeyboardArrowUpIcon sx={{ color: theme => theme.palette.mode === 'dark' ? '#fff' : '#000' }} />
        </Fab>
      )}
    </Box>
  );
};

export default AllSongsPage;

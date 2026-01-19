import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, IconButton, Skeleton, Menu, MenuItem, ListItemIcon, Container } from '@mui/material';
import { ArrowLeft, MoreVertical, Play, Music, PlusSquare, Heart } from '../icons';
import { Song } from '../types/api';
import { SoundChartsItem } from '../services/soundChartsApi';
import { FAVOURITE_SONGS_KEY, persistFavourites, readFavourites } from '../services/storage';

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
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedSong, setSelectedSong] = useState<ChartSongWithSaavn | null>(null);
  const [favouriteSongs, setFavouriteSongs] = useState<string[]>([]);

  // Scroll to top when component mounts and load all songs
  useEffect(() => {
    window.scrollTo(0, 0);
    setDisplayedSongs(chartSongs);
  }, [chartSongs]);

  // Load favourite songs
  useEffect(() => {
    const loadFavouriteIds = async () => {
      const saved = await readFavourites(FAVOURITE_SONGS_KEY);
      setFavouriteSongs(saved.map((song: any) => song.id));
    };

    loadFavouriteIds();
  }, []);

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

  const handleAddToFavourites = async () => {
    if (!selectedSong?.saavnData) return;

    const favourites = await readFavourites(FAVOURITE_SONGS_KEY);
    const isFavourite = favourites.some((song: any) => song.id === selectedSong.saavnData!.id);

    if (isFavourite) {
      const updated = favourites.filter((song: any) => song.id !== selectedSong.saavnData!.id);
      setFavouriteSongs(prev => prev.filter(id => id !== selectedSong.saavnData!.id));
      try {
        await persistFavourites(FAVOURITE_SONGS_KEY, updated);
      } catch (error) {
        console.warn('Unable to persist favourite songs', error);
      }
    } else {
      const newFavourite = {
        id: selectedSong.saavnData.id,
        name: selectedSong.saavnData.name,
        artist: selectedSong.saavnData.primaryArtists,
        albumArt: selectedSong.saavnData.image && selectedSong.saavnData.image.length > 0
          ? selectedSong.saavnData.image[0].link || ''
          : '',
        addedAt: Date.now(),
      };
      const updated = [...favourites, newFavourite];
      setFavouriteSongs(prev => [...prev, selectedSong.saavnData!.id]);
      try {
        await persistFavourites(FAVOURITE_SONGS_KEY, updated);
      } catch (error) {
        console.warn('Unable to persist favourite songs', error);
      }
    }

    handleMenuClose();
  };

  const getImageUrl = (imageArray: any[]): string => {
    if (!Array.isArray(imageArray) || imageArray.length === 0) {
      return '';
    }

    const firstImg = imageArray[0];
    return firstImg?.url || firstImg?.link || '';
  };

  return (
    <Box 
      sx={{ 
        pb: 10, 
        minHeight: '100vh',
        pt: 0,
      }}
    >
      {/* Sticky header with back button */}
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
          mt: 0,
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
            <ArrowLeft sx={{ fontSize: 20 }} />
          </IconButton>
          <Typography
            variant="h6"
            sx={{
              color: 'text.primary',
              fontWeight: 600,
              fontSize: { xs: '1rem', sm: '1.05rem', md: '1.1rem', lg: '1.25rem' },
              pl: 0.5,
            }}
            noWrap
          >
            Trending Songs
          </Typography>
        </Container>
      </Box>

      {/* Spacer to offset fixed header height so content doesn't go under it */}
      <Box sx={{ height: { xs: 56, sm: 64 }, width: '100%' }} />

      <Box sx={{ px: 2, pb: 12 }}>
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
                    borderRadius: 1.5,
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
                    {typeof item.position !== 'undefined' ? `${item.position}. ${item.song.name}` : item.song.name}
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
                    <MoreVertical sx={{ fontSize: 18 }} />
                  </IconButton>
                )}
              </Box>
            ))}
            
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
            <Play fontSize="small" />
          </ListItemIcon>
          Play
        </MenuItem>
        {onPlayNext && (
          <MenuItem onClick={handlePlayNext}>
            <ListItemIcon>
              <PlusSquare fontSize="small" />
            </ListItemIcon>
            Play Next
          </MenuItem>
        )}
        {onAddToQueue && (
          <MenuItem onClick={handleAddToQueue}>
            <ListItemIcon>
              <Music fontSize="small" />
            </ListItemIcon>
            Add to Queue
          </MenuItem>
        )}
        <MenuItem onClick={handleAddToFavourites}>
          <ListItemIcon>
            {selectedSong?.saavnData && favouriteSongs.includes(selectedSong.saavnData.id) ? (
              <Heart fontSize="small" />
            ) : (
              <Heart fontSize="small" />
            )}
          </ListItemIcon>
          {selectedSong?.saavnData && favouriteSongs.includes(selectedSong.saavnData.id) ? 'Remove from Favorites' : 'Add to Favorites'}
        </MenuItem>
      </Menu>

    </Box>
  );
};

export default AllSongsPage;

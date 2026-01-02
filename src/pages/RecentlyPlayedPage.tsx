import React, { useEffect, useState } from 'react';
import { Box, Typography, List, IconButton, Menu, MenuItem, ListItemIcon, Container } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import { Song } from '../types/api';
import SongItem from '../components/SongItem';
import { FAVOURITE_SONGS_KEY, getMeta, persistFavourites, readFavourites, setMeta } from '../services/storage';

interface RecentlyPlayedPageProps {
  onBack: () => void;
  onSongSelect: (song: Song, contextSongs?: Song[]) => void;
  onAddToQueue?: (song: Song) => void;
  onPlayNext?: (song: Song) => void;
  onShowSnackbar?: (message: string) => void;
}

const RecentlyPlayedPage: React.FC<RecentlyPlayedPageProps> = ({ onBack, onSongSelect, onAddToQueue, onPlayNext, onShowSnackbar }) => {
  const [recentSongs, setRecentSongs] = useState<Song[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);

  useEffect(() => {
    const loadRecentSongs = async () => {
      try {
        const stored = (await getMeta('recentlyPlayed')) as Song[] | undefined;
        if (stored && Array.isArray(stored)) {
          setRecentSongs(stored);
        }
      } catch (error) {
        console.warn('Unable to load recently played', error);
      }
    };

    loadRecentSongs();
  }, []);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, song: Song) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedSong(song);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedSong(null);
  };

  const handlePlayNow = () => {
    if (selectedSong) {
      onSongSelect(selectedSong);
    }
    handleMenuClose();
  };

  const handlePlayNext = () => {
    if (selectedSong && onPlayNext) {
      onPlayNext(selectedSong);
    }
    handleMenuClose();
  };

  const handleAddToQueue = () => {
    if (selectedSong && onAddToQueue) {
      onAddToQueue(selectedSong);
    }
    handleMenuClose();
  };

  const handleAddToFavourites = async () => {
    if (selectedSong) {
      try {
        const favourites = await readFavourites(FAVOURITE_SONGS_KEY);
        const exists = favourites.some((fav: any) => fav.id === selectedSong.id);
        
        if (!exists) {
          const newFav = {
            id: selectedSong.id,
            name: selectedSong.name,
            artist: selectedSong.primaryArtists || 'Unknown Artist',
            albumArt: getImageUrl(selectedSong.image),
            addedAt: Date.now(),
          };
          const updated = [...favourites, newFav];
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

  const handleClearRecent = async () => {
    try {
      await setMeta('recentlyPlayed', []);
    } catch (error) {
      console.warn('Unable to clear recent songs', error);
    }
    setRecentSongs([]);
  };

  const decodeHtmlEntities = (text: string): string => {
    if (!text) return text;
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
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

    return imageArray[0]?.url || imageArray[0]?.link || '';
  };

  return (
    <Box sx={{ pb: 14, pt: 0 }}>
      {/* Fixed header */}
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
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600, fontSize: '1.1rem', flex: 1, pl: 0.5 }} noWrap>
            Recently Played
          </Typography>
          {recentSongs.length > 0 && (
            <IconButton
              onClick={handleClearRecent}
              size="small"
              sx={{ color: 'text.secondary' }}
              title="Clear all recently played songs"
            >
              <ClearAllIcon />
            </IconButton>
          )}
        </Container>
      </Box>

      {/* Spacer to offset fixed header height */}
      <Box sx={{ height: { xs: 56, sm: 64 }, width: '100%' }} />

      {/* Songs List */}
      {recentSongs.length === 0 ? (
        <Box sx={{ textAlign: 'center', mt: 8, px: 2 }}>
          <Typography variant="body1" color="text.secondary">
            No recently played songs
          </Typography>
        </Box>
      ) : (
        <List sx={{ px: 2 }}>
          {recentSongs.map((song) => (
            <SongItem
              key={song.id}
              title={decodeHtmlEntities(song.name)}
              artist={decodeHtmlEntities(song.primaryArtists || 'Unknown Artist')}
              imageSrc={getImageUrl(song.image)}
              onClick={() => onSongSelect(song, recentSongs)}
              rightContent={
                <IconButton
                  edge="end"
                  onClick={(e) => handleMenuOpen(e, song)}
                >
                  <MoreVertIcon />
                </IconButton>
              }
            />
          ))}
        </List>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handlePlayNow}>
          <ListItemIcon>
            <PlayArrowIcon fontSize="small" />
          </ListItemIcon>
          <Typography variant="body2">Play Now</Typography>
        </MenuItem>
        <MenuItem onClick={handlePlayNext}>
          <ListItemIcon>
            <PlaylistAddIcon fontSize="small" />
          </ListItemIcon>
          <Typography variant="body2">Play Next</Typography>
        </MenuItem>
        <MenuItem onClick={handleAddToQueue}>
          <ListItemIcon>
            <QueueMusicIcon fontSize="small" />
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
  );
};

export default RecentlyPlayedPage;

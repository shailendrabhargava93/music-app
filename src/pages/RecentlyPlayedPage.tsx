import React, { useEffect, useState } from 'react';
import { Box, Typography, List, ListItem, ListItemAvatar, Avatar, ListItemText, IconButton, Menu, MenuItem, ListItemIcon } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { Song } from '../types/api';

interface RecentlyPlayedPageProps {
  onBack: () => void;
  onSongSelect: (song: Song) => void;
  onAddToQueue?: (song: Song) => void;
  onPlayNext?: (song: Song) => void;
  onShowSnackbar?: (message: string) => void;
}

const RecentlyPlayedPage: React.FC<RecentlyPlayedPageProps> = ({ onBack, onSongSelect, onAddToQueue, onPlayNext, onShowSnackbar }) => {
  const [recentSongs, setRecentSongs] = useState<Song[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);

  useEffect(() => {
    // Load recently played songs from localStorage
    const loadRecentSongs = () => {
      const stored = localStorage.getItem('recentlyPlayed');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setRecentSongs(parsed);
        } catch (error) {
          // Error parsing recent songs
        }
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

  const handleAddToFavourites = () => {
    if (selectedSong) {
      const favourites = JSON.parse(localStorage.getItem('favouriteSongs') || '[]');
      const exists = favourites.some((fav: any) => fav.id === selectedSong.id);
      
      if (!exists) {
        const newFav = {
          id: selectedSong.id,
          name: selectedSong.name,
          artist: selectedSong.primaryArtists || 'Unknown Artist',
          albumArt: getImageUrl(selectedSong.image),
          addedAt: Date.now(),
        };
        favourites.push(newFav);
        localStorage.setItem('favouriteSongs', JSON.stringify(favourites));
        if (onShowSnackbar) {
          onShowSnackbar('Added to favourites ❤️');
        }
      }
    }
    handleMenuClose();
  };

  const handleClearRecent = () => {
    localStorage.removeItem('recentlyPlayed');
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
    <Box sx={{ pb: 10 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, px: 2, pt: 2 }}>
        <IconButton onClick={onBack} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Recently Played
          </Typography>
          {recentSongs.length > 0 && (
            <Typography
              variant="body2"
              onClick={handleClearRecent}
              sx={{
                color: 'primary.main',
                cursor: 'pointer',
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              Clear All
            </Typography>
          )}
        </Box>
      </Box>

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
            <ListItem
              key={song.id}
              onClick={() => onSongSelect(song)}
              sx={{
                borderRadius: 1,
                mb: 1,
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
            >
              <ListItemAvatar>
                <Avatar
                  src={getImageUrl(song.image)}
                  alt={song.name}
                  variant="rounded"
                  sx={{ width: 56, height: 56 }}
                />
              </ListItemAvatar>
              <ListItemText
                primary={decodeHtmlEntities(song.name)}
                secondary={decodeHtmlEntities(song.primaryArtists || 'Unknown Artist')}
                sx={{
                  ml: 2,
                  mr: 1.5,
                  pr: 0.5,
                  '& .MuiListItemText-primary': {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  },
                  '& .MuiListItemText-secondary': {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  },
                }}
              />
              <IconButton
                edge="end"
                onClick={(e) => handleMenuOpen(e, song)}
              >
                <MoreVertIcon />
              </IconButton>
            </ListItem>
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

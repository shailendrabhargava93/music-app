import React, { useEffect, useState } from 'react';
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
  Button,
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

interface PlaylistPageProps {
  playlistId: string;
  playlistName: string;
  playlistImage: string;
  onBack: () => void;
  onSongSelect: (song: any) => void;
  type?: 'playlist' | 'album';
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

  // Check if playlist/album is in favourites
  useEffect(() => {
    const storageKey = type === 'album' ? 'favouriteAlbums' : 'favouritePlaylists';
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const favourites = JSON.parse(saved);
        const exists = favourites.some((item: any) => item.id === playlistId);
        setIsFavourite(exists);
      } catch (e) {
        // Error checking favourites
      }
    }
  }, [playlistId, type]);

  const toggleFavourite = () => {
    const storageKey = type === 'album' ? 'favouriteAlbums' : 'favouritePlaylists';
    const saved = localStorage.getItem(storageKey);
    let favourites = [];
    
    try {
      favourites = saved ? JSON.parse(saved) : [];
    } catch (e) {
      favourites = [];
    }

    if (isFavourite) {
      // Remove from favourites
      favourites = favourites.filter((item: any) => item.id !== playlistId);
      setIsFavourite(false);
    } else {
      // Add to favourites
      const newFavourite = {
        id: playlistId,
        name: playlistName,
        image: playlistImage,
        artist: type === 'album' ? 'Various Artists' : '',
        description: type === 'playlist' ? playlistName : '',
        addedAt: Date.now(),
      };
      favourites.push(newFavourite);
      setIsFavourite(true);
    }

    localStorage.setItem(storageKey, JSON.stringify(favourites));
  };

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

  const handleAddToFavourites = () => {
    if (selectedSong) {
      const saved = localStorage.getItem('favouriteSongs');
      let favourites = [];
      
      try {
        favourites = saved ? JSON.parse(saved) : [];
      } catch (e) {
        favourites = [];
      }

      const exists = favourites.some((song: any) => song.id === selectedSong.id);
      
      if (!exists) {
        const newFavourite = {
          id: selectedSong.id,
          name: selectedSong.name,
          artist: getArtistNames(selectedSong),
          albumArt: getHighQualityImage(selectedSong.image),
          addedAt: Date.now(),
        };
        favourites.push(newFavourite);
        localStorage.setItem('favouriteSongs', JSON.stringify(favourites));
        if (onShowSnackbar) {
          onShowSnackbar('Added to favourites ❤️');
        }
      }
    }
    handleMenuClose();
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
    
    const fetchPlaylist = async () => {
      try {
        setLoading(true);
        setError(false);
        
        const response = type === 'album' 
          ? await saavnApi.getAlbumById(playlistId)
          : await saavnApi.getPlaylistById(playlistId);
        
        if (response.success && response.data) {
          const playlistSongs = response.data.songs || [];
          setSongs(playlistSongs);
        } else {
          setError(true);
        }
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylist();
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
    <Box sx={{ pb: 16, minHeight: '100vh' }}>
      {/* Header with Back Button */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          pt: 1.5,
          pb: 1.5,
          mb: 2,
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
          Playlist
        </Typography>
      </Box>

      {/* Playlist Header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          px: 2,
          pb: 1,
          mb: 1.5,
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? 'linear-gradient(180deg, rgba(0, 188, 212, 0.1) 0%, transparent 100%)'
              : 'linear-gradient(180deg, rgba(0, 188, 212, 0.05) 0%, transparent 100%)',
        }}
      >
        <Avatar
          src={playlistImage}
          variant="rounded"
          sx={{
            width: 160,
            height: 160,
            mb: 2,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
          }}
        >
          <PlayArrowIcon sx={{ fontSize: 80 }} />
        </Avatar>
        <Typography
          variant="h5"
          sx={{
            color: 'text.primary',
            fontWeight: 'bold',
            textAlign: 'center',
            mb: 1,
            fontSize: '1.25rem',
            px: 2,
            lineHeight: 1.2,
          }}
        >
          {decodeHtmlEntities(playlistName)}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, fontSize: '0.9rem' }}>
          {songs.length} songs
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          {songs.length > 0 && (
            <IconButton
              onClick={() => {
                if (songs.length > 0) {
                  onSongSelect(songs[0]);
                }
              }}
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                width: 56,
                height: 56,
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
              }}
            >
              <PlayArrowIcon sx={{ fontSize: 32 }} />
            </IconButton>
          )}
          <IconButton
            onClick={toggleFavourite}
            sx={{
              bgcolor: isFavourite ? 'rgba(255, 82, 82, 0.1)' : 'action.hover',
              color: isFavourite ? 'error.main' : 'text.secondary',
              width: 40,
              height: 40,
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
            px: 3,
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
        <Box sx={{ px: 2 }}>
          <List sx={{ bgcolor: 'transparent', p: 0 }}>
            {songs.map((song, index) => (
              <ListItem
                key={song.id || index}
                sx={{
                  cursor: 'pointer',
                  borderRadius: 1,
                  px: 1,
                  py: 1,
                  mb: 0.5,
                  '&:hover': {
                    bgcolor: (theme) =>
                      theme.palette.mode === 'light'
                        ? 'rgba(0, 188, 212, 0.08)'
                        : 'rgba(255, 255, 255, 0.05)',
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
                  onClick={() => onSongSelect(song)}
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
                  onClick={() => onSongSelect(song)}
                  sx={{ cursor: 'pointer', mr: 1, pr: 1 }}
                  primary={
                    <Typography
                      sx={{
                        color: 'text.primary',
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        pr: 1,
                      }}
                    >
                      {decodeHtmlEntities(song.name)}
                    </Typography>
                  }
                  secondary={
                    <Box sx={{ pr: 1 }}>
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

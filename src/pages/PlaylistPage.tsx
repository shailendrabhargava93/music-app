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
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { saavnApi } from '../services/saavnApi';

interface PlaylistPageProps {
  playlistId: string;
  playlistName: string;
  playlistImage: string;
  onBack: () => void;
  onSongSelect: (song: any) => void;
  type?: 'playlist' | 'album';
}

const PlaylistPage: React.FC<PlaylistPageProps> = ({
  playlistId,
  playlistName,
  playlistImage,
  onBack,
  onSongSelect,
  type = 'playlist',
}) => {
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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
          px: 3,
          pb: 2,
          mb: 2,
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
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
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
          }}
        >
          {decodeHtmlEntities(playlistName)}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          {songs.length} songs
        </Typography>
        {songs.length > 0 && (
          <Button
            variant="contained"
            startIcon={<PlayArrowIcon />}
            onClick={() => {
              if (songs.length > 0) {
                onSongSelect(songs[0]);
              }
            }}
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              px: 4,
              py: 1.5,
              borderRadius: '50px',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1rem',
              '&:hover': {
                bgcolor: 'primary.dark',
              },
            }}
          >
            Play All
          </Button>
        )}
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
                onClick={() => onSongSelect(song)}
                sx={{
                  cursor: 'pointer',
                  borderRadius: 1,
                  px: 1,
                  py: 1.5,
                  mb: 0.5,
                  '&:hover': {
                    bgcolor: (theme) =>
                      theme.palette.mode === 'light'
                        ? 'rgba(0, 188, 212, 0.08)'
                        : 'rgba(255, 255, 255, 0.05)',
                  },
                }}
              >
                <ListItemAvatar sx={{ minWidth: 72 }}>
                  <Avatar
                    src={getHighQualityImage(song.image)}
                    variant="rounded"
                    sx={{ width: 56, height: 56 }}
                  >
                    <MusicNoteIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
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

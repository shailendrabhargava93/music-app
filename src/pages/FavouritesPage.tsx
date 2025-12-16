import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  IconButton,
  Container,
} from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import FavoriteIcon from '@mui/icons-material/Favorite';
import DeleteIcon from '@mui/icons-material/Delete';

interface FavouriteSong {
  id: string;
  name: string;
  artist: string;
  albumArt: string;
  addedAt: number;
}

interface FavouritesPageProps {
  onSongSelect: (songId: string) => void;
}

const FavouritesPage: React.FC<FavouritesPageProps> = ({ onSongSelect }) => {
  const [favourites, setFavourites] = useState<FavouriteSong[]>([]);

  // Load favourites from localStorage
  useEffect(() => {
    loadFavourites();
  }, []);

  const loadFavourites = () => {
    const saved = localStorage.getItem('favouriteSongs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFavourites(parsed);
      } catch (e) {
        setFavourites([]);
      }
    }
  };

  const removeFavourite = (songId: string) => {
    const updated = favourites.filter(song => song.id !== songId);
    setFavourites(updated);
    localStorage.setItem('favouriteSongs', JSON.stringify(updated));
  };

  // Decode HTML entities in strings
  const decodeHtmlEntities = (text: string): string => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        bgcolor: 'background.default',
        pb: 16,
        pt: 3
      }}
    >
      <Container maxWidth="md">
        <Box sx={{ px: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <FavoriteIcon sx={{ color: 'primary.main', fontSize: 32 }} />
            <Typography 
              variant="h5" 
              sx={{ 
                color: 'text.primary', 
                fontWeight: 'bold'
              }}
            >
              Your Favourites
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {favourites.length} {favourites.length === 1 ? 'song' : 'songs'}
          </Typography>
        </Box>

        {favourites.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '60vh',
              gap: 2,
              px: 3,
            }}
          >
            <FavoriteIcon sx={{ fontSize: 80, color: 'text.disabled', opacity: 0.3 }} />
            <Typography variant="h6" sx={{ color: 'text.secondary', textAlign: 'center' }}>
              No favourite songs yet
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.disabled', textAlign: 'center' }}>
              Add songs to your favourites by tapping the heart icon while playing
            </Typography>
          </Box>
        ) : (
          <List sx={{ px: 2 }}>
            {favourites.map((song) => (
              <ListItem
                key={song.id}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  px: 1,
                  py: 1.5,
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
                    onClick={() => removeFavourite(song.id)}
                    sx={{
                      color: 'error.main',
                      '&:hover': {
                        bgcolor: 'error.light',
                        color: 'error.dark',
                      },
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemAvatar 
                  sx={{ minWidth: 72, cursor: 'pointer' }}
                  onClick={() => onSongSelect(song.id)}
                >
                  <Avatar
                    src={song.albumArt}
                    variant="rounded"
                    sx={{ width: 56, height: 56 }}
                  >
                    <MusicNoteIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  onClick={() => onSongSelect(song.id)}
                  sx={{ 
                    cursor: 'pointer',
                    mr: 1,
                    minWidth: 0,
                    flex: 1
                  }}
                  primary={
                    <Typography
                      sx={{
                        color: 'text.primary',
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        pr: 1
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
                        {decodeHtmlEntities(song.artist)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                        Added {formatDate(song.addedAt)}
                      </Typography>
                    </Box>
                  }
                  secondaryTypographyProps={{ component: 'div' }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Container>
    </Box>
  );
};

export default FavouritesPage;

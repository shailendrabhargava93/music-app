import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  IconButton,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { Song } from '../types/api';

interface UpNextDrawerProps {
  open: boolean;
  onClose: () => void;
  suggestions: Song[];
  loading: boolean;
  onSongSelect: (song: Song) => void;
}

const UpNextDrawer: React.FC<UpNextDrawerProps> = ({
  open,
  onClose,
  suggestions,
  loading,
  onSongSelect,
}) => {
  const getHighQualityImage = (images: Array<{ quality: string; url?: string; link?: string }>) => {
    if (!images || images.length === 0) return '';
    const qualities = ['500x500', '150x150', '50x50'];
    for (const quality of qualities) {
      const img = images.find((img) => img.quality === quality);
      if (img) return img.url || img.link || '';
    }
    return images[0]?.url || images[0]?.link || '';
  };

  const handleSongClick = (song: Song) => {
    onSongSelect(song);
    onClose();
  };

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          maxHeight: '70vh',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          bgcolor: 'background.paper',
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
            Up Next
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Loading State */}
        {loading && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              py: 4,
              gap: 2,
            }}
          >
            <CircularProgress size={40} sx={{ color: 'primary.main' }} />
            <Typography variant="body2" color="text.secondary">
              Loading suggestions...
            </Typography>
          </Box>
        )}

        {/* Suggestions List */}
        {!loading && suggestions.length > 0 && (
          <List sx={{ p: 0 }}>
            {suggestions.filter(song => song && song.id).map((song, index) => (
              <ListItem
                key={song.id || index}
                onClick={() => handleSongClick(song)}
                sx={{
                  cursor: 'pointer',
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
              >
                <ListItemAvatar sx={{ minWidth: 60 }}>
                  <Avatar
                    src={song.image ? getHighQualityImage(song.image) : ''}
                    variant="rounded"
                    sx={{ width: 48, height: 48 }}
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
                      {song.name || 'Unknown Song'}
                    </Typography>
                  }
                  secondary={
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'text.secondary',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {(() => {
                        if (song.artists?.primary && Array.isArray(song.artists.primary)) {
                          return song.artists.primary.map((artist: any) => artist.name).join(', ');
                        }
                        return song.primaryArtists || 'Unknown Artist';
                      })()}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}

        {/* Empty State */}
        {!loading && suggestions.length === 0 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              py: 4,
              gap: 1,
            }}
          >
            <MusicNoteIcon sx={{ fontSize: 60, color: 'text.disabled', opacity: 0.3 }} />
            <Typography variant="body2" color="text.secondary">
              No suggestions available
            </Typography>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default UpNextDrawer;

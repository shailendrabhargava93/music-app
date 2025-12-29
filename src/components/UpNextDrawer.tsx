import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  List,
  IconButton,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { Song } from '../types/api';
import SongListItem from './SongListItem';

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
  const getHighQualityImage = (
    images: Array<{ quality: string; url?: string; link?: string }>
  ) => {
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
      PaperProps={{
        sx: {
          borderRadius: '16px 16px 0 0',
          maxHeight: '70vh',
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Sticky Header (fixed, like Details drawer) */}
      <Box
        sx={{
          bgcolor: 'background.default',
          color: 'text.primary',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          Up Next
        </Typography>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ color: 'text.secondary' }}
          aria-label="close"
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Scrollable Content */}
      <Box sx={{ p: 1.25, maxHeight: '60vh', overflowY: 'auto' }}>
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
            {suggestions.filter((song) => song && song.id).map((song, index) => (
              <SongListItem
                key={song.id || index}
                title={song.name || 'Unknown Song'}
                artist={(() => {
                  const songAny = song as any;
                  if (songAny.artists?.primary && Array.isArray(songAny.artists.primary)) {
                    return songAny.artists.primary.map((artist: any) => artist.name).join(', ');
                  }
                  return song.primaryArtists || 'Unknown Artist';
                })()}
                avatarSrc={song.image ? getHighQualityImage(song.image) : ''}
                onClick={() => handleSongClick(song)}
              />
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

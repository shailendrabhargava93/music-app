import React, { useState, useEffect, useRef } from 'react';
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
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { Song } from '../types/api';
import SongItem from './SongItem';

interface UpNextDrawerProps {
  open: boolean;
  onClose: () => void;
  suggestions: Song[];
  loading: boolean;
  onSongSelect: (song: Song) => void;
  onReorder?: (newOrder: Song[]) => void;
}

const UpNextDrawer: React.FC<UpNextDrawerProps> = ({
  open,
  onClose,
  suggestions,
  loading,
  onSongSelect,
  onReorder,
}) => {
  const [items, setItems] = useState<Song[]>(suggestions || []);
  const dragIndexRef = useRef<number | null>(null);

  useEffect(() => {
    setItems(suggestions || []);
  }, [suggestions]);

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    dragIndexRef.current = index;
    try {
      e.dataTransfer.setData('text/plain', String(index));
    } catch (err) {
      // ignore
    }
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (_index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const from = dragIndexRef.current;
    const to = index;
    if (from === null || from === undefined) return;
    if (from === to) return;
    const updated = [...items];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setItems(updated);
    dragIndexRef.current = null;
    if (onReorder) onReorder(updated);
  };
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

  const decodeHtmlEntities = (text: string): string => {
    if (!text) return text;
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    const decoded = textarea.value;
    if (decoded.includes('&')) {
      textarea.innerHTML = decoded;
      return textarea.value;
    }
    return decoded;
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
          p: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '0.95rem' }}>
          Up Next
        </Typography>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ color: 'text.secondary' }}
          aria-label="close"
        >
          <CloseIcon fontSize="small" />
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
        {!loading && items.length > 0 && (
          <List sx={{ p: 0 }}>
            {items.filter((song) => song && song.id).map((song, index) => (
              <Box
                key={song.id || index}
                draggable
                onDragStart={handleDragStart(index)}
                onDragOver={handleDragOver(index)}
                onDrop={handleDrop(index)}
                sx={{ cursor: 'grab' }}
              >
                <SongItem
                  title={decodeHtmlEntities(song.name || 'Unknown Song')}
                  artist={(() => {
                    const songAny = song as any;
                    if (songAny.artists?.primary && Array.isArray(songAny.artists.primary)) {
                      return songAny.artists.primary.map((artist: any) => artist.name).join(', ');
                    }
                    return song.primaryArtists || 'Unknown Artist';
                  })()}
                  imageSrc={song.image ? getHighQualityImage(song.image) : ''}
                  onClick={() => handleSongClick(song)}
                  rightContent={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <DragIndicatorIcon sx={{ color: 'text.secondary', fontSize: 20, pointerEvents: 'none' }} />
                    </Box>
                  }
                />
              </Box>
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

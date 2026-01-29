import React, { useState, useEffect, useRef } from 'react';
import {
  Drawer,
  Box,
  Typography,
  List,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Close, MusicNote, DragIndicator } from '../icons';
import { Song } from '../types/api';
import SongItem from './SongItem';
import { decodeHtmlEntities, getBestImage } from '../utils/normalize';

type AnyRecord = Record<string, unknown>;

interface UpNextDrawerProps {
  open: boolean;
  onClose: () => void;
  items: Song[];
  loading: boolean;
  onSongSelect: (song: Song) => void;
  onReorder?: (newOrder: Song[]) => void;
  currentSongId?: string | null;
}

const UpNextDrawer: React.FC<UpNextDrawerProps> = ({
  open,
  onClose,
  items: initialItems,
  loading,
  onSongSelect,
  onReorder,
  currentSongId,
}) => {
  const [items, setItems] = useState<Song[]>(initialItems || []);
  const dragIndexRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [maxHeight, setMaxHeight] = useState<number>(60); // percent of viewport
  const draggingRef = useRef(false);
  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(60);

  useEffect(() => {
    setItems(initialItems || []);
  }, [initialItems]);

  useEffect(() => {
    let rafId: number | null = null;
    const handleTouchMove = (ev: TouchEvent) => {
      if (!draggingRef.current) return;
      const touch = ev.touches[0];
      const dy = startYRef.current - touch.clientY;
      const compute = () => {
        const newHeight = Math.min(90, Math.max(30, startHeightRef.current + (dy / window.innerHeight) * 100));
        setMaxHeight(newHeight);
        rafId = null;
      };
      if (rafId == null) rafId = requestAnimationFrame(compute);
    };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!draggingRef.current) return;
      const dy = startYRef.current - ev.clientY;
      const compute = () => {
        const newHeight = Math.min(90, Math.max(30, startHeightRef.current + (dy / window.innerHeight) * 100));
        setMaxHeight(newHeight);
        rafId = null;
      };
      if (rafId == null) rafId = requestAnimationFrame(compute);
    };

    const stopDrag = () => {
      draggingRef.current = false;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      // Snap-to-full behavior: if user drags past 75% of viewport, expand to full
      setMaxHeight(prev => {
        if (prev >= 75) return 100;
        if (prev <= 35) return 35;
        return prev;
      });
    };

    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchend', stopDrag);
    window.addEventListener('mouseup', stopDrag);

    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchend', stopDrag);
      window.removeEventListener('mouseup', stopDrag);
    };
  }, []);

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    dragIndexRef.current = index;
    try {
      e.dataTransfer.setData('text/plain', String(index));
    } catch {
      // ignore
    }
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
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

  const startDragTouch = (clientY: number) => {
    draggingRef.current = true;
    startYRef.current = clientY;
    startHeightRef.current = maxHeight;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    startDragTouch(e.touches[0].clientY);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    startDragTouch(e.clientY);
  };
  const getHighQualityImage = (images: unknown) => getBestImage(images);

  // use shared `decodeHtmlEntities` from utils

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
          maxHeight: `${maxHeight}vh`,
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Drag handle */}
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 0.75, cursor: 'ns-resize' }}>
        <Box
          onTouchStart={handleTouchStart}
          onMouseDown={handleMouseDown}
          sx={{ width: 48, height: 6, borderRadius: 3, bgcolor: 'divider' }}
        />
      </Box>

      {/* Sticky Header (fixed, like Details drawer) */}
      <Box
        sx={{
          
          color: 'text.primary',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '0.95rem' }}>
            Up Next
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ color: 'text.secondary' }}
          aria-label="close"
        >
          <Close fontSize="small" />
        </IconButton>
      </Box>

      {/* Scrollable Content */}
      <Box ref={containerRef} sx={{ p: 1.25, maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
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
            <CircularProgress size={36} sx={{ color: 'primary.main' }} />
            <Typography variant="body2" color="text.secondary">Loading...</Typography>
          </Box>
        )}

        {/* List */}
        {!loading && items.length > 0 && (
          <List sx={{ p: 0 }}>
            {items.filter((song) => song && song.id).map((song, index) => {
              const isPlaying = !!currentSongId && String(song.id) === String(currentSongId);
              return (
                  <Box
                  key={song.id || index}
                  draggable
                  onDragStart={handleDragStart(index)}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop(index)}
                  sx={{ cursor: 'grab' }}
                >
                  <SongItem
                    title={decodeHtmlEntities(song.name || 'Unknown Song')}
                    artist={(() => {
                      const s = song as AnyRecord;
                      const artistsObj = s['artists'] as AnyRecord | undefined;
                      const primary = artistsObj && Array.isArray(artistsObj['primary']) ? artistsObj['primary'] as AnyRecord[] : undefined;
                      if (primary && primary.length > 0) {
                        return primary.map(a => String((a && (a as AnyRecord)['name']) || '')).filter(Boolean).join(', ');
                      }
                      return (s['primaryArtists'] as string) || (song.primaryArtists as string) || 'Unknown Artist';
                    })()}
                    imageSrc={song.image ? getHighQualityImage(song.image) : ''}
                    onClick={() => handleSongClick(song)}
                    highlight={isPlaying}
                    playing={isPlaying}
                    rightContent={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {isPlaying && (
                          <Box sx={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Box sx={{ display: 'flex', gap: 0.3, alignItems: 'end' }}>
                              {[0,1,2].map(i => (
                                <Box key={i} sx={(theme) => ({ width: 3, height: 6 + (i * 4), bgcolor: theme.palette.primary.main, borderRadius: 1, animation: `eq-small 600ms ${i * 120}ms infinite linear` })} />
                              ))}
                            </Box>
                          </Box>
                        )}
                        <DragIndicator sx={{ color: 'text.secondary', fontSize: 20, pointerEvents: 'none' }} />
                      </Box>
                    }
                  />
                </Box>
              );
            })}
          </List>
        )}

        {/* Empty State */}
        {!loading && items.length === 0 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              py: 4,
              gap: 1,
            }}
          >
            <MusicNote sx={{ fontSize: 60, color: 'text.disabled', opacity: 0.3 }} />
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

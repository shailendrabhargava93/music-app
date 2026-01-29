import React from 'react';
import { Box, List, Typography } from '@mui/material';
import SongItemSkeleton from './SongItemSkeleton';

interface TrackListProps<T> {
  items: T[];
  loading?: boolean;
  renderItem: (item: T, index: number) => React.ReactNode;
  emptyMessage?: string;
  renderEmpty?: React.ReactNode;
  skeletonCount?: number;
  keyExtractor?: (item: T, index: number) => string | number;
}

function TrackList<T>({
  items,
  loading = false,
  renderItem,
  emptyMessage = 'No items',
  skeletonCount = 6,
  keyExtractor,
  renderEmpty,
}: TrackListProps<T>) {
  const defaultKey = (item: unknown, idx: number) => {
    const obj = item as Record<string, unknown> | undefined;
    const candidate = obj && (obj['id'] ?? obj['key'] ?? obj['name']);
    return (candidate ?? idx) as string | number;
  };

  if (loading) {
    return (
      <Box sx={{ px: 2 }}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <SongItemSkeleton key={i} />
        ))}
      </Box>
    );
  }

  if (!items || items.length === 0) {
    if (renderEmpty) return <>{renderEmpty}</>;
    return (
      <Box sx={{ textAlign: 'center', mt: 8, px: 2 }}>
        <Typography variant="body1" color="text.secondary">{emptyMessage}</Typography>
      </Box>
    );
  }

  return (
    <List sx={{ px: 2 }}>
      {items.map((item, idx) => (
        <li key={keyExtractor ? keyExtractor(item, idx) : defaultKey(item, idx)}>
          {renderItem(item, idx)}
        </li>
      ))}
    </List>
  );
}

export default TrackList;

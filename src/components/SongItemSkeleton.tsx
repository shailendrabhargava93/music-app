import React from 'react';
import { Box, Skeleton } from '@mui/material';

const SongItemSkeleton: React.FC = () => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, py: 0.5 }}>
      <Skeleton variant="rectangular" width={56} height={56} sx={{ borderRadius: 1.5 }} />
      <Box sx={{ flex: 1 }}>
        <Skeleton width="60%" height={24} />
        <Skeleton width="40%" height={18} sx={{ mt: 0.5 }} />
      </Box>
      <Skeleton variant="circular" width={36} height={36} />
    </Box>
  );
};

export default SongItemSkeleton;

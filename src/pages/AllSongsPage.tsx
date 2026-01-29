import React from 'react';
import { Box, Typography } from '@mui/material';
import PageHeader from '../components/PageHeader';
import { Song } from '../types/api';

interface AllSongsPageProps {
  onBack?: () => void;
  onSongSelect?: (song: Song) => void;
}

const AllSongsPage: React.FC<AllSongsPageProps> = ({ onBack }) => {
  return (
    <Box sx={{ pb: 10, minHeight: '100vh', pt: 0 }}>
      <PageHeader title="All Songs" onBack={onBack} position="fixed" />
      <Box sx={{ px: 2, pb: 12, mt: 8 }}>
        <Typography variant="body2" color="text.secondary">
          The full "All Songs" view is temporarily disabled while refactoring.
        </Typography>
      </Box>
    </Box>
  );
};

export default AllSongsPage;

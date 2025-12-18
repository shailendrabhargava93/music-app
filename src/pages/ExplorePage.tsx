import React, { useState } from 'react';
import { Box, Typography, Chip, List, ListItem, ListItemAvatar, Avatar, ListItemText, IconButton, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import { saavnApi } from '../services/saavnApi';

interface ExplorePageProps {
  onPlaylistSelect: (playlistId: string, playlistName: string, playlistImage: string) => void;
}

const moods = [
  { label: 'Chill', color: '#00BCD4' },
  { label: 'Commute', color: '#FFC107' },
  { label: 'Feel good', color: '#4CAF50' },
  { label: 'Party', color: '#9C27B0' },
  { label: 'Romance', color: '#F44336' },
  { label: 'Sad', color: '#9E9E9E' },
  { label: 'Sleep', color: '#673AB7' },
  { label: 'Workout', color: '#FF5722' },
];

const genres = [
  { label: 'Bengali', color: '#FFC107' },
  { label: 'Bhojpuri', color: '#9C27B0' },
  { label: 'Carnatic classical', color: '#FF9800' },
  { label: 'Classical', color: '#607D8B' },
  { label: 'Dance & electronic', color: '#00BCD4' },
  { label: 'Devotional', color: '#607D8B' },
  { label: 'Family', color: '#00BCD4' },
  { label: 'Folk & acoustic', color: '#4CAF50' },
  { label: 'Ghazal/sufi', color: '#00BCD4' },
  { label: 'Gujarati', color: '#FF5722' },
  { label: 'Haryanvi', color: '#00BCD4' },
  { label: 'Hindi', color: '#FFC107' },
  { label: 'Hindustani classical', color: '#9C27B0' },
  { label: 'Hip-hop', color: '#FF5722' },
  { label: 'Indian indie', color: '#9E9E9E' },
  { label: 'Indian pop', color: '#4CAF50' },
  { label: 'Indie & alternative', color: '#9E9E9E' },
  { label: 'J-Pop', color: '#E91E63' },
  { label: 'Jazz', color: '#2196F3' },
  { label: 'K-Pop', color: '#9C27B0' },
  { label: 'Kannada', color: '#FFC107' },
  { label: 'Malayalam', color: '#4CAF50' },
  { label: 'Marathi', color: '#9C27B0' },
  { label: 'Metal', color: '#607D8B' },
  { label: 'Monsoon', color: '#FFC107' },
  { label: 'Pop', color: '#E91E63' },
  { label: 'Punjabi', color: '#FF5722' },
  { label: 'R&B & soul', color: '#673AB7' },
  { label: 'Reggae & caribbean', color: '#FFC107' },
  { label: 'Rock', color: '#F44336' },
  { label: 'Tamil', color: '#F44336' },
  { label: 'Telugu', color: '#E91E63' },
];

const ExplorePage: React.FC<ExplorePageProps> = ({ onPlaylistSelect }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleCategoryClick = async (category: string) => {
    setSelectedCategory(category);
    setLoading(true);

    try {
      // Check cache first
      const cacheKey = `explore_${category.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      const cachedData = localStorage.getItem(cacheKey);
      const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
      const cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours

      if (cachedData && cacheTimestamp) {
        const age = Date.now() - parseInt(cacheTimestamp);
        if (age < cacheExpiry) {
          setPlaylists(JSON.parse(cachedData));
          setLoading(false);
          return;
        }
      }

      // Fetch from API
      const response = await saavnApi.searchPlaylists(category, 10);
      if (response?.data?.results) {
        const fetchedPlaylists = response.data.results.slice(0, 10);
        setPlaylists(fetchedPlaylists);
        
        // Cache the results
        localStorage.setItem(cacheKey, JSON.stringify(fetchedPlaylists));
        localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
      }
    } catch (error) {
      // Error fetching playlists
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedCategory(null);
    setPlaylists([]);
  };

  const getImageUrl = (images: Array<{ quality: string; url: string }>) => {
    if (!images || images.length === 0) return '';
    const qualities = ['500x500', '150x150', '50x50'];
    for (const quality of qualities) {
      const img = images.find(img => img.quality === quality);
      if (img?.url) return img.url;
    }
    return images[images.length - 1]?.url || '';
  };

  const decodeHtmlEntities = (text: string): string => {
    if (!text) return text;
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  };

  if (selectedCategory) {
    return (
      <Box sx={{ pb: 10 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, px: 2, pt: 2 }}>
          <IconButton onClick={handleBack} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {selectedCategory}
          </Typography>
        </Box>

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Playlists List */}
        {!loading && playlists.length > 0 && (
          <List sx={{ px: 2 }}>
            {playlists.map((playlist) => (
              <ListItem
                key={playlist.id}
                onClick={() => onPlaylistSelect(playlist.id, decodeHtmlEntities(playlist.name), getImageUrl(playlist.image))}
                sx={{
                  borderRadius: 1,
                  mb: 1,
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <ListItemAvatar>
                  <Avatar
                    src={getImageUrl(playlist.image)}
                    variant="rounded"
                    sx={{ width: 56, height: 56 }}
                  >
                    <PlaylistPlayIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={decodeHtmlEntities(playlist.name)}
                  secondary={`${playlist.songCount || 0} songs`}
                  sx={{
                    ml: 2,
                    '& .MuiListItemText-primary': {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    },
                  }}
                />
              </ListItem>
            ))}
          </List>
        )}

        {/* No Results */}
        {!loading && playlists.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
            <Typography variant="body1" color="text.secondary">
              No playlists found
            </Typography>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 10, px: 2, pt: 2 }}>
      {/* Moods & Moments Section */}
      <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: 'text.primary' }}>
        Moods & moments
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 4 }}>
        {moods.map((mood) => (
          <Box key={mood.label} sx={{ width: 'calc(50% - 6px)', minWidth: 140 }}>
            <Chip
              label={mood.label}
              onClick={() => handleCategoryClick(mood.label)}
              sx={{
                width: '100%',
                height: 48,
                fontSize: '0.95rem',
                fontWeight: 500,
                bgcolor: (theme) => 
                  theme.palette.mode === 'light' 
                    ? 'rgba(0, 0, 0, 0.04)' 
                    : 'rgba(255, 255, 255, 0.05)',
                color: 'text.primary',
                borderLeft: `4px solid ${mood.color}`,
                borderRadius: 1,
                justifyContent: 'flex-start',
                border: (theme) => 
                  theme.palette.mode === 'light' 
                    ? '1px solid rgba(0, 0, 0, 0.08)' 
                    : 'none',
                '&:hover': {
                  bgcolor: (theme) => 
                    theme.palette.mode === 'light' 
                      ? 'rgba(0, 0, 0, 0.08)' 
                      : 'rgba(255, 255, 255, 0.1)',
                },
                '& .MuiChip-label': {
                  px: 2,
                },
              }}
            />
          </Box>
        ))}
      </Box>

      {/* Genres Section */}
      <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: 'text.primary' }}>
        Genres
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        {genres.map((genre) => (
          <Box key={genre.label} sx={{ width: 'calc(50% - 6px)', minWidth: 140 }}>
            <Chip
              label={genre.label}
              onClick={() => handleCategoryClick(genre.label)}
              sx={{
                width: '100%',
                height: 48,
                fontSize: '0.95rem',
                fontWeight: 500,
                bgcolor: (theme) => 
                  theme.palette.mode === 'light' 
                    ? 'rgba(0, 0, 0, 0.04)' 
                    : 'rgba(255, 255, 255, 0.05)',
                color: 'text.primary',
                borderLeft: `4px solid ${genre.color}`,
                borderRadius: 1,
                justifyContent: 'flex-start',
                border: (theme) => 
                  theme.palette.mode === 'light' 
                    ? '1px solid rgba(0, 0, 0, 0.08)' 
                    : 'none',
                '&:hover': {
                  bgcolor: (theme) => 
                    theme.palette.mode === 'light' 
                      ? 'rgba(0, 0, 0, 0.08)' 
                      : 'rgba(255, 255, 255, 0.1)',
                },
                '& .MuiChip-label': {
                  px: 2,
                },
              }}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default ExplorePage;

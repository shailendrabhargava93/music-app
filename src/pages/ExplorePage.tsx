import React, { useState } from 'react';
import { Box, Typography, Chip, List, ListItem, ListItemAvatar, Avatar, ListItemText, IconButton, CircularProgress, Theme } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import { saavnApi } from '../services/saavnApi';

interface ExplorePageProps {
  onPlaylistSelect: (playlistId: string, playlistName: string, playlistImage: string) => void;
}

const moods = ['Chill', 'Commute', 'Feel good', 'Party', 'Romance', 'Sad', 'Sleep', 'Workout'];
const genres = [
  'Bengali',
  'Bhojpuri',
  'Carnatic classical',
  'Classical',
  'Dance & electronic',
  'Devotional',
  'Family',
  'Folk & acoustic',
  'Ghazal/sufi',
  'Gujarati',
  'Haryanvi',
  'Hindi',
  'Hindustani classical',
  'Hip-hop',
  'Indian indie',
  'Indian pop',
  'Indie & alternative',
  'J-Pop',
  'Jazz',
  'K-Pop',
  'Kannada',
  'Malayalam',
  'Marathi',
  'Metal',
  'Monsoon',
  'Pop',
  'Punjabi',
  'R&B & soul',
  'Reggae & caribbean',
  'Rock',
  'Tamil',
  'Telugu',
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

  const borderedContainerStyles = (theme: Theme) => ({
    borderRadius: 3,
    bgcolor: theme.palette.background.paper,
    p: { xs: 1, sm: 1.5 },
  });

  if (selectedCategory) {
    return (
      <Box sx={{ pb: 12, pt: 1, px: { xs: 1, sm: 1.5 } }}>
        <Box sx={borderedContainerStyles}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
            <IconButton onClick={handleBack}>
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
            <List sx={{ px: 0 }}>
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
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="body1" color="text.secondary">
                No playlists found
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 12, px: { xs: 1, sm: 1.5 }, pt: 1 }}>
      <Box sx={borderedContainerStyles}>
        {/* Moods & Moments Section */}
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: 'text.primary' }}>
          Moods & moments
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
          {moods.map((mood) => (
            <Box key={mood} sx={{ width: 'calc(50% - 6px)', minWidth: 120, mb: 1 }}>
              <Chip
                label={mood}
                onClick={() => handleCategoryClick(mood)}
                sx={{
                  width: '100%',
                  height: 48,
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  border: (theme) => `1px solid ${theme.palette.primary.main}`,
                  borderRadius: 2,
                  justifyContent: 'flex-start',
                  transition: 'transform 0.2s ease, background-color 0.2s ease',
                  boxShadow: 'none',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    bgcolor: (theme) => theme.palette.primary.main,
                    color: '#fff',
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
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}> 
          {genres.map((genre) => (
            <Box key={genre} sx={{ width: 'calc(50% - 6px)', minWidth: 120, mb: 1 }}>
              <Chip
                label={genre}
                onClick={() => handleCategoryClick(genre)}
                sx={{
                  width: '100%',
                  height: 48,
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  border: (theme) => `1px solid ${theme.palette.primary.main}`,
                  borderRadius: 2,
                  justifyContent: 'flex-start',
                  transition: 'transform 0.2s ease, background-color 0.2s ease',
                  boxShadow: 'none',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    bgcolor: (theme) => theme.palette.primary.main,
                    color: '#fff',
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
    </Box>
  );
};

export default ExplorePage;

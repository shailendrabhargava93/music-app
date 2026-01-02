import React, { useState, useEffect } from 'react';
import { Box, Typography, Chip, IconButton, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
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
    // persist current selection so navigation back restores it
    try {
      localStorage.setItem('explore:selectedCategory', category);
    } catch (e) {
      // ignore
    }
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
    try {
      localStorage.removeItem('explore:selectedCategory');
    } catch (e) {
      // ignore
    }
  };

  // Restore last selected category on mount (if any)
  useEffect(() => {
    try {
      const last = localStorage.getItem('explore:selectedCategory');
      if (last) {
        // load cached playlists or fetch
        handleCategoryClick(last);
      }
    } catch (e) {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <Box sx={{ pb: 10, minHeight: '100vh', pt: 0 }}>
      {selectedCategory ? (
        <>
          {/* Sticky header - match AllSongsPage style */}
          <Box
            sx={(theme) => ({
              position: 'sticky',
              top: 0,
              zIndex: theme.zIndex.appBar,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.25,
              py: 0.325,
              justifyContent: 'flex-start',
              width: '100%',
              backgroundColor: theme.palette.background.default,
              boxShadow: `0 1px 6px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.1)'}`,
              mt: 0,
              mb: 1,
            })}
          >
            <IconButton
              onClick={handleBack}
              sx={{
                color: 'text.primary',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600, fontSize: '1.1rem', pl: 0.5 }} noWrap>
              {selectedCategory}
            </Typography>
          </Box>

          <Box sx={{ px: 2, pb: 8 }}>
            {/* Loading State */}
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            )}

            {/* Playlists List */}
            {!loading && playlists.length > 0 && (
              <Box>
                {playlists.map((playlist) => (
                  <Box
                    key={playlist.id}
                    onClick={() => onPlaylistSelect(playlist.id, decodeHtmlEntities(playlist.name), getImageUrl(playlist.image))}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      mb: 1,
                      p: 0.5,
                      cursor: 'pointer',
                      borderRadius: 1,
                      '&:hover': {
                        bgcolor: (theme) =>
                          theme.palette.mode === 'light'
                            ? 'rgba(0, 188, 212, 0.08)'
                            : 'rgba(255, 255, 255, 0.05)',
                      },
                    }}
                  >
                    {/* Image */}
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 1,
                        overflow: 'hidden',
                        flexShrink: 0,
                        bgcolor: 'action.hover',
                      }}
                    >
                      <img
                        src={getImageUrl(playlist.image)}
                        alt={decodeHtmlEntities(playlist.name)}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    </Box>

                    {/* Text Content */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body1"
                        sx={{
                          color: 'text.primary',
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {decodeHtmlEntities(playlist.name)}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'text.secondary',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {`${playlist.songCount || 0} songs`}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
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
        </>
      ) : (
        <Box sx={{ px: 2, pt: 1, pb: 8 }}>
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
                  size="small"
                  sx={{
                    width: '100%',
                    height: 36,
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    bgcolor: 'background.paper',
                    color: 'text.primary',
                    border: (theme) => `1px solid ${theme.palette.primary.main}`,
                    borderRadius: 2,
                    justifyContent: 'flex-start',
                    transition: 'transform 0.15s ease, background-color 0.15s ease',
                    boxShadow: 'none',
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      bgcolor: (theme) => theme.palette.primary.main,
                      color: '#fff',
                    },
                    '& .MuiChip-label': {
                      px: 1,
                      py: 0.25,
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
                  size="small"
                  sx={{
                    width: '100%',
                    height: 36,
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    bgcolor: 'background.paper',
                    color: 'text.primary',
                    border: (theme) => `1px solid ${theme.palette.primary.main}`,
                    borderRadius: 2,
                    justifyContent: 'flex-start',
                    transition: 'transform 0.15s ease, background-color 0.15s ease',
                    boxShadow: 'none',
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      bgcolor: (theme) => theme.palette.primary.main,
                      color: '#fff',
                    },
                    '& .MuiChip-label': {
                      px: 1,
                      py: 0.25,
                    },
                  }}
                />
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ExplorePage;

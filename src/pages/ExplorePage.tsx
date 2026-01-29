import React, { useState, useEffect, useCallback } from 'react';
import type { Theme } from '@mui/material/styles';
import { Box, Typography, Chip, Skeleton } from '@mui/material';
import PageHeader from '../components/PageHeader';
import { saavnApi } from '../services/saavnApi';
import { readLocalJson, writeLocalJson } from '../services/storage';
import { decodeHtmlEntities } from '../utils/normalize';
import SongItemSkeleton from '../components/SongItemSkeleton';

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
  type AnyRecord = Record<string, unknown>;
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<AnyRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const handleCategoryClick = useCallback(async (category: string) => {
    setSelectedCategory(category);
    // persist current selection so navigation back restores it
    try {
      localStorage.setItem('explore:selectedCategory', category);
    } catch {
      // ignore
    }
    setLoading(true);

    try {
      // Check cache first
      const cacheKey = `explore_${category.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      const cachedData = readLocalJson<AnyRecord[]>(cacheKey, null as unknown as AnyRecord[] | null);
      const cacheTimestamp = readLocalJson<string | null>(`${cacheKey}_timestamp`, null as unknown as string | null);
      const cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
      if (cachedData && cacheTimestamp) {
        const age = Date.now() - parseInt(cacheTimestamp);
        if (age < cacheExpiry) {
          setPlaylists(cachedData);
          setLoading(false);
          return;
        }
      }

      // Fetch from API
      const response = await saavnApi.searchPlaylists(category, 10);
      if (response?.data?.results) {
        const fetchedPlaylists = response.data.results.slice(0, 10) as AnyRecord[];
        setPlaylists(fetchedPlaylists);
        
        // Cache the results
        writeLocalJson(cacheKey, fetchedPlaylists);
        localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
      }
    } catch {
      // Error fetching playlists
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleBack = () => {
    setSelectedCategory(null);
    setPlaylists([]);
    try {
      localStorage.removeItem('explore:selectedCategory');
    } catch {
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
    } catch {
      // ignore
    }
    
  }, [handleCategoryClick]);

  const getImageUrl = (images: Array<{ quality: string; url: string }>) => {
    if (!images || images.length === 0) return '';
    const qualities = ['500x500', '150x150', '50x50'];
    for (const quality of qualities) {
      const img = images.find(img => img.quality === quality);
      if (img?.url) return img.url;
    }
    return images[images.length - 1]?.url || '';
  };

  // use shared `decodeHtmlEntities` from utils

  return (
    <Box sx={{ pb: 10, minHeight: '100vh', pt: 0 }}>
      {selectedCategory ? (
        <>
          <PageHeader title={selectedCategory} onBack={handleBack} position="fixed" />

          <Box sx={{ px: 2, pb: 8 }}>
            {/* Loading State */}
            {loading && (
              <Box>
                {/* Header skeleton to match other pages' sticky header */}
                <Box sx={{ position: 'sticky', top: 0, zIndex: (t) => t.zIndex.appBar, px: 1.25, py: 0.5, bgcolor: 'background.default' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Skeleton variant="circular" width={40} height={40} />
                    <Skeleton width="40%" height={28} />
                  </Box>
                </Box>

                {/* Playlist skeleton list */}
                <Box sx={{ px: 2, pt: 2 }}>
                  {[...Array(6)].map((_, i) => (
                    <SongItemSkeleton key={i} />
                  ))}
                </Box>
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
                        bgcolor: (theme: Theme) =>
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

import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Avatar, Skeleton } from '@mui/material';
import Header from '../components/Header';
import { Song } from '../types/api';
import { SoundChartsItem } from '../services/soundChartsApi';
import { saavnApi } from '../services/saavnApi';
import AlbumIcon from '@mui/icons-material/Album';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';

interface HomePageProps {
  onSongSelect: (song: Song) => void;
  chartSongs: ChartSongWithSaavn[];
  chartSongsLoading: boolean;
  onViewAllCharts: () => void;
  onAlbumSelect: (albumId: string, albumName: string, albumImage: string) => void;
  onPlaylistSelect: (playlistId: string, playlistName: string, playlistImage: string) => void;
}

interface ChartSongWithSaavn extends SoundChartsItem {
  saavnData?: Song;
  isSearching?: boolean;
}

const HomePage: React.FC<HomePageProps> = ({ onSongSelect, chartSongs, chartSongsLoading, onViewAllCharts, onAlbumSelect, onPlaylistSelect }) => {
  const [displayedSongs, setDisplayedSongs] = useState<ChartSongWithSaavn[]>([]);
  const [latestAlbums, setLatestAlbums] = useState<any[]>([]);
  const [albumsLoading, setAlbumsLoading] = useState(true);
  const [albumsFetched, setAlbumsFetched] = useState(false);
  const [trendingPlaylists, setTrendingPlaylists] = useState<any[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(true);
  const [playlistsFetched, setPlaylistsFetched] = useState(false);

  // Fetch latest albums only once
  useEffect(() => {
    const fetchLatestAlbums = async () => {
      if (albumsFetched) return; // Skip if already fetched
      
      try {
        setAlbumsLoading(true);
        const response = await saavnApi.searchAlbums('latest', 10);
        if (response?.data?.results) {
          setLatestAlbums(response.data.results.slice(0, 10));
          setAlbumsFetched(true); // Mark as fetched
        }
      } catch (error) {
        // Error fetching albums
      } finally {
        setAlbumsLoading(false);
      }
    };

    fetchLatestAlbums();
  }, [albumsFetched]);

  // Fetch trending playlists only once
  useEffect(() => {
    const fetchTrendingPlaylists = async () => {
      if (playlistsFetched) return;
      
      try {
        setPlaylistsLoading(true);
        const response = await saavnApi.searchPlaylists('2025', 10);
        if (response?.data?.results) {
          setTrendingPlaylists(response.data.results.slice(0, 10));
          setPlaylistsFetched(true);
        }
      } catch (error) {
        // Error fetching playlists
      } finally {
        setPlaylistsLoading(false);
      }
    };

    fetchTrendingPlaylists();
  }, [playlistsFetched]);

  // Update displayed songs - show only first 10 on home page
  useEffect(() => {
    if (chartSongs.length > 0) {
      setDisplayedSongs(chartSongs.slice(0, 10));
    }
  }, [chartSongs]);

  const handleSongClick = (song: ChartSongWithSaavn) => {
    if (song.saavnData) {
      onSongSelect(song.saavnData);
    }
  };

  const getImageUrl = (imageArray: any[]): string => {
    if (!Array.isArray(imageArray) || imageArray.length === 0) {
      return '';
    }

    const qualities = ['150x150', '500x500', '50x50'];
    
    for (const quality of qualities) {
      const img = imageArray.find((img: any) => img.quality === quality);
      if (img) {
        return img.url || img.link || '';
      }
    }
    
    const firstImg = imageArray[0];
    return firstImg?.url || firstImg?.link || '';
  };

  const getHighQualityImage = (images: Array<{ quality: string; url: string }>) => {
    if (!images || images.length === 0) return '';
    const qualities = ['500x500', '150x150', '50x50'];
    for (const quality of qualities) {
      const img = images.find(img => img.quality === quality);
      if (img?.url) return img.url;
    }
    return images[images.length - 1]?.url || '';
  };

  return (
    <Box sx={{ pb: 16 }}>
      <Header />
      
      <Box sx={{ px: 2, pt: 2 }}>
        {/* Latest Albums Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ color: 'text.secondary', mb: 2, fontWeight: 500 }}>
            Latest Albums
          </Typography>

          {albumsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={32} sx={{ color: 'primary.main' }} />
            </Box>
          ) : (
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                overflowX: 'auto',
                pb: 2,
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                '&::-webkit-scrollbar': {
                  display: 'none',
                },
              }}
            >
              {latestAlbums.map((album) => (
                <Box
                  key={album.id}
                  onClick={() => onAlbumSelect(album.id, album.name, getHighQualityImage(album.image))}
                  sx={{
                    minWidth: 140,
                    maxWidth: 140,
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'scale(1.05)',
                    },
                  }}
                >
                  <Avatar
                    src={getHighQualityImage(album.image)}
                    variant="rounded"
                    sx={{
                      width: 140,
                      height: 140,
                      mb: 1,
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    <AlbumIcon sx={{ fontSize: 60 }} />
                  </Avatar>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: 'text.primary',
                    }}
                  >
                    {album.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'block',
                    }}
                  >
                    {album.artists?.primary?.[0]?.name || 'Various Artists'}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* Trending Playlists Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ color: 'text.secondary', mb: 2, fontWeight: 500 }}>
            Trending Playlists
          </Typography>

          {playlistsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={32} sx={{ color: 'primary.main' }} />
            </Box>
          ) : (
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                overflowX: 'auto',
                pb: 2,
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                '&::-webkit-scrollbar': {
                  display: 'none',
                },
              }}
            >
              {trendingPlaylists.map((playlist) => (
                <Box
                  key={playlist.id}
                  onClick={() => onPlaylistSelect(playlist.id, playlist.name, getHighQualityImage(playlist.image))}
                  sx={{
                    minWidth: 140,
                    maxWidth: 140,
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'scale(1.05)',
                    },
                  }}
                >
                  <Avatar
                    src={getHighQualityImage(playlist.image)}
                    variant="rounded"
                    sx={{
                      width: 140,
                      height: 140,
                      mb: 1,
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    <PlaylistPlayIcon sx={{ fontSize: 60 }} />
                  </Avatar>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: 'text.primary',
                    }}
                  >
                    {playlist.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'block',
                    }}
                  >
                    {playlist.songCount} songs
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* Trending Songs Section */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            Trending now
          </Typography>
          {chartSongs.length > 10 && (
            <Typography
              variant="body2"
              onClick={onViewAllCharts}
              sx={{
                color: 'primary.main',
                cursor: 'pointer',
                fontWeight: 600,
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              View All
            </Typography>
          )}
        </Box>

        {chartSongsLoading && displayedSongs.length === 0 && (
          <Box>
            {[...Array(10)].map((_, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  mb: 1,
                  p: 1.5,
                }}
              >
                <Skeleton variant="text" width={40} height={40} sx={{ flexShrink: 0 }} />
                <Skeleton variant="rounded" width={56} height={56} sx={{ flexShrink: 0 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Skeleton variant="text" width="70%" height={24} />
                  <Skeleton variant="text" width="50%" height={20} />
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {displayedSongs.length > 0 && (
          <Box>
            {displayedSongs.map((item) => (
              <Box
                key={item.position}
                onClick={() => handleSongClick(item)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  mb: 1,
                  p: 1.5,
                  borderRadius: 1,
                  cursor: item.saavnData ? 'pointer' : 'default',
                  opacity: item.saavnData ? 1 : 0.7,
                  transition: 'background-color 0.2s',
                  '&:hover': item.saavnData ? {
                    backgroundColor: (theme) => 
                      theme.palette.mode === 'light'
                        ? 'rgba(0, 188, 212, 0.08)'
                        : 'rgba(255, 255, 255, 0.05)',
                  } : {},
                }}
              >
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 1,
                    overflow: 'hidden',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {item.isSearching ? (
                    <CircularProgress size={24} sx={{ color: 'primary.main' }} />
                  ) : item.saavnData?.image && item.saavnData.image.length > 0 ? (
                    <img
                      src={getImageUrl(item.saavnData.image)}
                      alt={item.song.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : item.song.imageUrl ? (
                    <img
                      src={item.song.imageUrl}
                      alt={item.song.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Typography sx={{ color: 'text.disabled', fontSize: '1.5rem' }}>
                      ♪
                    </Typography>
                  )}
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.song.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.song.creditName}
                  </Typography>
                </Box>

                {item.isSearching && (
                  <Typography
                    variant="caption"
                    color="text.disabled"
                    sx={{ fontSize: '0.7rem' }}
                  >
                    Finding...
                  </Typography>
                )}
                {!item.isSearching && !item.saavnData && (
                  <Typography
                    variant="caption"
                    color="text.disabled"
                    sx={{ fontSize: '0.7rem' }}
                  >
                    Not available
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default HomePage;

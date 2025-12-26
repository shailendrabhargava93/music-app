import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Avatar,
  Skeleton,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import Header from '../components/Header';
import { Song } from '../types/api';
import { SoundChartsItem } from '../services/soundChartsApi';
import { saavnApi } from '../services/saavnApi';
import AlbumIcon from '@mui/icons-material/Album';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { FAVOURITE_SONGS_KEY, persistFavourites, readFavourites, getMeta, setMeta } from '../services/storage';

interface HomePageProps {
  onSongSelect: (song: Song, contextSongs?: Song[]) => void;
  chartSongs: ChartSongWithSaavn[];
  chartSongsLoading: boolean;
  onViewAllCharts: () => void;
  onAlbumSelect: (albumId: string, albumName: string, albumImage: string) => void;
  onPlaylistSelect: (playlistId: string, playlistName: string, playlistImage: string) => void;
  onArtistSelect: (artistId: string, artistName: string, artistImage: string) => void;
  onRecentlyPlayedClick?: () => void;
  onSettingsClick?: () => void;
  onAddToQueue?: (song: Song) => void;
  onPlayNext?: (song: Song) => void;
  onShowSnackbar?: (message: string) => void;
}

interface ChartSongWithSaavn extends SoundChartsItem {
  saavnData?: Song;
  isSearching?: boolean;
}

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;
const LATEST_ALBUMS_KEY = 'latestAlbums';
const LATEST_ALBUMS_TIMESTAMP_KEY = 'latestAlbumsTimestamp';
const TRENDING_PLAYLISTS_KEY = 'trendingPlaylists';
const TRENDING_PLAYLISTS_TIMESTAMP_KEY = 'trendingPlaylistsTimestamp';
const TOP_ARTISTS_QUERY = 'latest';
const TOP_ARTISTS_LIMIT = 12;
const TOP_ARTISTS_SEARCH_LIMIT = 30;

interface ArtistPreview {
  id?: string;
  name?: string;
  image?: string;
}

const getHighQualityImage = (images?: Array<{ quality?: string; url?: string; link?: string }>): string => {
  if (!images || images.length === 0) return '';
  const qualities = ['500x500', '150x150', '50x50'];
  for (const quality of qualities) {
    const img = images.find(image => image.quality === quality);
    if (img?.url) return img.url;
    if (img?.link) return img.link;
  }
  const fallback = images.find(image => image.url || image.link);
  if (fallback) {
    return fallback.url || fallback.link || '';
  }
  return '';
};

const normalizeArtistName = (raw?: string): string => {
  const decoded = decodeHtmlEntities(raw || '');
  return decoded.replace(/\s+/g, ' ').trim();
};


const collectArtistImageSources = (candidate: any): Array<{ quality?: string; url?: string; link?: string }> => {
  const sources: Array<{ quality?: string; url?: string; link?: string }> = [];
  if (!candidate) return sources;
  if (Array.isArray(candidate.image)) {
    sources.push(...candidate.image.filter(Boolean));
  }
  if (Array.isArray(candidate.images)) {
    sources.push(...candidate.images.filter(Boolean));
  }
  if (candidate.imageUrl) {
    sources.push({ link: candidate.imageUrl });
  }
  if (candidate.cover) {
    sources.push({ link: candidate.cover });
  }
  if (candidate.thumbnail) {
    sources.push({ link: candidate.thumbnail });
  }
  if (candidate.avatar) {
    if (typeof candidate.avatar === 'string') {
      sources.push({ link: candidate.avatar });
    } else if (candidate.avatar?.url) {
      sources.push({ link: candidate.avatar.url });
    }
  }
  if (candidate.avatarUrl) {
    sources.push({ link: candidate.avatarUrl });
  }
  return sources;
};

const decodeHtmlEntities = (text: string): string => {
  if (!text || typeof document === 'undefined') return text;
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
};

const HomePage: React.FC<HomePageProps> = ({
  onSongSelect,
  chartSongs,
  chartSongsLoading,
  onViewAllCharts,
  onAlbumSelect,
  onPlaylistSelect,
  onArtistSelect,
  onRecentlyPlayedClick,
  onSettingsClick,
  onAddToQueue,
  onPlayNext,
  onShowSnackbar,
}) => {
  const [displayedSongs, setDisplayedSongs] = useState<ChartSongWithSaavn[]>([]);
  const [latestAlbums, setLatestAlbums] = useState<any[]>([]);
  const [albumsLoading, setAlbumsLoading] = useState(true);
  const [albumsFetched, setAlbumsFetched] = useState(false);
  const [trendingPlaylists, setTrendingPlaylists] = useState<any[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(true);
  const [playlistsFetched, setPlaylistsFetched] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedSong, setSelectedSong] = useState<ChartSongWithSaavn | null>(null);
  const [favouriteSongs, setFavouriteSongs] = useState<string[]>([]);
  const [topArtists, setTopArtists] = useState<ArtistPreview[]>([]);
  const [topArtistsLoading, setTopArtistsLoading] = useState(false);
  const [topArtistsError, setTopArtistsError] = useState<string | null>(null);

  // Fetch latest albums only once
  useEffect(() => {
    const fetchLatestAlbums = async () => {
      if (albumsFetched) return; // Skip if already fetched
      
      try {
        setAlbumsLoading(true);
        const cachedData = await getMeta(LATEST_ALBUMS_KEY);
        const cacheTimestamp = await getMeta(LATEST_ALBUMS_TIMESTAMP_KEY);
        const parsedTimestamp =
          typeof cacheTimestamp === 'number'
            ? cacheTimestamp
            : Number(cacheTimestamp);
        
        if (
          Array.isArray(cachedData) &&
          Number.isFinite(parsedTimestamp) &&
          Date.now() - parsedTimestamp < CACHE_DURATION_MS
        ) {
          setLatestAlbums(cachedData);
          setAlbumsFetched(true);
          return;
        }
        
        const response = await saavnApi.searchAlbums('latest', 10);
        if (response?.data?.results) {
          const albums = response.data.results.slice(0, 10);
          setLatestAlbums(albums);
          setAlbumsFetched(true);
          await setMeta(LATEST_ALBUMS_KEY, albums);
          await setMeta(LATEST_ALBUMS_TIMESTAMP_KEY, Date.now());
        }
      } catch (error) {
        console.warn('Failed to load latest albums', error);
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
        const cachedData = await getMeta(TRENDING_PLAYLISTS_KEY);
        const cacheTimestamp = await getMeta(TRENDING_PLAYLISTS_TIMESTAMP_KEY);
        const parsedTimestamp =
          typeof cacheTimestamp === 'number'
            ? cacheTimestamp
            : Number(cacheTimestamp);
        
        if (
          Array.isArray(cachedData) &&
          Number.isFinite(parsedTimestamp) &&
          Date.now() - parsedTimestamp < CACHE_DURATION_MS
        ) {
          setTrendingPlaylists(cachedData);
          setPlaylistsFetched(true);
          return;
        }
        
        const response = await saavnApi.searchPlaylists('2025', 10);
        if (response?.data?.results) {
          const playlists = response.data.results.slice(0, 10);
          setTrendingPlaylists(playlists);
          setPlaylistsFetched(true);
          await setMeta(TRENDING_PLAYLISTS_KEY, playlists);
          await setMeta(TRENDING_PLAYLISTS_TIMESTAMP_KEY, Date.now());
        }
      } catch (error) {
        console.warn('Failed to load trending playlists', error);
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

  // Load favourite songs
  useEffect(() => {
    const loadFavouriteIds = async () => {
      const saved = await readFavourites(FAVOURITE_SONGS_KEY);
      setFavouriteSongs(saved.map((song: any) => song.id));
    };

    loadFavouriteIds();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchTopArtists = async () => {
      try {
        setTopArtistsLoading(true);
        setTopArtistsError(null);
        
        // Check cache first
        const cachedArtists = await getMeta('topArtists');
        const cachedTimestamp = await getMeta('topArtistsTimestamp');
        const now = Date.now();
        const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
        const parsedCachedTimestamp = typeof cachedTimestamp === 'number' ? cachedTimestamp : Number(cachedTimestamp);
        
        if (Array.isArray(cachedArtists) && Number.isFinite(parsedCachedTimestamp) && (now - parsedCachedTimestamp < CACHE_DURATION)) {
          if (isMounted) {
            setTopArtists(cachedArtists);
            setTopArtistsLoading(false);
          }
          return;
        }
        
        // Fetch fresh data
        const response = await saavnApi.searchArtists(TOP_ARTISTS_QUERY, TOP_ARTISTS_SEARCH_LIMIT);
        const candidates = response?.data?.results ?? [];
        const curated: ArtistPreview[] = [];
        const seen = new Set<string>();
        for (const candidate of candidates) {
          if (!candidate?.id || seen.has(candidate.id)) continue;
          seen.add(candidate.id);
          const normalizedName = normalizeArtistName(candidate.name);
          if (!normalizedName) continue;
          const image = getHighQualityImage(collectArtistImageSources(candidate));
          curated.push({ id: candidate.id, name: normalizedName, image });
          if (curated.length >= TOP_ARTISTS_LIMIT) break;
        }
        
        // Cache the results
        await setMeta('topArtists', curated);
        await setMeta('topArtistsTimestamp', now);
        
        if (isMounted) {
          setTopArtists(curated);
        }
      } catch (error) {
        console.warn('Failed to load top artists', error);
        if (isMounted) {
          setTopArtistsError('Unable to load artists right now');
        }
      } finally {
        if (isMounted) {
          setTopArtistsLoading(false);
        }
      }
    };

    fetchTopArtists();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSongClick = (song: ChartSongWithSaavn) => {
    if (song.saavnData) {
      // Pass all chart songs as context
      const allChartSongs = chartSongs.map(cs => cs.saavnData).filter((s): s is Song => s !== null);
      onSongSelect(song.saavnData, allChartSongs);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, song: ChartSongWithSaavn) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedSong(song);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedSong(null);
  };

  const handlePlayNext = () => {
    if (selectedSong?.saavnData && onPlayNext) {
      onPlayNext(selectedSong.saavnData);
    }
    handleMenuClose();
  };

  const handleAddToQueue = () => {
    if (selectedSong?.saavnData && onAddToQueue) {
      onAddToQueue(selectedSong.saavnData);
    }
    handleMenuClose();
  };

  const handleAddToFavourites = async () => {
    if (!selectedSong?.saavnData) return;

    try {
      const favourites = await readFavourites(FAVOURITE_SONGS_KEY);
      const isFavourite = favourites.some((song: any) => song.id === selectedSong.saavnData!.id);

      if (isFavourite) {
        const updated = favourites.filter((song: any) => song.id !== selectedSong.saavnData!.id);
        setFavouriteSongs(prev => prev.filter(id => id !== selectedSong.saavnData!.id));
        await persistFavourites(FAVOURITE_SONGS_KEY, updated);
        if (onShowSnackbar) {
          onShowSnackbar('Removed from favourites');
        }
      } else {
        const newFavourite = {
          id: selectedSong.saavnData.id,
          name: selectedSong.saavnData.name,
          artist: selectedSong.saavnData.primaryArtists,
          albumArt: selectedSong.saavnData.image && selectedSong.saavnData.image.length > 0 
            ? selectedSong.saavnData.image[0].link || ''
            : '',
          addedAt: Date.now(),
        };
        const updated = [...favourites, newFavourite];
        setFavouriteSongs(prev => [...prev, selectedSong.saavnData!.id]);
        await persistFavourites(FAVOURITE_SONGS_KEY, updated);
        if (onShowSnackbar) {
          onShowSnackbar('Added to favourites ❤️');
        }
      }
    } catch (error) {
      console.warn('Unable to update favourite songs', error);
    }
  };

  const handleArtistCardClick = (artist: ArtistPreview) => {
    if (!artist?.id) return;
    onArtistSelect(artist.id, artist.name || 'Artist', artist.image || '');
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

  return (
    <Box sx={{ pb: 14, pt: 0 }}>
      <Header 
        onRecentlyPlayedClick={onRecentlyPlayedClick}
        onSettingsClick={onSettingsClick}
      />
      
      <Box sx={{ px: 2 }}>
        {/* Latest Albums Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1.5, fontWeight: 500 }}>
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
                </Box>
              ))}
            </Box>
          )}
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ color: 'text.secondary', mb: 2, fontWeight: 500 }}>
            Top Artists
          </Typography>
          {topArtistsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} sx={{ color: 'primary.main' }} />
            </Box>
          ) : topArtistsError ? (
            <Typography variant="body2" color="error">
              {topArtistsError}
            </Typography>
          ) : topArtists.length > 0 ? (
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                overflowX: 'auto',
                pb: 1,
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                '&::-webkit-scrollbar': {
                  display: 'none',
                },
              }}
            >
              {topArtists.map((artist) => (
                <Box
                  key={artist.id ?? artist.name}
                  onClick={() => handleArtistCardClick(artist)}
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
                    src={artist.image || undefined}
                    variant="circular"
                    imgProps={{ loading: 'lazy' }}
                    sx={{
                      width: 140,
                      height: 140,
                      mb: 1,
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    <MusicNoteIcon sx={{ fontSize: 60 }} />
                  </Avatar>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: 'text.primary',
                      textAlign: 'center',
                    }}
                  >
                    {artist.name}
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No artists available right now.
            </Typography>
          )}
        </Box>

        {/* Trending Songs Section */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            Trending now
          </Typography>
          {chartSongs.length > 10 && (
            <IconButton
              onClick={onViewAllCharts}
              size="small"
              sx={{
                color: 'primary.main',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
              aria-label="view all trending songs"
            >
              <ArrowForwardIcon />
            </IconButton>
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
                  p: 0.5,
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

                {item.saavnData && (
                  <IconButton
                    onClick={(e) => handleMenuOpen(e, item)}
                    size="small"
                    sx={{ color: 'text.secondary' }}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                )}

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

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={() => selectedSong?.saavnData && onSongSelect(selectedSong.saavnData)}>
          <ListItemIcon>
            <PlayArrowIcon fontSize="small" />
          </ListItemIcon>
          Play
        </MenuItem>
        {onPlayNext && (
          <MenuItem onClick={handlePlayNext}>
            <ListItemIcon>
              <PlaylistAddIcon fontSize="small" />
            </ListItemIcon>
            Play Next
          </MenuItem>
        )}
        {onAddToQueue && (
          <MenuItem onClick={handleAddToQueue}>
            <ListItemIcon>
              <QueueMusicIcon fontSize="small" />
            </ListItemIcon>
            Add to Queue
          </MenuItem>
        )}
        <MenuItem onClick={handleAddToFavourites}>
          <ListItemIcon>
            {selectedSong?.saavnData && favouriteSongs.includes(selectedSong.saavnData.id) ? (
              <FavoriteIcon fontSize="small" />
            ) : (
              <FavoriteBorderIcon fontSize="small" />
            )}
          </ListItemIcon>
          {selectedSong?.saavnData && favouriteSongs.includes(selectedSong.saavnData.id) ? 'Remove from Favorites' : 'Add to Favorites'}
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default HomePage;

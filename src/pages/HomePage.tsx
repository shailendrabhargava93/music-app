import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Skeleton,
  IconButton,
  
} from '@mui/material';
import { Album, PlaylistPlay, ArrowForward, MusicNote } from '../icons';
import Header from '../components/Header';
import HorizontalScroller from '../components/HorizontalScroller';
import SongContextMenu from '../components/SongContextMenu';
import { Song } from '../types/api';
import { SoundChartsItem } from '../services/soundChartsApi';
import { saavnApi } from '../services/saavnApi';
import { decodeHtmlEntities, getBestImage } from '../utils/normalize';
// consolidated icons import above
import { FAVOURITE_SONGS_KEY, persistFavourites, readFavourites, getMeta, setMeta } from '../services/storage';

interface HomePageProps {
  onSongSelect: (song: Song, contextSongs?: Song[]) => void;
  chartSongs: ChartSongWithSaavn[];
  chartSongsLoading: boolean;
  onViewAllCharts: () => void;
  onAlbumSelect: (albumId: string, albumName: string, albumImage: string) => void;
  onPlaylistSelect: (playlistId: string, playlistName: string, playlistImage: string) => void;
  onArtistSelect: (artistId: string, artistName: string, artistImage: string) => void;
  onViewAllArtists?: () => void;
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
const NEW_ALBUMS_KEY = 'newAlbums';
const NEW_ALBUMS_TIMESTAMP_KEY = 'newAlbumsTimestamp';
const TRENDING_PLAYLISTS_KEY = 'trendingPlaylists';
const TRENDING_PLAYLISTS_TIMESTAMP_KEY = 'trendingPlaylistsTimestamp';
const TOP_CHARTS_KEY = 'topCharts';
const TOP_CHARTS_TIMESTAMP_KEY = 'topChartsTimestamp';
const RECOMMENDED_ARTISTS_KEY = 'recommendedArtists';
const RECOMMENDED_ARTISTS_TIMESTAMP_KEY = 'recommendedArtistsTimestamp';
const ARTIST_AVATAR_SIZE = 110;

interface ArtistPreview {
  id?: string;
  name?: string;
  image?: string;
}

type AnyRecord = Record<string, unknown>;

const getHighQualityImage = (images?: unknown): string => getBestImage(images);

const normalizeArtistName = (raw?: string): string => {
  const decoded = decodeHtmlEntities(raw || '');
  return decoded.replace(/\s+/g, ' ').trim();
};

const HomePage: React.FC<HomePageProps> = ({
  onSongSelect,
  chartSongs,
  chartSongsLoading,
  onViewAllCharts,
  onViewAllArtists,
  onAlbumSelect,
  onPlaylistSelect,
  onArtistSelect,
  onRecentlyPlayedClick,
  onSettingsClick,
  onAddToQueue,
  onPlayNext,
}) => {
  const [displayedSongs, setDisplayedSongs] = useState<ChartSongWithSaavn[]>([]);
  const [latestAlbums, setLatestAlbums] = useState<AnyRecord[]>([]);
  const [albumsLoading, setAlbumsLoading] = useState(true);
  const [albumsFetched, setAlbumsFetched] = useState(false);
  const [trendingPlaylists, setTrendingPlaylists] = useState<AnyRecord[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(true);
  const [playlistsFetched, setPlaylistsFetched] = useState(false);
  const [topCharts, setTopCharts] = useState<AnyRecord[]>([]);
  const [topChartsLoading, setTopChartsLoading] = useState(true);
  const [topChartsFetched, setTopChartsFetched] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedSong, setSelectedSong] = useState<ChartSongWithSaavn | null>(null);
  const [favouriteSongs, setFavouriteSongs] = useState<string[]>([]);
  const [recommendedArtists, setRecommendedArtists] = useState<ArtistPreview[]>([]);
  const [recommendedArtistsLoading, setRecommendedArtistsLoading] = useState(false);
  const [recommendedArtistsError, setRecommendedArtistsError] = useState<string | null>(null);
  const artistsContainerRef = React.useRef<HTMLDivElement | null>(null);

  // Fetch latest albums and trending playlists using the launch API
   
  useEffect(() => {
    if (albumsFetched && playlistsFetched && topChartsFetched) return;
    const fetchLaunchData = async () => {
      try {
        // Albums
        setAlbumsLoading(true);
        const cachedAlbums = await getMeta(NEW_ALBUMS_KEY);
        const cachedAlbumsTimestamp = await getMeta(NEW_ALBUMS_TIMESTAMP_KEY);
        const parsedAlbumsTimestamp = typeof cachedAlbumsTimestamp === 'number' ? cachedAlbumsTimestamp : Number(cachedAlbumsTimestamp);

        const albumsCacheValid =
          Array.isArray(cachedAlbums) &&
          Number.isFinite(parsedAlbumsTimestamp) &&
          Date.now() - parsedAlbumsTimestamp < CACHE_DURATION_MS;

        if (albumsCacheValid) {
          setLatestAlbums(cachedAlbums);
          setAlbumsFetched(true);
        }

        // Playlists
        setPlaylistsLoading(true);
        // Top Charts
        setTopChartsLoading(true);
        const cachedTopCharts = await getMeta(TOP_CHARTS_KEY);
        const cachedTopChartsTimestamp = await getMeta(TOP_CHARTS_TIMESTAMP_KEY);
        const parsedTopChartsTimestamp = typeof cachedTopChartsTimestamp === 'number' ? cachedTopChartsTimestamp : Number(cachedTopChartsTimestamp);

        const chartsCacheValid =
          Array.isArray(cachedTopCharts) &&
          Number.isFinite(parsedTopChartsTimestamp) &&
          Date.now() - parsedTopChartsTimestamp < CACHE_DURATION_MS;

        if (chartsCacheValid) {
          setTopCharts(cachedTopCharts);
          setTopChartsFetched(true);
        }
        const cachedPlaylists = await getMeta(TRENDING_PLAYLISTS_KEY);
        const cachedPlaylistsTimestamp = await getMeta(TRENDING_PLAYLISTS_TIMESTAMP_KEY);
        const parsedPlaylistsTimestamp = typeof cachedPlaylistsTimestamp === 'number' ? cachedPlaylistsTimestamp : Number(cachedPlaylistsTimestamp);

        const playlistsCacheValid =
          Array.isArray(cachedPlaylists) &&
          Number.isFinite(parsedPlaylistsTimestamp) &&
          Date.now() - parsedPlaylistsTimestamp < CACHE_DURATION_MS;

        if (playlistsCacheValid) {
          setTrendingPlaylists(cachedPlaylists);
          setPlaylistsFetched(true);
        }

        // If albums, playlists and charts are all cached and valid, skip network call
        if (albumsCacheValid && playlistsCacheValid && chartsCacheValid) {
          return;
        }

        // Call launch endpoint
        const launchResp = await saavnApi.launch();
        const payload = launchResp?.data ?? launchResp ?? {};

        // Helper to convert single image URL into the array format expected by getHighQualityImage
        const normalizeImage = (img: unknown) => {
          if (!img) return [];
          if (Array.isArray(img)) return img;
          if (typeof img === 'string') return [{ link: img }];
          return [];
        };

        // Map a launch album/play object to the shape HomePage expects
        const mapAlbum = (item: AnyRecord) => {
          const name = (item.title as string) ?? (item.name as string) ?? '';
          const image = normalizeImage(item.image ?? item.images ?? item.imageUrl);
          const primaryArtist = ((item.more_info as AnyRecord)?.artistMap as AnyRecord)?.artists?.[0]?.name as string | undefined || ((item.more_info as AnyRecord)?.artistMap as AnyRecord)?.primary_artists?.[0]?.name as string | undefined || (item.subtitle as string | undefined) || '';
          return {
            id: item.id,
            name,
            image,
            artists: { primary: [{ name: primaryArtist }] },
            type: item.type, // Preserve the type from API (song/album)
            // keep original for any other fallbacks
            _raw: item,
          };
        };

        const mapPlaylist = (item: AnyRecord) => {
          const name = (item.title as string) ?? (item.name as string) ?? '';
          const image = normalizeImage(item.image ?? item.images ?? item.imageUrl);
          return {
            id: item.id,
            name,
            image,
            _raw: item,
          };
        };

        // Use launch payload arrays directly — do not filter, merge, or deduplicate.
        const albumsSource: AnyRecord[] = Array.isArray(payload.new_albums) ? payload.new_albums : [];
        const playlistsSource: AnyRecord[] = Array.isArray(payload.top_playlists) ? payload.top_playlists : [];
        const chartsSource: AnyRecord[] = Array.isArray(payload.top_charts)
          ? payload.top_charts
          : Array.isArray(payload.charts)
          ? payload.charts
          : Array.isArray(payload.top_songs)
          ? payload.top_songs
          : [];

        const albumsMapped = albumsSource.map(mapAlbum);
        const playlistsMapped = playlistsSource.map(mapPlaylist);
        const chartsMapped = chartsSource.map((item: AnyRecord) => {
          const name = (item.title as string) ?? (item.name as string) ?? (item.song as string) ?? (item.trackName as string) ?? '';
          const image = normalizeImage(item.image ?? item.images ?? item.imageUrl ?? item.thumbnail ?? item.cover);
          const primaryArtist = (((item.more_info as AnyRecord)?.artistMap as AnyRecord)?.artists?.[0]?.name as string | undefined) || (((item.more_info as AnyRecord)?.artistMap as AnyRecord)?.primary_artists?.[0]?.name as string | undefined) || (item.subtitle as string | undefined) || (item.artist as string | undefined) || '';
          return {
            id: item.id || item.songId || item.trackId || item.sid || name,
            name,
            image,
            artists: { primary: [{ name: primaryArtist }] },
            _raw: item,
          };
        });

        if (albumsMapped.length > 0 && !albumsFetched) {
          setLatestAlbums(albumsMapped);
          setAlbumsFetched(true);
          await setMeta(NEW_ALBUMS_KEY, albumsMapped);
          await setMeta(NEW_ALBUMS_TIMESTAMP_KEY, Date.now());
        }

        if (playlistsMapped.length > 0 && !playlistsFetched) {
          setTrendingPlaylists(playlistsMapped);
          setPlaylistsFetched(true);
          await setMeta(TRENDING_PLAYLISTS_KEY, playlistsMapped);
          await setMeta(TRENDING_PLAYLISTS_TIMESTAMP_KEY, Date.now());
        }

        if (chartsMapped.length > 0 && !topChartsFetched) {
          setTopCharts(chartsMapped);
          setTopChartsFetched(true);
          await setMeta(TOP_CHARTS_KEY, chartsMapped);
          await setMeta(TOP_CHARTS_TIMESTAMP_KEY, Date.now());
        }

        // Recommended artists from launch payload
        const artistsSource: AnyRecord[] = Array.isArray(payload.artist_recos) ? payload.artist_recos : [];
        const artistsMapped: ArtistPreview[] = artistsSource.map((item: AnyRecord) => {
          const name = (item.name as string) || (item.title as string) || (item.artist as string) || '';
          const imageArr = normalizeImage(item.image ?? item.images ?? item.imageUrl ?? item.avatar ?? item.thumbnail ?? item.cover);
          const image = getHighQualityImage(Array.isArray(imageArr) ? imageArr : []);
          return { id: item.id || item.artistId || item.sid || name, name: normalizeArtistName(name), image };
        });

        if (artistsMapped.length > 0) {
          setRecommendedArtists(artistsMapped);
          try {
            await setMeta(RECOMMENDED_ARTISTS_KEY, artistsMapped);
            await setMeta(RECOMMENDED_ARTISTS_TIMESTAMP_KEY, Date.now());
          } catch {
            // ignore cache write failures
          }
        }
      } catch {
        console.warn('Failed to load launch data');
      } finally {
        setAlbumsLoading(false);
        setPlaylistsLoading(false);
        setTopChartsLoading(false);
      }
    };

    fetchLaunchData();
  }, [albumsFetched, playlistsFetched, topChartsFetched]);

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
      setFavouriteSongs((saved as AnyRecord[]).map((song) => (song['id'] as string)));
    };

    loadFavouriteIds();
  }, []);

  // Load recommended artists from cache if available (launch already writes to cache)
  useEffect(() => {
    let isMounted = true;
    const loadCachedRecommended = async () => {
      try {
        setRecommendedArtistsLoading(true);
        setRecommendedArtistsError(null);
        const cached = await getMeta(RECOMMENDED_ARTISTS_KEY);
        const cachedTimestamp = await getMeta(RECOMMENDED_ARTISTS_TIMESTAMP_KEY);
        const now = Date.now();
        const parsed = typeof cachedTimestamp === 'number' ? cachedTimestamp : Number(cachedTimestamp);
        const CACHE_DURATION = 24 * 60 * 60 * 1000;
        if (Array.isArray(cached) && Number.isFinite(parsed) && (now - parsed < CACHE_DURATION)) {
          if (isMounted) setRecommendedArtists(cached as ArtistPreview[]);
        }
      } catch (err) {
        console.warn('Failed to load recommended artists from cache', err);
        if (isMounted) setRecommendedArtistsError('Unable to load artists right now');
      } finally {
        if (isMounted) setRecommendedArtistsLoading(false);
      }
    };
    loadCachedRecommended();
    return () => { isMounted = false; };
  }, []);

  const handleSongClick = (song: ChartSongWithSaavn) => {
    if (song.saavnData) {
      // Pass all chart songs as context
      const allChartSongs = chartSongs.map(cs => cs.saavnData).filter((s): s is Song => s !== null);
      onSongSelect(song.saavnData, allChartSongs);
    }
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
      const isFavourite = (favourites as AnyRecord[]).some((song) => (song['id'] as string) === selectedSong.saavnData!.id);

      if (isFavourite) {
        const updated = (favourites as AnyRecord[]).filter((song) => (song['id'] as string) !== selectedSong.saavnData!.id);
        setFavouriteSongs(prev => prev.filter(id => id !== selectedSong.saavnData!.id));
        await persistFavourites(FAVOURITE_SONGS_KEY, updated as unknown[]);
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
        const updated = [...(favourites as AnyRecord[]), newFavourite];
        setFavouriteSongs(prev => [...prev, selectedSong.saavnData!.id]);
        await persistFavourites(FAVOURITE_SONGS_KEY, updated as unknown[]);
      }
    } catch {
      console.warn('Unable to update favourite songs');
    }
  };

  const handleArtistCardClick = (artist: ArtistPreview) => {
    if (!artist?.id) return;
    onArtistSelect(artist.id, artist.name || 'Artist', artist.image || '');
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
            New Albums
          </Typography>

          {albumsLoading ? (
              <HorizontalScroller gap={2} px={2}>
                {[...Array(6)].map((_, idx) => (
                  <Box key={idx} sx={{ minWidth: 140, maxWidth: 140 }}>
                    <Skeleton variant="rounded" width={140} height={140} sx={{ mb: 1 }} />
                    <Skeleton variant="text" width="80%" sx={{ mb: 0.5 }} />
                    <Skeleton variant="text" width="60%" />
                  </Box>
                ))}
              </HorizontalScroller>
          ) : (
            <HorizontalScroller gap={2} px={2} sx={{ pb: 2 }}>
              {latestAlbums.map((album) => (
                <Box
                  key={album.id}
                  onClick={async () => {
                    // Check if this is actually a song, not an album
                    if (album.type === 'song') {
                      try {
                        // Fetch the song details
                        const songResponse = await saavnApi.getSongById(album.id);
                        if (songResponse?.success && songResponse?.data && Array.isArray(songResponse.data) && songResponse.data.length > 0) {
                          const songData = songResponse.data[0];
                          onSongSelect(songData, [songData]);
                        }
                      } catch (error) {
                        console.error('Error fetching song:', error);
                      }
                    } else {
                      // It's an actual album
                      onAlbumSelect(album.id, album.name, getHighQualityImage(album.image));
                    }
                  }}
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
                    <Album sx={{ fontSize: 60 }} />
                  </Avatar>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: 'text.primary',
                      fontSize: {
                        xs: '0.78rem',
                        sm: '0.9rem',
                        md: '1rem',
                      },
                    }}
                  >
                    {decodeHtmlEntities(album.name)}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'block',
                      fontSize: {
                        xs: '0.65rem',
                        sm: '0.75rem',
                        md: '0.8rem',
                      },
                    }}
                  >
                    {decodeHtmlEntities(album.artists?.primary?.[0]?.name || 'Various Artists')}
                  </Typography>
                </Box>
              ))}
            </HorizontalScroller>
          )}
        </Box>

        {/* Trending Songs Section (Top 10 grid) */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            Trending Songs
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
              <ArrowForward />
            </IconButton>
          )}
        </Box>

        {chartSongsLoading && displayedSongs.length === 0 && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(5, 1fr)' }, gap: 2, mb: 2 }}>
            {[...Array(10)].map((_, idx) => (
              <Box key={idx} sx={{ width: '100%', textAlign: 'center' }}>
                <Skeleton variant="rounded" width="100%" height={160} sx={{ mb: 1 }} />
                <Skeleton width="80%" />
              </Box>
            ))}
          </Box>
        )}

        {displayedSongs.length > 0 && (
          <Box sx={{ mb: 3, overflowY: 'visible' }}>
            <HorizontalScroller gap={3} px={2} sx={{ overflowY: 'hidden', pr: 2, WebkitOverflowScrolling: 'touch' }}>
              {displayedSongs.map((item, idx) => {
                const pos = typeof item.position !== 'undefined' ? item.position : idx + 1;
                
                // Helper to choose best quality image
                const chooseBestImage = (saavnImgs: AnyRecord[], fallback?: string) => {
                  if (Array.isArray(saavnImgs) && saavnImgs.length > 0) {
                    const preferred = ['500x500', '300x300', '150x150', '50x50'];
                    for (const p of preferred) {
                      const found = saavnImgs.find((i: AnyRecord) => (i['quality'] as string | undefined) === p || ((i['link'] as string | undefined) && (i['link'] as string).includes(p)) || ((i['url'] as string | undefined) && (i['url'] as string).includes(p)));
                      if (found) return (found['url'] as string) || (found['link'] as string) || (found as unknown as string);
                    }
                    const first = saavnImgs[0];
                    return (first['url'] as string) || (first['link'] as string) || (first as unknown as string);
                  }
                  return fallback || '';
                };

                const posterUrl = item.saavnData && item.saavnData.image && item.saavnData.image.length > 0 
                  ? chooseBestImage(item.saavnData.image, item.song.imageUrl) 
                  : (item.song.imageUrl || '');

                return (
                  <Box 
                    key={pos} 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'flex-end', 
                      gap: 0,
                      cursor: item.saavnData ? 'pointer' : 'default',
                      transition: 'transform 0.2s',
                      flexShrink: 0,
                      '&:hover': {
                        transform: item.saavnData ? 'scale(1.03)' : 'none'
                      }
                    }} 
                    onClick={() => handleSongClick(item)}
                  >
                    {/* Large rank number with Netflix-style thick black outline */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        width: { xs: 60, sm: 90 },
                        height: { xs: 130, sm: 160 },
                        flexShrink: 0,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: { xs: 90, sm: 150 },
                          lineHeight: 0.85,
                          fontWeight: 900,
                          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                          letterSpacing: '-8px',
                          WebkitTextStroke: '6px #000',
                          color: '#e5e5e5',
                          paintOrder: 'stroke fill',
                          textShadow: '0 4px 8px rgba(0,0,0,0.5)',
                          userSelect: 'none',
                          margin: 0,
                          padding: 0,
                        }}
                      >
                        {pos}
                      </Typography>
                    </Box>

                    {/* Album poster - square aspect */}
                    <Avatar 
                      src={posterUrl} 
                      variant="rounded" 
                      sx={{ 
                        width: { xs: 130, sm: 160 }, 
                        height: { xs: 130, sm: 160 }, 
                        borderRadius: 1.5,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)', 
                        flexShrink: 0, 
                        '& img': { objectFit: 'cover', width: '100%', height: '100%' } 
                      }}
                    >
                      <MusicNote sx={{ fontSize: 40 }} />
                    </Avatar>
                  </Box>
                );
              })}
            </HorizontalScroller>
          </Box>
        )}

        {/* Top Charts Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1.5, fontWeight: 500 }}>
            Top Charts
          </Typography>

          {topChartsLoading ? (
            <HorizontalScroller gap={2} px={2}>
              {[...Array(6)].map((_, idx) => (
                <Box key={idx} sx={{ minWidth: 140, maxWidth: 140 }}>
                  <Skeleton variant="rounded" width={140} height={140} sx={{ mb: 1 }} />
                  <Skeleton variant="text" width="80%" />
                </Box>
              ))}
            </HorizontalScroller>
          ) : (
            <HorizontalScroller gap={2} px={2} sx={{ pb: 2 }}>
              {topCharts.map((chart) => (
                <Box
                  key={chart.id}
                  onClick={() => {
                    // If chart item has song id, attempt to play first song via onSongSelect
                    // Fallback: if there's a playlist id, open playlist
                    if (chart._raw?.type === 'playlist' && chart.id && onPlaylistSelect) {
                      onPlaylistSelect(chart.id, chart.name, getHighQualityImage(chart.image));
                      return;
                    }
                    // Otherwise, just call album select if album present
                    if (chart._raw?.type === 'album' && chart.id && onAlbumSelect) {
                      onAlbumSelect(chart.id, chart.name, getHighQualityImage(chart.image));
                      return;
                    }
                  }}
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
                    src={getHighQualityImage(chart.image)}
                    variant="rounded"
                    sx={{
                      width: 140,
                      height: 140,
                      mb: 1,
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    <MusicNote sx={{ fontSize: 60 }} />
                  </Avatar>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: 'text.primary',
                      fontSize: {
                        xs: '0.78rem',
                        sm: '0.9rem',
                        md: '1rem',
                      },
                    }}
                  >
                    {chart.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'block',
                      fontSize: {
                        xs: '0.65rem',
                        sm: '0.75rem',
                        md: '0.8rem',
                      },
                    }}
                  >
                    {chart.artists?.primary?.[0]?.name || 'Various Artists'}
                  </Typography>
                </Box>
              ))}
            </HorizontalScroller>
          )}
        </Box>

        {/* Trending Playlists Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ color: 'text.secondary', mb: 2, fontWeight: 500 }}>
            Trending Playlists
          </Typography>

          {playlistsLoading ? (
              <HorizontalScroller gap={2} px={2}>
                {[...Array(6)].map((_, idx) => (
                  <Box key={idx} sx={{ minWidth: 140, maxWidth: 140 }}>
                    <Skeleton variant="rounded" width={140} height={140} sx={{ mb: 1 }} />
                    <Skeleton variant="text" width="80%" />
                  </Box>
                ))}
              </HorizontalScroller>
          ) : (
            <HorizontalScroller gap={2} px={2} sx={{ pb: 2 }}>
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
                    <PlaylistPlay sx={{ fontSize: 60 }} />
                  </Avatar>
                  <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: 'text.primary',
                        fontSize: {
                          xs: '0.78rem',
                          sm: '0.9rem',
                          md: '1rem',
                        },
                      }}
                  >
                    {playlist.name}
                  </Typography>
                </Box>
              ))}
            </HorizontalScroller>
          )}
        </Box>

        

        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              Recommended Artists
            </Typography>
            {recommendedArtists.length > 6 && (
              <IconButton
                onClick={() => {
                  if (typeof onViewAllArtists === 'function') return onViewAllArtists();
                  // fallback: scroll right on the container
                  const el = artistsContainerRef.current;
                  if (el) el.scrollBy({ left: el.clientWidth * 0.6, behavior: 'smooth' });
                }}
                size="small"
                sx={{ color: 'primary.main' }}
                aria-label="view all artists"
              >
                <ArrowForward />
              </IconButton>
            )}
          </Box>
            {recommendedArtistsLoading ? (
            <HorizontalScroller gap={2} px={2} refProp={artistsContainerRef}>
              {[...Array(6)].map((_, idx) => (
                <Box key={idx} sx={{ minWidth: ARTIST_AVATAR_SIZE, maxWidth: ARTIST_AVATAR_SIZE }}>
                  <Skeleton variant="circular" width={ARTIST_AVATAR_SIZE} height={ARTIST_AVATAR_SIZE} sx={{ mb: 1 }} />
                  <Skeleton variant="text" width="70%" />
                </Box>
              ))}
            </HorizontalScroller>
          ) : recommendedArtistsError ? (
            <Typography variant="body2" color="error">
              {recommendedArtistsError}
            </Typography>
            ) : recommendedArtists.length > 0 ? (
            <HorizontalScroller gap={2} px={2} refProp={artistsContainerRef}>
              {recommendedArtists.map((artist) => (
                <Box
                  key={artist.id ?? artist.name}
                  onClick={() => handleArtistCardClick(artist)}
                  sx={{ minWidth: ARTIST_AVATAR_SIZE, maxWidth: ARTIST_AVATAR_SIZE, cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.05)' } }}
                >
                  <Avatar src={artist.image || undefined} variant="circular" imgProps={{ loading: 'lazy' }} sx={{ width: ARTIST_AVATAR_SIZE, height: ARTIST_AVATAR_SIZE, mb: 1, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                    <MusicNote sx={{ fontSize: Math.floor(ARTIST_AVATAR_SIZE * 0.55) }} />
                  </Avatar>
                  <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'text.primary', textAlign: 'center' }}>{artist.name}</Typography>
                </Box>
              ))}
            </HorizontalScroller>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No artists available right now.
            </Typography>
          )}
        </Box>
      </Box>

      <SongContextMenu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onPlayNow={() => selectedSong?.saavnData && onSongSelect(selectedSong.saavnData)}
        onPlayNext={onPlayNext ? handlePlayNext : undefined}
        onAddToQueue={onAddToQueue ? handleAddToQueue : undefined}
        onAddToFavourites={handleAddToFavourites}
        isFavourite={selectedSong?.saavnData ? favouriteSongs.includes(selectedSong.saavnData.id) : false}
      />
    </Box>
  );
};

export default HomePage;

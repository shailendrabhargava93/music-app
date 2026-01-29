import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  TextField,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  InputAdornment,
  CircularProgress,
  Chip,
  IconButton,
  Skeleton,
  Container,
} from '@mui/material';
import { Search, MusicNote, PlaylistPlay, Album, Person, Clear, History, ClearAll, MoreVertical, TrendingUp } from '../icons';
import SongItem from '../components/SongItem';
import SongContextMenu from '../components/SongContextMenu';
import SongItemSkeleton from '../components/SongItemSkeleton';
import HorizontalScroller from '../components/HorizontalScroller';
// icons now imported from ../icons
import { saavnApi } from '../services/saavnApi';
import { getBestImage } from '../utils/normalize';
import { Song } from '../types/api';
import { FAVOURITE_SONGS_KEY, persistFavourites, readFavourites, readSessionJson, readLocalJson, writeSessionJson, writeLocalJson } from '../services/storage';
import { decodeHtmlEntities } from '../utils/normalize';

interface SearchPageProps {
  onSongSelect: (song: Song, contextSongs?: Song[]) => void;
  onPlaylistSelect: (playlistId: string, playlistName: string, playlistImage: string) => void;
  onAlbumSelect: (albumId: string, albumName: string, albumImage: string) => void;
  onArtistSelect?: (artistId: string, artistName: string, artistImage: string) => void;
  onAddToQueue?: (song: Song) => void;
  onPlayNext?: (song: Song) => void;
  onShowSnackbar?: (message: string) => void;
}

type AnyRecord = Record<string, unknown>;

const SearchPage: React.FC<SearchPageProps> = ({ onSongSelect, onPlaylistSelect, onAlbumSelect, onArtistSelect, onAddToQueue, onPlayNext }) => {
  // Use state that persists in sessionStorage
  const [searchQuery, setSearchQuery] = useState(() => {
    return sessionStorage.getItem('searchQuery') || '';
  });
  const [songs, setSongs] = useState<Song[]>(() => readSessionJson<Song[]>('searchSongs', []));
  const [playlists, setPlaylists] = useState<AnyRecord[]>(() => readSessionJson<AnyRecord[]>('searchPlaylists', []));
  const [albums, setAlbums] = useState<AnyRecord[]>(() => readSessionJson<AnyRecord[]>('searchAlbums', []));
  const [artists, setArtists] = useState<AnyRecord[]>(() => readSessionJson<AnyRecord[]>('searchArtists', []));
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(() => {
    return sessionStorage.getItem('hasSearched') === 'true';
  });
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trending, setTrending] = useState<AnyRecord[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedSong, setSelectedSong] = useState<Song | AnyRecord | null>(null);

  // Save search state to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('searchQuery', searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    writeSessionJson('searchSongs', songs);
  }, [songs]);

  useEffect(() => {
    writeSessionJson('searchPlaylists', playlists);
  }, [playlists]);

  useEffect(() => {
    writeSessionJson('searchAlbums', albums);
  }, [albums]);

  useEffect(() => {
    writeSessionJson('searchArtists', artists);
  }, [artists]);

  useEffect(() => {
    sessionStorage.setItem('hasSearched', hasSearched ? 'true' : 'false');
  }, [hasSearched]);

  // Load recent searches from localStorage
  useEffect(() => {
    setRecentSearches(readLocalJson<string[]>('recentSearches', []));
    // Fetch trending/top searches for the Search page
    (async () => {
      try {
        const resp = await saavnApi.fetchTopSearches(12);
        setTrending(Array.isArray(resp?.items) ? resp.items : []);
      } catch {
        // ignore trending fetch errors
      }
    })();
  }, []);

  // Helper type guards for incoming search payloads
  const hasIdNameImage = (obj: unknown): obj is Record<string, unknown> => {
    if (!obj || typeof obj !== 'object') return false;
    const r = obj as Record<string, unknown>;
    const hasId = typeof r['id'] === 'string' || typeof r['id'] === 'number';
    const hasName = typeof r['name'] === 'string';
    const img = r['image'];
    const hasImage = Array.isArray(img) ? (img as unknown[]).length > 0 : Boolean(img);
    return !!hasId && !!hasName && !!hasImage;
  };

  const extractFirst = (val: unknown): unknown => {
    if (Array.isArray(val)) return val[0];
    if (val && typeof val === 'object') {
      const r = val as Record<string, unknown>;
      if (Array.isArray(r['data'])) return (r['data'] as unknown[])[0];
    }
    return undefined;
  };

  // Handle click on trending item based on its type
  const handleTrendingClick = async (t: AnyRecord | undefined) => {
    if (!t) return;
    try {
      const tType = (t as AnyRecord)['type'] as string | undefined;
      const tName = ((t as AnyRecord)['name'] as string) || '';
      const payload = (t as AnyRecord)['payload'] as AnyRecord | undefined;

      if (tType === 'query') {
        setSearchQuery(tName);
        await handleSearch(tName);
        return;
      }
      if (tType === 'artist') {
        if (!onArtistSelect) return;
        try {
          setLoading(true);
          const artistId = (t as AnyRecord)['id'] as string | undefined || payload?.artistId as string | undefined || payload?.artist_id as string | undefined || payload?.id as string | undefined;
          if (!artistId) {
            if (tName) await handleSearch(tName);
            return;
          }
          const resp = await saavnApi.getArtistById(artistId);
          const raw = resp?.data || resp;
          const name = (raw as AnyRecord)?.name as string | undefined || tName || '';
          const img = getBestImage(((raw as AnyRecord)?.image as unknown) || ((raw as AnyRecord)?.images as unknown) || (t as AnyRecord)['image'] || payload?.image || (raw as AnyRecord)?.thumbnail || (raw as AnyRecord)?.cover);
          onArtistSelect(artistId, name, img);
        } finally {
          setLoading(false);
        }
        return;
      }
      if (tType === 'album') {
        if (!onAlbumSelect) return;
        try {
          setLoading(true);
          const albumId = (t as AnyRecord)['id'] as string | undefined || payload?.albumId as string | undefined || payload?.album_id as string | undefined || payload?.id as string | undefined;
          if (!albumId) {
            if (tName) await handleSearch(tName);
            return;
          }
          const resp = await saavnApi.getAlbumById(albumId);
          const raw = resp?.data || resp;
          const name = (raw as AnyRecord)?.name as string | undefined || (raw as AnyRecord)?.title as string | undefined || tName || '';
          const img = getBestImage(((raw as AnyRecord)?.image as unknown) || ((raw as AnyRecord)?.images as unknown) || (raw as AnyRecord)?.cover || (t as AnyRecord)['image'] || payload?.image || (raw as AnyRecord)?.thumbnail);
          onAlbumSelect(albumId, name, img);
        } finally {
          setLoading(false);
        }
        return;
      }
      if (tType === 'song') {
        if (onSongSelect) {
          if (payload) {
            onSongSelect(payload as Song);
          } else {
            try {
              setLoading(true);
              const songId = (t as AnyRecord)['id'] as string | undefined || payload?.id as string | undefined;
              if (!songId) {
                if (tName) await handleSearch(tName);
                return;
              }
              const resp = await saavnApi.getSongById(songId);
              const songData = extractFirst(resp) ?? resp;
              if (songData) onSongSelect(songData as Song);
            } finally {
              setLoading(false);
            }
          }
        }
        return;
      }
      setSearchQuery(tName || '');
      await handleSearch(tName || '');
    } catch {
      // ignore
    }
  };

  // Clear all recent searches
  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  // use shared `decodeHtmlEntities` from utils

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 3) {
      setSongs([]);
      setPlaylists([]);
      setAlbums([]);
      setArtists([]);
      setHasSearched(false);
      return;
    }

    // Save to recent searches
    const trimmedQuery = query.trim();
    if (trimmedQuery && trimmedQuery.length >= 3) {
      setRecentSearches(prev => {
        const filtered = prev.filter(s => s.toLowerCase() !== trimmedQuery.toLowerCase());
        const updated = [trimmedQuery, ...filtered].slice(0, 10);
        writeLocalJson('recentSearches', updated);
        return updated;
      });
    }
    // Ensure Songs tab is visible and UI reflects a search in-progress
    setActiveTab(0);
    setHasSearched(true);
    setLoading(true);
    try {
      // Call all APIs in parallel
      const [songsResponse, playlistsResponse, albumsResponse, artistsResponse] = await Promise.all([
        saavnApi.searchSongs(query, 20),
        saavnApi.searchPlaylists(query, 20),
        saavnApi.searchAlbums(query, 20),
        saavnApi.searchArtists(query, 20)
      ]);
      
      // Extract songs from response
      const songsData = songsResponse.data?.results || [];

      const validSongs = (songsData as unknown[]).filter(hasIdNameImage).slice(0, 20) as Song[];
      
      // Extract playlists from response
      const playlistsData = playlistsResponse.data?.results || [];

      const validPlaylists = (playlistsData as unknown[]).filter(hasIdNameImage).slice(0, 20) as AnyRecord[];
      
      // Extract albums from response
      const albumsData = albumsResponse.data?.results || [];

      const validAlbums = (albumsData as unknown[]).filter(hasIdNameImage).slice(0, 20) as AnyRecord[];

      // Extract artists from response
      const artistsData = artistsResponse.data?.results || [];

      const validArtists = (artistsData as unknown[]).filter(hasIdNameImage).slice(0, 5) as AnyRecord[];
      
      setSongs(validSongs);
      setPlaylists(validPlaylists);
      setAlbums(validAlbums);
      setArtists(validArtists);
      setHasSearched(true);
    } catch {
      setSongs([]);
      setPlaylists([]);
      setAlbums([]);
      setArtists([]);
      setHasSearched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle clicking on a recent search
  const handleRecentSearchClick = (query: string) => {
    setSearchQuery(query);
    handleSearch(query);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    // If user clears the input, clear results below
    if (!value.trim()) {
      setSongs([]);
      setPlaylists([]);
      setAlbums([]);
      setArtists([]);
      setHasSearched(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(searchQuery);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSongs([]);
    setPlaylists([]);
    setAlbums([]);
    setHasSearched(false);
  };

  const getHighQualityImage = (images: unknown) => getBestImage(images);

  const getArtistNames = (song: AnyRecord): string => {
    const artists = (song as AnyRecord).artists;
    if (artists && typeof artists === 'object' && Array.isArray(((artists as AnyRecord).primary as unknown))) {
      return (((artists as AnyRecord).primary as AnyRecord[]) || []).map(a => (a as AnyRecord).name as string || '').filter(Boolean).join(', ');
    }
    return 'Unknown Artist';
  };

  

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, song: Song | AnyRecord) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedSong(song);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedSong(null);
  };

  const handlePlayNow = () => {
    if (selectedSong) {
      onSongSelect(selectedSong);
    }
    handleMenuClose();
  };

  const handlePlayNext = () => {
    if (selectedSong && onPlayNext) {
      onPlayNext(selectedSong);
    }
    handleMenuClose();
  };

  const handleAddToQueue = () => {
    if (selectedSong && onAddToQueue) {
      onAddToQueue(selectedSong);
    }
    handleMenuClose();
  };

  const handleAddToFavourites = async () => {
    if (selectedSong) {
      try {
        const favourites = await readFavourites(FAVOURITE_SONGS_KEY);
        const exists = (favourites as unknown[]).some((fav: Record<string, unknown>) => ((fav['id'] as string) === ((selectedSong as AnyRecord)['id'] as string)));

        if (!exists) {
          const sel = selectedSong as AnyRecord;
          const newFav = {
            id: sel['id'] as string,
            name: sel['name'] as string,
            artist: getArtistNames(sel),
            albumArt: getHighQualityImage(sel['image']),
            addedAt: Date.now(),
          };
          const updated = [...(favourites as unknown[]), newFav];
          await persistFavourites(FAVOURITE_SONGS_KEY, updated as unknown[]);
        }
      } catch (error) {
        console.warn('Unable to update favourite songs', error);
      }
    }
    handleMenuClose();
  };

  return (
    <Box sx={{ pb: 14, px: 2, pt: 2 }}>
      {/* Search Input */}
      <TextField
        fullWidth
        value={searchQuery}
        onChange={handleInputChange}
        onKeyPress={handleKeyPress}
        placeholder="What do you want to listen to?"
        variant="outlined"
        autoFocus
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search sx={{ color: 'text.secondary' }} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              {loading ? (
                <CircularProgress size={20} sx={{ color: 'primary.main' }} />
              ) : searchQuery ? (
                <Clear
                  sx={{
                    color: 'text.secondary',
                    cursor: 'pointer',
                    '&:hover': {
                      color: 'text.primary',
                    },
                  }}
                  onClick={handleClearSearch}
                />
              ) : null}
            </InputAdornment>
          ),
          sx: {
            bgcolor: 'background.paper',
            borderRadius: 2,
            '& fieldset': {
              borderColor: (theme) => 
                theme.palette.mode === 'light' 
                  ? 'rgba(0, 0, 0, 0.23)' 
                  : 'transparent',
            },
            '&:hover fieldset': {
              borderColor: (theme) => 
                theme.palette.mode === 'light' 
                  ? 'rgba(0, 0, 0, 0.5)' 
                  : 'action.hover',
            },
            '&.Mui-focused fieldset': {
              borderColor: 'primary.main',
            },
          },
        }}
        sx={{
          mb: 2,
          '& input': {
            color: 'text.primary',
          },
        }}
      />

      {/* Trending / Top Searches (only when user hasn't searched yet) */}
      {!loading && !hasSearched && trending.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <TrendingUp sx={{ color: 'text.secondary', fontSize: 18 }} />
            <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 600 }}>Trending</Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-start' }}>
            {trending.map((t, idx) => {
              const label = t.name || (t.payload && (t.payload.title || t.payload.name)) || 'Unknown';
              const image = Array.isArray(t.image) ? (t.image[0]?.url || t.image[0]) : t.image;
              return (
                <Chip
                  key={idx}
                  size="small"
                  avatar={image ? <Avatar src={image} /> : undefined}
                  label={label}
                  onClick={() => handleTrendingClick(t)}
                  sx={{ height: 34, cursor: 'pointer', textTransform: 'none', fontSize: '0.875rem' }}
                />
              );
            })}
          </Box>
        </Box>
      )}

      {/* Recent Searches */}
      {!hasSearched && !loading && recentSearches.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <History sx={{ color: 'text.secondary', fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                Recent Searches
              </Typography>
            </Box>
            <IconButton
              onClick={clearRecentSearches}
              size="small"
              sx={{ color: 'text.secondary' }}
              title="Clear all recent searches"
            >
              <ClearAll />
            </IconButton>
          </Box>

          {/* Recent search chips that wrap onto multiple lines */}
          <Box sx={{ mb: 0.5, py: 0.25 }}>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-start' }}>
              {recentSearches.map((search, index) => (
                <Chip
                  key={index}
                  size="small"
                  label={search}
                  onClick={() => handleRecentSearchClick(search)}
                  sx={{
                    height: 32,
                    bgcolor: 'action.hover',
                    color: 'text.primary',
                    '&:hover': { bgcolor: 'action.selected' },
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                />
              ))}
            </Box>
          </Box>
        </Box>
      )}

      {/* Loading State: show skeleton chips and song rows to match results layout */}
      {loading && (
        <Box sx={{ px: 1 }}>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" width={84} height={32} />
            ))}
          </Box>

          <Box>
            {Array.from({ length: 6 }).map((_, i) => (
              <SongItemSkeleton key={i} />
            ))}
          </Box>
        </Box>
      )}

      {/* Tabs for Search Results */}
      {!loading && hasSearched && (songs.length > 0 || playlists.length > 0 || albums.length > 0 || artists.length > 0) && (
        <Container maxWidth="sm" disableGutters>
          {/* Compact horizontally scrollable tabs chips */}
          <HorizontalScroller px={0} gap={2}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'nowrap', alignItems: 'center' }}>
              <Chip
                size="small"
                icon={<MusicNote />}
                label="Songs"
                onClick={() => setActiveTab(0)}
                variant={activeTab === 0 ? 'filled' : 'outlined'}
                sx={{
                  flex: '0 0 auto',
                  height: 32,
                  bgcolor: activeTab === 0 ? 'primary.main' : 'transparent',
                  color: activeTab === 0 ? 'primary.contrastText' : 'text.primary',
                  borderColor: activeTab === 0 ? 'primary.main' : 'divider',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  '& .MuiChip-icon': { fontSize: '1rem', marginLeft: '6px', marginRight: '-2px' },
                }}
              />
              <Chip
                size="small"
                icon={<Album />}
                label="Albums"
                onClick={() => setActiveTab(1)}
                variant={activeTab === 1 ? 'filled' : 'outlined'}
                sx={{
                  flex: '0 0 auto',
                  height: 32,
                  bgcolor: activeTab === 1 ? 'primary.main' : 'transparent',
                  color: activeTab === 1 ? 'primary.contrastText' : 'text.primary',
                  borderColor: activeTab === 1 ? 'primary.main' : 'divider',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  '& .MuiChip-icon': { fontSize: '1rem', marginLeft: '6px', marginRight: '-2px' },
                }}
              />
              <Chip
                size="small"
                icon={<PlaylistPlay />}
                label="Playlists"
                onClick={() => setActiveTab(2)}
                variant={activeTab === 2 ? 'filled' : 'outlined'}
                sx={{
                  flex: '0 0 auto',
                  height: 32,
                  bgcolor: activeTab === 2 ? 'primary.main' : 'transparent',
                  color: activeTab === 2 ? 'primary.contrastText' : 'text.primary',
                  borderColor: activeTab === 2 ? 'primary.main' : 'divider',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  '& .MuiChip-icon': { fontSize: '1rem', marginLeft: '6px', marginRight: '-2px' },
                }}
              />
              <Chip
                size="small"
                icon={<Person />}
                label="Artists"
                onClick={() => setActiveTab(3)}
                variant={activeTab === 3 ? 'filled' : 'outlined'}
                sx={{
                  flex: '0 0 auto',
                  height: 32,
                  bgcolor: activeTab === 3 ? 'primary.main' : 'transparent',
                  color: activeTab === 3 ? 'primary.contrastText' : 'text.primary',
                  borderColor: activeTab === 3 ? 'primary.main' : 'divider',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  '& .MuiChip-icon': { fontSize: '1rem', marginLeft: '6px', marginRight: '-2px' },
                }}
              />
            </Box>
          </HorizontalScroller>
        </Container>
      )}

      {/* Tab Content */}
      {!loading && hasSearched && (songs.length > 0 || playlists.length > 0 || albums.length > 0 || artists.length > 0) && (
        <Box>
          {/* Songs Tab */}
          {activeTab === 0 && (
            <Box>
              {loading ? (
                <Box sx={{ px: 1 }}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <SongItemSkeleton key={i} />
                  ))}
                </Box>
              ) : songs.length === 0 ? (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '30vh',
                    gap: 2,
                  }}
                >
                  <MusicNote sx={{ fontSize: 64, color: 'text.disabled', opacity: 0.3 }} />
                  <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                    No songs found
                  </Typography>
                </Box>
              ) : (
                <List sx={{ bgcolor: 'transparent', p: 0, pb: 2 }}>
                  {songs.map((song) => (
                    <SongItem
                      key={song.id}
                      title={decodeHtmlEntities(song.name)}
                      artist={decodeHtmlEntities(getArtistNames(song))}
                      imageSrc={getHighQualityImage(song.image)}
                      onClick={() => onSongSelect(song, songs)}
                      rightContent={
                        <IconButton
                          edge="end"
                          onClick={(e) => handleMenuOpen(e, song)}
                          sx={{ color: 'text.secondary' }}
                        >
                          <MoreVertical />
                        </IconButton>
                      }
                    />
                  ))}
                </List>
              )}
            </Box>
          )}

          {/* Albums Tab */}
          {activeTab === 1 && (
            <Box>
              {albums.length === 0 ? (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '30vh',
                    gap: 2,
                  }}
                >
                  <Album sx={{ fontSize: 64, color: 'text.disabled', opacity: 0.3 }} />
                  <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                    No albums found
                  </Typography>
                </Box>
              ) : (
                <List sx={{ bgcolor: 'transparent', p: 0, pb: 2 }}>
                  {albums.map((album) => (
                    <ListItem
                      key={album.id}
                      onClick={() => onAlbumSelect(album.id, decodeHtmlEntities(album.name), getHighQualityImage(album.image))}
                      sx={{
                        cursor: 'pointer',
                        borderRadius: 1,
                        px: 1,
                        py: 0.5,
                        mb: 0.5,
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                      }}
                    >
                      <ListItemAvatar sx={{ minWidth: 72 }}>
                        <Avatar
                          src={getHighQualityImage(album.image)}
                          variant="rounded"
                          sx={{ width: 56, height: 56 }}
                        >
                          <Album />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography
                            sx={{
                              color: 'text.primary',
                              fontWeight: 500,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {decodeHtmlEntities(album.name)}
                          </Typography>
                        }
                        secondary={
                          <Typography
                            variant="body2"
                            sx={{
                              color: 'text.secondary',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {album.artists?.primary?.[0]?.name || 'Various Artists'}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          )}

          {/* Playlists Tab */}
          {activeTab === 2 && (
            <Box>
              {playlists.length === 0 ? (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '30vh',
                    gap: 2,
                  }}
                >
                  <PlaylistPlay sx={{ fontSize: 64, color: 'text.disabled', opacity: 0.3 }} />
                  <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                    No playlists found
                  </Typography>
                </Box>
              ) : (
                <List sx={{ bgcolor: 'transparent', p: 0, pb: 2 }}>
                  {playlists.map((playlist) => (
                    <ListItem
                      key={playlist.id}
                      onClick={() => onPlaylistSelect(playlist.id, decodeHtmlEntities(playlist.name), getHighQualityImage(playlist.image))}
                      sx={{
                        cursor: 'pointer',
                        borderRadius: 1,
                        px: 1,
                        py: 0.5,
                        mb: 0.5,
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                      }}
                    >
                      <ListItemAvatar sx={{ minWidth: 72 }}>
                        <Avatar
                          src={getHighQualityImage(playlist.image)}
                          variant="rounded"
                          sx={{ width: 56, height: 56 }}
                        >
                          <PlaylistPlay />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography
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
                        }
                        secondary={
                          <Typography
                            variant="body2"
                            sx={{
                              color: 'text.secondary',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {playlist.songCount} songs
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          )}

          {/* Artists Tab */}
          {activeTab === 3 && (
            <Box>
              {artists.length === 0 ? (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '30vh',
                    gap: 2,
                  }}
                >
                  <Person sx={{ fontSize: 64, color: 'text.disabled', opacity: 0.3 }} />
                  <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                    No artists found
                  </Typography>
                </Box>
              ) : (
                <List sx={{ bgcolor: 'transparent', p: 0, pb: 2 }}>
                  {artists.map((artist) => (
                    <ListItem
                      key={artist.id}
                      onClick={() => {
                        if (onArtistSelect) {
                          onArtistSelect(artist.id, decodeHtmlEntities(artist.name), getHighQualityImage(artist.image));
                        }
                      }}
                      sx={{
                        cursor: 'pointer',
                        borderRadius: 1,
                        px: 1,
                        py: 0.5,
                        mb: 0.5,
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                      }}
                    >
                      <ListItemAvatar sx={{ minWidth: 72 }}>
                        <Avatar
                          src={getHighQualityImage(artist.image)}
                          variant="circular"
                          sx={{ width: 56, height: 56 }}
                        >
                          <Person />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography
                            sx={{
                              color: 'text.primary',
                              fontWeight: 500,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {decodeHtmlEntities(artist.name)}
                          </Typography>
                        }
                        secondary={
                          <Typography
                            variant="body2"
                            sx={{
                              color: 'text.secondary',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Artist
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* No Results */}
      {!loading && hasSearched && songs.length === 0 && playlists.length === 0 && albums.length === 0 && artists.length === 0 && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '40vh',
            gap: 2,
          }}
        >
          <Search sx={{ fontSize: 64, color: '#404040' }} />
          <Typography variant="h6" sx={{ color: '#b3b3b3' }}>
            No results found
          </Typography>
          <Typography variant="body2" sx={{ color: '#888' }}>
            Try searching with different keywords
          </Typography>
        </Box>
      )}

      {/* Initial State */}
      {!hasSearched && !loading && recentSearches.length === 0 && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '50vh',
            gap: 1.5,
            px: 3,
          }}
        >
          <Typography 
            variant="h5" 
            sx={{ 
              color: 'text.primary',
              fontWeight: 'bold',
              textAlign: 'center'
            }}
          >
            Everything you need
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'text.secondary',
              textAlign: 'center'
            }}
          >
            Search for songs, artists, albums, playlists, and more
          </Typography>
        </Box>
      )}

      <SongContextMenu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onPlayNow={handlePlayNow}
        onPlayNext={handlePlayNext}
        onAddToQueue={handleAddToQueue}
        onAddToFavourites={handleAddToFavourites}
        onOpenAlbum={onAlbumSelect ? () => {
          if (!selectedSong) return;
          const sel = selectedSong as AnyRecord;
          const albumId = sel?.albumId as string | undefined || (sel?.album as AnyRecord)?.id as string | undefined;
          const albumName = sel?.albumName as string | undefined || (sel?.album as AnyRecord)?.name as string | undefined;
          const albumImage = sel?.albumImage as string | undefined || (sel?.album as AnyRecord)?.image as string | undefined;
          if (albumId && onAlbumSelect) onAlbumSelect(albumId, albumName || '', albumImage || '');
        } : undefined}
      />
    </Box>
  );
};

export default SearchPage;

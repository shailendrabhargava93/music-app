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
  Menu,
  MenuItem,
  ListItemIcon,
  Skeleton,
  Container,
} from '@mui/material';
import { Search, MusicNote, PlaylistPlay, Album, Person, Clear, History, ClearAll, PlayArrow, QueueMusic, PlaylistAdd, Favorite, MoreVertical, TrendingUp } from '../icons';
import SongItem from '../components/SongItem';
import SongItemSkeleton from '../components/SongItemSkeleton';
// icons now imported from ../icons
import { saavnApi } from '../services/saavnApi';
import { getBestImage } from '../utils/normalize';
import { Song } from '../types/api';
import { FAVOURITE_SONGS_KEY, persistFavourites, readFavourites } from '../services/storage';
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

const SearchPage: React.FC<SearchPageProps> = ({ onSongSelect, onPlaylistSelect, onAlbumSelect, onArtistSelect, onAddToQueue, onPlayNext, onShowSnackbar }) => {
  // Use state that persists in sessionStorage
  const [searchQuery, setSearchQuery] = useState(() => {
    return sessionStorage.getItem('searchQuery') || '';
  });
  const [songs, setSongs] = useState<any[]>(() => {
    const saved = sessionStorage.getItem('searchSongs');
    return saved ? JSON.parse(saved) : [];
  });
  const [playlists, setPlaylists] = useState<any[]>(() => {
    const saved = sessionStorage.getItem('searchPlaylists');
    return saved ? JSON.parse(saved) : [];
  });
  const [albums, setAlbums] = useState<any[]>(() => {
    const saved = sessionStorage.getItem('searchAlbums');
    return saved ? JSON.parse(saved) : [];
  });
  const [artists, setArtists] = useState<any[]>(() => {
    const saved = sessionStorage.getItem('searchArtists');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(() => {
    return sessionStorage.getItem('hasSearched') === 'true';
  });
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trending, setTrending] = useState<any[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedSong, setSelectedSong] = useState<any>(null);

  // Save search state to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('searchQuery', searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    sessionStorage.setItem('searchSongs', JSON.stringify(songs));
  }, [songs]);

  useEffect(() => {
    sessionStorage.setItem('searchPlaylists', JSON.stringify(playlists));
  }, [playlists]);

  useEffect(() => {
    sessionStorage.setItem('searchAlbums', JSON.stringify(albums));
  }, [albums]);

  useEffect(() => {
    sessionStorage.setItem('searchArtists', JSON.stringify(artists));
  }, [artists]);

  useEffect(() => {
    sessionStorage.setItem('hasSearched', hasSearched ? 'true' : 'false');
  }, [hasSearched]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        // Error loading recent searches
      }
    }
    // Fetch trending/top searches for the Search page
    (async () => {
      try {
        const resp = await saavnApi.fetchTopSearches(12);
        setTrending(Array.isArray(resp?.items) ? resp.items : []);
      } catch (err) {
        // ignore trending fetch errors
      }
    })();
  }, []);

  // Save search to recent searches
  const saveToRecentSearches = (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || trimmedQuery.length < 3) return;

    setRecentSearches(prev => {
      // Remove if already exists
      const filtered = prev.filter(s => s.toLowerCase() !== trimmedQuery.toLowerCase());
      // Add to beginning, keep only 10
      const updated = [trimmedQuery, ...filtered].slice(0, 10);
      // Save to localStorage
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      return updated;
    });
  };

  // Handle click on trending item based on its type
  const handleTrendingClick = async (t: any) => {
    if (!t) return;
    try {
      if (t.type === 'query') {
        setSearchQuery(t.name);
        await handleSearch(t.name);
        return;
      }
      if (t.type === 'artist') {
        // Fetch artist details then call onArtistSelect
        if (!onArtistSelect) return;
        try {
          setLoading(true);
          // Try t.id then common payload fallbacks
          const artistId = t.id || t.payload?.artistId || t.payload?.artist_id || t.payload?.id;
          if (!artistId) {
            // fallback: if name present, perform a search
            if (t.name) {
              await handleSearch(t.name);
            }
            return;
          }
          const resp = await saavnApi.getArtistById(artistId);
          // Try to pick image
          const raw = resp?.data || resp;
          const name = raw?.name || t.name || '';
          const img = getBestImage(raw?.image || raw?.images || t.image || t.payload?.image || raw?.thumbnail || raw?.cover);
          onArtistSelect(artistId, name, img);
        } finally {
          setLoading(false);
        }
        return;
      }
      if (t.type === 'album') {
        // Fetch album details then call onAlbumSelect
        if (!onAlbumSelect) return;
        try {
          setLoading(true);
          const albumId = t.id || t.payload?.albumId || t.payload?.album_id || t.payload?.id;
          if (!albumId) {
            if (t.name) {
              await handleSearch(t.name);
            }
            return;
          }
          const resp = await saavnApi.getAlbumById(albumId);
          const raw = resp?.data || resp;
          const name = raw?.name || raw?.title || t.name || '';
          const img = getBestImage(raw?.image || raw?.images || raw?.cover || t.image || t.payload?.image || raw?.thumbnail);
          onAlbumSelect(albumId, name, img);
        } finally {
          setLoading(false);
        }
        return;
      }
      if (t.type === 'song') {
        if (onSongSelect) {
          // If payload exists, pass it; else fetch song by id
          if (t.payload) {
            onSongSelect(t.payload);
          } else {
            try {
              setLoading(true);
              const songId = t.id || t.payload?.id;
              if (!songId) {
                if (t.name) {
                  await handleSearch(t.name);
                }
                return;
              }
              const resp = await saavnApi.getSongById(songId);
              const songData = resp?.data?.[0] || resp?.[0] || resp?.data || resp;
              if (songData) {
                onSongSelect(songData);
              }
            } finally {
              setLoading(false);
            }
          }
        }
        return;
      }
      // Fallback: treat as a query
      setSearchQuery(t.name || '');
      await handleSearch(t.name || '');
    } catch (err) {
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
    saveToRecentSearches(query);
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
      
      const validSongs = songsData.filter((song: any) => {
        return song && 
               song.id && 
               song.name && 
               song.image && 
               song.image.length > 0;
      }).slice(0, 20);
      
      // Extract playlists from response
      const playlistsData = playlistsResponse.data?.results || [];
      
      const validPlaylists = playlistsData.filter((playlist: any) => {
        return playlist && 
               playlist.id && 
               playlist.name && 
               playlist.image && 
               playlist.image.length > 0;
      }).slice(0, 20);
      
      // Extract albums from response
      const albumsData = albumsResponse.data?.results || [];
      
      const validAlbums = albumsData.filter((album: any) => {
        return album && 
               album.id && 
               album.name && 
               album.image && 
               album.image.length > 0;
      }).slice(0, 20);

      // Extract artists from response
      const artistsData = artistsResponse.data?.results || [];
      
      const validArtists = artistsData.filter((artist: any) => {
        return artist && 
               artist.id && 
               artist.name && 
               artist.image && 
               artist.image.length > 0;
      }).slice(0, 5);
      
      setSongs(validSongs);
      setPlaylists(validPlaylists);
      setAlbums(validAlbums);
      setArtists(validArtists);
      setHasSearched(true);
    } catch (error) {
      setSongs([]);
      setPlaylists([]);
      setAlbums([]);
      setArtists([]);
      setAlbums([]);
      setHasSearched(true);
    } finally {
      setLoading(false);
    }
  }, [saveToRecentSearches]);

  // Handle clicking on a recent search
  const handleRecentSearchClick = (query: string) => {
    setSearchQuery(query);
    handleSearch(query);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
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

  const getHighQualityImage = (images: any) => {
    return getBestImage(images);
  };

  const getArtistNames = (song: any): string => {
    if (song.artists?.primary && Array.isArray(song.artists.primary)) {
      return song.artists.primary.map((artist: any) => artist.name).join(', ');
    }
    return 'Unknown Artist';
  };

  

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, song: any) => {
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
        const exists = favourites.some((fav: any) => fav.id === selectedSong.id);
        
        if (!exists) {
          const newFav = {
            id: selectedSong.id,
            name: selectedSong.name,
            artist: getArtistNames(selectedSong),
            albumArt: getHighQualityImage(selectedSong.image),
            addedAt: Date.now(),
          };
          const updated = [...favourites, newFav];
          await persistFavourites(FAVOURITE_SONGS_KEY, updated);
          if (onShowSnackbar) {
            onShowSnackbar('Added to favourites ❤️');
          }
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
          <Box sx={{ mb: 2, overflowX: 'auto' }}>
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
          </Box>
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
        <MenuItem onClick={handlePlayNow}>
          <ListItemIcon>
            <PlayArrow fontSize="small" />
          </ListItemIcon>
          <Typography variant="body2">Play Now</Typography>
        </MenuItem>
        <MenuItem onClick={handlePlayNext}>
          <ListItemIcon>
            <QueueMusic fontSize="small" />
          </ListItemIcon>
          <Typography variant="body2">Play Next</Typography>
        </MenuItem>
        <MenuItem onClick={handleAddToQueue}>
          <ListItemIcon>
            <PlaylistAdd fontSize="small" />
          </ListItemIcon>
          <Typography variant="body2">Add to Queue</Typography>
        </MenuItem>
        <MenuItem onClick={handleAddToFavourites}>
          <ListItemIcon>
            <Favorite fontSize="small" />
          </ListItemIcon>
          <Typography variant="body2">Add to Favourites</Typography>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default SearchPage;

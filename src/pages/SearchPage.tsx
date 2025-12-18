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
  Tabs,
  Tab,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import AlbumIcon from '@mui/icons-material/Album';
import ClearIcon from '@mui/icons-material/Clear';
import HistoryIcon from '@mui/icons-material/History';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { saavnApi } from '../services/saavnApi';
import { Song } from '../types/api';

interface SearchPageProps {
  onSongSelect: (song: Song) => void;
  onPlaylistSelect: (playlistId: string, playlistName: string, playlistImage: string) => void;
  onAlbumSelect: (albumId: string, albumName: string, albumImage: string) => void;
}

const SearchPage: React.FC<SearchPageProps> = ({ onSongSelect, onPlaylistSelect, onAlbumSelect }) => {
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
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(() => {
    return sessionStorage.getItem('hasSearched') === 'true';
  });
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

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

  // Clear all recent searches
  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  // Decode HTML entities in strings
  const decodeHtmlEntities = (text: string): string => {
    if (!text) return text;
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    const decoded = textarea.value;
    // If still contains entities, try one more time
    if (decoded.includes('&')) {
      textarea.innerHTML = decoded;
      return textarea.value;
    }
    return decoded;
  };

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 3) {
      setSongs([]);
      setPlaylists([]);
      setAlbums([]);
      setHasSearched(false);
      return;
    }

    // Save to recent searches
    saveToRecentSearches(query);

    setLoading(true);
    try {
      // Call all three APIs in parallel
      const [songsResponse, playlistsResponse, albumsResponse] = await Promise.all([
        saavnApi.searchSongs(query, 10),
        saavnApi.searchPlaylists(query, 10),
        saavnApi.searchAlbums(query, 10)
      ]);
      
      // Extract songs from response
      const songsData = songsResponse.data?.results || [];
      
      const validSongs = songsData.filter((song: any) => {
        return song && 
               song.id && 
               song.name && 
               song.image && 
               song.image.length > 0;
      }).slice(0, 10);
      
      // Extract playlists from response
      const playlistsData = playlistsResponse.data?.results || [];
      
      const validPlaylists = playlistsData.filter((playlist: any) => {
        return playlist && 
               playlist.id && 
               playlist.name && 
               playlist.image && 
               playlist.image.length > 0;
      }).slice(0, 10);
      
      // Extract albums from response
      const albumsData = albumsResponse.data?.results || [];
      
      const validAlbums = albumsData.filter((album: any) => {
        return album && 
               album.id && 
               album.name && 
               album.image && 
               album.image.length > 0;
      }).slice(0, 10);
      
      setSongs(validSongs);
      setPlaylists(validPlaylists);
      setAlbums(validAlbums);
      setHasSearched(true);
    } catch (error) {
      setSongs([]);
      setPlaylists([]);
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

  const getHighQualityImage = (images: Array<{ quality: string; url: string }>) => {
    if (!images || images.length === 0) return '';
    
    // Try to get the highest quality image available
    const qualities = ['500x500', '150x150', '50x50'];
    for (const quality of qualities) {
      const img = images.find(img => img.quality === quality);
      if (img?.url) return img.url;
    }
    
    // Fallback to last available image
    return images[images.length - 1]?.url || '';
  };

  const getArtistNames = (song: any): string => {
    if (song.artists?.primary && Array.isArray(song.artists.primary)) {
      return song.artists.primary.map((artist: any) => artist.name).join(', ');
    }
    return 'Unknown Artist';
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Box sx={{ pb: 16, px: 2, pt: 2 }}>
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
              <SearchIcon sx={{ color: 'text.secondary' }} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              {loading ? (
                <CircularProgress size={20} sx={{ color: 'primary.main' }} />
              ) : searchQuery ? (
                <ClearIcon
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
          mb: 3,
          '& input': {
            color: 'text.primary',
          },
        }}
      />

      {/* Recent Searches */}
      {!hasSearched && !loading && recentSearches.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <HistoryIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                Recent Searches
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={clearRecentSearches}
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  color: 'error.main',
                },
              }}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {recentSearches.map((search, index) => (
              <Chip
                key={index}
                label={search}
                onClick={() => handleRecentSearchClick(search)}
                sx={{
                  bgcolor: 'action.hover',
                  color: 'text.primary',
                  '&:hover': {
                    bgcolor: 'action.selected',
                  },
                  cursor: 'pointer',
                }}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Loading State */}
      {loading && (
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
          <CircularProgress size={48} sx={{ color: 'primary.main' }} />
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Searching...
          </Typography>
        </Box>
      )}

      {/* Tabs for Search Results */}
      {!loading && hasSearched && (songs.length > 0 || playlists.length > 0 || albums.length > 0) && (
        <Box>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              mb: 2,
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.9rem',
                minWidth: 80,
                minHeight: 48,
              },
              '& .Mui-selected': {
                color: 'primary.main',
                fontWeight: 600,
              },
            }}
          >
            <Tab icon={<MusicNoteIcon />} iconPosition="start" label="Songs" />
            <Tab icon={<AlbumIcon />} iconPosition="start" label="Albums" />
            <Tab icon={<PlaylistPlayIcon />} iconPosition="start" label="Playlists" />
          </Tabs>

          {/* Songs Tab */}
          {activeTab === 0 && (
            <Box>
              {songs.length === 0 ? (
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
                  <MusicNoteIcon sx={{ fontSize: 64, color: 'text.disabled', opacity: 0.3 }} />
                  <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                    No songs found
                  </Typography>
                </Box>
              ) : (
                <List sx={{ bgcolor: 'transparent', p: 0 }}>
                  {songs.map((song) => (
                    <ListItem
                      key={song.id}
                      onClick={() => onSongSelect(song)}
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
                          src={getHighQualityImage(song.image)}
                          variant="rounded"
                          sx={{ width: 56, height: 56 }}
                        >
                          <MusicNoteIcon />
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
                            {decodeHtmlEntities(song.name)}
                          </Typography>
                        }
                        secondary={
                          <Box>
                            <Typography
                              variant="body2"
                              sx={{
                                color: 'text.secondary',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {decodeHtmlEntities(getArtistNames(song))}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                              {decodeHtmlEntities(song.album?.name || 'Unknown Album')} • {formatDuration(song.duration)}
                            </Typography>
                          </Box>
                        }
                        secondaryTypographyProps={{ component: 'div' }}
                      />
                    </ListItem>
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
                  <AlbumIcon sx={{ fontSize: 64, color: 'text.disabled', opacity: 0.3 }} />
                  <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                    No albums found
                  </Typography>
                </Box>
              ) : (
                <List sx={{ bgcolor: 'transparent', p: 0 }}>
                  {albums.map((album) => (
                    <ListItem
                      key={album.id}
                      onClick={() => onAlbumSelect(album.id, decodeHtmlEntities(album.name), getHighQualityImage(album.image))}
                      sx={{
                        cursor: 'pointer',
                        borderRadius: 1,
                        px: 1,
                        py: 1,
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
                          <AlbumIcon />
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
                  <PlaylistPlayIcon sx={{ fontSize: 64, color: 'text.disabled', opacity: 0.3 }} />
                  <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                    No playlists found
                  </Typography>
                </Box>
              ) : (
                <List sx={{ bgcolor: 'transparent', p: 0 }}>
                  {playlists.map((playlist) => (
                    <ListItem
                      key={playlist.id}
                      onClick={() => onPlaylistSelect(playlist.id, decodeHtmlEntities(playlist.name), getHighQualityImage(playlist.image))}
                      sx={{
                        cursor: 'pointer',
                        borderRadius: 1,
                        px: 1,
                        py: 1,
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
                          <PlaylistPlayIcon />
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
        </Box>
      )}

      {/* No Results */}
      {!loading && hasSearched && songs.length === 0 && playlists.length === 0 && albums.length === 0 && (
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
          <SearchIcon sx={{ fontSize: 64, color: '#404040' }} />
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
    </Box>
  );
};

export default SearchPage;

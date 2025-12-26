import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  IconButton,
  Tabs,
  Tab,
  Menu,
  MenuItem,
  ListItemIcon,
} from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import FavoriteIcon from '@mui/icons-material/Favorite';
import DeleteIcon from '@mui/icons-material/Delete';
import AlbumIcon from '@mui/icons-material/Album';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import PersonIcon from '@mui/icons-material/Person';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import {
  FAVOURITE_ALBUMS_KEY,
  FAVOURITE_PLAYLISTS_KEY,
  FAVOURITE_SONGS_KEY,
  FAVOURITE_ARTISTS_KEY,
  persistFavourites,
  readFavourites,
} from '../services/storage';

interface FavouriteSong {
  id: string;
  name: string;
  artist: string;
  albumArt: string;
  addedAt: number;
}

interface FavouriteAlbum {
  id: string;
  name: string;
  artist: string;
  image: string;
  addedAt: number;
}

interface FavouritePlaylist {
  id: string;
  name: string;
  description: string;
  image: string;
  addedAt: number;
}

interface FavouriteArtist {
  id: string;
  name: string;
  image: string;
  addedAt: number;
}

interface FavouritesPageProps {
  onSongSelect: (songId: string) => void;
  onAlbumSelect?: (albumId: string, albumName: string, albumImage: string) => void;
  onPlaylistSelect?: (playlistId: string, playlistName: string, playlistImage: string) => void;
  onArtistSelect?: (artistId: string, artistName: string, artistImage: string) => void;
}

const FavouritesPage: React.FC<FavouritesPageProps> = ({ onSongSelect, onAlbumSelect, onPlaylistSelect, onArtistSelect }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [favourites, setFavourites] = useState<FavouriteSong[]>([]);
  const [favouriteAlbums, setFavouriteAlbums] = useState<FavouriteAlbum[]>([]);
  const [favouritePlaylists, setFavouritePlaylists] = useState<FavouritePlaylist[]>([]);
  const [favouriteArtists, setFavouriteArtists] = useState<FavouriteArtist[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Load favourites from IndexedDB
  useEffect(() => {
    loadFavourites();
    loadFavouriteAlbums();
    loadFavouritePlaylists();
    loadFavouriteArtists();
  }, []);

  const loadFavourites = async () => {
    const saved = await readFavourites(FAVOURITE_SONGS_KEY);
    try {
      const sorted = [...saved].sort((a: FavouriteSong, b: FavouriteSong) => {
        return (b.addedAt || 0) - (a.addedAt || 0);
      });
      setFavourites(sorted);
    } catch (error) {
      setFavourites([]);
    }
  };

  const loadFavouriteAlbums = async () => {
    const saved = await readFavourites(FAVOURITE_ALBUMS_KEY);
    try {
      const sorted = [...saved].sort((a: FavouriteAlbum, b: FavouriteAlbum) => {
        return (b.addedAt || 0) - (a.addedAt || 0);
      });
      setFavouriteAlbums(sorted);
    } catch (error) {
      setFavouriteAlbums([]);
    }
  };

  const loadFavouritePlaylists = async () => {
    const saved = await readFavourites(FAVOURITE_PLAYLISTS_KEY);
    try {
      const sorted = [...saved].sort((a: FavouritePlaylist, b: FavouritePlaylist) => {
        return (b.addedAt || 0) - (a.addedAt || 0);
      });
      setFavouritePlaylists(sorted);
    } catch (error) {
      setFavouritePlaylists([]);
    }
  };

  const loadFavouriteArtists = async () => {
    const saved = await readFavourites(FAVOURITE_ARTISTS_KEY);
    try {
      const sorted = [...saved].sort((a: FavouriteArtist, b: FavouriteArtist) => {
        return (b.addedAt || 0) - (a.addedAt || 0);
      });
      setFavouriteArtists(sorted);
    } catch (error) {
      setFavouriteArtists([]);
    }
  };

  const removeFavourite = async (songId: string) => {
    const updated = favourites.filter(song => song.id !== songId);
    setFavourites(updated);
    try {
      await persistFavourites(FAVOURITE_SONGS_KEY, updated);
    } catch (error) {
      console.warn('Failed to persist favourite songs', error);
    }
  };

  const removeFavouriteAlbum = async (albumId: string) => {
    const updated = favouriteAlbums.filter(album => album.id !== albumId);
    setFavouriteAlbums(updated);
    try {
      await persistFavourites(FAVOURITE_ALBUMS_KEY, updated);
    } catch (error) {
      console.warn('Failed to persist favourite albums', error);
    }
  };

  const removeFavouritePlaylist = async (playlistId: string) => {
    const updated = favouritePlaylists.filter(playlist => playlist.id !== playlistId);
    setFavouritePlaylists(updated);
    try {
      await persistFavourites(FAVOURITE_PLAYLISTS_KEY, updated);
    } catch (error) {
      console.warn('Failed to persist favourite playlists', error);
    }
  };

  const removeFavouriteArtist = async (artistId: string) => {
    const updated = favouriteArtists.filter(artist => artist.id !== artistId);
    setFavouriteArtists(updated);
    try {
      await persistFavourites(FAVOURITE_ARTISTS_KEY, updated);
    } catch (error) {
      console.warn('Failed to persist favourite artists', error);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, item: any) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedItem(item);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedItem(null);
  };

  const handleRemove = async () => {
    if (selectedItem) {
      if (activeTab === 0) {
        await removeFavourite(selectedItem.id);
      } else if (activeTab === 1) {
        await removeFavouriteAlbum(selectedItem.id);
      } else if (activeTab === 2) {
        await removeFavouritePlaylist(selectedItem.id);
      } else if (activeTab === 3) {
        await removeFavouriteArtist(selectedItem.id);
      }
    }
    handleMenuClose();
  };

  // Decode HTML entities in strings
  const decodeHtmlEntities = (text: string): string => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const getTotalCount = () => {
    if (activeTab === 0) return favourites.length;
    if (activeTab === 1) return favouriteAlbums.length;
    if (activeTab === 2) return favouritePlaylists.length;
    return favouriteArtists.length;
  };

  const getTabLabel = () => {
    if (activeTab === 0) return 'Songs';
    if (activeTab === 1) return 'Albums';
    if (activeTab === 2) return 'Playlists';
    return 'Artists';
  };

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        bgcolor: 'background.default',
        pb: 10,
        pt: 1,
        px: 2
      }}
    >
      <Box sx={{ px: 0 }}>
        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <FavoriteIcon sx={{ color: 'primary.main', fontSize: 32 }} />
              <Typography 
                variant="h5" 
                sx={{ 
                  color: 'text.primary', 
                  fontWeight: 'bold'
                }}
              >
                Your Library
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              {getTotalCount()} {getTabLabel().toLowerCase()}
            </Typography>
          </Box>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              mb: 2,
              px: 0,
              '& .MuiTabs-flexContainer': {
                justifyContent: 'space-between',
                width: '100%',
              },
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.95rem',
                minWidth: 70,
                minHeight: 42,
                px: 0.8,
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
            <Tab icon={<PersonIcon />} iconPosition="start" label="Artists" />
          </Tabs>
        </Box>

        {/* Songs Tab */}
        {activeTab === 0 && (
          <>
            {favourites.length === 0 ? (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '50vh',
                  gap: 2,
                  px: { xs: 1, sm: 1.5 },
                }}
              >
                <MusicNoteIcon sx={{ fontSize: 80, color: 'text.disabled', opacity: 0.3 }} />
                <Typography variant="h6" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                  No favourite songs yet
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.disabled', textAlign: 'center' }}>
                  Add songs to your library by tapping the heart icon
                </Typography>
              </Box>
            ) : (
              <List sx={{ px: 0 }}>
                {favourites.map((song) => (
                  <ListItem
                    key={song.id}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                        px: 0,
                      py: 0.5,
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        onClick={(e) => handleMenuOpen(e, song)}
                        sx={{ color: 'text.secondary' }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    }
                  >
                    <ListItemAvatar 
                      sx={{ minWidth: 72, cursor: 'pointer' }}
                      onClick={() => onSongSelect(song.id)}
                    >
                      <Avatar
                        src={song.albumArt || ''}
                        variant="rounded"
                        sx={{ 
                          width: 56, 
                          height: 56,
                          bgcolor: song.albumArt ? 'transparent' : 'primary.main',
                          fontSize: '1.5rem',
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                        imgProps={{
                          loading: 'lazy',
                          onError: (e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }
                        }}
                      >
                        {!song.albumArt && <MusicNoteIcon />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      onClick={() => onSongSelect(song.id)}
                      sx={{ 
                        cursor: 'pointer',
                        mr: 1.5,
                        pr: 0.5,
                        minWidth: 0,
                        flex: 1
                      }}
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
                            {decodeHtmlEntities(song.artist)}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                            Added {formatDate(song.addedAt)}
                          </Typography>
                        </Box>
                      }
                      secondaryTypographyProps={{ component: 'div' }}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </>
        )}

        {/* Albums Tab */}
        {activeTab === 1 && (
          <>
            {favouriteAlbums.length === 0 ? (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '50vh',
                  gap: 2,
                  px: { xs: 1, sm: 1.5 },
                }}
              >
                <AlbumIcon sx={{ fontSize: 80, color: 'text.disabled', opacity: 0.3 }} />
                <Typography variant="h6" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                  No favourite albums yet
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.disabled', textAlign: 'center' }}>
                  Add albums to your library
                </Typography>
              </Box>
            ) : (
                <List sx={{ px: 0 }}>
                {favouriteAlbums.map((album) => (
                  <ListItem
                    key={album.id}
                    onClick={() => {
                      if (onAlbumSelect) {
                        onAlbumSelect(album.id, album.name, album.image);
                      }
                    }}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      px: 0,
                      py: 0.5,
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: (theme) =>
                          theme.palette.mode === 'light'
                            ? 'rgba(0, 188, 212, 0.08)'
                            : 'rgba(255, 255, 255, 0.05)',
                      },
                    }}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        onClick={(e) => handleMenuOpen(e, album)}
                        sx={{ color: 'text.secondary' }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    }
                  >
                    <ListItemAvatar sx={{ minWidth: 72 }}>
                      <Avatar
                        src={album.image || ''}
                        variant="rounded"
                        sx={{ 
                          width: 56, 
                          height: 56,
                          bgcolor: album.image ? 'transparent' : 'primary.main',
                          fontSize: '1.5rem',
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                        imgProps={{
                          loading: 'lazy',
                          onError: (e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }
                        }}
                      >
                        {!album.image && <AlbumIcon />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      sx={{
                        mr: 1.5,
                        pr: 0.5,
                        minWidth: 0,
                        flex: 1
                      }}
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
                            {decodeHtmlEntities(album.artist)}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 0.25 }}>
                            Added {formatDate(album.addedAt)}
                          </Typography>
                        </Box>
                      }
                      secondaryTypographyProps={{ component: 'div' }}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </>
        )}

        {/* Playlists Tab */}
        {activeTab === 2 && (
          <>
            {favouritePlaylists.length === 0 ? (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '50vh',
                  gap: 2,
                  px: 2,
                }}
              >
                <PlaylistPlayIcon sx={{ fontSize: 80, color: 'text.disabled', opacity: 0.3 }} />
                <Typography variant="h6" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                  No favourite playlists yet
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.disabled', textAlign: 'center' }}>
                  Add playlists to your library
                </Typography>
              </Box>
            ) : (
              <List sx={{ px: 2 }}>
                {favouritePlaylists.map((playlist) => (
                  <ListItem
                    key={playlist.id}
                    onClick={() => {
                      if (onPlaylistSelect) {
                        onPlaylistSelect(playlist.id, playlist.name, playlist.image);
                      }
                    }}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      px: 0,
                      py: 0.5,
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: (theme) =>
                          theme.palette.mode === 'light'
                            ? 'rgba(0, 188, 212, 0.08)'
                            : 'rgba(255, 255, 255, 0.05)',
                      },
                    }}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        onClick={(e) => handleMenuOpen(e, playlist)}
                        sx={{ color: 'text.secondary' }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    }
                  >
                    <ListItemAvatar sx={{ minWidth: 72 }}>
                      <Avatar
                        src={playlist.image || ''}
                        variant="rounded"
                        sx={{ 
                          width: 56, 
                          height: 56,
                          bgcolor: playlist.image ? 'transparent' : 'primary.main',
                          fontSize: '1.5rem',
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                        imgProps={{
                          loading: 'lazy',
                          onError: (e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }
                        }}
                      >
                        {!playlist.image && <PlaylistPlayIcon />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      sx={{
                        mr: 1.5,
                        pr: 0.5,
                        minWidth: 0,
                        flex: 1
                      }}
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
                            {playlist.description || 'Playlist'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 0.25 }}>
                            Added {formatDate(playlist.addedAt)}
                          </Typography>
                        </Box>
                      }
                      secondaryTypographyProps={{ component: 'div' }}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </>
        )}

        {/* Artists Tab */}
        {activeTab === 3 && (
          <>
            {favouriteArtists.length === 0 ? (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '50vh',
                  gap: 2,
                  px: 2,
                }}
              >
                <PersonIcon sx={{ fontSize: 80, color: 'text.disabled', opacity: 0.3 }} />
                <Typography variant="h6" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                  No favourite artists yet
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.disabled', textAlign: 'center' }}>
                  Add artists to your library
                </Typography>
              </Box>
            ) : (
              <List sx={{ px: 2 }}>
                {favouriteArtists.map((artist) => (
                  <ListItem
                    key={artist.id}
                    onClick={() => {
                      if (onArtistSelect) {
                        onArtistSelect(artist.id, artist.name, artist.image);
                      }
                    }}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      px: 0,
                      py: 0.5,
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: (theme) =>
                          theme.palette.mode === 'light'
                            ? 'rgba(0, 188, 212, 0.08)'
                            : 'rgba(255, 255, 255, 0.05)',
                      },
                    }}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        onClick={(e) => handleMenuOpen(e, artist)}
                        sx={{ color: 'text.secondary' }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    }
                  >
                    <ListItemAvatar sx={{ minWidth: 72 }}>
                      <Avatar
                        src={artist.image || ''}
                        sx={{ 
                          width: 56, 
                          height: 56,
                          bgcolor: artist.image ? 'transparent' : 'primary.main',
                          fontSize: '1.5rem',
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                        imgProps={{
                          loading: 'lazy',
                          onError: (e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }
                        }}
                      >
                        {!artist.image && <PersonIcon />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      sx={{
                        mr: 1.5,
                        pr: 0.5,
                        minWidth: 0,
                        flex: 1
                      }}
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
                            Artist
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 0.25 }}>
                            Added {formatDate(artist.addedAt)}
                          </Typography>
                        </Box>
                      }
                      secondaryTypographyProps={{ component: 'div' }}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </>
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
          {activeTab === 0 && (
            <MenuItem onClick={() => { onSongSelect(selectedItem?.id); handleMenuClose(); }}>
              <ListItemIcon>
                <PlayArrowIcon fontSize="small" />
              </ListItemIcon>
              <Typography variant="body2">Play Now</Typography>
            </MenuItem>
          )}
          {activeTab === 1 && onAlbumSelect && (
            <MenuItem onClick={() => { onAlbumSelect(selectedItem?.id, selectedItem?.name, selectedItem?.image); handleMenuClose(); }}>
              <ListItemIcon>
                <PlayArrowIcon fontSize="small" />
              </ListItemIcon>
              <Typography variant="body2">Open Album</Typography>
            </MenuItem>
          )}
          {activeTab === 2 && onPlaylistSelect && (
            <MenuItem onClick={() => { onPlaylistSelect(selectedItem?.id, selectedItem?.name, selectedItem?.image); handleMenuClose(); }}>
              <ListItemIcon>
                <PlayArrowIcon fontSize="small" />
              </ListItemIcon>
              <Typography variant="body2">Open Playlist</Typography>
            </MenuItem>
          )}
          {activeTab === 3 && onArtistSelect && (
            <MenuItem onClick={() => { onArtistSelect(selectedItem?.id, selectedItem?.name, selectedItem?.image); handleMenuClose(); }}>
              <ListItemIcon>
                <PlayArrowIcon fontSize="small" />
              </ListItemIcon>
              <Typography variant="body2">Open Artist</Typography>
            </MenuItem>
          )}
          <MenuItem onClick={handleRemove} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" sx={{ color: 'error.main' }} />
            </ListItemIcon>
            <Typography variant="body2">Remove from Library</Typography>
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
};

export default FavouritesPage;

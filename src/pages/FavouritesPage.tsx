import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Container,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
} from '@mui/material';
import TrackList from '../components/TrackList';
import HorizontalScroller from '../components/HorizontalScroller';
import { MusicNote, Favorite, Album, PlaylistPlay, Person, MoreVertical } from '../icons';
import SongContextMenu from '../components/SongContextMenu';
import SongItem from '../components/SongItem';
import {
  FAVOURITE_ALBUMS_KEY,
  FAVOURITE_PLAYLISTS_KEY,
  FAVOURITE_SONGS_KEY,
  FAVOURITE_ARTISTS_KEY,
  persistFavourites,
  readFavourites,
} from '../services/storage';
import { decodeHtmlEntities } from '../utils/normalize';

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

type AnyRecord = Record<string, unknown>;

const FavouritesPage: React.FC<FavouritesPageProps> = ({ onSongSelect, onAlbumSelect, onPlaylistSelect, onArtistSelect }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [favourites, setFavourites] = useState<FavouriteSong[]>([]);
  const [favouriteAlbums, setFavouriteAlbums] = useState<FavouriteAlbum[]>([]);
  const [favouritePlaylists, setFavouritePlaylists] = useState<FavouritePlaylist[]>([]);
  const [favouriteArtists, setFavouriteArtists] = useState<FavouriteArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedItem, setSelectedItem] = useState<Song | FavouriteAlbum | FavouritePlaylist | FavouriteArtist | AnyRecord | null>(null);

  // Load favourites from IndexedDB
  useEffect(() => {
    loadFavourites();
    loadFavouriteAlbums();
    loadFavouritePlaylists();
    loadFavouriteArtists();
    // Ensure loading cleared after initial load attempts
    const timer = setTimeout(() => setLoading(false), 250);
    return () => clearTimeout(timer);
  }, []);

  const loadFavourites = async () => {
    const saved = await readFavourites(FAVOURITE_SONGS_KEY);
    try {
      const sorted = [...saved].sort((a: FavouriteSong, b: FavouriteSong) => {
        return (b.addedAt || 0) - (a.addedAt || 0);
      });
      setFavourites(sorted);
    } catch {
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
    } catch {
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
    } catch {
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
    } catch {
      setFavouriteArtists([]);
    }
  };

  const removeFavourite = async (songId: string) => {
    const updated = favourites.filter(song => song.id !== songId);
    setFavourites(updated);
    try {
      await persistFavourites(FAVOURITE_SONGS_KEY, updated);
    } catch {
      console.warn('Failed to persist favourite songs');
    }
  };

  const removeFavouriteAlbum = async (albumId: string) => {
    const updated = favouriteAlbums.filter(album => album.id !== albumId);
    setFavouriteAlbums(updated);
    try {
      await persistFavourites(FAVOURITE_ALBUMS_KEY, updated);
    } catch {
      console.warn('Failed to persist favourite albums');
    }
  };

  const removeFavouritePlaylist = async (playlistId: string) => {
    const updated = favouritePlaylists.filter(playlist => playlist.id !== playlistId);
    setFavouritePlaylists(updated);
    try {
      await persistFavourites(FAVOURITE_PLAYLISTS_KEY, updated);
    } catch {
      console.warn('Failed to persist favourite playlists');
    }
  };

  const removeFavouriteArtist = async (artistId: string) => {
    const updated = favouriteArtists.filter(artist => artist.id !== artistId);
    setFavouriteArtists(updated);
    try {
      await persistFavourites(FAVOURITE_ARTISTS_KEY, updated);
    } catch {
      console.warn('Failed to persist favourite artists');
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, item: Song | FavouriteAlbum | FavouritePlaylist | FavouriteArtist | AnyRecord) => {
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

  // use shared `decodeHtmlEntities` from utils

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
      }}
    >
      <Container maxWidth="sm" disableGutters sx={{ px: 2 }}>
        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Favorite sx={{ color: 'error.main', fontSize: 32 }} />
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

          {/* Tabs - compact horizontal scroll for chips only */}
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
        </Box>
      </Container>

      {/* Tab Content */}
      <Box>
        {/* Songs Tab */}
        {activeTab === 0 && (
          <>
            <TrackList
              items={favourites}
              loading={loading}
              keyExtractor={(s: FavouriteSong) => s.id}
              skeletonCount={6}
              renderEmpty={(
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
                  <MusicNote sx={{ fontSize: 80, color: 'text.disabled', opacity: 0.3 }} />
                  <Typography variant="h6" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                    No favourite songs yet
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.disabled', textAlign: 'center' }}>
                    Add songs to your library by tapping the heart icon
                  </Typography>
                </Box>
              )}
              renderItem={(song: FavouriteSong) => (
                <SongItem
                  key={song.id}
                  title={decodeHtmlEntities(song.name)}
                  artist={decodeHtmlEntities(song.artist)}
                  imageSrc={song.albumArt || ''}
                  onClick={() => onSongSelect(song.id)}
                  rightContent={
                    <IconButton
                      edge="end"
                      onClick={(e) => handleMenuOpen(e, song)}
                      sx={{ color: 'text.secondary' }}
                    >
                      <MoreVertical />
                    </IconButton>
                  }
                  meta={`Added ${formatDate(song.addedAt)}`}
                />
              )}
            />
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
                <Album sx={{ fontSize: 80, color: 'text.disabled', opacity: 0.3 }} />
                <Typography variant="h6" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                  No favourite albums yet
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.disabled', textAlign: 'center' }}>
                  Add albums to your library
                </Typography>
              </Box>
            ) : (
                <List sx={{ px: 2 }}>
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
                        <MoreVertical />
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
                          borderRadius: 1.5,
                        }}
                        imgProps={{
                          loading: 'lazy',
                          onError: (e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }
                        }}
                      >
                        {!album.image && <Album />}
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
                          {decodeHtmlEntities((album.name || '').replace(/\s+/g, ' ').trim())}
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
                <PlaylistPlay sx={{ fontSize: 80, color: 'text.disabled', opacity: 0.3 }} />
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
                        <MoreVertical />
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
                          borderColor: 'divider',                          borderRadius: 1.5,                        }}
                        imgProps={{
                          loading: 'lazy',
                          onError: (e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }
                        }}
                      >
                        {!playlist.image && <PlaylistPlay />}
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
                <Person sx={{ fontSize: 80, color: 'text.disabled', opacity: 0.3 }} />
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
                        <MoreVertical />
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
                          borderRadius: 1.5,
                        }}
                        imgProps={{
                          loading: 'lazy',
                          onError: (e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }
                        }}
                      >
                        {!artist.image && <Person />}
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

        <SongContextMenu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          onPlayNow={() => {
            if (activeTab === 0 && selectedItem) onSongSelect(selectedItem.id);
          }}
          isFavourite={activeTab === 0 || activeTab === 1 || activeTab === 2}
          onOpenAlbum={activeTab === 1 && onAlbumSelect ? () => onAlbumSelect!(selectedItem?.id, selectedItem?.name, selectedItem?.image) : undefined}
          onOpenPlaylist={activeTab === 2 && onPlaylistSelect ? () => onPlaylistSelect!(selectedItem?.id, selectedItem?.name, selectedItem?.image) : undefined}
          onOpenArtist={activeTab === 3 && onArtistSelect ? () => onArtistSelect!(selectedItem?.id, selectedItem?.name, selectedItem?.image) : undefined}
          onRemove={handleRemove}
          removeLabel="Remove from Library"
          mode="compact"
        />
      </Box>
    </Box>
  );
};

export default FavouritesPage;

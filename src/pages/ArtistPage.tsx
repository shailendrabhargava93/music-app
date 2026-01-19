import React, { useEffect, useState } from 'react';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import { MoreVertical } from '../icons';
// About dialog removed per request
import { Box, Container, Typography, Avatar, IconButton, Skeleton, List, Chip, Button } from '@mui/material';
import { ArrowBack, PlayArrow, Album, QueueMusic, PlaylistAdd, Verified, Language, Favorite, PeopleAlt, Person } from '../icons';
import { saavnApi } from '../services/saavnApi';
import { FAVOURITE_SONGS_KEY, persistFavourites, readFavourites } from '../services/storage';
import SongItem from '../components/SongItem';
import { decodeHtmlEntities, joinArtistNames, formatCountShort, getBestImage } from '../utils/normalize';

interface ArtistPageProps {
  artistId: string;
  artistName?: string;
  artistImage?: string;
  onBack: () => void;
  onSongSelect?: (song: any, context?: any[]) => void;
  onAddToQueue?: (song: any) => void;
  onPlayNext?: (song: any) => void;
  onAlbumSelect?: (albumId: string, albumName: string, albumImage: string) => void;
}

const ArtistPage: React.FC<ArtistPageProps> = ({ artistId, artistName, artistImage, onBack, onSongSelect, onAddToQueue, onPlayNext, onAlbumSelect }) => {
  const [loading, setLoading] = useState(true);
  const [artistData, setArtistData] = useState<any>(null);
  const [topSongs, setTopSongs] = useState<any[]>([]);
  const [topAlbums, setTopAlbums] = useState<any[]>([]);
  const [singles, setSingles] = useState<any[]>([]);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuTarget, setMenuTarget] = useState<any>(null);
  const [isFavouriteLocal, setIsFavouriteLocal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchArtist = async () => {
      setLoading(true);
      try {
        const resp = await saavnApi.getArtistById(artistId);
        if (!isMounted) return;
        const data = resp?.data ?? resp;
        setArtistData(data);

        // topSongs/topAlbums/singles may be nested under data
        setTopSongs(Array.isArray(data?.topSongs) ? data.topSongs : (Array.isArray(data?.top_songs) ? data.top_songs : []));
        setTopAlbums(Array.isArray(data?.topAlbums) ? data.topAlbums : (Array.isArray(data?.top_albums) ? data.top_albums : []));
        setSingles(Array.isArray(data?.singles) ? data.singles : (Array.isArray(data?.singles_list) ? data.singles_list : []));
      } catch (err) {
        console.warn('Failed to fetch artist', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchArtist();
    // Scroll to top when opening an artist page
    window.scrollTo(0, 0);
    return () => { isMounted = false; };
  }, [artistId]);

  const getImageFromData = () => {
    if (artistImage) return artistImage;
    if (!artistData) return '';
    return getBestImage(artistData.image || artistData.images || artistData.thumbnail || artistData.cover || artistData.img);
  };

  const getHighQualityImage = (images: any) => getBestImage(images);

  const mainContent = (
    <Box sx={{ pb: 14, minHeight: '100vh' }}>
      <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1200, backgroundColor: 'background.default', py: 0.5 }}>
        <Container maxWidth="sm" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={onBack} sx={{ color: 'text.primary' }}><ArrowBack /></IconButton>
          <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>{artistName || decodeHtmlEntities(artistData?.name || '')}</Typography>
        </Container>
      </Box>
      <Box sx={{ height: 56 }} />

      <Container maxWidth="sm" sx={{ px: 2, pt: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
          {loading ? (
            <Skeleton variant="circular" width={120} height={120} />
          ) : (
            <Avatar src={getImageFromData()} variant="rounded" imgProps={{ loading: 'lazy' }} sx={{ width: 120, height: 120, boxShadow: '0 6px 18px rgba(0,0,0,0.2)' }}>
              <Person sx={{ fontSize: 48 }} />
            </Avatar>
          )}
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>{artistName || decodeHtmlEntities(artistData?.name || '')}</Typography>
              {!loading && artistData?.isVerified ? <Verified color="primary" sx={{ fontSize: 18 }} /> : null}
            </Box>

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mt: 0.5 }}>
              {!loading && typeof artistData?.followerCount !== 'undefined' ? (
                <Chip size="small" icon={<PeopleAlt />} label={`${formatCountShort(artistData.followerCount)} followers`} />
              ) : loading ? <Skeleton variant="rectangular" width={120} height={28} /> : null}

              {!loading && artistData?.fanCount ? (
                <Chip size="small" icon={<Favorite />} label={`${formatCountShort(artistData.fanCount)} fans`} />
              ) : loading ? <Skeleton variant="rectangular" width={90} height={28} /> : null}

              {!loading && artistData?.dominantLanguage ? (
                <Chip size="small" icon={<Language />} label={String(artistData.dominantLanguage).toUpperCase()} />
              ) : null}
            </Box>

            {/* Removed social links as requested */}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              {/* Replace inline intro with an active About chip */}
              {/* About removed: use album/artist pages and actions instead */}
            </Box>
          </Box>
        </Box>

        {/* New Release / Top Songs section */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6">Top Songs</Typography>
            {!loading ? (
              <Button size="small" startIcon={<PlayArrow />} onClick={() => { if (onSongSelect && topSongs && topSongs.length > 0) onSongSelect(topSongs[0], topSongs); }}>
                Play All
              </Button>
            ) : <Skeleton variant="rectangular" width={80} height={32} />}
          </Box>

          {loading ? (
            <Box>
              {[...Array(6)].map((_, i) => (
                <Box key={i} sx={{ mb: 1 }}>
                  <Skeleton variant="rectangular" height={64} />
                </Box>
              ))}
            </Box>
          ) : (
            <List>
              {topSongs.slice(0, 12).map((song: any, idx: number) => {
                const title = decodeHtmlEntities(song.name || song.title || 'Untitled');
                const artist = joinArtistNames(song.artists?.primary ?? song.artists?.all ?? song.artists?.all ?? []);
                const imageSrc = getHighQualityImage(song.image) || (song.album && getHighQualityImage(song.album.image)) || '';
                return (
                    <SongItem
                      key={song.id || song.songid || song.sid || title || idx}
                      title={title}
                      artist={artist}
                      imageSrc={imageSrc}
                      onClick={() => onSongSelect && onSongSelect(song)}
                      rightContent={
                        <IconButton
                          edge="end"
                          onClick={(e) => { e.stopPropagation(); setMenuAnchor(e.currentTarget); setMenuTarget(song); }}
                          sx={{ color: 'text.secondary' }}
                        >
                          <MoreVertical />
                        </IconButton>
                      }
                    />
                );
              })}
            </List>
          )}
        </Box>

        {/* Top Albums */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Top Albums</Typography>
          {loading ? (
            <Box sx={{ display: 'flex', gap: 2, pb: 2, overflowX: 'auto' }}>
              {[...Array(6)].map((_, idx) => (
                <Box key={idx} sx={{ minWidth: 140, maxWidth: 140 }}>
                  <Skeleton variant="rounded" width={140} height={140} sx={{ mb: 1 }} />
                  <Skeleton variant="text" width="80%" sx={{ mb: 0.5 }} />
                  <Skeleton variant="text" width="60%" />
                </Box>
              ))}
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
              {topAlbums.map((album: any) => {
                const albumTitle = decodeHtmlEntities(album.name || album.title || '');
                const albumId = album.id || album.albumid || album.sid || album._id || albumTitle;
                // Prefer high-quality images when available
                let albumImage = '';
                if (Array.isArray(album.image) && album.image.length > 0) {
                  // try to pick the largest/url-like image
                  albumImage = album.image.find((i: any) => i?.quality === '500x500')?.url || album.image[0]?.url || album.image.find((i: any) => i?.url)?.url || '';
                } else {
                  albumImage = album.image || album.thumbnail || '';
                }
                const primaryArtist = album.artists?.primary?.[0]?.name || album.artists?.all?.[0]?.name || '';
                return (
                  <Box
                    key={albumId}
                    onClick={() => onAlbumSelect && onAlbumSelect(albumId, albumTitle, albumImage)}
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
                    <Box sx={{ position: 'relative' }}>
                      <Avatar
                        imgProps={{ loading: 'lazy' }}
                        src={albumImage}
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
                      <IconButton
                        size="small"
                        sx={{ position: 'absolute', right: 6, bottom: 6, bgcolor: 'background.paper' }}
                        onClick={(e) => { e.stopPropagation(); if (onAlbumSelect) onAlbumSelect(albumId, albumTitle, albumImage); }}
                      >
                        <PlayArrow />
                      </IconButton>
                    </Box>
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
                      {albumTitle}
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
                      {primaryArtist}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>

        {/* Singles */}
        <Box sx={{ mb: 6 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6">Singles</Typography>
            {!loading && singles.length > 0 ? (
              <Button 
                size="small" 
                startIcon={<PlayArrow />} 
                onClick={async () => { 
                  if (!onSongSelect || !singles[0]) return;
                  try {
                    const albumId = singles[0].id || singles[0].albumid || singles[0].album_id;
                    if (!albumId) return;
                    const albumData = await saavnApi.getAlbumById(albumId);
                    const songs = albumData?.data?.songs || albumData?.songs || [];
                    if (songs.length > 0) {
                      onSongSelect(songs[0], songs);
                    }
                  } catch (err) {
                    console.warn('Failed to load single', err);
                  }
                }}
              >
                Play All
              </Button>
            ) : loading ? <Skeleton variant="rectangular" width={80} height={32} /> : null}
          </Box>
          {loading ? (
            <Box>
              {[...Array(6)].map((_, i) => (
                <Box key={i} sx={{ mb: 1 }}>
                  <Skeleton variant="rectangular" height={64} />
                </Box>
              ))}
            </Box>
          ) : (
            <List>
              {singles.slice(0, 12).map((item: any, idx: number) => {
                // singles are album-like objects; fetch songs and play first one
                const title = decodeHtmlEntities(item.name || item.title || '');
                const artist = joinArtistNames(item.artists?.primary ?? item.artists?.all ?? []);
                const imageSrc = getHighQualityImage(item.image) || '';
                const albumId = item.id || item.albumid || item.album_id;
                
                const handleSingleClick = async () => {
                  if (!albumId || !onSongSelect) return;
                  try {
                    const albumData = await saavnApi.getAlbumById(albumId);
                    const songs = albumData?.data?.songs || albumData?.songs || [];
                    if (songs.length > 0) {
                      onSongSelect(songs[0], songs);
                    }
                  } catch (err) {
                    console.warn('Failed to load single', err);
                  }
                };
                
                return (
                  <SongItem
                    key={albumId || title || idx}
                    title={title}
                    artist={artist}
                    imageSrc={imageSrc}
                    onClick={handleSingleClick}
                    rightContent={
                      <IconButton
                        edge="end"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setMenuAnchor(e.currentTarget); 
                          setMenuTarget({ ...item, albumId, title, artist, imageSrc });
                        }}
                        sx={{ color: 'text.secondary' }}
                      >
                        <MoreVertical />
                      </IconButton>
                    }
                  />
                );
              })}
            </List>
          )}
        </Box>
      </Container>
    </Box>
  );

  // Menu for per-song actions
  const SongMenu: React.FC<{ anchorEl: HTMLElement | null; onClose: () => void; song: any | null; }> = ({ anchorEl, onClose, song }) => {
    const handlePlayNow = async () => {
      if (!song || !onSongSelect) return onClose();
      
      // Check if this is a single (has albumId)
      if (song.albumId) {
        try {
          const albumData = await saavnApi.getAlbumById(song.albumId);
          const songs = albumData?.data?.songs || albumData?.songs || [];
          if (songs.length > 0) {
            onSongSelect(songs[0], songs);
          }
        } catch (err) {
          console.warn('Failed to load single', err);
        }
      } else {
        onSongSelect(song, topSongs.concat(singles));
      }
      onClose();
    };

    const handleAddToQueue = async () => {
      if (!song || !onAddToQueue) return onClose();
      
      // Check if this is a single (has albumId)
      if (song.albumId) {
        try {
          const albumData = await saavnApi.getAlbumById(song.albumId);
          const songs = albumData?.data?.songs || albumData?.songs || [];
          if (songs.length > 0) {
            onAddToQueue(songs[0]);
          }
        } catch (err) {
          console.warn('Failed to load single', err);
        }
      } else {
        onAddToQueue(song);
      }
      onClose();
    };

    const handlePlayNext = async () => {
      if (!song || !onPlayNext) return onClose();
      
      // Check if this is a single (has albumId)
      if (song.albumId) {
        try {
          const albumData = await saavnApi.getAlbumById(song.albumId);
          const songs = albumData?.data?.songs || albumData?.songs || [];
          if (songs.length > 0) {
            onPlayNext(songs[0]);
          }
        } catch (err) {
          console.warn('Failed to load single', err);
        }
      } else {
        onPlayNext(song);
      }
      onClose();
    };

    // 'Go To Album' removed from Artist page context menu per request

    const handleToggleFavourite = async () => {
      if (!song) return onClose();
      try {
        const favourites = await readFavourites(FAVOURITE_SONGS_KEY);
        const exists = favourites.some((s: any) => s.id === song.id);
        if (exists) {
          const updated = favourites.filter((s: any) => s.id !== song.id);
          await persistFavourites(FAVOURITE_SONGS_KEY, updated);
          setIsFavouriteLocal(false);
        } else {
          const newFavourite = {
            id: song.id,
            name: song.name || song.title,
            artist: song.primaryArtists || song.artist || '',
            albumArt: Array.isArray(song.image) && song.image[0] ? (song.image[0].url || song.image[0].link) : '',
            addedAt: Date.now(),
          };
          await persistFavourites(FAVOURITE_SONGS_KEY, [...favourites, newFavourite]);
          setIsFavouriteLocal(true);
        }
      } catch (err) {
        console.warn('Unable to update favourites', err);
      }
      onClose();
    };

    return (
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={onClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
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
        {/* Go To Album removed on Artist page */}
        <MenuItem onClick={handleToggleFavourite}>
          <ListItemIcon>
            <Favorite fontSize="small" />
          </ListItemIcon>
          <Typography variant="body2">{isFavouriteLocal ? 'Remove from Favourites' : 'Add to Favourites'}</Typography>
        </MenuItem>
      </Menu>
    );
  };

  // Render SongMenu and More dialog anchored to menuAnchor/menuTarget
  const handleMenuClose = () => { setMenuAnchor(null); setMenuTarget(null); };

  return (
    <>
      {mainContent}
      <SongMenu anchorEl={menuAnchor} onClose={handleMenuClose} song={menuTarget} />
    </>
  );
};

export default ArtistPage;

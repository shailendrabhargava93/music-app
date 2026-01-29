import React, { useEffect, useState } from 'react';
import { MoreVertical } from '../icons';
import PageHeader from '../components/PageHeader';
// About dialog removed per request
import { Box, Container, Typography, Avatar, IconButton, Skeleton, List, Chip, Button } from '@mui/material';
import { PlayArrow, Album, Verified, Language, Favorite, PeopleAlt, Person } from '../icons';
import { saavnApi } from '../services/saavnApi';
import { FAVOURITE_SONGS_KEY, FAVOURITE_ARTISTS_KEY, persistFavourites, readFavourites } from '../services/storage';
import SongItem from '../components/SongItem';
import SongContextMenu from '../components/SongContextMenu';
import FavouriteToggle from '../components/FavouriteToggle';
import HorizontalScroller from '../components/HorizontalScroller';
import { decodeHtmlEntities, joinArtistNames, formatCountShort, getBestImage } from '../utils/normalize';

type AnyRecord = Record<string, unknown>;

interface ArtistPageProps {
  artistId: string;
  artistName?: string;
  artistImage?: string;
  onBack: () => void;
  onSongSelect?: (song: AnyRecord | unknown, context?: AnyRecord[] | unknown[]) => void;
  onAddToQueue?: (song: AnyRecord | unknown) => void;
  onPlayNext?: (song: AnyRecord | unknown) => void;
  onAlbumSelect?: (albumId: string, albumName: string, albumImage: string) => void;
  onShowSnackbar?: (message: string) => void;
}

const ArtistPage: React.FC<ArtistPageProps> = ({ artistId, artistName, artistImage, onBack, onSongSelect, onAddToQueue, onPlayNext, onAlbumSelect, onShowSnackbar }) => {
  const [loading, setLoading] = useState(true);
  const [artistData, setArtistData] = useState<AnyRecord | null>(null);
  const [topSongs, setTopSongs] = useState<AnyRecord[]>([]);
  const [topAlbums, setTopAlbums] = useState<AnyRecord[]>([]);
  const [singles, setSingles] = useState<AnyRecord[]>([]);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuTarget, setMenuTarget] = useState<AnyRecord | null>(null);
  const [isFavouriteLocal, setIsFavouriteLocal] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const favs = await readFavourites(FAVOURITE_ARTISTS_KEY);
        const exists = (favs as AnyRecord[]).some((a) => (a['id'] as string) === artistId);
        if (mounted) setIsFavouriteLocal(Boolean(exists));
      } catch {
        if (mounted) setIsFavouriteLocal(false);
      }
    })();
    return () => { mounted = false; };
  }, [artistId]);

  useEffect(() => {
    let isMounted = true;
    const fetchArtist = async () => {
      setLoading(true);
      try {
        const resp = await saavnApi.getArtistById(artistId);
        if (!isMounted) return;
        const data = resp?.data ?? resp;
        setArtistData(data as AnyRecord);

        // topSongs/topAlbums/singles may be nested under data
        setTopSongs(Array.isArray((data as AnyRecord)?.topSongs) ? (data as AnyRecord).topSongs as AnyRecord[] : (Array.isArray((data as AnyRecord)?.top_songs) ? (data as AnyRecord).top_songs as AnyRecord[] : []));
        setTopAlbums(Array.isArray((data as AnyRecord)?.topAlbums) ? (data as AnyRecord).topAlbums as AnyRecord[] : (Array.isArray((data as AnyRecord)?.top_albums) ? (data as AnyRecord).top_albums as AnyRecord[] : []));
        setSingles(Array.isArray((data as AnyRecord)?.singles) ? (data as AnyRecord).singles as AnyRecord[] : (Array.isArray((data as AnyRecord)?.singles_list) ? (data as AnyRecord).singles_list as AnyRecord[] : []));
      } catch {
        console.warn('Failed to fetch artist');
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

  const getHighQualityImage = (images: unknown) => getBestImage(images);

  const mainContent = (
    <Box sx={{ pb: 14, minHeight: '100vh' }}>
      <PageHeader
        title={artistName || decodeHtmlEntities(artistData?.name || '')}
        onBack={onBack}
        position="fixed"
      />

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

              <FavouriteToggle
                item={{ id: artistId, name: artistName || decodeHtmlEntities(artistData?.name || ''), image: getImageFromData() }}
                type="artist"
                initial={isFavouriteLocal}
                onChange={(v: boolean) => setIsFavouriteLocal(Boolean(v))}
                onShowSnackbar={onShowSnackbar}
              />
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
              {topSongs.slice(0, 12).map((song: AnyRecord, idx: number) => {
                const title = decodeHtmlEntities((song.name as string) || (song.title as string) || 'Untitled');
                const artist = joinArtistNames(((song as AnyRecord).artists as AnyRecord | undefined)?.primary ?? ((song as AnyRecord).artists as AnyRecord | undefined)?.all ?? []);
                const imageSrc = getHighQualityImage((song as AnyRecord).image) || (((song as AnyRecord).album as AnyRecord | undefined) && getHighQualityImage(((song as AnyRecord).album as AnyRecord).image)) || '';
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
            <HorizontalScroller gap={2} px={2}>
              {topAlbums.map((album: AnyRecord) => {
                const albumTitle = decodeHtmlEntities((album.name as string) || (album.title as string) || '');
                const albumId = (album.id as string) || (album.albumid as string) || (album.sid as string) || (album._id as string) || albumTitle;
                // Prefer high-quality images when available
                let albumImage = '';
                if (Array.isArray((album.image as unknown)) && (album.image as unknown[]).length > 0) {
                  const arr = album.image as AnyRecord[];
                  albumImage = (arr.find((i) => (i?.quality as string) === '500x500')?.url as string) || (arr[0]?.url as string) || (arr.find((i) => (i?.url as string))?.url as string) || '';
                } else {
                  albumImage = (album.image as string) || (album.thumbnail as string) || '';
                }
                const primaryArtist = ((album as AnyRecord).artists as AnyRecord | undefined)?.primary?.[0]?.name as string | undefined || ((album as AnyRecord).artists as AnyRecord | undefined)?.all?.[0]?.name as string | undefined || '';
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
            </HorizontalScroller>
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
              {singles.slice(0, 12).map((item: AnyRecord, idx: number) => {
                // singles are album-like objects; fetch songs and play first one
                const title = decodeHtmlEntities(item.name || item.title || '');
                const artist = joinArtistNames(item.artists?.primary ?? item.artists?.all ?? []);
                const imageSrc = getHighQualityImage(item.image) || '';
                const albumId = item.id || item.albumid || item.album_id;
                
                  const handleSingleClick = async () => {
                    if (!albumId || !onSongSelect) return;
                    try {
                      const albumData = await saavnApi.getAlbumById(albumId);
                      const songs = (albumData as AnyRecord)?.data?.songs || (albumData as AnyRecord)?.songs || [];
                      if (songs.length > 0) {
                        onSongSelect(songs[0], songs as AnyRecord[]);
                      }
                    } catch {
                      console.warn('Failed to load single');
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

  // Use SongContextMenu for per-song actions
  const handleMenuClose = () => { setMenuAnchor(null); setMenuTarget(null); };

  const SongMenu = (
    <SongContextMenu
      anchorEl={menuAnchor}
      open={Boolean(menuAnchor)}
      onClose={handleMenuClose}
      onPlayNow={async () => {
        const song = menuTarget;
        if (!song || !onSongSelect) return;
        if (song.albumId) {
          try {
            const albumData = await saavnApi.getAlbumById(song.albumId);
            const songs = albumData?.data?.songs || albumData?.songs || [];
            if (songs.length > 0) onSongSelect(songs[0], songs);
          } catch (err) { console.warn('Failed to load single', err); }
        } else {
          onSongSelect(song, topSongs.concat(singles));
        }
      }}
      onPlayNext={async () => {
        const song = menuTarget;
        if (!song || !onPlayNext) return;
        if (song.albumId) {
          try {
            const albumData = await saavnApi.getAlbumById(song.albumId);
            const songs = albumData?.data?.songs || albumData?.songs || [];
            if (songs.length > 0) onPlayNext(songs[0]);
          } catch (err) { console.warn('Failed to load single', err); }
        } else {
          onPlayNext(song);
        }
      }}
      onAddToQueue={async () => {
        const song = menuTarget;
        if (!song || !onAddToQueue) return;
        if (song.albumId) {
          try {
            const albumData = await saavnApi.getAlbumById(song.albumId);
            const songs = albumData?.data?.songs || albumData?.songs || [];
            if (songs.length > 0) onAddToQueue(songs[0]);
          } catch { console.warn('Failed to load single'); }
        } else {
          onAddToQueue(song);
        }
      }}
      onAddToFavourites={async () => {
        const song = menuTarget;
        if (!song) return;
        try {
          const favourites = await readFavourites(FAVOURITE_SONGS_KEY);
          const exists = (favourites as AnyRecord[]).some((s) => (s['id'] as string) === ((song as AnyRecord)['id'] as string));
          if (exists) {
            const updated = (favourites as AnyRecord[]).filter((s) => (s['id'] as string) !== ((song as AnyRecord)['id'] as string));
            await persistFavourites(FAVOURITE_SONGS_KEY, updated as unknown[]);
            setIsFavouriteLocal(false);
          } else {
            const s = song as AnyRecord;
            const newFavourite = {
              id: s['id'],
              name: s['name'] as string | undefined || s['title'] as string | undefined,
              artist: (s['primaryArtists'] as string) || (s['artist'] as string) || '',
              albumArt: Array.isArray(s['image'] as unknown) && (s['image'] as AnyRecord[])[0] ? ((s['image'] as AnyRecord[])[0].url as string || (s['image'] as AnyRecord[])[0].link as string) : '',
              addedAt: Date.now(),
            };
            await persistFavourites(FAVOURITE_SONGS_KEY, [...(favourites as AnyRecord[]), newFavourite] as unknown[]);
            setIsFavouriteLocal(true);
          }
        } catch {
          console.warn('Unable to update favourites');
        }
      }}
      isFavourite={isFavouriteLocal}
    />
  );

  // Render SongMenu and More dialog anchored to menuAnchor/menuTarget

  return (
    <>
      {mainContent}
      {SongMenu}
    </>
  );
};

export default ArtistPage;

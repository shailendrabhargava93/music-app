import React from 'react';
import { Box, Typography } from '@mui/material';
import PageHeader from '../components/PageHeader';
import TrackList from '../components/TrackList';
import SongItem from '../components/SongItem';
import { Song } from '../types/api';
import { getBestImage, decodeHtmlEntities } from '../utils/normalize';
import SongContextMenu from '../components/SongContextMenu';
import { IconButton } from '@mui/material';
import { MoreVertical } from '../icons';
import { readFavourites, persistFavourites, FAVOURITE_SONGS_KEY } from '../services/storage';
import { SoundChartsItem } from '../services/soundChartsApi';

interface ChartSongWithSaavn extends SoundChartsItem {
  saavnData?: Song | null;
  isSearching?: boolean;
}

interface AllSongsPageProps {
  onBack?: () => void;
  chartSongs?: ChartSongWithSaavn[];
  onSongSelect?: (song: Song, contextSongs?: Song[]) => void;
  onAddToQueue?: (song: Song) => void;
  onPlayNext?: (song: Song) => void;
}

const AllSongsPage: React.FC<AllSongsPageProps> = ({ onBack, chartSongs = [], onSongSelect, onAddToQueue, onPlayNext }) => {
  const [menuAnchor, setMenuAnchor] = React.useState<HTMLElement | null>(null);
  const [menuItem, setMenuItem] = React.useState<ChartSongWithSaavn | null>(null);

  const handleSongClick = (songItem: ChartSongWithSaavn) => {
    const song = songItem.saavnData || (songItem as any).song || null;
    if (!song) return;
    if (onSongSelect && songItem.saavnData) {
      onSongSelect(songItem.saavnData, chartSongs.slice(0, 100).map(s => s.saavnData!).filter(Boolean) as Song[]);
    } else if (onSongSelect) {
      const scSong = (songItem as any).song as any;
      const fallback: Song = {
        id: scSong?.uuid || String(songItem.position),
        name: scSong?.name || 'Unknown',
        album: { id: '', name: '', url: '' },
        year: '',
        releaseDate: '',
        duration: 0,
        label: '',
        primaryArtists: scSong?.creditName || '',
        primaryArtistsId: '',
        featuredArtists: '',
        featuredArtistsId: '',
        explicitContent: 0,
        playCount: 0,
        language: '',
        hasLyrics: false,
        url: '',
        copyright: '',
        image: scSong?.imageUrl ? [{ quality: 'default', link: scSong.imageUrl }] : [],
        downloadUrl: [],
      };
      onSongSelect(fallback, []);
    }
  };

  const openMenu = (ev: React.MouseEvent<HTMLElement>, item: ChartSongWithSaavn) => {
    ev.stopPropagation();
    setMenuAnchor(ev.currentTarget as HTMLElement);
    setMenuItem(item);
    // Check if this item is already a favourite
    (async () => {
      try {
        const favs = await readFavourites(FAVOURITE_SONGS_KEY);
        const id = item.saavnData?.id || (item as any).song?.uuid || String(item.position);
        const exists = (favs as any[]).some(f => String(f.id) === String(id));
        setIsMenuItemFavourite(Boolean(exists));
      } catch {
        setIsMenuItemFavourite(false);
      }
    })();
  };

  const closeMenu = () => {
    setMenuAnchor(null);
    setMenuItem(null);
  };

  const getSongForAction = (it: ChartSongWithSaavn | null): Song | null => {
    if (!it) return null;
    if (it.saavnData) return it.saavnData;
    const sc = (it as any).song as any;
    return {
      id: sc?.uuid || String(it.position),
      name: sc?.name || 'Unknown',
      album: { id: '', name: '', url: '' },
      year: '',
      releaseDate: '',
      duration: 0,
      label: '',
      primaryArtists: sc?.creditName || '',
      primaryArtistsId: '',
      featuredArtists: '',
      featuredArtistsId: '',
      explicitContent: 0,
      playCount: 0,
      language: '',
      hasLyrics: false,
      url: '',
      copyright: '',
      image: sc?.imageUrl ? [{ quality: 'default', link: sc.imageUrl }] : [],
      downloadUrl: [],
    };
  };

  const [isMenuItemFavourite, setIsMenuItemFavourite] = React.useState(false);

  const handleAddToFavourites = async () => {
    const s = getSongForAction(menuItem);
    if (!s) return;
    try {
      const favourites = await readFavourites(FAVOURITE_SONGS_KEY);
      const exists = (favourites as any[]).some(f => String(f.id) === String(s.id));
      if (exists) {
        const updated = (favourites as any[]).filter(f => String(f.id) !== String(s.id));
        await persistFavourites(FAVOURITE_SONGS_KEY, updated);
        setIsMenuItemFavourite(false);
      } else {
        const newFavourite = {
          id: s.id,
          name: s.name,
          artist: s.primaryArtists,
          albumArt: Array.isArray(s.image) && s.image.length > 0 ? (s.image[0] as any).link || '' : '',
          addedAt: Date.now(),
        };
        const updated = [...(favourites as any[]), newFavourite];
        await persistFavourites(FAVOURITE_SONGS_KEY, updated);
        setIsMenuItemFavourite(true);
      }
    } catch (err) {
      console.warn('Failed to update favourites', err);
    } finally {
      closeMenu();
    }
  };

  return (
    <Box sx={{ pb: 10, minHeight: '100vh', pt: 0 }}>
      <PageHeader title="All Songs" onBack={onBack} position="fixed" />
      <Box sx={{ mt: 0 }}>
        {chartSongs && chartSongs.length > 0 ? (
          <>
          <TrackList
            items={chartSongs.slice(0, 100)}
            skeletonCount={8}
            renderItem={(item: ChartSongWithSaavn, idx: number) => {
              const saavn = item.saavnData;
              const sc = (item as any).song;
              const rawTitle = saavn?.name || sc?.name || `#${item.position}`;
              const rawArtist = saavn?.primaryArtists || sc?.creditName || '';

              const normalizeDisplay = (s?: string) => {
                if (!s) return '';
                // remove HTML tags, decode entities, collapse whitespace
                const withoutTags = s.replace(/<[^>]*>/g, '');
                const decoded = decodeHtmlEntities(withoutTags);
                return decoded.replace(/\s+/g, ' ').trim();
              };

              const title = normalizeDisplay(rawTitle);
              const artist = normalizeDisplay(rawArtist);
              const imageSrc = saavn ? getBestImage(saavn.image) : getBestImage(sc?.imageUrl ?? sc?.image);

              return (
                <SongItem
                  title={title}
                  artist={artist}
                  imageSrc={imageSrc}
                  onClick={() => handleSongClick(item)}
                  rightContent={(
                    <IconButton size="small" onClick={(e) => openMenu(e, item)}>
                      <MoreVertical />
                    </IconButton>
                  )}
                />
              );
            }}
          />
          <SongContextMenu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={closeMenu}
            onPlayNow={() => {
              const s = getSongForAction(menuItem);
              if (s && onSongSelect) onSongSelect(s, chartSongs.slice(0, 100).map(s => s.saavnData!).filter(Boolean) as Song[]);
              closeMenu();
            }}
            onPlayNext={() => {
              const s = getSongForAction(menuItem);
              if (s && onPlayNext) onPlayNext(s);
              closeMenu();
            }}
            onAddToQueue={() => {
              const s = getSongForAction(menuItem);
              if (s && onAddToQueue) onAddToQueue(s);
              closeMenu();
            }}
            onAddToFavourites={handleAddToFavourites}
            isFavourite={isMenuItemFavourite}
          />
          </>
        ) : (
          <Box sx={{ px: 2, pb: 12, mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              No songs available.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default AllSongsPage;

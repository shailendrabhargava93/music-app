import React, { useEffect, useState } from 'react';
import { Box, IconButton } from '@mui/material';
import TrackList from '../components/TrackList';
import PageHeader from '../components/PageHeader';
import { ClearAll, MoreVertical } from '../icons';
import { Song } from '../types/api';
import SongItem from '../components/SongItem';
import { FAVOURITE_SONGS_KEY, getMeta, persistFavourites, readFavourites, setMeta } from '../services/storage';
import SongContextMenu from '../components/SongContextMenu';
import { decodeHtmlEntities } from '../utils/normalize';

interface RecentlyPlayedPageProps {
  onBack: () => void;
  onSongSelect: (song: Song, contextSongs?: Song[]) => void;
  onAddToQueue?: (song: Song) => void;
  onPlayNext?: (song: Song) => void;
  onShowSnackbar?: (message: string) => void;
}

const RecentlyPlayedPage: React.FC<RecentlyPlayedPageProps> = ({ onBack, onSongSelect, onAddToQueue, onPlayNext }) => {
  type AnyRecord = Record<string, unknown>;
  const [recentSongs, setRecentSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [selectedIsFavourite, setSelectedIsFavourite] = useState<boolean>(false);

  useEffect(() => {
    const loadRecentSongs = async () => {
      try {
        const stored = (await getMeta('recentlyPlayed')) as Song[] | undefined;
        if (stored && Array.isArray(stored)) {
          setRecentSongs(stored);
        }
      } catch {
        console.warn('Unable to load recently played');
      }
      setLoading(false);
    };

    loadRecentSongs();
  }, []);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, song: Song) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedSong(song);
    (async () => {
      try {
        const favourites = await readFavourites(FAVOURITE_SONGS_KEY);
        const exists = (favourites as unknown[]).some((fav: AnyRecord) => (fav['id'] as string) === song.id);
        setSelectedIsFavourite(Boolean(exists));
      } catch {
        setSelectedIsFavourite(false);
      }
    })();
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
        const exists = (favourites as unknown[]).some((fav: AnyRecord) => (fav['id'] as string) === selectedSong.id);

        if (!exists) {
          const newFav = {
            id: selectedSong.id,
            name: selectedSong.name,
            artist: selectedSong.primaryArtists || 'Unknown Artist',
            albumArt: getImageUrl(selectedSong.image as unknown[]),
            addedAt: Date.now(),
          };
          const updated = [...(favourites as unknown[]), newFav];
          await persistFavourites(FAVOURITE_SONGS_KEY, updated as unknown[]);
        }
      } catch {
        console.warn('Unable to update favourite songs');
      }
    }
    handleMenuClose();
  };

  const handleClearRecent = async () => {
    try {
      await setMeta('recentlyPlayed', []);
    } catch {
      console.warn('Unable to clear recent songs');
    }
    setRecentSongs([]);
  };

  // use shared `decodeHtmlEntities` from utils

  const getImageUrl = (imageArray: unknown[]): string => {
    if (!Array.isArray(imageArray) || imageArray.length === 0) return '';
    const qualities = ['150x150', '500x500', '50x50'];
    for (const quality of qualities) {
      const img = (imageArray as AnyRecord[]).find(i => (i?.quality as string) === quality);
      if (img) return (img?.url as string) || (img?.link as string) || '';
    }
    const first = (imageArray as AnyRecord[])[0];
    return (first?.url as string) || (first?.link as string) || '';
  };

  return (
    <Box sx={{ pb: 14, pt: 0 }}>
      <PageHeader
        title="Recently Played"
        onBack={onBack}
        position="fixed"
        rightActions={
          recentSongs.length > 0 ? (
            <IconButton
              onClick={handleClearRecent}
              size="small"
              sx={{ color: 'text.secondary' }}
              title="Clear all recently played songs"
            >
              <ClearAll />
            </IconButton>
          ) : null
        }
      />

      <TrackList
        items={recentSongs}
        loading={loading}
        skeletonCount={6}
        emptyMessage="No recently played songs"
        keyExtractor={(s: Song) => s.id}
        renderItem={(song: Song) => (
          <SongItem
            key={song.id}
            title={decodeHtmlEntities(song.name)}
            artist={decodeHtmlEntities(song.primaryArtists || 'Unknown Artist')}
            imageSrc={getImageUrl(song.image)}
            onClick={() => onSongSelect(song, recentSongs)}
            rightContent={
              <IconButton
                edge="end"
                onClick={(e) => handleMenuOpen(e, song)}
              >
                <MoreVertical />
              </IconButton>
            }
          />
        )}
      />

      <SongContextMenu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onPlayNow={handlePlayNow}
        onPlayNext={handlePlayNext}
        onAddToQueue={handleAddToQueue}
        onAddToFavourites={handleAddToFavourites}
        isFavourite={selectedIsFavourite}
      />
    </Box>
  );
};

export default RecentlyPlayedPage;

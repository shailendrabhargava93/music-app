import React, { useEffect, useState } from 'react';
import { IconButton, Snackbar } from '@mui/material';
import { Theme } from '@mui/material/styles';
import { SxProps } from '@mui/system';
import { Favorite, FavoriteBorder } from '../icons';
import {
  FAVOURITE_SONGS_KEY,
  FAVOURITE_ALBUMS_KEY,
  FAVOURITE_PLAYLISTS_KEY,
  FAVOURITE_ARTISTS_KEY,
  readFavourites,
  persistFavourites,
} from '../services/storage';

type FavType = 'song' | 'album' | 'playlist' | 'artist';

interface FavouriteItem {
  id?: string;
  name?: string;
  title?: string;
  label?: string;
  image?: string;
  thumbnail?: string;
  albumArt?: string;
  addedAt?: number;
}

interface FavouriteToggleProps {
  item?: FavouriteItem;
  type?: FavType;
  size?: 'small' | 'medium';
  initial?: boolean;
  onChange?: (isFav: boolean) => void;
  showSnackbar?: boolean;
  onShowSnackbar?: (message: string) => void;
  icon?: { fav?: React.ReactNode; notFav?: React.ReactNode };
  iconButtonSx?: SxProps<Theme> | ((theme: Theme) => SxProps<Theme>);
  activeIconButtonSx?: SxProps<Theme> | ((theme: Theme) => SxProps<Theme>);
}

const keyFor = (type: FavType) => {
  switch (type) {
    case 'album': return FAVOURITE_ALBUMS_KEY;
    case 'playlist': return FAVOURITE_PLAYLISTS_KEY;
    case 'artist': return FAVOURITE_ARTISTS_KEY;
    default: return FAVOURITE_SONGS_KEY;
  }
};

export default function FavouriteToggle({ item, type = 'song', size = 'small', initial, onChange, showSnackbar = true, onShowSnackbar, icon, iconButtonSx, activeIconButtonSx }: FavouriteToggleProps) {
  const [isFav, setIsFav] = useState<boolean>(Boolean(initial));
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (typeof initial !== 'undefined') return;
      try {
        const key = keyFor(type);
        const favs = (await readFavourites(key)) as FavouriteItem[];
        const exists = favs.some((f) => f.id === item?.id);
        if (mounted) setIsFav(Boolean(exists));
      } catch {
        if (mounted) setIsFav(false);
      }
    })();
    return () => { mounted = false; };
  }, [item, type, initial]);

  // Keep internal state in sync when parent provides an explicit `initial` value
  useEffect(() => {
    if (typeof initial !== 'undefined') {
      setIsFav(Boolean(initial));
    }
  }, [initial]);

  const toggle = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const key = keyFor(type);
      const favs = (await readFavourites(key)) as FavouriteItem[];
      const exists = favs.some((f) => f.id === item?.id);
      if (exists) {
        const updated = favs.filter((f) => f.id !== item?.id);
        await persistFavourites(key, updated);
        setIsFav(false);
        if (onChange) onChange(false);
        if (onShowSnackbar) {
          onShowSnackbar('Removed from favourites');
        } else if (showSnackbar) {
          setSnackMsg('Removed from favourites');
          setSnackOpen(true);
        }
      } else {
        const toSave: FavouriteItem = {
          id: item?.id,
          name: item?.name || item?.title || item?.label || '',
          image: item?.image || item?.thumbnail || item?.albumArt || '',
          addedAt: Date.now(),
        };
        await persistFavourites(key, [...favs, toSave]);
        setIsFav(true);
        if (onChange) onChange(true);
        if (onShowSnackbar) {
          onShowSnackbar('Added to favourites ❤️');
        } else if (showSnackbar) {
          setSnackMsg('Added to favourites');
          setSnackOpen(true);
        }
      }
    } catch (err) {
      // Log error for debugging
       
      console.warn('Favourite toggle failed', err);
    }
  };

  return (
    <>
      <IconButton
        size={size}
        onClick={toggle}
        aria-label="toggle favourite"
        sx={(theme: Theme) => {
          const base = { color: isFav ? 'error.main' : 'text.secondary', p: 0.5 } as SxProps<Theme>;
          const resolvedIconSx = typeof iconButtonSx === 'function' ? iconButtonSx(theme) : (iconButtonSx || {});
          const resolvedActive = isFav ? (typeof activeIconButtonSx === 'function' ? activeIconButtonSx(theme) : (activeIconButtonSx || {})) : {};
          return { ...base, ...resolvedIconSx, ...resolvedActive };
        }}
      >
        {isFav ? (icon?.fav ?? <Favorite />) : (icon?.notFav ?? <FavoriteBorder />)}
      </IconButton>

      <Snackbar
        open={snackOpen}
        autoHideDuration={1800}
        onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: { xs: 80, sm: 24 } }}
      >
        <div
          style={{
            backgroundColor: 'var(--mui-palette-background-paper)',
            color: 'var(--mui-palette-text-primary)',
            padding: '12px 24px',
            borderRadius: 12,
            boxShadow: 'var(--mui-shadow-3)',
            border: '1px solid var(--mui-palette-divider)',
          }}
        >
          {snackMsg}
        </div>
      </Snackbar>
    </>
  );
}

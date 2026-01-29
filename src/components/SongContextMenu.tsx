import React from 'react';
import { Menu, MenuItem, ListItemIcon, Typography } from '@mui/material';
import { PlayArrow, PlaylistAdd, QueueMusic, Favorite, Delete, Launch } from '../icons';

type CustomItem = {
  key: string;
  content: React.ReactNode;
  onClick?: () => void;
};

interface Props {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  onPlayNow?: () => void;
  onPlayNext?: () => void;
  onAddToQueue?: () => void;
  onAddToFavourites?: () => void;
  isFavourite?: boolean;
  // optional conditional actions
  onOpenAlbum?: () => void;
  onOpenPlaylist?: () => void;
  onOpenArtist?: () => void;
  onRemove?: () => void;
  removeLabel?: string;
  customItems?: CustomItem[];
  mode?: 'full' | 'compact';
}

const SongContextMenu: React.FC<Props> = ({
  anchorEl,
  open,
  onClose,
  onPlayNow,
  onPlayNext,
  onAddToQueue,
  onAddToFavourites,
  isFavourite,
  onOpenAlbum,
  onOpenPlaylist,
  onOpenArtist,
  onRemove,
  removeLabel = 'Remove',
  customItems,
  mode = 'full',
}) => {
  const primaryAction = () => {
    // Prefer opening album/playlist/artist when those handlers are provided
    if (onOpenAlbum) return { label: 'Open Album', onClick: onOpenAlbum, icon: <Launch fontSize="small" /> };
    if (onOpenPlaylist) return { label: 'Open Playlist', onClick: onOpenPlaylist, icon: <Launch fontSize="small" /> };
    if (onOpenArtist) return { label: 'Open Artist', onClick: onOpenArtist, icon: <Launch fontSize="small" /> };
    if (onPlayNow) return { label: 'Play Now', onClick: onPlayNow, icon: <PlayArrow fontSize="small" /> };
    return null;
  };

  const primary = primaryAction();

  return (
    <Menu anchorEl={anchorEl} open={open} onClose={onClose}>
      {mode === 'full' && (
        <>
          <MenuItem onClick={() => { if (onPlayNow) onPlayNow(); onClose(); }}>
            <ListItemIcon>
              <PlayArrow fontSize="small" />
            </ListItemIcon>
            <Typography variant="body2">Play Now</Typography>
          </MenuItem>

          <MenuItem onClick={() => { if (onPlayNext) onPlayNext(); onClose(); }}>
            <ListItemIcon>
              <PlaylistAdd fontSize="small" />
            </ListItemIcon>
            <Typography variant="body2">Play Next</Typography>
          </MenuItem>

          <MenuItem onClick={() => { if (onAddToQueue) onAddToQueue(); onClose(); }}>
            <ListItemIcon>
              <QueueMusic fontSize="small" />
            </ListItemIcon>
            <Typography variant="body2">Add to Queue</Typography>
          </MenuItem>

          {onAddToFavourites && !isFavourite && (
            <MenuItem onClick={() => { if (onAddToFavourites) onAddToFavourites(); onClose(); }}>
              <ListItemIcon>
                <Favorite fontSize="small" />
              </ListItemIcon>
              <Typography variant="body2">Add to Favourites</Typography>
            </MenuItem>
          )}

          {onOpenAlbum && (
            <MenuItem onClick={() => { onOpenAlbum(); onClose(); }}>
              <ListItemIcon>
                <Launch fontSize="small" />
              </ListItemIcon>
              <Typography variant="body2">Open Album</Typography>
            </MenuItem>
          )}

          {onOpenPlaylist && (
            <MenuItem onClick={() => { onOpenPlaylist(); onClose(); }}>
              <ListItemIcon>
                <Launch fontSize="small" />
              </ListItemIcon>
              <Typography variant="body2">Open Playlist</Typography>
            </MenuItem>
          )}

          {onOpenArtist && (
            <MenuItem onClick={() => { onOpenArtist(); onClose(); }}>
              <ListItemIcon>
                <Launch fontSize="small" />
              </ListItemIcon>
              <Typography variant="body2">Open Artist</Typography>
            </MenuItem>
          )}

          {customItems && customItems.map((it) => (
            <MenuItem key={it.key} onClick={() => { if (it.onClick) it.onClick(); onClose(); }}>
              {it.content}
            </MenuItem>
          ))}
        </>
      )}

      {mode === 'compact' && (
        <>
          {primary && (
            <MenuItem onClick={() => { if (primary.onClick) primary.onClick(); onClose(); }}>
              {primary.icon && <ListItemIcon>{primary.icon}</ListItemIcon>}
              <Typography variant="body2">{primary.label}</Typography>
            </MenuItem>
          )}
        </>
      )}

      {onRemove && (
        <MenuItem onClick={() => { onRemove(); onClose(); }} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <Delete fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <Typography variant="body2">{removeLabel}</Typography>
        </MenuItem>
      )}
    </Menu>
  );
};

export default SongContextMenu;

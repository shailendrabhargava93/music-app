import React from 'react';
import { ListItem, ListItemAvatar, Avatar, ListItemText, Typography } from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';

interface SongListItemProps {
  title: string;
  artist?: string;
  avatarSrc?: string;
  onClick?: () => void;
  secondaryAction?: React.ReactNode;
}

const SongListItem: React.FC<SongListItemProps> = ({
  title,
  artist,
  avatarSrc,
  onClick,
  secondaryAction,
}) => {
  return (
    <ListItem
      onClick={onClick}
      secondaryAction={secondaryAction}
      sx={{
        borderRadius: 1,
        mb: 0.5,
        px: 0,
        py: 0.5,
        '&:hover': { bgcolor: 'action.hover' },
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <ListItemAvatar sx={{ minWidth: 64 }}>
        <Avatar
          src={avatarSrc || ''}
          variant="rounded"
          sx={{ width: 56, height: 56, bgcolor: avatarSrc ? 'transparent' : 'primary.main', border: '1px solid', borderColor: 'divider' }}
        >
          {!avatarSrc && <MusicNoteIcon />}
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
            {title}
          </Typography>
        }
        secondary={
          <Typography variant="body2" sx={{ color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {artist}
          </Typography>
        }
        secondaryTypographyProps={{ component: 'div' }}
      />
    </ListItem>
  );
};

export default SongListItem;

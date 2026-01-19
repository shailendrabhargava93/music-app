import React from 'react';
import { Box, Typography } from '@mui/material';

interface SongItemProps {
  title: string;
  artist?: string;
  imageSrc?: string;
  onClick?: () => void;
  rightContent?: React.ReactNode;
  highlight?: boolean;
  playing?: boolean;
}

const SongItem: React.FC<SongItemProps> = ({
  title,
  artist,
  imageSrc,
  onClick,
  rightContent,
  highlight = false,
  playing = false,
}) => {
  return (
    <Box
      onClick={onClick}
      aria-current={playing ? 'true' : undefined}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        mb: 1,
        py: 0.5,
        borderRadius: 1,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background-color 0.2s',
        backgroundColor: highlight ? (theme) => theme.palette.action.selected : 'transparent',
        '&:hover': onClick ? {
          backgroundColor: (theme) => 
            highlight ? theme.palette.action.selected : (theme.palette.mode === 'light'
              ? 'rgba(0, 188, 212, 0.08)'
              : 'rgba(255, 255, 255, 0.05)') ,
        } : {},
      }}
    >
      {playing ? (
        <Box sx={{ width: 56, height: 56, position: 'relative', flexShrink: 0, borderRadius: 1.5, overflow: 'hidden', border: (theme) => `2px solid ${theme.palette.primary.main}` }}>
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <Box sx={{ width: '100%', height: '100%', bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography sx={{ color: 'text.disabled', fontSize: '1.5rem' }}>♪</Typography>
            </Box>
          )}

          {/* Dim background + Equalizer overlay (stronger contrast) */}
          <Box sx={{ position: 'absolute', inset: 0, borderRadius: 1.5, bgcolor: 'rgba(0,0,0,0.22)', pointerEvents: 'none', zIndex: 1 }} />
          <Box sx={{ position: 'absolute', left: 8, right: 8, bottom: 8, top: 8, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 0.6, pointerEvents: 'none', zIndex: 2 }}>
            {[0,1,2,3,4].map((i) => (
              <Box
                key={i}
                sx={{
                  width: 6,
                  maxHeight: '92%',
                  bgcolor: 'rgba(255,255,255,0.92)',
                  borderRadius: 2,
                  transformOrigin: 'bottom center',
                  animation: `eq-bounce 660ms ${i * 120}ms infinite cubic-bezier(.2,.8,.2,1)`,
                  willChange: 'transform, opacity',
                }}
              />
            ))}
          </Box>
          <style>{`
            @keyframes eq-bounce {
              0% { transform: scaleY(0.25); opacity: 0.45 }
              35% { transform: scaleY(1.35); opacity: 1 }
              100% { transform: scaleY(0.25); opacity: 0.45 }
            }
            @keyframes eq-small {
              0% { transform: scaleY(0.6); opacity: 0.6 }
              50% { transform: scaleY(1.2); opacity: 1 }
              100% { transform: scaleY(0.6); opacity: 0.6 }
            }
          `}</style>
        </Box>
      ) : (
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: 1.5,
            overflow: 'hidden',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Typography sx={{ color: 'text.disabled', fontSize: '1.5rem' }}>
              ♪
            </Typography>
          )}
        </Box>
      )}

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body1"
          sx={{
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </Typography>
        {artist && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {artist}
          </Typography>
        )}
      </Box>

      {rightContent}
    </Box>
  );
};

export default SongItem;

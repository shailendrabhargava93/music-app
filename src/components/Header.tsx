import React from 'react';
import { Typography, Box, IconButton } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';

interface HeaderProps {
  onRecentlyPlayedClick?: () => void;
  onSettingsClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onRecentlyPlayedClick, onSettingsClick }) => {
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'space-between',
        py: 0.5,
        mb: 2,
        px: { xs: 2, sm: 2 }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <Box
          component="img"
          src="/wave-logo.svg"
          alt="Wave Music"
          sx={{
            width: 40,
            height: 40,
            objectFit: 'contain',
          }}
        />
        <Typography 
          variant="h6" 
          sx={{ 
            color: 'text.primary',
            display: 'block',
            fontSize: { xs: '1.1rem', sm: '1.3rem' },
            fontWeight: 600,
            letterSpacing: 0.5,
            lineHeight: 1.2
          }}
        >
          Wave Music
        </Typography>
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {onRecentlyPlayedClick && (
          <IconButton onClick={onRecentlyPlayedClick} sx={{ color: 'text.primary' }}>
            <HistoryIcon />
          </IconButton>
        )}
        {onSettingsClick && (
          <IconButton onClick={onSettingsClick} sx={{ color: 'text.primary' }}>
            <SettingsIcon />
          </IconButton>
        )}
      </Box>
    </Box>
  );
};

export default Header;

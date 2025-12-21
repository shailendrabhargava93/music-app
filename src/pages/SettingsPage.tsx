import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  Switch,
  Divider,
  Paper,
  Container,
  IconButton,
  Snackbar,
  Alert
} from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import ShareIcon from '@mui/icons-material/Share';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import LabelOffIcon from '@mui/icons-material/LabelOff';

interface SettingsPageProps {
  isDarkMode: boolean;
  onThemeToggle: () => void;
  onNavigateHome?: () => void;
  hideBottomNavText?: boolean;
  onBottomNavTextToggle?: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ 
  isDarkMode, 
  onThemeToggle,
  onNavigateHome,
  hideBottomNavText = false,
  onBottomNavTextToggle
}) => {
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const handleClearSearchHistory = () => {
    localStorage.removeItem('recentSearches');
    setSnackbarMessage('Search history cleared successfully');
    setSnackbarOpen(true);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Wave Music App',
          text: 'Check out Wave Music App - Stream your favorite songs!',
          url: window.location.origin,
        });
      } catch (error) {
        // Error sharing
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.origin);
        alert('App link copied to clipboard!');
      } catch (error) {
        // Error copying to clipboard
      }
    }
  };

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        bgcolor: 'background.default',
        pb: 10,
        pt: 1
      }}
    >
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, px: 2, pt: 1, gap: 1 }}>
          {onNavigateHome && (
            <IconButton onClick={onNavigateHome}>
              <ArrowBackIcon />
            </IconButton>
          )}
          <Typography 
            variant="h6" 
            sx={{ 
              color: 'text.primary', 
              fontWeight: 600
            }}
          >
            Settings
          </Typography>
        </Box>

        <Paper 
          elevation={0}
          sx={{ 
            bgcolor: 'background.paper',
            borderRadius: 2,
            overflow: 'hidden',
            border: (theme) => 
              theme.palette.mode === 'light' 
                ? '1px solid rgba(0, 0, 0, 0.08)' 
                : 'none'
          }}
        >
          <List sx={{ py: 0 }}>
            <ListItem
              sx={{
                py: 2,
                px: 3,
                '&:hover': {
                  bgcolor: 'action.hover'
                }
              }}
            >
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2,
                  flex: 1
                }}
              >
                {isDarkMode ? (
                  <DarkModeIcon sx={{ color: 'primary.main' }} />
                ) : (
                  <LightModeIcon sx={{ color: 'primary.main' }} />
                )}
                <ListItemText
                  primary={
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        fontWeight: 600,
                        color: 'text.primary'
                      }}
                    >
                      Dark Theme
                    </Typography>
                  }
                  secondary={
                    <Typography 
                      variant="body2" 
                      sx={{ color: 'text.secondary' }}
                    >
                      {isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                    </Typography>
                  }
                />
              </Box>
              <Switch
                checked={isDarkMode}
                onChange={onThemeToggle}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: 'primary.main',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: 'primary.main',
                  },
                }}
              />
            </ListItem>
            
            <Divider />

            <ListItem
              sx={{
                py: 2,
                px: 3,
                '&:hover': {
                  bgcolor: 'action.hover'
                }
              }}
            >
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2,
                  flex: 1
                }}
              >
                <LabelOffIcon sx={{ color: 'primary.main' }} />
                <ListItemText
                  primary={
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        fontWeight: 600,
                        color: 'text.primary'
                      }}
                    >
                      Hide Bottom Nav Text
                    </Typography>
                  }
                  secondary={
                    <Typography 
                      variant="body2" 
                      sx={{ color: 'text.secondary' }}
                    >
                      Show only icons in bottom navigation
                    </Typography>
                  }
                />
              </Box>
              <Switch
                checked={hideBottomNavText}
                onChange={onBottomNavTextToggle}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: 'primary.main',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: 'primary.main',
                  },
                }}
              />
            </ListItem>
            
            <Divider />
            
            <ListItem
              onClick={handleShare}
              sx={{
                py: 2,
                px: 3,
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: 'action.hover'
                }
              }}
            >
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2,
                  flex: 1
                }}
              >
                <ShareIcon sx={{ color: 'primary.main' }} />
                <ListItemText
                  primary={
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        fontWeight: 600,
                        color: 'text.primary'
                      }}
                    >
                      Share App
                    </Typography>
                  }
                  secondary={
                    <Typography 
                      variant="body2" 
                      sx={{ color: 'text.secondary' }}
                    >
                      Share Wave with your friends
                    </Typography>
                  }
                />
              </Box>
              <IconButton 
                size="small"
                sx={{ color: 'text.secondary' }}
              >
                <ShareIcon fontSize="small" />
              </IconButton>
            </ListItem>
            
            <Divider />

            <ListItem
              onClick={handleClearSearchHistory}
              sx={{
                py: 2,
                px: 3,
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: 'action.hover'
                }
              }}
            >
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2,
                  flex: 1
                }}
              >
                <DeleteSweepIcon sx={{ color: 'primary.main' }} />
                <ListItemText
                  primary={
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        fontWeight: 600,
                        color: 'text.primary'
                      }}
                    >
                      Clear Search History
                    </Typography>
                  }
                  secondary={
                    <Typography 
                      variant="body2" 
                      sx={{ color: 'text.secondary' }}
                    >
                      Remove all recent searches
                    </Typography>
                  }
                />
              </Box>
            </ListItem>
            
            <Divider />
            
            <ListItem
              sx={{
                py: 2,
                px: 3
              }}
            >
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2,
                  flex: 1
                }}
              >
                <InfoOutlinedIcon sx={{ color: 'primary.main' }} />
                <ListItemText
                  primary={
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        fontWeight: 600,
                        color: 'text.primary'
                      }}
                    >
                      About
                    </Typography>
                  }
                  secondary={
                    <Typography 
                      variant="body2" 
                      sx={{ color: 'text.secondary' }}
                    >
                      Wave Music App v1.0.0
                    </Typography>
                  }
                />
              </Box>
            </ListItem>
          </List>
        </Paper>

        <Box sx={{ mt: 4, px: 2 }}>
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'text.secondary',
              textAlign: 'center'
            }}
          >
            Made with ❤️ by Wave Team
          </Typography>
        </Box>
      </Container>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity="success"
          icon={false}
          sx={{ 
            width: '100%',
            bgcolor: 'background.paper',
            color: 'text.primary',
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SettingsPage;

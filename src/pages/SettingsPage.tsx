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
  Alert,
  Radio,
  RadioGroup,
  Drawer
} from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import ShareIcon from '@mui/icons-material/Share';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import LabelOffIcon from '@mui/icons-material/LabelOff';
import HighQualityIcon from '@mui/icons-material/HighQuality';
import CloseIcon from '@mui/icons-material/Close';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { setMeta } from '../services/storage';

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
  const [streamQuality, setStreamQuality] = useState(() => {
    const saved = localStorage.getItem('streamQuality');
    return saved || '320';
  });
  const [qualityDrawerOpen, setQualityDrawerOpen] = useState(false);

  const handleStreamQualityChange = (newQuality: string) => {
    setStreamQuality(newQuality);
    localStorage.setItem('streamQuality', newQuality);
    setMeta('streamQuality', newQuality);
    setSnackbarMessage(`Stream quality set to ${newQuality}kbps`);
    setSnackbarOpen(true);
    setQualityDrawerOpen(false);
  };

  const getQualityLabel = () => {
    const labels: Record<string, string> = {
      '48': '48 kbps - Low',
      '160': '160 kbps - Medium',
      '320': '320 kbps - High'
    };
    return labels[streamQuality] || '320 kbps - High';
  };

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
        pt: 0
      }}
    >
      <Box
        sx={(theme) => ({
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: theme.zIndex.appBar,
          width: '100%',
          backgroundColor: theme.palette.background.default,
          boxShadow: `0 1px 6px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.1)'}`,
          py: 0.325,
        })}
      >
        <Container maxWidth="sm" sx={{ display: 'flex', alignItems: 'center', gap: 1, px: { xs: 1, sm: 1.25 } }}>
          {onNavigateHome && (
            <IconButton
              onClick={onNavigateHome}
              sx={{
                color: 'text.primary',
              }}
            >
              <ArrowBackIcon />
            </IconButton>
          )}
          <Typography 
            variant="h6" 
            sx={{ 
              color: 'text.primary', 
              fontWeight: 600,
              fontSize: { xs: '1rem', sm: '1.05rem', md: '1.1rem' }
            }}
          >
            Settings
          </Typography>
        </Container>
      </Box>

      {/* Spacer to offset fixed header height */}
      <Box sx={{ height: { xs: 56, sm: 64 }, width: '100%' }} />
      <Container maxWidth="sm" sx={{ px: { xs: 2, sm: 3 }, pt: 0 }}>
        <Paper 
          elevation={0}
          sx={{ 
            bgcolor: 'background.paper',
            borderRadius: 2,
            overflow: 'hidden',
            border: (theme) => `1px solid ${theme.palette.divider}`
          }}
        >
          <List sx={{ py: 0 }}>
            <ListItem
              sx={{
                py: 2,
                px: { xs: 2, sm: 3 },
                '&:hover': {
                  bgcolor: 'action.hover'
                },
                borderBottom: (theme) => `1px solid ${theme.palette.divider}`
              }}
            >
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2,
                  flex: 1,
                  minWidth: 0
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
                px: { xs: 2, sm: 3 },
                '&:hover': {
                  bgcolor: 'action.hover'
                },
                borderBottom: (theme) => `1px solid ${theme.palette.divider}`
              }}
            >
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2,
                  flex: 1,
                  minWidth: 0
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
              onClick={() => setQualityDrawerOpen(true)}
              sx={{
                py: 2,
                px: { xs: 2, sm: 3 },
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: 'action.hover'
                },
                borderBottom: (theme) => `1px solid ${theme.palette.divider}`
              }}
            >
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2,
                  flex: 1,
                  minWidth: 0
                }}
              >
                <HighQualityIcon sx={{ color: 'primary.main' }} />
                <ListItemText
                  primary={
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        fontWeight: 600,
                        color: 'text.primary'
                      }}
                    >
                      Stream Quality
                    </Typography>
                  }
                  secondary={
                    <Typography 
                      variant="body2" 
                      sx={{ color: 'text.secondary' }}
                    >
                      {getQualityLabel()}
                    </Typography>
                  }
                />
              </Box>
              <IconButton
                size="small"
                sx={{ color: 'text.secondary' }}
                aria-label="open quality settings"
              >
                <ChevronRightIcon />
              </IconButton>
            </ListItem>
            
            <Divider />

            <ListItem
              onClick={handleClearSearchHistory}
              sx={{
                py: 2,
                px: { xs: 2, sm: 3 },
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: 'action.hover'
                },
                borderBottom: (theme) => `1px solid ${theme.palette.divider}`
              }}
            >
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2,
                  flex: 1,
                  minWidth: 0
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
              onClick={handleShare}
              sx={{
                py: 2,
                px: { xs: 2, sm: 3 },
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: 'action.hover'
                },
                borderBottom: (theme) => `1px solid ${theme.palette.divider}`
              }}
            >
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2,
                  flex: 1,
                  minWidth: 0
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
              sx={{
                py: 2,
                px: { xs: 2, sm: 3 }
              }}
            >
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2,
                  flex: 1,
                  minWidth: 0
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

      {/* Stream Quality Drawer */}
      <Drawer
        anchor="bottom"
        open={qualityDrawerOpen}
        onClose={() => setQualityDrawerOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: '16px 16px 0 0',
            bgcolor: 'background.paper',
          }
        }}
      >
        <Box
          sx={{
            p: 3,
            pb: 4,
            maxWidth: 600,
            mx: 'auto',
            width: '100%'
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography 
              variant="h6" 
              sx={{ 
                color: 'text.primary',
                fontWeight: 600
              }}
            >
              Select Stream Quality
            </Typography>
            <IconButton
              onClick={() => setQualityDrawerOpen(false)}
              size="small"
              sx={{ color: 'text.secondary' }}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
          </Box>
          
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'text.secondary',
              mb: 2.5
            }}
          >
            Choose your preferred audio bitrate. Higher quality requires more data.
          </Typography>

          <RadioGroup
            value={streamQuality}
            onChange={(e) => handleStreamQualityChange(e.target.value)}
          >
            <Box
              onClick={() => handleStreamQualityChange('48')}
              sx={{
                p: 2,
                mb: 1.5,
                borderRadius: 2,
                cursor: 'pointer',
                border: '2px solid',
                borderColor: streamQuality === '48' ? 'primary.main' : 'divider',
                bgcolor: streamQuality === '48' ? (theme) => `rgba(0, 188, 212, ${theme.palette.mode === 'dark' ? 0.12 : 0.08})` : 'transparent',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: streamQuality === '48' ? (theme) => `rgba(0, 188, 212, ${theme.palette.mode === 'dark' ? 0.15 : 0.1})` : (theme) => `rgba(0, 0, 0, ${theme.palette.mode === 'dark' ? 0.08 : 0.03})`
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Radio
                  checked={streamQuality === '48'}
                  size="small"
                  sx={{
                    color: 'primary.main'
                  }}
                />
                <Box>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      fontWeight: 600,
                      color: 'text.primary'
                    }}
                  >
                    Low Quality (48 kbps)
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: 'text.secondary'
                    }}
                  >
                    Minimal data usage, suitable for background listening
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box
              onClick={() => handleStreamQualityChange('160')}
              sx={{
                p: 2,
                mb: 1.5,
                borderRadius: 2,
                cursor: 'pointer',
                border: '2px solid',
                borderColor: streamQuality === '160' ? 'primary.main' : 'divider',
                bgcolor: streamQuality === '160' ? (theme) => `rgba(0, 188, 212, ${theme.palette.mode === 'dark' ? 0.12 : 0.08})` : 'transparent',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: streamQuality === '160' ? (theme) => `rgba(0, 188, 212, ${theme.palette.mode === 'dark' ? 0.15 : 0.1})` : (theme) => `rgba(0, 0, 0, ${theme.palette.mode === 'dark' ? 0.08 : 0.03})`
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Radio
                  checked={streamQuality === '160'}
                  size="small"
                  sx={{
                    color: 'primary.main'
                  }}
                />
                <Box>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      fontWeight: 600,
                      color: 'text.primary'
                    }}
                  >
                    Medium Quality (160 kbps)
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: 'text.secondary'
                    }}
                  >
                    Good balance between quality and data usage
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box
              onClick={() => handleStreamQualityChange('320')}
              sx={{
                p: 2,
                borderRadius: 2,
                cursor: 'pointer',
                border: '2px solid',
                borderColor: streamQuality === '320' ? 'primary.main' : 'divider',
                bgcolor: streamQuality === '320' ? (theme) => `rgba(0, 188, 212, ${theme.palette.mode === 'dark' ? 0.12 : 0.08})` : 'transparent',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: streamQuality === '320' ? (theme) => `rgba(0, 188, 212, ${theme.palette.mode === 'dark' ? 0.15 : 0.1})` : (theme) => `rgba(0, 0, 0, ${theme.palette.mode === 'dark' ? 0.08 : 0.03})`
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Radio
                  checked={streamQuality === '320'}
                  size="small"
                  sx={{
                    color: 'primary.main'
                  }}
                />
                <Box>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      fontWeight: 600,
                      color: 'text.primary'
                    }}
                  >
                    High Quality (320 kbps) ⭐
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: 'text.secondary'
                    }}
                  >
                    Best quality, uses more data
                  </Typography>
                </Box>
              </Box>
            </Box>
          </RadioGroup>
        </Box>
      </Drawer>
    </Box>
  );
};

export default SettingsPage;

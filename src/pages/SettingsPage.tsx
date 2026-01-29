import React, { useState } from 'react';
import { 
  Box, 
  Typography,
  Switch,
  Paper,
  Container,
  IconButton,
  Snackbar,
  Alert,
  Radio,
  RadioGroup,
  Drawer,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import ShareIcon from '@mui/icons-material/Share';
import PageHeader from '../components/PageHeader';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import LabelOffIcon from '@mui/icons-material/LabelOff';
import HighQualityIcon from '@mui/icons-material/HighQuality';
import CloseIcon from '@mui/icons-material/Close';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { setMeta } from '../services/storage';
import pkg from '../../package.json';

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
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const handleStreamQualityChange = (newQuality: string) => {
    setStreamQuality(newQuality);
    localStorage.setItem('streamQuality', newQuality);
    setMeta('streamQuality', newQuality);
    setSnackbarMessage(`Stream quality set to ${newQuality}kbps`);
    setSnackbarOpen(true);
    setQualityDrawerOpen(false);
  };

  const handleClearSearchHistory = () => {
    // open confirmation dialog
    setConfirmClearOpen(true);
  };

  const confirmClearSearchHistory = () => {
    localStorage.removeItem('recentSearches');
    setSnackbarMessage('Search history cleared successfully');
    setSnackbarOpen(true);
    setConfirmClearOpen(false);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Wave Music App',
          text: 'Check out Wave Music App - Stream your favorite songs!',
          url: window.location.origin,
        });
      } catch {
        void 0;
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.origin);
        alert('App link copied to clipboard!');
      } catch {
        void 0;
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
      <PageHeader title="Settings" onBack={onNavigateHome} position="fixed" />
      <Container maxWidth="sm" sx={{ px: { xs: 2, sm: 3 }, pt: 0 }}>
        <Box sx={{ display: 'grid', gap: 2 }}>
          {/* Appearance */}
          <Paper elevation={0} sx={{ bgcolor: 'background.paper', borderRadius: 2, border: (theme) => `1px solid ${theme.palette.divider}` }}>
            <Box sx={{ px: 2, py: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {isDarkMode ? <DarkModeIcon sx={{ color: 'primary.main' }} /> : <LightModeIcon sx={{ color: 'primary.main' }} />}
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary' }}>Theme</Typography>
                </Box>
              </Box>
              <Switch checked={isDarkMode} onChange={onThemeToggle} sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: 'primary.main' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: 'primary.main' } }} />
            </Box>

            <Box sx={{ px: 2, py: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <LabelOffIcon sx={{ color: 'primary.main' }} />
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary' }}>Toggle Labels</Typography>
                </Box>
              </Box>
              <Switch checked={!hideBottomNavText} onChange={() => onBottomNavTextToggle && onBottomNavTextToggle()} sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: 'primary.main' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: 'primary.main' } }} />
            </Box>
          </Paper>

          {/* Playback (Stream quality + Search history combined) */}
          <Paper elevation={0} sx={{ bgcolor: 'background.paper', borderRadius: 2, border: (theme) => `1px solid ${theme.palette.divider}` }}>
            <Box sx={{ px: 2, py: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <HighQualityIcon sx={{ color: 'primary.main' }} />
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary' }}>Stream Quality</Typography>
                </Box>
              </Box>
              <IconButton size="small" sx={{ color: 'text.secondary' }} onClick={() => setQualityDrawerOpen(true)} aria-label="open quality settings"><ChevronRightIcon /></IconButton>
            </Box>

            <Box sx={{ px: 2, py: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <DeleteSweepIcon sx={{ color: 'primary.main' }} />
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary' }}>Search History</Typography>
                </Box>
              </Box>
              <IconButton size="small" sx={{ color: 'text.secondary' }} onClick={handleClearSearchHistory} aria-label="clear search history"><ChevronRightIcon /></IconButton>
            </Box>
          </Paper>



          {/* Support / About */}
          <Paper elevation={0} sx={{ bgcolor: 'background.paper', borderRadius: 2, border: (theme) => `1px solid ${theme.palette.divider}` }}>
            <Box sx={{ px: 2, py: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <ShareIcon sx={{ color: 'primary.main' }} />
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary' }}>Share Wave</Typography>
                </Box>
              </Box>
              <IconButton size="small" sx={{ color: 'text.secondary' }} onClick={handleShare}><ShareIcon fontSize="small" /></IconButton>
            </Box>

            <Box sx={{ px: 2, py: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <InfoOutlinedIcon sx={{ color: 'primary.main' }} />
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary' }}>About</Typography>
                </Box>
              </Box>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>{`v${pkg.version}`}</Typography>
            </Box>
          </Paper>

          <Box sx={{ mt: 1, px: 2 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>Made with ❤️ by Wave Team</Typography>
          </Box>
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
      {/* Confirm Clear Search History Dialog */}
      <Dialog open={confirmClearOpen} onClose={() => setConfirmClearOpen(false)}>
        <DialogTitle>Clear search history?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">Are you sure you want to delete your search history? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmClearOpen(false)}>Cancel</Button>
          <Button color="error" onClick={confirmClearSearchHistory}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SettingsPage;

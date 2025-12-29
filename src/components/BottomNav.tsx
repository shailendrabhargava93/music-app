import React, { useEffect, useState } from 'react';
import { BottomNavigation, BottomNavigationAction, Paper, Box, Typography } from '@mui/material';
import { subscribeNetworkStatus, getLastFetchFailed } from '../services/networkStatus';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic';
import ExploreIcon from '@mui/icons-material/Explore';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  showLabels?: boolean;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, showLabels = true }) => {
  const getTabIndex = (tab: string) => {
    switch (tab) {
      case 'home': return 0;
      case 'explore': return 1;
      case 'search': return 2;
      case 'favourites': return 3;
      default: return 0;
    }
  };

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    const tabs = ['home', 'explore', 'search', 'favourites'];
    onTabChange(tabs[newValue]);
  };

  return (
    <Paper id="bottom-nav-paper" sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000 }} elevation={3}>
      <BottomNavigation
        value={getTabIndex(activeTab)}
        onChange={handleChange}
        showLabels={showLabels}
        sx={{
          backgroundColor: 'background.paper',
          '& .MuiBottomNavigationAction-root': {
            color: 'text.secondary',
            minWidth: '80px',
            '&.Mui-selected': {
              color: 'primary.main',
            },
          },
        }}
      >
        <BottomNavigationAction {...(showLabels && { label: 'Home' })} icon={<HomeIcon />} />
        <BottomNavigationAction {...(showLabels && { label: 'Explore' })} icon={<ExploreIcon />} />
        <BottomNavigationAction {...(showLabels && { label: 'Search' })} icon={<SearchIcon />} />
        <BottomNavigationAction {...(showLabels && { label: 'Library' })} icon={<LibraryMusicIcon />} />
      </BottomNavigation>

      {/* Offline / fetch failure banner below nav buttons, always visible like the nav */}
      <BottomNavBanner />
    </Paper>
  );
};

const BottomNavBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [status, setStatus] = useState(() => getLastFetchFailed());

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    const unsub = subscribeNetworkStatus(s => setStatus({ lastFetchFailed: s.lastFetchFailed, message: s.message ?? null }));
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      unsub();
    };
  }, []);

  const show = !isOnline || status.lastFetchFailed;
  if (!show) return null;

  const text = !isOnline ? 'You are offline. Some features may be unavailable.' : (status.message || 'Unable to fetch some content. Showing cached data where available.');

  return (
    <Box role="banner" sx={{ bgcolor: 'warning.main', color: 'text.primary', py: 0.5, textAlign: 'center', fontSize: '0.85rem' }}>
      <Typography variant="caption">{text}</Typography>
    </Box>
  );
};

export default BottomNav;

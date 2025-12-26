import React from 'react';
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
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
    <Paper 
      sx={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0,
        zIndex: 1000
      }} 
      elevation={3}
    >
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
        <BottomNavigationAction 
          {...(showLabels && { label: "Home" })}
          icon={<HomeIcon />} 
        />
        <BottomNavigationAction 
          {...(showLabels && { label: "Explore" })}
          icon={<ExploreIcon />} 
        />
        <BottomNavigationAction 
          {...(showLabels && { label: "Search" })}
          icon={<SearchIcon />} 
        />
        <BottomNavigationAction 
          {...(showLabels && { label: "Library" })}
          icon={<LibraryMusicIcon />} 
        />
      </BottomNavigation>
    </Paper>
  );
};

export default BottomNav;

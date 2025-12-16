import { useState, useEffect } from 'react';
import { ThemeProvider, CssBaseline, Box, Container } from '@mui/material';
import { darkTheme, lightTheme } from './theme';
import BottomNav from './components/BottomNav';
import MusicPlayer from './components/MusicPlayer';
import FullPlayer from './components/FullPlayer';
import InstallPrompt from './components/InstallPrompt';
import HomePage from './pages/HomePage';
import SettingsPage from './pages/SettingsPage';
import WelcomeScreen from './pages/WelcomeScreen';
import PlaylistPage from './pages/PlaylistPage';
import FavouritesPage from './pages/FavouritesPage';
import AllSongsPage from './pages/AllSongsPage';
import { Song, CurrentSong } from './types/api';
import { saavnApi } from './services/saavnApi';
import { soundChartsApi, SoundChartsItem } from './services/soundChartsApi';
import SearchPage from './pages/SearchPage';

interface ChartSongWithSaavn extends SoundChartsItem {
  saavnData?: Song;
  isSearching?: boolean;
}

function App() {
  // Welcome screen state - check if user has visited before
  const [showWelcome, setShowWelcome] = useState(() => {
    const hasVisited = localStorage.getItem('hasVisited');
    return !hasVisited;
  });

  // Theme state with localStorage persistence
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme ? savedTheme === 'dark' : true; // Default to dark
  });

  const [activeTab, setActiveTab] = useState('home');
  const [fullPlayerOpen, setFullPlayerOpen] = useState(false);
  const [currentSong, setCurrentSong] = useState<CurrentSong | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Playlist state
  const [selectedPlaylist, setSelectedPlaylist] = useState<{
    id: string;
    name: string;
    image: string;
    type?: 'playlist' | 'album';
  } | null>(null);
  
  // View All Chart Songs state
  const [showAllCharts, setShowAllCharts] = useState(false);
  
  // Global state for chart songs - persists across tab switches
  const [chartSongs, setChartSongs] = useState<ChartSongWithSaavn[]>([]);
  const [chartSongsLoading, setChartSongsLoading] = useState(false);
  const [chartSongsLoaded, setChartSongsLoaded] = useState(false);

  // Save theme preference to localStorage
  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const handleThemeToggle = () => {
    setIsDarkMode(prev => !prev);
  };

  const handleGetStarted = () => {
    localStorage.setItem('hasVisited', 'true');
    setShowWelcome(false);
  };

  // Load chart songs once on app mount
  useEffect(() => {
    const loadChartSongs = async () => {
      if (chartSongsLoaded) return; // Don't reload if already loaded

      try {
        setChartSongsLoading(true);
        
        const response = await soundChartsApi.getTopSongs(0, 100);
        
        if (response.items && response.items.length > 0) {
          const songsWithPlaceholder = response.items.map(item => ({
            ...item,
            isSearching: true,
          }));
          
          setChartSongs(songsWithPlaceholder);
          setChartSongsLoaded(true);

          // Search Saavn for each song in background
          for (let i = 0; i < response.items.length; i++) {
            const item = response.items[i];
            const saavnData = await searchSongOnSaavn(item);
            
            setChartSongs(prev => 
              prev.map(song => 
                song.position === item.position 
                  ? { ...song, saavnData, isSearching: false }
                  : song
              )
            );

            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      } catch (err) {
        // Error loading chart songs
      } finally {
        setChartSongsLoading(false);
      }
    };

    loadChartSongs();
  }, [chartSongsLoaded]);

  const searchSongOnSaavn = async (item: SoundChartsItem): Promise<Song | undefined> => {
    try {
      // First attempt: Search with song name + artist name
      const query = `${item.song.name} ${item.song.creditName}`;
      let searchResults = await saavnApi.searchSongs(query, 5);

      if (searchResults?.data?.results && searchResults.data.results.length > 0) {
        const bestMatch = searchResults.data.results[0];
        
        return {
          id: bestMatch.id,
          name: bestMatch.name,
          album: bestMatch.album ? {
            id: bestMatch.album.id || '',
            name: bestMatch.album.name || '',
            url: bestMatch.album.url || '',
          } : undefined,
          year: bestMatch.year || '',
          releaseDate: bestMatch.releaseDate || '',
          duration: bestMatch.duration || 0,
          label: bestMatch.label || '',
          primaryArtists: bestMatch.artists?.primary?.map((a: any) => a.name).join(', ') || item.song.creditName,
          primaryArtistsId: bestMatch.artists?.primary?.map((a: any) => a.id).join(',') || '',
          featuredArtists: bestMatch.artists?.featured?.map((a: any) => a.name).join(', ') || '',
          featuredArtistsId: bestMatch.artists?.featured?.map((a: any) => a.id).join(',') || '',
          explicitContent: bestMatch.explicitContent || 0,
          playCount: bestMatch.playCount || 0,
          language: bestMatch.language || '',
          hasLyrics: bestMatch.hasLyrics || false,
          url: bestMatch.url || '',
          copyright: bestMatch.copyright || '',
          image: Array.isArray(bestMatch.image) ? bestMatch.image : [],
          downloadUrl: Array.isArray(bestMatch.downloadUrl) ? bestMatch.downloadUrl : [],
        };
      }
      
      // Fallback: Search by song name only and match artist
      const fallbackQuery = item.song.name;
      searchResults = await saavnApi.searchSongs(fallbackQuery, 10);
      
      if (searchResults?.data?.results && searchResults.data.results.length > 0) {
        // Normalize artist name for comparison
        const normalizeArtist = (name: string) => 
          name.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        const targetArtist = normalizeArtist(item.song.creditName);
        
        // Try to find a match with same or similar artist
        for (const result of searchResults.data.results) {
          const primaryArtistsNames = result.artists?.primary?.map((a: any) => a.name).join(', ') || '';
          const featuredArtistsNames = result.artists?.featured?.map((a: any) => a.name).join(', ') || '';
          const allArtists = `${primaryArtistsNames} ${featuredArtistsNames}`;
          
          const resultArtist = normalizeArtist(allArtists);
          
          // Check if artist name matches
          if (resultArtist.includes(targetArtist) || targetArtist.includes(resultArtist)) {
            return {
              id: result.id,
              name: result.name,
              album: result.album ? {
                id: result.album.id || '',
                name: result.album.name || '',
                url: result.album.url || '',
              } : undefined,
              year: result.year || '',
              releaseDate: result.releaseDate || '',
              duration: result.duration || 0,
              label: result.label || '',
              primaryArtists: primaryArtistsNames || item.song.creditName,
              primaryArtistsId: result.artists?.primary?.map((a: any) => a.id).join(',') || '',
              featuredArtists: featuredArtistsNames,
              featuredArtistsId: result.artists?.featured?.map((a: any) => a.id).join(',') || '',
              explicitContent: result.explicitContent || 0,
              playCount: result.playCount || 0,
              language: result.language || '',
              hasLyrics: result.hasLyrics || false,
              url: result.url || '',
              copyright: result.copyright || '',
              image: Array.isArray(result.image) ? result.image : [],
              downloadUrl: Array.isArray(result.downloadUrl) ? result.downloadUrl : [],
            };
          }
        }
        
        // If no artist match found, return the first result as a best guess
        const firstResult = searchResults.data.results[0];
        return {
          id: firstResult.id,
          name: firstResult.name,
          album: firstResult.album ? {
            id: firstResult.album.id || '',
            name: firstResult.album.name || '',
            url: firstResult.album.url || '',
          } : undefined,
          year: firstResult.year || '',
          releaseDate: firstResult.releaseDate || '',
          duration: firstResult.duration || 0,
          label: firstResult.label || '',
          primaryArtists: firstResult.artists?.primary?.map((a: any) => a.name).join(', ') || item.song.creditName,
          primaryArtistsId: firstResult.artists?.primary?.map((a: any) => a.id).join(',') || '',
          featuredArtists: firstResult.artists?.featured?.map((a: any) => a.name).join(', ') || '',
          featuredArtistsId: firstResult.artists?.featured?.map((a: any) => a.id).join(',') || '',
          explicitContent: firstResult.explicitContent || 0,
          playCount: firstResult.playCount || 0,
          language: firstResult.language || '',
          hasLyrics: firstResult.hasLyrics || false,
          url: firstResult.url || '',
          copyright: firstResult.copyright || '',
          image: Array.isArray(firstResult.image) ? firstResult.image : [],
          downloadUrl: Array.isArray(firstResult.downloadUrl) ? firstResult.downloadUrl : [],
        };
      }
      
      return undefined;
    } catch (err) {
      return undefined;
    }
  };

  // Decode HTML entities in strings
  const decodeHtmlEntities = (text: string): string => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  };

  const handleSongSelect = async (song: Song) => {
    try {
      // Fetch complete song details with download URLs
      const songDetailsResponse = await saavnApi.getSongsByIds([song.id]);
      
      if (!songDetailsResponse.success || !songDetailsResponse.data || songDetailsResponse.data.length === 0) {
        return;
      }
      
      const songDetails = songDetailsResponse.data[0];
      
      const getHighQualityImage = (images: Array<{ quality: string; url?: string; link?: string }>) => {
        if (!images || images.length === 0) return '';
        const qualities = ['500x500', '150x150', '50x50'];
        for (const quality of qualities) {
          const img = images.find(img => img.quality === quality);
          if (img) {
            return img.url || img.link || '';
          }
        }
        return images[images.length - 1]?.url || images[images.length - 1]?.link || '';
      };

      const getHighQualityAudio = (downloadUrls: Array<{ quality: string; url?: string; link?: string }>) => {
        if (!downloadUrls || downloadUrls.length === 0) return '';
        // Try to get the highest quality audio
        const qualities = ['320kbps', '160kbps', '96kbps', '48kbps', '12kbps'];
        for (const quality of qualities) {
          const audio = downloadUrls.find(url => url.quality === quality);
          if (audio) {
            return audio.url || audio.link || '';
          }
        }
        return downloadUrls[downloadUrls.length - 1]?.url || downloadUrls[downloadUrls.length - 1]?.link || '';
      };

      const getArtistNames = (artists: any): string => {
        if (artists?.primary && Array.isArray(artists.primary)) {
          return artists.primary.map((artist: any) => artist.name).join(', ');
        }
        return 'Unknown Artist';
      };

      const imageUrl = getHighQualityImage(songDetails.image);
      const audioUrl = getHighQualityAudio(songDetails.downloadUrl);
      const artistNames = getArtistNames(songDetails.artists);

      if (!audioUrl) {
        return;
      }

      const newSong: CurrentSong = {
        id: songDetails.id,
        title: decodeHtmlEntities(songDetails.name),
        artist: decodeHtmlEntities(artistNames),
        albumArt: imageUrl,
        duration: songDetails.duration,
        downloadUrl: audioUrl,
        albumId: songDetails.album?.id || '',
        albumName: songDetails.album?.name || 'Unknown Album',
        label: songDetails.label || 'Unknown Label',
        copyright: songDetails.copyright || 'Copyright information not available',
        year: songDetails.year || 'Unknown Year',
        language: songDetails.language || 'Unknown Language',
      };

      setCurrentSong(newSong);
      setIsPlaying(true);
      // Don't automatically open full player, just start playing
    } catch (error) {
      // Error loading song
    }
  };

  const handleNextSong = () => {
    if (chartSongs.length === 0) return;
    
    // Find current song index in chartSongs
    const currentIndex = chartSongs.findIndex(
      item => item.saavnData?.id === currentSong?.id
    );
    
    // Get next song (loop back to start if at end)
    const nextIndex = currentIndex >= 0 
      ? (currentIndex + 1) % chartSongs.length 
      : 0;
    
    const nextChartSong = chartSongs[nextIndex];
    if (nextChartSong?.saavnData) {
      handleSongSelect(nextChartSong.saavnData);
    }
  };

  const handlePreviousSong = () => {
    if (chartSongs.length === 0) return;
    
    // Find current song index in chartSongs
    const currentIndex = chartSongs.findIndex(
      item => item.saavnData?.id === currentSong?.id
    );
    
    // Get previous song (loop back to end if at start)
    const previousIndex = currentIndex >= 0 
      ? currentIndex === 0 ? chartSongs.length - 1 : currentIndex - 1
      : chartSongs.length - 1;
    
    const previousChartSong = chartSongs[previousIndex];
    if (previousChartSong?.saavnData) {
      handleSongSelect(previousChartSong.saavnData);
    }
  };

  const handlePlaylistSelect = (playlistId: string, playlistName: string, playlistImage: string) => {
    setSelectedPlaylist({ id: playlistId, name: playlistName, image: playlistImage, type: 'playlist' });
  };

  const handleAlbumSelect = (albumId: string, albumName: string, albumImage: string) => {
    setSelectedPlaylist({ id: albumId, name: albumName, image: albumImage, type: 'album' });
  };

  const handleBackFromPlaylist = () => {
    setSelectedPlaylist(null);
    // Return to appropriate tab based on playlist type
    if (selectedPlaylist?.type === 'album') {
      setActiveTab('home');
    } else {
      setActiveTab('search');
    }
  };

  const handleViewAllCharts = () => {
    setShowAllCharts(true);
  };

  const handleBackFromAllCharts = () => {
    setShowAllCharts(false);
  };

  const handleFavouriteSongSelect = async (songId: string) => {
    // Load the song by ID from Saavn
    try {
      const songDetailsResponse = await saavnApi.getSongsByIds([songId]);
      
      if (!songDetailsResponse.success || !songDetailsResponse.data || songDetailsResponse.data.length === 0) {
        return;
      }
      
      const songDetails = songDetailsResponse.data[0];
      
      // Convert to Song object and call handleSongSelect
      const song: Song = {
        id: songDetails.id,
        name: songDetails.name,
        album: songDetails.album,
        year: songDetails.year || '',
        releaseDate: songDetails.releaseDate || '',
        duration: songDetails.duration || 0,
        label: songDetails.label || '',
        primaryArtists: songDetails.artists?.primary?.map((a: any) => a.name).join(', ') || '',
        primaryArtistsId: songDetails.artists?.primary?.map((a: any) => a.id).join(',') || '',
        featuredArtists: songDetails.artists?.featured?.map((a: any) => a.name).join(', ') || '',
        featuredArtistsId: songDetails.artists?.featured?.map((a: any) => a.id).join(',') || '',
        explicitContent: songDetails.explicitContent || 0,
        playCount: songDetails.playCount || 0,
        language: songDetails.language || '',
        hasLyrics: songDetails.hasLyrics || false,
        url: songDetails.url || '',
        copyright: songDetails.copyright || '',
        image: songDetails.image || [],
        downloadUrl: songDetails.downloadUrl || [],
      };
      
      handleSongSelect(song);
    } catch (error) {
      // Error loading favourite song
    }
  };

  const renderContent = () => {
    // Show all chart songs page if activated
    if (showAllCharts) {
      return (
        <AllSongsPage
          chartSongs={chartSongs}
          onSongSelect={handleSongSelect}
          onBack={handleBackFromAllCharts}
        />
      );
    }

    // Show playlist/album page if selected
    if (selectedPlaylist) {
      return (
        <PlaylistPage
          playlistId={selectedPlaylist.id}
          playlistName={selectedPlaylist.name}
          playlistImage={selectedPlaylist.image}
          onBack={handleBackFromPlaylist}
          onSongSelect={handleSongSelect}
          type={selectedPlaylist.type}
        />
      );
    }

    switch (activeTab) {
      case 'home':
        return (
          <HomePage 
            onSongSelect={handleSongSelect} 
            chartSongs={chartSongs}
            chartSongsLoading={chartSongsLoading}
            onViewAllCharts={handleViewAllCharts}
            onAlbumSelect={handleAlbumSelect}
          />
        );
      case 'search':
        return (
          <SearchPage 
            onSongSelect={handleSongSelect}
            onPlaylistSelect={handlePlaylistSelect}
          />
        );
      case 'settings':
        return (
          <SettingsPage 
            isDarkMode={isDarkMode}
            onThemeToggle={handleThemeToggle}
          />
        );
      case 'favourites':
        return (
          <FavouritesPage 
            onSongSelect={handleFavouriteSongSelect}
          />
        );
      default:
        return null;
    }
  };

  return (
    <ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
      <CssBaseline />
      {showWelcome ? (
        <WelcomeScreen onGetStarted={handleGetStarted} />
      ) : (
        <Box 
          sx={{ 
            minHeight: '100vh',
            bgcolor: 'background.default',
          }}
        >
          <Container 
            maxWidth="sm" 
            sx={{ 
              px: { xs: 0, sm: 2 },
              pt: 3
            }}
          >
            {renderContent()}
          </Container>
          {currentSong && (
            <>
              <MusicPlayer 
                songTitle={currentSong.title}
                artist={currentSong.artist}
                albumArt={currentSong.albumArt}
                isPlaying={isPlaying}
                onTogglePlay={() => setIsPlaying(!isPlaying)}
                onOpenFullPlayer={() => setFullPlayerOpen(true)}
                onNextSong={handleNextSong}
                onPreviousSong={handlePreviousSong}
              />
              <FullPlayer 
                open={fullPlayerOpen} 
                onClose={() => setFullPlayerOpen(false)}
                songId={currentSong.id}
                songTitle={currentSong.title}
                artist={currentSong.artist}
                albumArt={currentSong.albumArt}
                duration={currentSong.duration}
                audioUrl={currentSong.downloadUrl}
                isPlaying={isPlaying}
                onTogglePlay={() => setIsPlaying(!isPlaying)}
                onNextSong={handleNextSong}
                onPreviousSong={handlePreviousSong}
                onSongSelect={handleSongSelect}
                // Song details for info popup
                albumId={currentSong.albumId}
                albumName={currentSong.albumName}
                label={currentSong.label}
                copyright={currentSong.copyright}
                year={currentSong.year}
                language={currentSong.language}
              />
            </>
          )}
          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
          <InstallPrompt />
        </Box>
      )}
    </ThemeProvider>
  );
}

export default App;

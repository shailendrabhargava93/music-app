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
    sourceTab?: string;
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
        
        // Check if we have cached data in localStorage
        const cachedData = localStorage.getItem('chartSongs');
        const cacheTimestamp = localStorage.getItem('chartSongsTimestamp');
        const cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        
        // Use cached data if it exists and is less than 24 hours old
        if (cachedData && cacheTimestamp) {
          const age = Date.now() - parseInt(cacheTimestamp);
          if (age < cacheExpiry) {
            const cached = JSON.parse(cachedData);
            setChartSongs(cached);
            setChartSongsLoaded(true);
            setChartSongsLoading(false);
            return;
          }
        }
        
        const response = await soundChartsApi.getTopSongs(0, 100);
        
        if (response.items && response.items.length > 0) {
          const songsWithPlaceholder = response.items.map(item => ({
            ...item,
            isSearching: true,
          }));
          
          setChartSongs(songsWithPlaceholder);
          setChartSongsLoaded(true);

          // Search Saavn for each song in background
          const processedSongs: ChartSongWithSaavn[] = [];
          for (let i = 0; i < response.items.length; i++) {
            const item = response.items[i];
            const saavnData = await searchSongOnSaavn(item);
            
            const updatedSong = { ...item, saavnData, isSearching: false };
            processedSongs.push(updatedSong);
            
            setChartSongs(prev => 
              prev.map(song => 
                song.position === item.position 
                  ? updatedSong
                  : song
              )
            );

            await new Promise(resolve => setTimeout(resolve, 200));
          }
          
          // Cache the final processed songs
          const finalSongs = songsWithPlaceholder.map(song => {
            const processed = processedSongs.find(p => p.position === song.position);
            return processed || song;
          });
          localStorage.setItem('chartSongs', JSON.stringify(finalSongs));
          localStorage.setItem('chartSongsTimestamp', Date.now().toString());
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
      // Normalize text for better comparison
      const normalizeText = (text: string) => 
        text.toLowerCase()
          .replace(/\s+/g, ' ')
          .replace(/[^\w\s]/g, '')
          .trim();
      
      const normalizeArtist = (name: string) => 
        name.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      const targetSongName = normalizeText(item.song.name);
      const targetArtist = normalizeArtist(item.song.creditName);
      
      // Calculate similarity score between two strings
      const similarityScore = (str1: string, str2: string): number => {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        if (longer.length === 0) return 1.0;
        const editDistance = (s1: string, s2: string): number => {
          const costs: number[] = [];
          for (let i = 0; i <= s1.length; i++) {
            let lastValue = i;
            for (let j = 0; j <= s2.length; j++) {
              if (i === 0) {
                costs[j] = j;
              } else if (j > 0) {
                let newValue = costs[j - 1];
                if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                  newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                }
                costs[j - 1] = lastValue;
                lastValue = newValue;
              }
            }
            if (i > 0) costs[s2.length] = lastValue;
          }
          return costs[s2.length];
        };
        return (longer.length - editDistance(longer, shorter)) / longer.length;
      };
      
      // First attempt: Search with song name + artist name
      const query = `${item.song.name} ${item.song.creditName}`;
      let searchResults = await saavnApi.searchSongs(query, 10);

      if (searchResults?.data?.results && searchResults.data.results.length > 0) {
        // Find best match by comparing song names and artists
        let bestMatch = null;
        let bestScore = 0;
        
        for (const result of searchResults.data.results) {
          const resultSongName = normalizeText(result.name);
          const primaryArtists = result.artists?.primary?.map((a: any) => a.name).join(', ') || '';
          const featuredArtists = result.artists?.featured?.map((a: any) => a.name).join(', ') || '';
          const allArtists = `${primaryArtists} ${featuredArtists}`;
          const resultArtist = normalizeArtist(allArtists);
          
          // Calculate similarity scores
          const songNameScore = similarityScore(targetSongName, resultSongName);
          const artistScore = similarityScore(targetArtist, resultArtist);
          
          // Combined score: 70% song name, 30% artist name
          const totalScore = (songNameScore * 0.7) + (artistScore * 0.3);
          
          // Only consider matches with reasonable similarity
          if (totalScore > bestScore && songNameScore > 0.6) {
            bestScore = totalScore;
            bestMatch = result;
          }
        }
        
        if (bestMatch) {
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
    setSelectedPlaylist({ id: playlistId, name: playlistName, image: playlistImage, type: 'playlist', sourceTab: activeTab });
  };

  const handleAlbumSelect = (albumId: string, albumName: string, albumImage: string) => {
    setSelectedPlaylist({ id: albumId, name: albumName, image: albumImage, type: 'album', sourceTab: activeTab });
  };

  const handleBackFromPlaylist = () => {
    const sourceTab = selectedPlaylist?.sourceTab || 'home';
    setSelectedPlaylist(null);
    setActiveTab(sourceTab);
  };

  const handleViewAllCharts = () => {
    setShowAllCharts(true);
  };

  const handleBackFromAllCharts = () => {
    setShowAllCharts(false);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Reset showAllCharts and selectedPlaylist when navigating via bottom nav
    setShowAllCharts(false);
    setSelectedPlaylist(null);
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
            onPlaylistSelect={handlePlaylistSelect}
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
          <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
          <InstallPrompt />
        </Box>
      )}
    </ThemeProvider>
  );
}

export default App;

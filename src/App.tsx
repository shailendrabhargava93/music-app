import { useState, useEffect, useRef, useCallback } from 'react';
import { ThemeProvider, CssBaseline, Box, Container, Snackbar } from '@mui/material';
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
import RecentlyPlayedPage from './pages/RecentlyPlayedPage';
import ExplorePage from './pages/ExplorePage';
import { Song, CurrentSong } from './types/api';
import { saavnApi } from './services/saavnApi';
import { soundChartsApi, SoundChartsItem } from './services/soundChartsApi';
import SearchPage from './pages/SearchPage';
import { saveSongMetadata, saveDownloadRecord, setMeta, getDownloadRecord, getMeta, migrateLocalStorage } from './services/storage';
import { subscribeNetworkStatus } from './services/networkStatus';

const decodeHtmlEntities = (text: string): string => {
  if (!text) return text;
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
};

interface ChartSongWithSaavn extends SoundChartsItem {
  saavnData?: Song;
  isSearching?: boolean;
}

interface ArtistReference {
  id?: string;
  name?: string;
}

interface SessionData {
  song?: CurrentSong;
  progress?: number;
  songQueue?: Song[];
  activeTab?: string;
  isPlaying?: boolean;
}

const joinArtistNames = (artists?: ArtistReference[]) =>
  (artists ?? [])
    .map(artist => artist?.name?.trim() ?? '')
    .filter(name => name)
    .join(', ');

const joinArtistIds = (artists?: ArtistReference[]) =>
  (artists ?? [])
    .map(artist => artist?.id?.trim() ?? '')
    .filter(id => id)
    .join(',');

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

  // Bottom nav text visibility state
  const [hideBottomNavText, setHideBottomNavText] = useState(() => {
    const savedPref = localStorage.getItem('hideBottomNavText');
    return savedPref === 'true';
  });

  const [activeTab, setActiveTab] = useState('home');
  const [fullPlayerOpen, setFullPlayerOpen] = useState(false);
  const [currentSong, setCurrentSong] = useState<CurrentSong | null>(() => {
    const saved = localStorage.getItem('lastSong');
    return saved ? JSON.parse(saved) : null;
  });
  const [isPlaying, setIsPlaying] = useState(() => {
    const saved = localStorage.getItem('isPlaying');
    return saved === 'true';
  });
  const [isLoadingSong, setIsLoadingSong] = useState(false);
  const [songProgress, setSongProgress] = useState(() => {
    const saved = localStorage.getItem('lastSongProgress');
    return saved ? parseInt(saved) : 0;
  });
  const [audio] = useState(() => new Audio());
  const offlineBlobUrlRef = useRef<string | null>(null);
  
  // Queue management
  const [songQueue, setSongQueue] = useState<Song[]>([]);
  const [currentContextSongs, setCurrentContextSongs] = useState<Song[]>([]);
  
  // Repeat mode: 'off' | 'all' | 'one'
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>(() => {
    const saved = localStorage.getItem('repeatMode');
    return (saved === 'all' || saved === 'one') ? saved : 'off';
  });
  
  // Shuffle mode
  const [shuffleMode, setShuffleMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('shuffleMode');
    return saved === 'true';
  });
  
  // Snackbar state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // Recently played page state
  const [showRecentlyPlayed, setShowRecentlyPlayed] = useState(false);
  
  const trackBlobUrl = useCallback((url?: string | null) => {
    if (offlineBlobUrlRef.current && offlineBlobUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(offlineBlobUrlRef.current);
    }
    if (url && url.startsWith('blob:')) {
      offlineBlobUrlRef.current = url;
    } else {
      offlineBlobUrlRef.current = null;
    }
  }, []);

  const ensureOfflineAudioUrl = useCallback(async (songId: string, remoteUrl?: string) => {
    const normalizedUrl = remoteUrl || '';
    try {
      const existing = await getDownloadRecord(songId);
      if (existing?.blob) {
        if (normalizedUrl && normalizedUrl !== existing.url) {
          try {
            await saveDownloadRecord(songId, { url: normalizedUrl });
          } catch (saveError) {
            console.warn('Unable to persist download metadata', saveError);
          }
        }
        return URL.createObjectURL(existing.blob);
      }

      if (!normalizedUrl) return '';

      const response = await fetch(normalizedUrl);
      if (!response.ok) {
        throw new Error(`Failed to download audio for ${songId}`);
      }
      const blob = await response.blob();
      await saveDownloadRecord(songId, { blob, url: normalizedUrl });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.warn('Offline caching failed for song', songId, error);
      if (normalizedUrl) {
        try {
          await saveDownloadRecord(songId, { url: normalizedUrl });
        } catch (saveError) {
          console.warn('Unable to persist download URL after caching failure', saveError);
        }
      }
      return normalizedUrl;
    }
  }, []);
  
  useEffect(() => {
    migrateLocalStorage();
  }, []);

  // Subscribe to API/network failure messages and show snackbars
  useEffect(() => {
    const unsub = subscribeNetworkStatus((s) => {
      if (s.message) {
        setSnackbarMessage(s.message);
        setSnackbarOpen(true);
      }
    });
    return () => unsub();
  }, []);

  

  useEffect(() => {
    const restoreSession = async () => {
      const lastSession = await getMeta('lastSession') as SessionData | undefined;
      if (lastSession?.song) {
        const remoteUrl = lastSession.song.remoteDownloadUrl ?? lastSession.song.downloadUrl ?? '';
        const playbackUrl = await ensureOfflineAudioUrl(lastSession.song.id, remoteUrl);
        trackBlobUrl(playbackUrl);
        setCurrentSong({
          ...lastSession.song,
          downloadUrl: playbackUrl,
          remoteDownloadUrl: remoteUrl,
        });
        setSongProgress(lastSession.progress ?? 0);
        setSongQueue(lastSession.songQueue ?? []);
        setIsPlaying(!!lastSession.isPlaying);
        setActiveTab(lastSession.activeTab || 'home');
      }
    };
    restoreSession();
  }, [ensureOfflineAudioUrl, trackBlobUrl]);

  useEffect(() => {
    return () => {
      if (offlineBlobUrlRef.current && offlineBlobUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(offlineBlobUrlRef.current);
      }
    };
  }, []);
  // Playlist state
  const [selectedPlaylist, setSelectedPlaylist] = useState<{
    id: string;
    name: string;
    image: string;
    type?: 'playlist' | 'album' | 'artist';
    sourceTab?: string;
  } | null>(null);
  
  // View All Chart Songs state
  const [showAllCharts, setShowAllCharts] = useState(false);

  // Manage browser history entries so mobile back gesture/popstate
  // closes in-app overlays (playlist, charts, recently played, full player)
  // instead of closing the PWA / navigating away.
  useEffect(() => {
    // Ensure there's an app-specific history entry we control
    try {
      const initialState = { app: 'wave', view: 'home' };
      // Replace any external state with our initial app state and then
      // push one so there's a safe entry to return to when user navigates back.
      window.history.replaceState(initialState, '');
      window.history.pushState(initialState, '');
    } catch (err) {
      console.debug('History initialization failed', err);
    }

    const onPopState = (ev: PopStateEvent) => {
      const state = ev.state as any;
      // If this is our app's state object, map it to app UI state
      if (state && state.app === 'wave') {
        const view = state.view as string | undefined;
        // When popping back to home view, close overlays
        if (!view || view === 'home') {
          setSelectedPlaylist(null);
          setShowAllCharts(false);
          setShowRecentlyPlayed(false);
          setFullPlayerOpen(false);
          setActiveTab('home');
        } else if (view === 'playlist') {
          // If state indicates playlist view we don't automatically open a playlist
          // because that requires knowing which playlist; leave current UI as-is.
        } else if (view === 'charts') {
          setShowAllCharts(true);
        } else if (view === 'recent') {
          setShowRecentlyPlayed(true);
        } else if (view === 'fullplayer') {
          setFullPlayerOpen(true);
        }
      } else {
        // If the popped state is not ours, re-insert a home state to avoid exiting
        try {
          const home = { app: 'wave', view: 'home' };
          window.history.replaceState(home, '');
        } catch (err) {
          // ignore
        }
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  // Push history entries whenever one of these overlays or views is opened
  useEffect(() => {
    try {
      if (selectedPlaylist) {
        window.history.pushState({ app: 'wave', view: 'playlist', id: selectedPlaylist.id }, '');
      }
    } catch (err) {
      // ignore
    }
  }, [selectedPlaylist]);

  useEffect(() => {
    try {
      if (showAllCharts) {
        window.history.pushState({ app: 'wave', view: 'charts' }, '');
      }
    } catch (err) {
      // ignore
    }
  }, [showAllCharts]);

  useEffect(() => {
    try {
      if (showRecentlyPlayed) {
        window.history.pushState({ app: 'wave', view: 'recent' }, '');
      }
    } catch (err) {
      // ignore
    }
  }, [showRecentlyPlayed]);

  useEffect(() => {
    try {
      if (fullPlayerOpen) {
        window.history.pushState({ app: 'wave', view: 'fullplayer' }, '');
      }
    } catch (err) {
      // ignore
    }
  }, [fullPlayerOpen]);
  
  // Global state for chart songs - persists across tab switches
  const [chartSongs, setChartSongs] = useState<ChartSongWithSaavn[]>([]);
  const [chartSongsLoading, setChartSongsLoading] = useState(false);
  const [chartSongsLoaded, setChartSongsLoaded] = useState(false);

  // Save theme preference to localStorage
  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Save current song and progress to localStorage
  useEffect(() => {
    if (currentSong) {
      localStorage.setItem('lastSong', JSON.stringify(currentSong));
      localStorage.setItem('lastSongProgress', songProgress.toString());
    }
  }, [currentSong, songProgress]);

  // Save playing state to localStorage
  useEffect(() => {
    localStorage.setItem('isPlaying', isPlaying.toString());
  }, [isPlaying]);

  // Save bottom nav text preference to localStorage
  useEffect(() => {
    localStorage.setItem('hideBottomNavText', hideBottomNavText.toString());
  }, [hideBottomNavText]);

  const handleThemeToggle = () => {
    setIsDarkMode(prev => !prev);
  };

  const handleBottomNavTextToggle = () => {
    setHideBottomNavText(prev => !prev);
  };

  const handleGetStarted = () => {
    localStorage.setItem('hasVisited', 'true');
    setShowWelcome(false);
  };

  // Handle PWA shortcuts
  useEffect(() => {
    const handleShortcut = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const shortcut = urlParams.get('shortcut');
      
      if (shortcut === 'search') {
        // Dismiss welcome screen if shown and navigate to search
        if (showWelcome) {
          setShowWelcome(false);
        }
        setActiveTab('search');
      } else if (shortcut === 'favourites' || shortcut === 'favorites') {
        // Dismiss welcome screen if shown and navigate to favorites
        if (showWelcome) {
          setShowWelcome(false);
        }
        setActiveTab('favourites');
      }
    };

    handleShortcut();
  }, [showWelcome]);

  // Load chart songs only when welcome screen is dismissed AND home page is accessed
  useEffect(() => {
    const loadChartSongs = async () => {
      // Only load if welcome screen is dismissed and home tab is active
      if (showWelcome || activeTab !== 'home' || chartSongsLoaded) return;

      try {
        setChartSongsLoading(true);
        const cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        const cachedData = await getMeta('chartSongs');
        const cacheTimestamp = await getMeta('chartSongsTimestamp');
        const parsedTimestamp =
          typeof cacheTimestamp === 'number'
            ? cacheTimestamp
            : Number(cacheTimestamp);

        if (
          Array.isArray(cachedData) &&
          Number.isFinite(parsedTimestamp) &&
          Date.now() - parsedTimestamp < cacheExpiry
        ) {
          setChartSongs(cachedData);
          setChartSongsLoaded(true);
          setChartSongsLoading(false);
          return;
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
          await setMeta('chartSongs', finalSongs);
          await setMeta('chartSongsTimestamp', Date.now());
        }
      } catch (err) {
        console.warn('Failed to load chart songs', err);
      } finally {
        setChartSongsLoading(false);
      }
    };

    loadChartSongs();
  }, [showWelcome, activeTab, chartSongsLoaded]);

  useEffect(() => {
    if (!currentSong) return;
    setMeta('lastSession', {
      song: currentSong,
      progress: songProgress,
      songQueue,
      activeTab,
      isPlaying,
    });
  }, [currentSong, songProgress, songQueue, activeTab, isPlaying]);

  // Save repeat mode to localStorage
  useEffect(() => {
    localStorage.setItem('repeatMode', repeatMode);
  }, [repeatMode]);

  // Save shuffle mode to localStorage
  useEffect(() => {
    localStorage.setItem('shuffleMode', String(shuffleMode));
  }, [shuffleMode]);

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
      
      // First attempt: Search with just song title
      let searchResults = await saavnApi.searchSongs(item.song.name, 15);

      if (searchResults?.data?.results && searchResults.data.results.length > 0) {
        // Find best match by comparing song names and artists
        let bestMatch = null;
        let bestScore = 0;
        
        for (const result of searchResults.data.results) {
          const resultSongName = normalizeText(result.name);
          const primaryArtists = joinArtistNames(result.artists?.primary);
          const featuredArtists = joinArtistNames(result.artists?.featured);
          const allArtists = `${primaryArtists} ${featuredArtists}`;
          const resultArtist = normalizeArtist(allArtists);
          
          // Calculate similarity scores
          const songNameScore = similarityScore(targetSongName, resultSongName);
          const artistScore = similarityScore(targetArtist, resultArtist);
          
          // Combined score: 70% song name, 30% artist name
          const totalScore = (songNameScore * 0.7) + (artistScore * 0.3);
          
          // Only consider matches with reasonable similarity (song name > 0.5)
          if (totalScore > bestScore && songNameScore > 0.5) {
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
            primaryArtists: joinArtistNames(bestMatch.artists?.primary) || item.song.creditName,
            primaryArtistsId: joinArtistIds(bestMatch.artists?.primary) || '',
            featuredArtists: joinArtistNames(bestMatch.artists?.featured) || '',
            featuredArtistsId: joinArtistIds(bestMatch.artists?.featured) || '',
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
      
      // Fallback: Try with artist + song name
      const fallbackQuery = `${item.song.name} ${item.song.creditName}`;
      searchResults = await saavnApi.searchSongs(fallbackQuery, 10);
      
      if (searchResults?.data?.results && searchResults.data.results.length > 0) {
        let bestMatch = null;
        let bestScore = 0;
        
        for (const result of searchResults.data.results) {
          const resultSongName = normalizeText(result.name);
          const songNameScore = similarityScore(targetSongName, resultSongName);
          
          if (songNameScore > bestScore && songNameScore > 0.5) {
            bestScore = songNameScore;
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
            primaryArtists: joinArtistNames(bestMatch.artists?.primary) || item.song.creditName,
            primaryArtistsId: joinArtistIds(bestMatch.artists?.primary) || '',
            featuredArtists: joinArtistNames(bestMatch.artists?.featured) || '',
            featuredArtistsId: joinArtistIds(bestMatch.artists?.featured) || '',
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
      console.warn('searchSongOnSaavn failed', err);
      return undefined;
    }
  };

  // Decode HTML entities in strings
  const handleSongSelect = async (song: Song, contextSongs?: Song[]) => {
    try {
      // Set loading state
      setIsLoadingSong(true);
      
      // If contextSongs provided, populate queue with remaining songs
      if (contextSongs && contextSongs.length > 0) {
        setCurrentContextSongs(contextSongs);
        const currentIndex = contextSongs.findIndex(s => s.id === song.id);
        if (currentIndex !== -1) {
          // Add all songs after the selected one to the queue
          const remainingSongs = contextSongs.slice(currentIndex + 1);
          setSongQueue(remainingSongs);
        }
      }
      
      // Fetch complete song details with download URLs
      const songDetailsResponse = await saavnApi.getSongsByIds([song.id]);
      
      if (!songDetailsResponse.success || !songDetailsResponse.data || songDetailsResponse.data.length === 0) {
        setIsLoadingSong(false);
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
        
        // Get user's preferred quality setting (48, 160, or 320)
        const userQuality = localStorage.getItem('streamQuality') || '320';
        
        // Map user quality preference to available qualities
        let priorityQualities: string[] = [];
        
        if (userQuality === '48') {
          // Low quality: try 48kbps first, then fallback
          priorityQualities = ['48kbps', '96kbps', '160kbps', '320kbps', '12kbps'];
        } else if (userQuality === '160') {
          // Medium quality: try 160kbps first, then fallback
          priorityQualities = ['160kbps', '320kbps', '96kbps', '48kbps', '12kbps'];
        } else {
          // High (default): try 320kbps first, then fallbacks
          priorityQualities = ['320kbps', '160kbps', '96kbps', '48kbps', '12kbps'];
        }
        
        // Try to get audio in priority order
        for (const quality of priorityQualities) {
          const audio = downloadUrls.find(url => url.quality === quality);
          if (audio) {
            return audio.url || audio.link || '';
          }
        }
        
        // Fallback to any available audio
        return downloadUrls[downloadUrls.length - 1]?.url || downloadUrls[downloadUrls.length - 1]?.link || '';
      };

      const getArtistNames = (artists?: { primary?: ArtistReference[] }): string => {
        if (artists?.primary && artists.primary.length > 0) {
          return joinArtistNames(artists.primary);
        }
        return 'Unknown Artist';
      };

      const imageUrl = getHighQualityImage(songDetails.image);
      const audioUrl = getHighQualityAudio(songDetails.downloadUrl);
      const artistNames = getArtistNames(songDetails.artists);

      if (!audioUrl) {
        setIsLoadingSong(false);
        return;
      }

      const playbackUrl = await ensureOfflineAudioUrl(songDetails.id, audioUrl);

      const newSong: CurrentSong = {
        id: songDetails.id,
        title: decodeHtmlEntities(songDetails.name),
        artist: decodeHtmlEntities(artistNames),
        albumArt: imageUrl,
        duration: songDetails.duration,
        downloadUrl: playbackUrl,
        remoteDownloadUrl: audioUrl,
        albumId: songDetails.album?.id || '',
        albumName: songDetails.album?.name || 'Unknown Album',
        label: songDetails.label || 'Unknown Label',
        copyright: songDetails.copyright || 'Copyright information not available',
        year: songDetails.year || 'Unknown Year',
        language: songDetails.language || 'Unknown Language',
        explicitContent: songDetails.explicitContent || false,
        source: selectedPlaylist ? selectedPlaylist.name : undefined,
      };

      await saveSongMetadata(songDetails as Song);

      trackBlobUrl(playbackUrl);

      setCurrentSong(newSong);
      setIsPlaying(true);
      setIsLoadingSong(false);
      
      // Add to recently played in localStorage with complete song details
      const storedRecentlyPlayed = (await getMeta('recentlyPlayed')) as Song[] | undefined;
      const recentlyPlayed = Array.isArray(storedRecentlyPlayed) ? storedRecentlyPlayed : [];
      // Remove if already exists to avoid duplicates
      const filtered = recentlyPlayed.filter((s: Song) => s.id !== songDetails.id);
      
      // Create a proper Song object with primaryArtists as string
      const recentSong: Song = {
        id: songDetails.id,
        name: songDetails.name,
        album: songDetails.album,
        year: songDetails.year || '',
        releaseDate: songDetails.releaseDate || '',
        duration: songDetails.duration || 0,
        label: songDetails.label || '',
        primaryArtists: artistNames, // Use the extracted artist names string
        primaryArtistsId: joinArtistIds(songDetails.artists?.primary) || '',
        featuredArtists: joinArtistNames(songDetails.artists?.featured) || '',
        featuredArtistsId: joinArtistIds(songDetails.artists?.featured) || '',
        explicitContent: songDetails.explicitContent || 0,
        playCount: songDetails.playCount || 0,
        language: songDetails.language || '',
        hasLyrics: songDetails.hasLyrics || false,
        url: songDetails.url || '',
        copyright: songDetails.copyright || '',
        image: songDetails.image || [],
        downloadUrl: songDetails.downloadUrl || [],
      };
      
      // Add to the beginning with complete details
      filtered.unshift(recentSong);
      // Keep only last 50 songs
      const limited = filtered.slice(0, 50);
      await setMeta('recentlyPlayed', limited);
      // Don't automatically open full player, just start playing
    } catch (error) {
      console.warn('Failed to load song details', error);
      setIsLoadingSong(false);
    }
  };

  const handleProgressSeek = useCallback((newTime: number) => {
    setSongProgress(newTime);
    audio.currentTime = newTime;
  }, [audio]);

  const handleNextSong = useCallback(() => {
    // Check if there's a song in the queue first
    if (songQueue.length > 0) {
      const [nextSong, ...remainingQueue] = songQueue;
      setSongQueue(remainingQueue);
      handleSongSelect(nextSong);
      return;
    }
    
    // Try to play next from current context
    if (currentContextSongs.length > 0 && currentSong) {
      const currentIndex = currentContextSongs.findIndex(s => s.id === currentSong.id);
      
      if (shuffleMode) {
        // Shuffle: pick a random song from context (excluding current)
        const availableSongs = currentContextSongs.filter(s => s.id !== currentSong.id);
        if (availableSongs.length > 0) {
          const randomIndex = Math.floor(Math.random() * availableSongs.length);
          handleSongSelect(availableSongs[randomIndex], currentContextSongs);
          return;
        }
      }
      
      if (currentIndex >= 0 && currentIndex < currentContextSongs.length - 1) {
        const nextSong = currentContextSongs[currentIndex + 1];
        handleSongSelect(nextSong, currentContextSongs);
        return;
      } else if (repeatMode === 'all' && currentIndex === currentContextSongs.length - 1) {
        // Loop back to first song in context
        handleSongSelect(currentContextSongs[0], currentContextSongs);
        return;
      }
    }
    
    // Otherwise, play from chart songs as fallback
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
  }, [songQueue, currentContextSongs, currentSong, shuffleMode, repeatMode, chartSongs]);

  const handlePreviousSong = useCallback(() => {
    // Try from current context first
    if (currentContextSongs.length > 0 && currentSong) {
      const currentIndex = currentContextSongs.findIndex(s => s.id === currentSong.id);
      if (currentIndex > 0) {
        const previousSong = currentContextSongs[currentIndex - 1];
        handleSongSelect(previousSong, currentContextSongs);
        return;
      }
    }
    
    // Fallback to chart songs
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
  }, [currentContextSongs, currentSong, chartSongs]);

  const handlePlaylistSelect = (playlistId: string, playlistName: string, playlistImage: string) => {
    setSelectedPlaylist({ id: playlistId, name: playlistName, image: playlistImage, type: 'playlist', sourceTab: activeTab });
  };

  const handleArtistSelect = (artistId: string, artistName: string, artistImage: string) => {
    setSelectedPlaylist({ id: artistId, name: artistName, image: artistImage, type: 'artist', sourceTab: activeTab });
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
    setShowRecentlyPlayed(false);
  };

  const handleRecentlyPlayedClick = () => {
    setShowRecentlyPlayed(true);
    setShowAllCharts(false);
    setSelectedPlaylist(null);
  };

  const handleBackFromRecentlyPlayed = () => {
    setShowRecentlyPlayed(false);
  };

  const handleSettingsClick = () => {
    setActiveTab('settings');
    setShowRecentlyPlayed(false);
    setShowAllCharts(false);
    setSelectedPlaylist(null);
  };

  // MediaSession metadata & handlers
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentSong) return;

    const normalizedTitle = decodeHtmlEntities(currentSong.title);
    const normalizedArtist = decodeHtmlEntities(currentSong.artist);
    const normalizedAlbum = decodeHtmlEntities(currentSong.albumName || 'Wave Music');
    const artworkSrc = currentSong.albumArt;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: normalizedTitle,
        artist: normalizedArtist,
        album: normalizedAlbum,
        artwork: artworkSrc
          ? [
              { src: artworkSrc, sizes: '512x512', type: 'image/jpeg' },
              { src: artworkSrc, sizes: '384x384', type: 'image/jpeg' },
              { src: artworkSrc, sizes: '256x256', type: 'image/jpeg' },
              { src: artworkSrc, sizes: '192x192', type: 'image/jpeg' },
              { src: artworkSrc, sizes: '128x128', type: 'image/jpeg' },
              { src: artworkSrc, sizes: '96x96', type: 'image/jpeg' },
            ]
          : [],
      });
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

      if (navigator.mediaSession.setPositionState && currentSong.duration) {
        navigator.mediaSession.setPositionState({
          duration: currentSong.duration,
          playbackRate: 1,
          position: Math.floor(songProgress),
        });
      }

      localStorage.setItem('mediaSessionMetadata', JSON.stringify({
        title: normalizedTitle,
        artist: normalizedArtist,
        album: normalizedAlbum,
        artwork: artworkSrc,
        duration: currentSong.duration,
        progress: Math.floor(songProgress),
        playbackState: isPlaying ? 'playing' : 'paused',
      }));
    } catch (error) {
      console.debug('MediaSession metadata setup failed', error);
    }
  }, [currentSong, isPlaying, songProgress]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const safeSetHandler = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (error) {
        console.debug('MediaSession action not supported', action, error);
      }
    };

    safeSetHandler('play', () => setIsPlaying(true));
    safeSetHandler('pause', () => setIsPlaying(false));
    safeSetHandler('nexttrack', () => handleNextSong());
    safeSetHandler('previoustrack', () => handlePreviousSong());
    safeSetHandler('seekto', (event: MediaSessionActionDetails) => {
      if (event.seekTime !== undefined) {
        handleProgressSeek(event.seekTime);
      }
    });
    safeSetHandler('stop', () => setIsPlaying(false));
    safeSetHandler('skipad', () => handleNextSong());

    return () => {
      ['play', 'pause', 'nexttrack', 'previoustrack', 'seekto', 'stop', 'skipad'].forEach(action => {
        safeSetHandler(action as MediaSessionAction, null);
      });
    };
  }, [handleNextSong, handlePreviousSong, handleProgressSeek]);

  const handleAddToQueue = (song: Song) => {
    setSongQueue(prev => [...prev, song]);
    setSnackbarMessage('Added to queue');
    setSnackbarOpen(true);
  };

  const handlePlayNext = (song: Song) => {
    setSongQueue(prev => [song, ...prev]);
    setSnackbarMessage('Will play next');
    setSnackbarOpen(true);
  };

  // Sync audio source when song changes
  useEffect(() => {
    if (!currentSong || !currentSong.downloadUrl) {
      audio.pause();
      audio.currentTime = 0;
      return;
    }

    const trackUrl = currentSong.downloadUrl;
    audio.pause();
    audio.src = trackUrl;
    audio.load();
    setSongProgress(0);
  }, [currentSong, audio]);

  // Handle play/pause state changes
  useEffect(() => {
    if (!currentSong) return;
    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  }, [isPlaying, currentSong, audio]);

  // Update progress as the audio plays
  useEffect(() => {
    const updateProgress = () => {
      setSongProgress(Math.floor(audio.currentTime));
    };

    const handleEnded = () => {
      setSongProgress(0);
      if (repeatMode === 'one') {
        // Repeat current song
        audio.currentTime = 0;
        audio.play();
      } else {
        handleNextSong();
      }
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audio, handleNextSong]);

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
        primaryArtists: joinArtistNames(songDetails.artists?.primary) || '',
        primaryArtistsId: joinArtistIds(songDetails.artists?.primary) || '',
        featuredArtists: joinArtistNames(songDetails.artists?.featured) || '',
        featuredArtistsId: joinArtistIds(songDetails.artists?.featured) || '',
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
      console.warn('Failed to load favourite song', error);
    }
  };

  const renderContent = () => {
    // Show recently played page if activated
    if (showRecentlyPlayed) {
      return (
        <RecentlyPlayedPage
          onBack={handleBackFromRecentlyPlayed}
          onSongSelect={handleSongSelect}
          onAddToQueue={handleAddToQueue}
          onPlayNext={handlePlayNext}
          onShowSnackbar={(msg) => {
            setSnackbarMessage(msg);
            setSnackbarOpen(true);
          }}
        />
      );
    }

    // Show all chart songs page if activated
    if (showAllCharts) {
      return (
        <AllSongsPage
          chartSongs={chartSongs}
          onSongSelect={handleSongSelect}
          onBack={handleBackFromAllCharts}
          onAddToQueue={handleAddToQueue}
          onPlayNext={handlePlayNext}
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
          onAddToQueue={handleAddToQueue}
          onPlayNext={handlePlayNext}
          onShowSnackbar={(msg) => {
            setSnackbarMessage(msg);
            setSnackbarOpen(true);
          }}
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
            onArtistSelect={handleArtistSelect}
            onRecentlyPlayedClick={handleRecentlyPlayedClick}
            onSettingsClick={handleSettingsClick}
            onPlayNext={handlePlayNext}
            onAddToQueue={handleAddToQueue}
            onShowSnackbar={(msg) => {
              setSnackbarMessage(msg);
              setSnackbarOpen(true);
            }}
          />
        );
      case 'explore':
        return (
          <ExplorePage 
            onPlaylistSelect={handlePlaylistSelect}
          />
        );
      case 'search':
        return (
          <SearchPage 
            onSongSelect={handleSongSelect}
            onPlaylistSelect={handlePlaylistSelect}
            onAlbumSelect={handleAlbumSelect}
            onPlayNext={handlePlayNext}
            onAddToQueue={handleAddToQueue}
            onShowSnackbar={(msg) => {
              setSnackbarMessage(msg);
              setSnackbarOpen(true);
            }}
          />
        );
      case 'settings':
        return (
          <SettingsPage 
            isDarkMode={isDarkMode}
            onThemeToggle={handleThemeToggle}
            onNavigateHome={() => setActiveTab('home')}
            hideBottomNavText={hideBottomNavText}
            onBottomNavTextToggle={handleBottomNavTextToggle}
          />
        );
      case 'favourites':
        return (
          <FavouritesPage 
            onSongSelect={handleFavouriteSongSelect}
            onAlbumSelect={handleAlbumSelect}
            onPlaylistSelect={handlePlaylistSelect}
            onArtistSelect={handleArtistSelect}
          />
        );
      default:
        return null;
    }
  };

  return (
    <ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
      <CssBaseline />
      {/* Small offline / fetch failure indicator at bottom */}
      {/* Offline banner moved into BottomNav to keep it visible across all screens */}
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
              px: { xs: 0, sm: (selectedPlaylist || showAllCharts) ? 0 : 2 }
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
                isLoading={isLoadingSong}
                progress={songProgress}
                duration={currentSong.duration}
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
                isPlaying={isPlaying}
                onTogglePlay={() => setIsPlaying(!isPlaying)}
                onNextSong={handleNextSong}
                onPreviousSong={handlePreviousSong}
                onSongSelect={handleSongSelect}
                songQueue={songQueue}
                progress={songProgress}
                onProgressChange={handleProgressSeek}
                repeatMode={repeatMode}
                onRepeatModeChange={setRepeatMode}
                shuffleMode={shuffleMode}
                onShuffleModeChange={setShuffleMode}
                // Song details for info popup
                albumId={currentSong.albumId}
                albumName={currentSong.albumName}
                label={currentSong.label}
                copyright={currentSong.copyright}
                year={currentSong.year}
                language={currentSong.language}
                explicitContent={currentSong.explicitContent}
                source={currentSong.source}
              />
            </>
          )}
          <BottomNav activeTab={activeTab} onTabChange={handleTabChange} showLabels={!hideBottomNavText} />
          <InstallPrompt />
          
          {/* Global Snackbar */}
          <Snackbar
            open={snackbarOpen}
            autoHideDuration={2000}
            onClose={() => setSnackbarOpen(false)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            sx={{ bottom: { xs: 80, sm: 24 } }}
          >
            <Box
              sx={{
                bgcolor: 'background.paper',
                color: 'text.primary',
                px: 3,
                py: 1.5,
                borderRadius: 2,
                boxShadow: 3,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              {snackbarMessage}
            </Box>
          </Snackbar>
        </Box>
      )}
    </ThemeProvider>
  );
}

export default App;

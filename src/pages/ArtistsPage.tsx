import React, { useEffect, useState } from 'react';
import { Box, Container, Typography, Avatar, Skeleton, CircularProgress } from '@mui/material';
import { PlusSquare, Person } from '../icons';
import PageHeader from '../components/PageHeader';
import { getMeta } from '../services/storage';
import { saavnApi } from '../services/saavnApi';

interface ArtistPreview {
  id?: string;
  name?: string;
  image?: string;
}

const ARTIST_AVATAR_SIZE = 120;

type AnyRecord = Record<string, unknown>;

const ArtistsPage: React.FC<{ onBack: () => void; onArtistSelect?: (id?: string, name?: string, image?: string) => void }> = ({ onBack, onArtistSelect }) => {
  const [artists, setArtists] = useState<ArtistPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const load = async () => {
      const cached = await getMeta('recommendedArtists');
      if (Array.isArray(cached) && cached.length > 0) {
        setArtists(cached as ArtistPreview[]);
        setLoading(false);
      }
    };
    load().finally(async () => {
      setLoading(false);
      // If no cached artists, fetch an initial 20
      if ((await getMeta('recommendedArtists')) === null || (Array.isArray(await getMeta('recommendedArtists')) && (await getMeta('recommendedArtists')).length === 0)) {
        try {
          setLoading(true);
          const resp = await saavnApi.fetchNewArtists(0, 20, []);
          const items = Array.isArray(resp?.items) ? resp.items : [];
          if (items.length > 0) {
            setArtists(items as ArtistPreview[]);
            setPage(1);
            setHasMore(items.length >= 20);
          }
        } catch {
          void 0;
        } finally {
          setLoading(false);
        }
      }
    });
    // No initial API call; rely on cached `recommendedArtists` and the load-more tile.
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 14 }}>
      <PageHeader title="All Artists" onBack={onBack} position="fixed" />
      <Container maxWidth="sm" sx={{ px: 2, pt: 2 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 2 }}>
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <Box key={i} sx={{ textAlign: 'center' }}>
                  <Skeleton variant="circular" width={ARTIST_AVATAR_SIZE} height={ARTIST_AVATAR_SIZE} sx={{ mx: 'auto', mb: 1 }} />
                  <Skeleton width="60%" height={18} sx={{ mx: 'auto' }} />
                </Box>
              ))
            : (
              // Render artists plus a load-more tile at the end
              <>
                {artists.map(artist => (
                  <Box key={artist.id ?? artist.name} sx={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => onArtistSelect && onArtistSelect(artist.id, artist.name, artist.image)}>
                    <Avatar src={artist.image || undefined} variant="circular" sx={{ width: ARTIST_AVATAR_SIZE, height: ARTIST_AVATAR_SIZE, mx: 'auto', mb: 1 }}>{!artist.image && <Person sx={{ fontSize: 40, color: 'text.disabled', opacity: 0.6 }} />}</Avatar>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>{artist.name}</Typography>
                  </Box>
                ))}

                {/* Load more tile */}
                {hasMore ? (
                  <Box sx={{ textAlign: 'center', cursor: 'pointer' }} onClick={async () => {
                    setLoadingMore(true);
                    const limit = 20;
                    try {
                      const exclude = artists.map(a => a.id).filter(Boolean) as string[];
                      let currentPage = page;
                      let resp: unknown = null;
                      let items: AnyRecord[] = [];
                      // Try up to 3 pages ahead if API returns only excluded items
                      const maxRetries = 3;
                      let attempts = 0;
                      while (attempts <= maxRetries) {
                        resp = await saavnApi.fetchNewArtists(currentPage, limit, exclude) as unknown;
                        items = Array.isArray((resp as AnyRecord)?.items) ? ((resp as AnyRecord).items as AnyRecord[]) : [];
                        if (process.env.NODE_ENV !== 'production') {
                           
                          console.debug('ArtistsPage.loadMore -> fetched items:', { page: currentPage, fetched: items.length, sample: items[0] });
                        }
                        if (items.length > 0) break;
                        // nothing new on this page, try next
                        currentPage += 1;
                        attempts += 1;
                      }

                      if (items.length > 0) {
                        setArtists(prev => {
                          const ids = new Set(prev.map(p => p.id));
                          const merged = [...prev];
                          for (const m of items) if (!ids.has(m.id)) merged.push(m as ArtistPreview);
                          return merged;
                        });
                        // set next page to one after the page we successfully fetched
                        setPage(currentPage + 1);
                        // Use rawItems length (unfiltered) to determine if more pages exist upstream
                        const upstreamCount = Array.isArray(resp?.rawItems) ? resp.rawItems.length : items.length;
                        setHasMore(upstreamCount >= limit);
                      } else {
                        setHasMore(false);
                      }
                    } catch {
                      void 0;
                    } finally {
                      setLoadingMore(false);
                    }
                  }}>
                    <Avatar variant="circular" sx={{ width: ARTIST_AVATAR_SIZE, height: ARTIST_AVATAR_SIZE, mx: 'auto', mb: 1, bgcolor: 'background.paper', color: 'text.secondary', border: '1px dashed', borderColor: 'divider' }}>
                      {loadingMore ? <CircularProgress size={28} /> : <PlusSquare sx={{ fontSize: 36 }} />}
                    </Avatar>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>Load more</Typography>
                  </Box>
                ) : null}
              </>
            )}
        </Box>
        {/* Bottom load button removed; load-more is now a tile in the grid */}
        <Box sx={{ height: { xs: 88, sm: 72 } }} />
      </Container>
    </Box>
  );
};

export default ArtistsPage;

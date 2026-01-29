export const decodeHtmlEntities = (text: string): string => {
  if (!text) return text;
  try {
    // Use a temporary textarea to decode HTML entities
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  } catch {
    return text;
  }
};

export const joinArtistNames = (artists?: { id?: string; name?: string }[]) =>
  (artists ?? [])
    .map(artist => artist?.name?.trim() ?? '')
    .filter(name => name)
    .join(', ');

export const joinArtistIds = (artists?: { id?: string; name?: string }[]) =>
  (artists ?? [])
    .map(artist => artist?.id?.trim() ?? '')
    .filter(id => id)
    .join(', ');

export const normalizeText = (text: string) =>
  (text || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();

export const normalizeArtist = (name: string) =>
  (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export const similarityScore = (str1: string, str2: string): number => {
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

export const formatCountShort = (n?: number | string): string => {
  if (n === undefined || n === null) return '';
  const num = typeof n === 'string' ? Number(n) : n;
  if (!Number.isFinite(num)) return String(n);
  const abs = Math.abs(num);
  if (abs >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  if (abs >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (abs >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(num);
};

// Returns a best-quality image URL from various shapes used by the API.
// Accepts: string URL, array of {quality,url}, object with url, or nested shapes.
export const getBestImage = (imgField: unknown): string => {
  if (!imgField) return '';
  if (typeof imgField === 'string') return imgField;
  // If it's an array of images
  if (Array.isArray(imgField) && (imgField as unknown[]).length > 0) {
    const arr = imgField as unknown[];
    const prefer = ['500x500', '320x320', '150x150', '50x50'];
    for (const q of prefer) {
      const found = arr.find((it) => {
        const r = it as Record<string, unknown> | null;
        if (!r) return false;
        const quality = r['quality'] as string | undefined;
        const url = r['url'] as string | undefined;
        const link = r['link'] as string | undefined;
        return quality === q || (url && url.includes(q)) || (link && link.includes(q));
      });
      if (found) {
        const f = found as Record<string, unknown>;
        return (f['url'] as string) || (f['link'] as string) || '';
      }
    }
    const first = arr.find((it) => (it as Record<string, unknown>)['url']);
    if (first) {
      const f = first as Record<string, unknown>;
      return (f['url'] as string) || (f['link'] as string) || '';
    }
    const fallback = arr[0] as Record<string, unknown> | string | undefined;
    if (typeof fallback === 'string') return fallback;
    if (fallback) return (fallback['url'] as string) || (fallback['link'] as string) || '';
    return '';
  }
  // If it's an object with url or nested images
  if (typeof imgField === 'object' && imgField !== null) {
    const obj = imgField as Record<string, unknown>;
    if (typeof obj['url'] === 'string') return obj['url'] as string;
    if (typeof obj['link'] === 'string') return obj['link'] as string;
    for (const key of ['images', 'image', 'thumbnail', 'cover']) {
      if (obj[key]) return getBestImage(obj[key]);
    }
  }
  return '';
};

export type FetchOptions = {
    errorMessage?: string;
    headers?: Record<string, string>;
    timeoutMs?: number;
    retries?: number;
    retryDelayMs?: number;
    method?: string;
    body?: unknown;
    parseJson?: boolean;
    signal?: AbortSignal;
  };
  
  function delay(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
  }
  
  export async function fetchJson(url: string, optsOrMessage?: string | FetchOptions) {
    const defaultOpts: FetchOptions = { timeoutMs: 10000, retries: 0, retryDelayMs: 300, parseJson: true };
    const opts: FetchOptions = typeof optsOrMessage === 'string' ? { ...defaultOpts, errorMessage: optsOrMessage } : { ...defaultOpts, ...(optsOrMessage || {}) };
  
    let attempt = 0;
    const maxAttempts = (opts.retries ?? 0) + 1;
  
    while (attempt < maxAttempts) {
      attempt++;
      const controller = new AbortController();
      let timeout: ReturnType<typeof setTimeout> | null = null;
      if (opts.timeoutMs) timeout = setTimeout(() => controller.abort(), opts.timeoutMs);
      try {
        const response = await fetch(url, {
          method: opts.method ?? 'GET',
          headers: opts.headers,
          body: opts.body,
          signal: opts.signal ?? controller.signal,
        });
  
        if (!response.ok) {
          const text = await response.text().catch(() => '');
          const msg = opts.errorMessage ? `${opts.errorMessage} (${response.status})` : `Fetch failed: ${response.status}`;
          const err = new Error(`${msg} ${text ? '- ' + text : ''}`.trim());
          throw err;
        }
  
        if (opts.parseJson === false) {
          // Caller wants raw response
          return response;
        }
  
        const data = await response.json();
        return data;
      } catch (err) {
        // If aborted due to timeout, err.name === 'AbortError'
        if (attempt >= maxAttempts) {
          throw err;
        }
        // Retry after delay
        await delay(opts.retryDelayMs || 300);
      } finally {
        try {
          if (timeout) clearTimeout(timeout);
        } catch {
          // ignore
        }
      }
    }
    throw new Error(opts.errorMessage || 'Fetch failed');
  }
  
  export async function withInflight<T>(map: Map<string, Promise<T>>, key: string, fn: () => Promise<T>) {
    if (map.has(key)) return map.get(key)!;
  
    const promise = (async () => {
      return await fn();
    })();
  
    map.set(key, promise);
    try {
      const res = await promise;
      return res;
    } finally {
      map.delete(key);
    }
  }
  
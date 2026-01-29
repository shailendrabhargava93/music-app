// SoundCharts API Service for Top Songs in India

type AnyRecord = Record<string, unknown>;

const APP_ID = 'TBOY-API_3DE8C120';
const API_KEY = 'c228e42eab8a5997';
const BASE_URL = 'https://customer.api.soundcharts.com/api/v2.14';

import { withInflight, fetchJson } from '../utils/fetch';

export interface SoundChartsSong {
  uuid: string;
  name: string;
  creditName: string;
  imageUrl: string;
}

export interface SoundChartsItem {
  song: SoundChartsSong;
  position: number;
  positionEvolution: number;
  metric: number;
  entryState: string;
  entryDate: string;
  rankDate: string;
  oldPosition: number;
  timeOnChart: number;
  timeOnChartUnit: string;
}

export interface SoundChartsResponse {
  items: SoundChartsItem[];
  page: {
    offset: number;
    limit: number;
    total: number;
    next: string | null;
    previous: string | null;
  };
}

export const soundChartsApi = {
  /**
   * Fetch top songs for India
   * @param offset - Starting position (0-based)
   * @param limit - Number of songs to fetch (default: 10)
   */
  getTopSongs: async (offset: number = 0, limit: number = 10): Promise<SoundChartsResponse> => {
    try {
      // Use a simple global in-flight map to dedupe concurrent SoundCharts requests
      const globalAny = globalThis as unknown as AnyRecord;
      if (!globalAny.__soundcharts_inflight) globalAny.__soundcharts_inflight = new Map<string, Promise<unknown>>();
      const inflight: Map<string, Promise<unknown>> = globalAny.__soundcharts_inflight as Map<string, Promise<unknown>>;
      const key = `${offset}:${limit}`;

      return await withInflight(inflight, key, async () => {
        const url = `${BASE_URL}/chart/song/top-songs-29/ranking/latest?offset=${offset}&limit=${limit}`;
        const data = await fetchJson(url, {
          errorMessage: 'Failed to fetch SoundCharts top songs',
          headers: { 'x-app-id': APP_ID, 'x-api-key': API_KEY },
          timeoutMs: 8000,
          retries: 1,
          retryDelayMs: 500,
        });
        return data as SoundChartsResponse;
      });
    } catch (error) {
      console.error('Error fetching top songs from SoundCharts:', error);
      throw error;
    }
  },
};


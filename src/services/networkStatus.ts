type Listener = (state: { lastFetchFailed: boolean; message?: string | null }) => void;

let lastFetchFailed = false;
let lastFetchMessage: string | null = null;
const listeners = new Set<Listener>();

export const setLastFetchFailed = (val: boolean, message?: string | null) => {
  lastFetchFailed = val;
  lastFetchMessage = message ?? null;
  for (const l of listeners) l({ lastFetchFailed, message: lastFetchMessage });
};

export const getLastFetchFailed = () => ({ lastFetchFailed, message: lastFetchMessage });

export const subscribeNetworkStatus = (l: Listener) => {
  listeners.add(l);
  // Notify immediately with current state
  l({ lastFetchFailed, message: lastFetchMessage });
  return () => { listeners.delete(l); };
};

export default {
  setLastFetchFailed,
  getLastFetchFailed,
  subscribeNetworkStatus,
};

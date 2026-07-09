import { useState } from 'react';

// Tirer pour rafraîchir : gère l'état `refreshing` autour d'un ou plusieurs
// refetch. À brancher sur un `<RefreshControl>` (teinte jaune de marque).
export function usePullRefresh(refetchers: Array<() => Promise<unknown>>) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all(refetchers.map((r) => r().catch(() => undefined)));
    } finally {
      setRefreshing(false);
    }
  };
  return { refreshing, onRefresh };
}

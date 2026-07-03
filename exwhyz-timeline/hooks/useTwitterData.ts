'use client';

import { useState, useEffect } from 'react';
import { getTweetsData } from '@/lib/data-provider';
import { getCachedTweets, getLastFetchedAt, isAlreadyFetchedToday } from '@/lib/cache';

export function useTwitterData() {
  const [tweets, setTweets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitError, setRateLimitError] = useState<boolean>(false);
  const [dailyLimitError, setDailyLimitError] = useState<boolean>(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);

  const loadTweets = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    setRateLimitError(false);

    try {
      const data = await getTweetsData(forceRefresh);
      setTweets(data);
      setLastFetchedAt(getLastFetchedAt());
    } catch (err: any) {
      if (err?.rateLimitError) {
        // レート制限エラー: キャッシュ済みデータは維持しつつ警告フラグをセット
        setRateLimitError(true);
        // キャッシュがあれば表示を維持する
        const cached = getCachedTweets();
        if (cached) setTweets(cached);
      } else {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTweets();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = () => {
    if (isAlreadyFetchedToday()) {
      // 本日更新済みの場合はフラグをセットしてAPIを呼ばない
      setDailyLimitError(true);
      return;
    }
    setDailyLimitError(false);
    loadTweets(true);
  };

  return { tweets, loading, error, rateLimitError, dailyLimitError, lastFetchedAt, refresh };
}

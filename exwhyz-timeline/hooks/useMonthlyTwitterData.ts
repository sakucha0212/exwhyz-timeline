'use client';

import { useState, useEffect, useCallback } from 'react';
import { getMonthlyTweetsData } from '@/lib/data-provider-monthly';
import { getLastFetchedAt, type DayData } from '@/lib/idb-cache';

export function useMonthlyTwitterData(yearMonth: string) {
  const [tweets, setTweets] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitError, setRateLimitError] = useState<boolean>(false);
  const [lastFetchedAt, setLastFetchedAtState] = useState<string | null>(null);

  const loadTweets = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    setRateLimitError(false);

    try {
      const data = await getMonthlyTweetsData(yearMonth, forceRefresh);
      setTweets(data);
      const fetchedAt = await getLastFetchedAt();
      setLastFetchedAtState(fetchedAt);
    } catch (err: any) {
      if (err?.rateLimitError) {
        setRateLimitError(true);
      } else {
        setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
      }
    } finally {
      setLoading(false);
    }
  }, [yearMonth]);

  // yearMonth が変わるたびにデータを取得
  useEffect(() => {
    loadTweets();
  }, [loadTweets]);

  // 差分更新（当月のみ有効）
  const refresh = useCallback(() => {
    loadTweets(true);
  }, [loadTweets]);

  return { tweets, loading, error, rateLimitError, lastFetchedAt, refresh };
}

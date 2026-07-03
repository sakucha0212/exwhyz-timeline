const CACHE_KEY = 'exwhyz_timeline_tweets';
const CACHE_LAST_FETCHED_KEY = 'exwhyz_timeline_tweets_last_fetched';

export function getCachedTweets() {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    return JSON.parse(cached);
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
}

export function setCachedTweets(tweets: any[]) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(tweets));
  } catch (error) {
    console.error('Error writing cache:', error);
  }
}

export function clearCache() {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(CACHE_LAST_FETCHED_KEY);
}

/**
 * 最終取得日時を保存する（差分更新で使用）
 * @param isoString ISO 8601形式の日時文字列
 */
export function setLastFetchedAt(isoString: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CACHE_LAST_FETCHED_KEY, isoString);
}

/**
 * 最終取得日時を取得する（差分更新で使用）
 * @returns ISO 8601形式の日時文字列、または null
 */
export function getLastFetchedAt(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CACHE_LAST_FETCHED_KEY);
}

/**
 * 本日すでに更新済みかどうかを判定する
 * @returns true: 本日更新済み（更新不可）/ false: 未更新（更新可能）
 */
export function isAlreadyFetchedToday(): boolean {
  const lastFetchedAt = getLastFetchedAt();
  if (!lastFetchedAt) return false;

  const lastDate = new Date(lastFetchedAt);
  const today = new Date();

  return (
    lastDate.getFullYear() === today.getFullYear() &&
    lastDate.getMonth()    === today.getMonth()    &&
    lastDate.getDate()     === today.getDate()
  );
}

/**
 * 既存キャッシュに差分ツイートをマージして保存する。
 * tweetId の重複は除去する。
 * @param newTweets 新たに取得したツイート配列（formatTweetsForTimeline 適用後の形式）
 */
export function mergeCachedTweets(newTweets: any[]): void {
  if (typeof window === 'undefined') return;

  try {
    const existing: any[] = getCachedTweets() ?? [];

    // 既存キャッシュの tweetId を Set で管理
    const existingIds = new Set<string>();
    existing.forEach((day: any) => {
      (day.items ?? []).forEach((item: any) => {
        if (item.tweetId) existingIds.add(item.tweetId);
      });
    });

    // 新規ツイートを日付ごとにマージ
    const mergedMap: Record<string, any[]> = {};
    existing.forEach((day: any) => {
      mergedMap[day.date] = [...(day.items ?? [])];
    });

    newTweets.forEach((day: any) => {
      const newItems = (day.items ?? []).filter(
        (item: any) => !existingIds.has(item.tweetId)
      );
      if (newItems.length === 0) return;

      if (mergedMap[day.date]) {
        mergedMap[day.date] = [...mergedMap[day.date], ...newItems];
      } else {
        mergedMap[day.date] = newItems;
      }
    });

    const merged = Object.entries(mergedMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, items]) => ({ date, items }));

    setCachedTweets(merged);
  } catch (error) {
    console.error('[cache] mergeCachedTweets エラー:', error);
  }
}

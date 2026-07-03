/**
 * IndexedDB を使った月単位ツイートキャッシュ管理
 *
 * DB名:    exwhyz_timeline_cache
 * Store:   monthly_tweets  (keyPath: "yearMonth", 例: "2024-06")
 * Store:   metadata        (keyPath: "key")
 */

const DB_NAME = 'exwhyz_timeline_cache';
const DB_VERSION = 1;
const STORE_MONTHLY = 'monthly_tweets';
const STORE_META = 'metadata';

export interface DayData {
  date: string;
  items: { tweetId: string; note?: string }[];
}

export interface MonthlyCache {
  yearMonth: string;
  tweets: DayData[];
  fetchedAt: string;
  isCurrent: boolean;
  latestTweetId: string | null;
}

// -----------------------------------------------------------------------
// DB オープン
// -----------------------------------------------------------------------

let _db: IDBDatabase | null = null;

export function openDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB は SSR 環境では使用できません'));
  }

  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_MONTHLY)) {
        db.createObjectStore(STORE_MONTHLY, { keyPath: 'yearMonth' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };

    req.onsuccess = (event) => {
      _db = (event.target as IDBOpenDBRequest).result;
      resolve(_db);
    };

    req.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

// -----------------------------------------------------------------------
// 月単位キャッシュ: 取得
// -----------------------------------------------------------------------

export async function getMonthlyCache(yearMonth: string): Promise<MonthlyCache | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_MONTHLY, 'readonly');
      const req = tx.objectStore(STORE_MONTHLY).get(yearMonth);
      req.onsuccess = () => resolve((req.result as MonthlyCache) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('[idb-cache] getMonthlyCache エラー:', err);
    return null;
  }
}

// -----------------------------------------------------------------------
// 月単位キャッシュ: 保存
// -----------------------------------------------------------------------

export async function setMonthlyCache(
  yearMonth: string,
  tweets: DayData[],
  isCurrent: boolean
): Promise<void> {
  try {
    const db = await openDB();
    const latestTweetId = extractLatestTweetId(tweets);
    const record: MonthlyCache = {
      yearMonth,
      tweets,
      fetchedAt: new Date().toISOString(),
      isCurrent,
      latestTweetId,
    };
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_MONTHLY, 'readwrite');
      const req = tx.objectStore(STORE_MONTHLY).put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('[idb-cache] setMonthlyCache エラー:', err);
  }
}

// -----------------------------------------------------------------------
// 月単位キャッシュ: 差分マージ（当月更新用）
// -----------------------------------------------------------------------

export async function mergeMonthlyCache(
  yearMonth: string,
  newTweets: DayData[]
): Promise<void> {
  try {
    const db = await openDB();
    const existing = await getMonthlyCache(yearMonth);
    const existingTweets: DayData[] = existing?.tweets ?? [];

    // 既存の tweetId を Set で管理
    const existingIds = new Set<string>();
    existingTweets.forEach((day) => {
      (day.items ?? []).forEach((item) => {
        if (item.tweetId) existingIds.add(item.tweetId);
      });
    });

    // 日付ごとにマージ
    const mergedMap: Record<string, DayData['items']> = {};
    existingTweets.forEach((day) => {
      mergedMap[day.date] = [...(day.items ?? [])];
    });

    newTweets.forEach((day) => {
      const newItems = (day.items ?? []).filter(
        (item) => !existingIds.has(item.tweetId)
      );
      if (newItems.length === 0) return;

      if (mergedMap[day.date]) {
        mergedMap[day.date] = [...mergedMap[day.date], ...newItems];
      } else {
        mergedMap[day.date] = newItems;
      }
    });

    const merged: DayData[] = Object.entries(mergedMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, items]) => ({ date, items }));

    const latestTweetId = extractLatestTweetId(merged);
    const record: MonthlyCache = {
      yearMonth,
      tweets: merged,
      fetchedAt: new Date().toISOString(),
      isCurrent: true,
      latestTweetId,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_MONTHLY, 'readwrite');
      const req = tx.objectStore(STORE_MONTHLY).put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('[idb-cache] mergeMonthlyCache エラー:', err);
  }
}

// -----------------------------------------------------------------------
// 最新ツイートID の取得（差分更新の since_id 用）
// -----------------------------------------------------------------------

export async function getLatestTweetId(yearMonth: string): Promise<string | null> {
  const cache = await getMonthlyCache(yearMonth);
  return cache?.latestTweetId ?? null;
}

// -----------------------------------------------------------------------
// 最終取得日時（metadata ストア）
// -----------------------------------------------------------------------

export async function getLastFetchedAt(): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_META, 'readonly');
      const req = tx.objectStore(STORE_META).get('lastFetchedAt');
      req.onsuccess = () => resolve(req.result?.value ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('[idb-cache] getLastFetchedAt エラー:', err);
    return null;
  }
}

export async function setLastFetchedAt(isoString: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_META, 'readwrite');
      const req = tx.objectStore(STORE_META).put({ key: 'lastFetchedAt', value: isoString });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('[idb-cache] setLastFetchedAt エラー:', err);
  }
}

// -----------------------------------------------------------------------
// ユーティリティ
// -----------------------------------------------------------------------

/**
 * DayData[] の中から最大（最新）の tweetId を返す。
 * Twitter の tweetId は Snowflake ID（数値が大きいほど新しい）。
 */
function extractLatestTweetId(tweets: DayData[]): string | null {
  let latest: bigint | null = null;
  let latestId: string | null = null;

  tweets.forEach((day) => {
    (day.items ?? []).forEach((item) => {
      if (!item.tweetId) return;
      try {
        const id = BigInt(item.tweetId);
        if (latest === null || id > latest) {
          latest = id;
          latestId = item.tweetId;
        }
      } catch {
        // BigInt 変換失敗は無視
      }
    });
  });

  return latestId;
}

/**
 * 指定した yearMonth ("YYYY-MM") が当月かどうかを判定する
 */
export function isCurrentMonth(yearMonth: string): boolean {
  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return yearMonth === currentYM;
}

/**
 * 指定した yearMonth ("YYYY-MM") が未来月かどうかを判定する
 */
export function isFutureMonth(yearMonth: string): boolean {
  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return yearMonth > currentYM;
}

/**
 * 現在の yearMonth ("YYYY-MM") を返す
 */
export function getCurrentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

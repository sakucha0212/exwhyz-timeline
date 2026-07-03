/**
 * 月単位のツイートデータ取得ロジック
 *
 * - 過去月: キャッシュがあればキャッシュから返す。なければ API 全件取得してキャッシュ保存。
 * - 当月:   キャッシュがあればキャッシュから返す。なければ API 全件取得してキャッシュ保存。
 *           forceRefresh=true の場合は差分取得（since_id）してキャッシュにマージ。
 * - 未来月: 呼び出し元（UI）で遷移不可とするため、ここでは空配列を返す。
 *
 * ※ EXWHYZ_SEARCH_QUERY の検索条件はすべてのAPIリクエストで維持される。
 */

import {
  getMonthlyCache,
  setMonthlyCache,
  mergeMonthlyCache,
  getLatestTweetId,
  setLastFetchedAt,
  isCurrentMonth,
  isFutureMonth,
  type DayData,
} from './idb-cache';
import mockTweets from '@/data/user-tweets.json';

// -----------------------------------------------------------------------
// 月の開始・終了日時を計算するユーティリティ
// -----------------------------------------------------------------------

function getMonthStartTime(yearMonth: string): string {
  return `${yearMonth}-01T00:00:00Z`;
}

function getMonthEndTime(yearMonth: string): string {
  // 翌月1日の直前 = 当月末日 23:59:59
  const [year, month] = yearMonth.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate(); // month は 1-indexed なので month+1-1 = month
  return `${yearMonth}-${String(lastDay).padStart(2, '0')}T23:59:59Z`;
}

// -----------------------------------------------------------------------
// メイン: 月単位ツイートデータ取得
// -----------------------------------------------------------------------

export async function getMonthlyTweetsData(
  yearMonth: string,
  forceRefresh = false
): Promise<DayData[]> {
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

  // ── モックモード ──────────────────────────────────────────────────────
  if (useMock) {
    return filterMockByMonth(yearMonth);
  }

  // ── 未来月: データなし ────────────────────────────────────────────────
  if (isFutureMonth(yearMonth)) {
    return [];
  }

  const isCurrent = isCurrentMonth(yearMonth);

  // ── 過去月 / 当月（通常表示）: キャッシュ優先 ─────────────────────────
  if (!forceRefresh) {
    const cached = await getMonthlyCache(yearMonth);
    if (cached) {
      console.log(`[data-provider-monthly] キャッシュヒット: ${yearMonth}`);
      return cached.tweets;
    }
  }

  // ── 当月 差分更新（forceRefresh=true）────────────────────────────────
  if (isCurrent && forceRefresh) {
    return await fetchAndMergeCurrentMonth(yearMonth);
  }

  // ── 初回取得（過去月 or 当月のキャッシュなし）────────────────────────
  return await fetchFullMonth(yearMonth, isCurrent);
}

// -----------------------------------------------------------------------
// 初回全件取得
// -----------------------------------------------------------------------

async function fetchFullMonth(yearMonth: string, isCurrent: boolean): Promise<DayData[]> {
  const startTime = getMonthStartTime(yearMonth);
  // 過去月は月末まで、当月は現在時刻の30秒前まで
  const endTime = isCurrent
    ? new Date(Date.now() - 30 * 1000).toISOString()
    : getMonthEndTime(yearMonth);

  console.log(`[data-provider-monthly] 全件取得: ${yearMonth} (${startTime} 〜 ${endTime})`);

  const url = `/api/tweets/fetch?startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`;
  const response = await fetch(url);
  const data = await response.json();

  if (response.status === 429 && data.rateLimitError) {
    const err = new Error(data.error ?? '現在ポストを更新できません。');
    (err as any).rateLimitError = true;
    throw err;
  }

  if (!response.ok) {
    throw new Error(`API エラー: ${response.status}`);
  }

  const tweets: DayData[] = data.tweets ?? [];

  // キャッシュ保存
  await setMonthlyCache(yearMonth, tweets, isCurrent);
  await setLastFetchedAt(new Date().toISOString());

  return tweets;
}

// -----------------------------------------------------------------------
// 当月 差分更新（since_id を使って新着のみ取得してマージ）
// -----------------------------------------------------------------------

async function fetchAndMergeCurrentMonth(yearMonth: string): Promise<DayData[]> {
  const sinceId = await getLatestTweetId(yearMonth);
  const endTime = new Date(Date.now() - 30 * 1000).toISOString();

  console.log(`[data-provider-monthly] 差分更新: ${yearMonth} (sinceId: ${sinceId ?? 'なし'})`);

  // sinceId がない場合は全件取得にフォールバック
  if (!sinceId) {
    return await fetchFullMonth(yearMonth, true);
  }

  const url = `/api/tweets/fetch?sinceId=${encodeURIComponent(sinceId)}&endTime=${encodeURIComponent(endTime)}`;
  const response = await fetch(url);
  const data = await response.json();

  if (response.status === 429 && data.rateLimitError) {
    const err = new Error(data.error ?? '現在ポストを更新できません。');
    (err as any).rateLimitError = true;
    throw err;
  }

  if (!response.ok) {
    throw new Error(`API エラー: ${response.status}`);
  }

  const newTweets: DayData[] = data.tweets ?? [];

  if (newTweets.length > 0) {
    // 差分をキャッシュにマージ
    await mergeMonthlyCache(yearMonth, newTweets);
    console.log(`[data-provider-monthly] 差分マージ完了: ${newTweets.length}件追加`);
  } else {
    console.log(`[data-provider-monthly] 差分なし: 新着ツイートはありません`);
  }

  await setLastFetchedAt(new Date().toISOString());

  // マージ後のキャッシュを返す
  const updated = await getMonthlyCache(yearMonth);
  return updated?.tweets ?? [];
}

// -----------------------------------------------------------------------
// モックデータを月でフィルタリング
// -----------------------------------------------------------------------

function filterMockByMonth(yearMonth: string): DayData[] {
  return (mockTweets.tweets as DayData[]).filter((day) =>
    day.date.startsWith(yearMonth)
  );
}

import {
  getCachedTweets,
  setCachedTweets,
  getLastFetchedAt,
  setLastFetchedAt,
  mergeCachedTweets,
} from './cache';
import mockTweets from '@/data/user-tweets.json';

export async function getTweetsData(forceRefresh = false) {
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

  // モックモード: 常にモックデータを返す
  if (useMock) {
    return mockTweets.tweets;
  }

  // キャッシュチェック（強制更新でない場合）
  if (!forceRefresh) {
    const cached = getCachedTweets();
    if (cached) {
      return cached;
    }
  }

  // X APIから取得
  try {
    // X API の制約: end_time は現在時刻より少なくとも10秒以上前である必要がある
    const endTime = new Date(Date.now() - 30 * 1000).toISOString();

    // 差分更新: 更新ボタン押下時は最終取得日時以降のみ取得
    // 初回取得: キャッシュなしの場合は ARCHIVE_START_DATE から全件取得
    const lastFetchedAt = forceRefresh ? getLastFetchedAt() : null;
    const startTimeParam = lastFetchedAt ?? '';

    const url = `/api/tweets/fetch?startTime=${encodeURIComponent(startTimeParam)}&endTime=${encodeURIComponent(endTime)}`;
    const response = await fetch(url);
    const data = await response.json();

    // レート制限エラーの検出（HTTP 429）
    if (response.status === 429 && data.rateLimitError) {
      const err = new Error(data.error ?? '現在ポストを更新できません。');
      (err as any).rateLimitError = true;
      throw err;
    }

    if (!response.ok) {
      throw new Error(`API エラー: ${response.status}`);
    }

    const tweets = data.tweets ?? [];

    if (forceRefresh && lastFetchedAt) {
      // 差分マージ: 既存キャッシュに追記
      mergeCachedTweets(tweets);
    } else {
      // 初回全件保存
      setCachedTweets(tweets);
    }

    // 最終取得日時を更新
    setLastFetchedAt(endTime);

    return getCachedTweets() ?? tweets;
  } catch (error) {
    console.error('[data-provider] getTweetsData エラー:', error);

    // レート制限エラーは呼び出し元（useTwitterData）に伝播させる
    if ((error as any).rateLimitError) {
      throw error;
    }

    // その他のエラー時はキャッシュを返す。キャッシュもなければ空配列を返す（モックは返さない）
    return getCachedTweets() || [];
  }
}

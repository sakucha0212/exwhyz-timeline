import { TwitterApi } from 'twitter-api-v2';

/**
 * ExWHYZ関連ポストの検索クエリ
 * - グループ名・メンバー名（英語・カタカナ・ひらがな）のOR条件
 * - リツイート・リプライを除外
 */
export const EXWHYZ_SEARCH_QUERY =
  '(ExWHYZ OR WHYZ OR NATSLIVE OR mikina OR yu-ki OR maho OR mayu OR now OR midoriko ' +
  'OR イクスワイズ OR イクス OR ミキナ OR ユーキ OR マホ OR マユ OR ナウ OR ミドリコ OR ドリ ' +
  'OR みきな OR まほ OR ゆーき OR まゆ OR なう OR みどりこ OR どり OR ちぇきな ' +
  'OR EMPiRE OR "俺とお前で音源チェック") ' +
  '-is:retweet -is:reply';

/**
 * アーカイブ検索の開始日時（ExWHYZ活動開始月）
 * 環境変数 TWITTER_ARCHIVE_START_DATE で上書き可能
 */
export const ARCHIVE_START_DATE =
  process.env.TWITTER_ARCHIVE_START_DATE ?? '2022-06-01T00:00:00Z';

/**
 * /2/tweets/search/all を使ってログインユーザーの ExWHYZ 関連ツイートを全件取得する。
 * 全 API 呼び出しを Bearer Token（アプリ認証）で統一する。
 * ページネーションを自動処理する。
 *
 * @param userId       ログインユーザーの X ユーザーID
 * @param bearerToken  X API Bearer Token（ユーザー名取得・searchAll 両方に使用）
 * @param startTime    取得開始日時（ISO 8601形式、省略時は ARCHIVE_START_DATE を使用）
 * @param endTime      取得終了日時（ISO 8601形式、省略時は現在時刻の30秒前）
 * @param sinceId      差分更新用: このツイートID以降のツイートのみ取得（省略時は全件取得）
 * @returns            取得したツイートの配列
 */
export async function fetchUserArchiveTweets(
  userId: string,
  bearerToken: string,
  startTime?: string,
  endTime?: string,
  sinceId?: string
): Promise<any[]> {
  const start = startTime ?? ARCHIVE_START_DATE;
  // X API の制約: end_time は現在時刻より少なくとも10秒以上前である必要がある
  const end   = endTime   ?? new Date(Date.now() - 30 * 1000).toISOString();

  const allTweets: any[] = [];

  // Bearer Token で TwitterApi を初期化（全 API 呼び出しに使用）
  const client = new TwitterApi(bearerToken);

  try {
    // Bearer Token でユーザー名（username）を取得
    console.log(`[twitter-api] ユーザー名取得開始 (userId: ${userId})`);
    const userResponse = await client.v2.user(userId, { 'user.fields': 'username' });
    const username = userResponse.data.username;
    console.log(`[twitter-api] ユーザー名: @${username}`);

    // from:username + EXWHYZ_SEARCH_QUERY を組み合わせたクエリ
    // → ログインユーザーの ExWHYZ 関連ツイートのみを API 側でフィルタリング
    const query = `from:${username} ${EXWHYZ_SEARCH_QUERY}`;
    console.log(`[twitter-api] searchAll 開始 (start: ${start}, end: ${end})`);

    // Bearer Token で /2/tweets/search/all を呼び出し（ページネーション自動処理）
    const paginator = await client.v2.searchAll(query, {
      start_time:     start,
      end_time:       end,
      ...(sinceId ? { since_id: sinceId } : {}),  // 差分更新: since_id が指定された場合のみ追加
      max_results:    500,          // 1リクエストあたり最大500件
      'tweet.fields': 'created_at,text,attachments,author_id',
      'media.fields': 'url,preview_image_url',
      expansions:     'attachments.media_keys,author_id',
      'user.fields':  'username,name,profile_image_url',
    });

    // for await...of でイテレートすると TweetV2 オブジェクトが1件ずつ返される
    for await (const tweet of paginator) {
      allTweets.push(tweet);
    }
    console.log(`[twitter-api] 取得済み: ${allTweets.length}件`);

    return allTweets;
  } catch (error) {
    console.error('[twitter-api] fetchUserArchiveTweets エラー:', error);
    throw error;
  }
}

/**
 * 取得したツイート配列を日付ごとにグループ化し、timeline.json互換の形式に変換する。
 */
export function formatTweetsForTimeline(tweets: any[]) {
  // ツイートを日付ごとにグループ化
  const groupedByDate: Record<string, any[]> = {};

  tweets.forEach((tweet) => {
    // JST（UTC+9）基準で日付を計算する
    const d = new Date(tweet.created_at);
    const jstDate = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    const date = jstDate.toISOString().split('T')[0];
    if (!groupedByDate[date]) {
      groupedByDate[date] = [];
    }
    groupedByDate[date].push({
      tweetId: tweet.id,
      note: '',
    });
  });

  // 日付昇順でソートして timeline.json と同じ形式に変換
  return Object.entries(groupedByDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({ date, items }));
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fetchUserArchiveTweets, formatTweetsForTimeline } from '@/lib/twitter-api';

export async function GET(request: NextRequest) {
  // セッションから userId を取得（OAuth2 セッション）
  const session = await getServerSession(authOptions);

  if (!session?.userId) {
    return NextResponse.json(
      { error: '認証が必要です。ログインしてください。' },
      { status: 401 }
    );
  }

  // Bearer Token を取得（全 API 呼び出し用）
  const bearerToken = process.env.TWITTER_API_BEARER_TOKEN;
  if (!bearerToken) {
    return NextResponse.json(
      { error: 'TWITTER_API_BEARER_TOKEN が設定されていません' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  // 空文字の場合は undefined として扱い、ARCHIVE_START_DATE をデフォルトで使用する
  const startTime = searchParams.get('startTime') || undefined;
  const endTime   = searchParams.get('endTime')   || undefined;
  const sinceId   = searchParams.get('sinceId')   || undefined;  // 差分更新用

  try {
    // /2/tweets/search/all でログインユーザーの ExWHYZ 関連ツイートを全件取得
    // 全 API 呼び出しを Bearer Token で統一
    const rawTweets = await fetchUserArchiveTweets(
      session.userId,   // ログインユーザーの X ユーザーID
      bearerToken,      // Bearer Token（全 API 呼び出し用）
      startTime,
      endTime,
      sinceId           // 差分更新用 since_id
    );

    const formattedTweets = formatTweetsForTimeline(rawTweets);

    return NextResponse.json({
      tweets: formattedTweets,
      count:  rawTweets.length,
      meta: {
        userId:    session.userId,
        startTime: startTime ?? 'ARCHIVE_START_DATE（デフォルト）',
        endTime:   endTime   ?? '（現在時刻の30秒前）',
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[/api/tweets/fetch] エラー:', error);

    // X API レート制限エラーの検出
    // twitter-api-v2 は ApiResponseError として throw し、rateLimitError プロパティが true になる
    // 短期レート制限・月次利用量制限超過のいずれも HTTP 429 で返る
    const isRateLimit =
      error?.rateLimitError === true ||
      error?.code === 429 ||
      error?.status === 429;

    if (isRateLimit) {
      return NextResponse.json(
        {
          error: '現在ポストを更新できません。',
          rateLimitError: true,
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error.message ?? '不明なエラーが発生しました' },
      { status: 500 }
    );
  }
}

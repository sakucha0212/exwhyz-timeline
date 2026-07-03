# ExWHYZ-Timeline ユーザー個別ツイート取得 変更要求書（v3.3）

## 📋 変更要件の整理

### v3.3での変更要件

- **取得対象をログインユーザー自身の ExWHYZ 関連ツイートに限定する**: Bearer Token（アプリ認証）による全ユーザー横断検索から、OAuth2 accessToken（ユーザー認証）によるログインユーザーのタイムラインを `EXWHYZ_SEARCH_QUERY` でフィルタリングする方式に変更する

---

## 1. 変更の背景と目的

### 現状の課題（v3.1/v3.2の設計）

**v3.1で設計・実装されている `lib/twitter-api.ts` の実装**:

```typescript
export async function fetchAllArchiveTweets(
  bearerToken: string,   // ← アプリ認証（Bearer Token）
  startTime?: string,
  endTime?: string
): Promise<any[]> {
  const client = new TwitterApi(bearerToken);

  // 全ユーザーの ExWHYZ 関連ツイートを横断検索
  const paginator = await client.v2.searchAll(EXWHYZ_SEARCH_QUERY, {
    start_time: start,
    end_time:   end,
    ...
  });
  ...
}
```

**課題**:

| 課題 | 詳細 |
|------|------|
| 他人のツイートが含まれる | 全ユーザーの ExWHYZ 関連ツイートが取得されるため、ログインユーザー以外のツイートも混入する |
| OAuth 認証が活用されていない | NextAuth.js で取得した `accessToken` と `userId` が `route.ts` → `twitter-api.ts` の流れで全く使われていない |
| Pro プランが必要 | `/2/tweets/search/all` は X API Pro プラン以上が必要。Basic プランでは利用できない |

### 変更の目的

- **ログインユーザー自身の ExWHYZ 関連ツイートのみを表示する**: このアプリの本来の目的である「自分の ExWHYZ 関連の思い出ツイートをタイムラインに重ねて表示する」を実現する
- **OAuth 認証を有効活用する**: NextAuth.js で取得した `accessToken` と `userId` を実際のデータ取得に使用する
- **必要プランを下げる**: `/2/tweets/search/all`（Pro 以上）から `/2/users/:id/tweets`（Basic 以上）に変更することで、より低コストなプランで動作させる
- **ノイズの除去**: ユーザーIDで絞り込んだ上でキーワードフィルターをかけるため、他人のツイートが混入しない

---

## 2. エンドポイント仕様比較

### 変更前（v3.1）

| 項目 | 内容 |
|------|------|
| エンドポイント | `GET /2/tweets/search/all` |
| 認証方式 | Bearer Token（アプリ認証） |
| 取得対象 | 全ユーザーの ExWHYZ 関連ツイート（キーワード検索） |
| 取得上限 | 制限なし（全アーカイブ対象） |
| 必要プラン | **Pro 以上** |

### 変更後（v3.3）

| 項目 | 内容 |
|------|------|
| エンドポイント | `GET /2/users/:id/tweets` |
| 認証方式 | **OAuth2 accessToken（ユーザー認証）** |
| 取得対象 | **ログインユーザー自身のツイートのうち、`EXWHYZ_SEARCH_QUERY` に合致するもの** |
| 取得上限 | 最大3,200件（1リクエストあたり最大100件） |
| 必要プラン | **Basic 以上** |

> ⚠️ **注意**: `/2/users/:id/tweets` の全アーカイブ取得（`start_time` に過去の日時を指定）は **Basic アクセスレベル以上** が必要です。

---

## 3. 認証フローの変更

### 変更前（v3.1）

```
ブラウザ
  └─ /api/tweets/fetch を呼び出し
       └─ route.ts: TWITTER_API_BEARER_TOKEN（環境変数）を使用
            └─ twitter-api.ts: Bearer Token で TwitterApi を初期化
                 └─ /2/tweets/search/all（全ユーザー横断検索）
```

### 変更後（v3.3）

```
ブラウザ（ログイン済み）
  └─ /api/tweets/fetch を呼び出し
       └─ route.ts: getServerSession() でセッションから accessToken と userId を取得
            └─ twitter-api.ts: OAuth2 accessToken で TwitterApi を初期化
                 └─ /2/users/:id/tweets（ログインユーザーのツイートを EXWHYZ_SEARCH_QUERY でフィルタリング）
```

---

## 4. 取得フロー仕様

### 初回取得フロー（全件取得）

```
1. キャッシュチェック
   └─ キャッシュなし → 全件取得フローへ

2. セッションから accessToken と userId を取得
   └─ 未認証の場合は 401 を返す

3. /2/users/:id/tweets を呼び出し
   ├─ userId: ログインユーザーの X ユーザーID
   ├─ query:  EXWHYZ_SEARCH_QUERY（ExWHYZ 関連キーワードフィルター）
   ├─ start_time: 2022-06-01T00:00:00Z（ARCHIVE_START_DATE）
   ├─ end_time:   現在時刻の30秒前
   └─ max_results: 100（1リクエストあたりの最大値）

4. ページネーション処理
   ├─ pagination_token が存在する場合 → 次ページを取得
   ├─ pagination_token がなくなるまで繰り返す
   └─ 全件を配列に集約

5. 取得結果を localStorage にキャッシュ保存

6. タイムライン表示
```

### 2回目以降（キャッシュ利用 or 差分更新）

v3.2 と同様（変更なし）

---

## 5. 変更対象ファイルと変更内容

### 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `lib/twitter-api.ts` | **修正** | `fetchAllArchiveTweets()` を `fetchUserArchiveTweets()` に変更。`searchAll()` → `userTimeline()` に変更（`query` パラメータで `EXWHYZ_SEARCH_QUERY` を指定）。認証を Bearer Token → OAuth2 accessToken に変更。`EXWHYZ_SEARCH_QUERY` は引き続き使用するため残す |
| `app/api/tweets/fetch/route.ts` | **修正** | `getServerSession()` でセッションから `accessToken` と `userId` を取得し、`fetchUserArchiveTweets()` に渡す |

---

## 6. 変更詳細

### 6.1 `lib/twitter-api.ts` の変更

#### 変更前（v3.1/v3.2）

```typescript
import { TwitterApi } from 'twitter-api-v2';

export const EXWHYZ_SEARCH_QUERY = '(ExWHYZ OR mikina OR ...) -is:retweet -is:reply';
export const ARCHIVE_START_DATE = process.env.TWITTER_ARCHIVE_START_DATE ?? '2022-06-01T00:00:00Z';

export async function fetchAllArchiveTweets(
  bearerToken: string,   // ← Bearer Token（アプリ認証）
  startTime?: string,
  endTime?: string
): Promise<any[]> {
  const client = new TwitterApi(bearerToken);

  // 全ユーザーの ExWHYZ 関連ツイートを横断検索
  const paginator = await client.v2.searchAll(EXWHYZ_SEARCH_QUERY, {
    start_time: start,
    end_time:   end,
    max_results: 500,
    ...
  });

  for await (const tweet of paginator) {
    allTweets.push(tweet);
  }
  return allTweets;
}
```

#### 変更後（v3.3）

```typescript
import { TwitterApi } from 'twitter-api-v2';

/**
 * ExWHYZ関連ポストの検索クエリ
 * - グループ名・メンバー名（英語・カタカナ・ひらがな）のOR条件
 * - リツイート・リプライを除外
 * userTimeline の query パラメータとして使用する
 */
export const EXWHYZ_SEARCH_QUERY =
  '(ExWHYZ OR mikina OR yu-ki OR maho OR mayu OR now OR midoriko ' +
  'OR イクスワイズ OR ミキナ OR ユーキ OR マホ OR マユ OR ナウ OR ミドリコ OR ドリ ' +
  'OR みきな OR まほ OR ゆーき OR まほ OR なう OR みどりこ OR どり) ' +
  '-is:retweet -is:reply';

export const ARCHIVE_START_DATE =
  process.env.TWITTER_ARCHIVE_START_DATE ?? '2022-06-01T00:00:00Z';

/**
 * /2/users/:id/tweets を使ってログインユーザーの ExWHYZ 関連ツイートを全件取得する。
 * OAuth2 accessToken で認証し、EXWHYZ_SEARCH_QUERY でフィルタリングする。
 * ページネーションを自動処理する。
 *
 * @param accessToken  OAuth2 ユーザーアクセストークン（NextAuth.js で取得）
 * @param userId       ログインユーザーの X ユーザーID
 * @param startTime    取得開始日時（ISO 8601形式、省略時は ARCHIVE_START_DATE を使用）
 * @param endTime      取得終了日時（ISO 8601形式、省略時は現在時刻の30秒前）
 * @returns            取得したツイートの配列
 */
export async function fetchUserArchiveTweets(
  accessToken: string,   // ← OAuth2 accessToken（ユーザー認証）
  userId: string,        // ← ログインユーザーの X ユーザーID
  startTime?: string,
  endTime?: string
): Promise<any[]> {
  // OAuth2 accessToken で認証
  const client = new TwitterApi(accessToken);

  const start = startTime ?? ARCHIVE_START_DATE;
  // X API の制約: end_time は現在時刻より少なくとも10秒以上前である必要がある
  const end   = endTime   ?? new Date(Date.now() - 30 * 1000).toISOString();

  const allTweets: any[] = [];

  try {
    // /2/users/:id/tweets でログインユーザーのツイートを ExWHYZ 関連キーワードでフィルタリングして全件取得
    const paginator = await client.v2.userTimeline(userId, {
      query:          EXWHYZ_SEARCH_QUERY,  // ExWHYZ 関連キーワードフィルター
      start_time:     start,
      end_time:       end,
      max_results:    100,          // userTimeline は最大100件/リクエスト
      'tweet.fields': 'created_at,text,attachments,author_id',
      'media.fields': 'url,preview_image_url',
      expansions:     'attachments.media_keys',
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
  const groupedByDate: Record<string, any[]> = {};

  tweets.forEach((tweet) => {
    const date = new Date(tweet.created_at).toISOString().split('T')[0];
    if (!groupedByDate[date]) {
      groupedByDate[date] = [];
    }
    groupedByDate[date].push({
      tweetId: tweet.id,
      note: '',
    });
  });

  return Object.entries(groupedByDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({ date, items }));
}
```

---

### 6.2 `app/api/tweets/fetch/route.ts` の変更

#### 変更前（v3.1/v3.2）

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { fetchAllArchiveTweets, formatTweetsForTimeline } from '@/lib/twitter-api';

export async function GET(request: NextRequest) {
  const bearerToken = process.env.TWITTER_API_BEARER_TOKEN;

  if (!bearerToken) {
    return NextResponse.json(
      { error: 'TWITTER_API_BEARER_TOKEN が設定されていません' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const startTime = searchParams.get('startTime') || undefined;
  const endTime   = searchParams.get('endTime')   || undefined;

  try {
    const rawTweets = await fetchAllArchiveTweets(
      bearerToken,   // ← Bearer Token
      startTime,
      endTime
    );
    ...
  }
}
```

#### 変更後（v3.3）

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fetchUserArchiveTweets, formatTweetsForTimeline } from '@/lib/twitter-api';

export async function GET(request: NextRequest) {
  // セッションから accessToken と userId を取得
  const session = await getServerSession(authOptions);

  if (!session?.accessToken || !session?.userId) {
    return NextResponse.json(
      { error: '認証が必要です。ログインしてください。' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const startTime = searchParams.get('startTime') || undefined;
  const endTime   = searchParams.get('endTime')   || undefined;

  try {
    // /2/users/:id/tweets でログインユーザーの ExWHYZ 関連ツイートを全件取得
    const rawTweets = await fetchUserArchiveTweets(
      session.accessToken,   // ← OAuth2 accessToken
      session.userId,        // ← ログインユーザーの X ユーザーID
      startTime,
      endTime
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
    return NextResponse.json(
      { error: error.message ?? '不明なエラーが発生しました' },
      { status: 500 }
    );
  }
}
```

---

## 7. データフロー（v3.3 更新版）

```
1. 初回アクセス（キャッシュなし）
   ├─ キャッシュチェック → なし
   ├─ /api/tweets/fetch を呼び出し
   │   ├─ getServerSession() で accessToken と userId を取得
   │   └─ /2/users/:id/tweets でページネーション全件取得
   │       userId: ログインユーザーの X ユーザーID
   │       query:  EXWHYZ_SEARCH_QUERY（ExWHYZ 関連キーワードフィルター）
   │       start_time: 2022-06-01T00:00:00Z
   │       end_time:   現在時刻の30秒前
   ├─ 取得結果を localStorage に全件保存
   ├─ last_fetched_at を現在時刻で保存
   └─ タイムライン表示

2. 2回目以降のアクセス（キャッシュあり）
   ├─ キャッシュチェック → あり
   └─ キャッシュから即表示（APIコール不要）

3. 更新ボタン押下（差分更新）
   ├─ last_fetched_at を取得
   ├─ /api/tweets/fetch を呼び出し（startTime = last_fetched_at）
   │   └─ 最終取得以降の差分のみ取得
   ├─ 差分を既存キャッシュにマージ（重複除去）
   ├─ last_fetched_at を現在時刻で更新
   └─ タイムライン再描画
```

---

## 8. Rate Limit への対応

### `/2/users/:id/tweets` の Rate Limit

| プラン | リクエスト数 |
|--------|------------|
| Basic  | 5回/15分（ユーザー認証） |
| Pro    | 900回/15分 |

### 対応策

| 課題 | 対策 |
|------|------|
| 初回取得に時間がかかる（ページネーション多数） | ローディング画面を表示し、バックグラウンドで取得 |
| Rate Limit 到達（429） | エラーメッセージを表示し、ユーザーに待機を促す |
| 月間ツイート数の超過 | localStorage キャッシュを活用して API 呼び出しを最小限に抑える |

---

## 9. 後方互換性

| 項目 | 互換性 | 備考 |
|------|--------|------|
| `EXWHYZ_SEARCH_QUERY` 定数 | ✅ 維持 | `userTimeline` の `query` パラメータとして引き続き使用 |
| `formatTweetsForTimeline` の戻り値 | ✅ 維持 | 既存の timeline.json 形式と同一 |
| キャッシュキー (`exwhyz_timeline_tweets`) | ✅ 維持 | 既存のlocalStorageデータはそのまま利用可能 |
| モックモード (`NEXT_PUBLIC_USE_MOCK=true`) | ✅ 維持 | キャッシュロジックを通らないため影響なし |
| `lib/data-provider.ts` | ✅ 変更なし | `/api/tweets/fetch` を呼ぶだけなので影響なし |
| `hooks/useTwitterData.ts` | ✅ 変更なし | `getTweetsData()` を呼ぶだけなので影響なし |
| `TWITTER_API_BEARER_TOKEN` 環境変数 | ⚠️ 不要になる | OAuth2 accessToken を使用するため不要。ただし削除は任意 |

---

## 10. 実装フェーズ案

### フェーズ1: `lib/twitter-api.ts` の修正
- [ ] `fetchAllArchiveTweets()` を `fetchUserArchiveTweets()` に変更
- [ ] `searchAll()` → `userTimeline()` に変更（`query: EXWHYZ_SEARCH_QUERY` を追加）
- [ ] 認証を Bearer Token → OAuth2 accessToken に変更
- [ ] `EXWHYZ_SEARCH_QUERY` は残す（`userTimeline` の `query` パラメータとして使用）

### フェーズ2: `app/api/tweets/fetch/route.ts` の修正
- [ ] `getServerSession()` でセッションから `accessToken` と `userId` を取得
- [ ] 未認証時の 401 エラーハンドリングを追加
- [ ] `fetchUserArchiveTweets()` に `accessToken` と `userId` を渡す

### フェーズ3: テスト・動作確認
- [ ] モックモードでの動作確認（変更なし）
- [ ] OAuth ログイン後の初回全件取得テスト
- [ ] ページネーション動作確認
- [ ] 差分更新（更新ボタン）動作確認
- [ ] 未認証時の 401 エラーハンドリング確認

---

## 11. 次のステップ

この変更要求書（v3.3）の内容でご承認いただけましたら、以下の順序で実装を進めます：

1. **`lib/twitter-api.ts` の改修** — `fetchUserArchiveTweets()` への置き換え（`query` フィルター付き）
2. **`app/api/tweets/fetch/route.ts` の改修** — セッション認証の追加
3. **動作確認** — OAuth ログイン後のデータ取得テスト

ご確認・ご意見をお願いいたします！🎉

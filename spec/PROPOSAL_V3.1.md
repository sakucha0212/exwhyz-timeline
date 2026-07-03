# ExWHYZ-Timeline X API連携版 変更要求書（v3.1）

## 📋 変更要件の整理

### v3.1での変更要件

- **X API エンドポイントの変更**: `userTimeline`（最新100件）から `/2/tweets/search/all`（全アーカイブ検索）へ変更
- **初回取得範囲の変更**: 初回呼び出し時に **2022年6月〜現在まで** のポストを **全件** 取得する
- **検索クエリ条件の追加**: ExWHYZメンバー名（日英）によるOR検索クエリと、リツイート・リプライの除外条件を加える

---

## 1. 変更の背景と目的

### 現状の課題（v3.0の設計）

**v3.0で設計されている `lib/twitter-api.ts` の実装**:

```typescript
const tweets = await client.v2.userTimeline(userId, {
  max_results: 100,              // ← 最新100件しか取得できない
  'tweet.fields': ['created_at', 'text', 'attachments'],
  'media.fields': ['url', 'preview_image_url'],
  start_time: startDate,
  end_time: endDate,
});
```

**課題**:
- `userTimeline` は最新100件の取得に限定されており、ExWHYZが活動を開始した **2022年6月** 以降の全ポストを取得できない
- ページネーションを多段実行しても `GET /2/users/:id/tweets` は **過去3,200件** が上限
- ユーザーIDではなくキーワードベースで広くポストを検索したいが、`userTimeline` では対応できない

### 変更の目的

- **全期間アーカイブの取得**: 2022年6月から現在までのExWHYZ関連ポストを初回に全件取得する
- **キーワードベースの検索**: `ExWHYZ` や `ミキナ` などメンバー名を含むポストを横断的に取得する
- **ノイズの除去**: リツイート・リプライを除外し、オリジナルポストのみを対象とする
- **Archive API活用**: `/2/tweets/search/all` エンドポイントはアーカイブ全件検索が可能

---

## 2. 検索クエリ仕様

### 検索クエリ文字列

```
(ExWHYZ OR mikina OR yu-ki OR maho OR mayu OR now OR midoriko OR イクスワイズ OR ミキナ OR ユーキ OR マホ OR マユ OR ナウ OR ミドリコ OR ドリ OR みきな OR まほ OR ゆーき OR まほ OR なう OR みどりこ OR どり) -is:retweet -is:reply
```

### クエリの構成

| 種別 | キーワード | 説明 |
|------|-----------|------|
| グループ名（英語） | `ExWHYZ` | グループ名 |
| グループ名（日本語） | `イクスワイズ` | グループ名カタカナ |
| メンバー名（英語） | `mikina`, `yu-ki`, `maho`, `mayu`, `now`, `midoriko` | 各メンバー英語名 |
| メンバー名（カタカナ） | `ミキナ`, `ユーキ`, `マホ`, `マユ`, `ナウ`, `ミドリコ`, `ドリ` | 各メンバーカタカナ名 |
| メンバー名（ひらがな） | `みきな`, `まほ`, `ゆーき`, `なう`, `みどりこ`, `どり` | 各メンバーひらがな名 |
| 除外条件 | `-is:retweet` | リツイートを除外 |
| 除外条件 | `-is:reply` | リプライを除外 |

### 取得期間

| 設定 | 値 | 備考 |
|------|-----|------|
| `start_time` | `2022-06-01T00:00:00Z` | ExWHYZ活動開始月 |
| `end_time` | 現在時刻（動的） | 実行時の現在日時 |

---

## 3. エンドポイント仕様比較

### 変更前（v3.0）

| 項目 | 内容 |
|------|------|
| エンドポイント | `GET /2/users/:id/tweets`（`userTimeline`） |
| 取得上限 | 最新3,200件（1回あたり最大100件） |
| 検索方法 | 特定ユーザーの投稿のみ |
| アーカイブ | 直近7日〜最大3,200件のみ |
| 必要プラン | Basic以上 |

### 変更後（v3.1）

| 項目 | 内容 |
|------|------|
| エンドポイント | `GET /2/tweets/search/all` |
| 取得上限 | 制限なし（全アーカイブ対象） |
| 検索方法 | キーワード・フィルター条件による横断検索 |
| アーカイブ | Twitter開始以来の全ポストが対象（今回は2022年6月〜） |
| 必要プラン | **Pro または Academic Research** |

> ⚠️ **注意**: `/2/tweets/search/all` は **X API Pro プラン以上** が必要です。Free / Basic プランでは利用できません。

---

## 4. 取得フロー仕様

### 初回取得フロー（全件取得）

```
1. キャッシュチェック
   └─ キャッシュなし → 全件取得フローへ

2. /2/tweets/search/all を呼び出し
   ├─ query: (ExWHYZ OR mikina OR ...) -is:retweet -is:reply
   ├─ start_time: 2022-06-01T00:00:00Z
   ├─ end_time:   現在時刻（ISO 8601形式）
   └─ max_results: 500（1リクエストあたりの最大値）

3. ページネーション処理
   ├─ レスポンスに next_token が存在する場合 → 次ページを取得
   ├─ next_token がなくなるまで繰り返す
   └─ 全件を配列に集約

4. 取得結果をlocalStorageにキャッシュ保存

5. タイムライン表示
```

### 2回目以降（キャッシュ利用 or 差分更新）

```
1. キャッシュチェック
   └─ キャッシュあり → キャッシュから表示

2. 更新ボタン押下時
   ├─ last_fetched_at（最終取得日時）を取得
   └─ start_time: last_fetched_at を指定して差分のみ取得
      └─ 取得結果を既存キャッシュに追記・マージして保存
```

---

## 5. 変更対象ファイルと変更内容

### 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `lib/twitter-api.ts` | **修正** | `userTimeline` → `fetchAllArchiveTweets` に変更、ページネーション処理を追加、検索クエリ定数を追加 |
| `lib/cache.ts` | **修正** | 最終取得日時（`last_fetched_at`）の保存・取得・マージ関数を追加 |
| `lib/data-provider.ts` | **修正** | 初回全件取得フローと差分更新フローの分岐ロジックを追加 |
| `app/api/tweets/fetch/route.ts` | **修正** | `fetchAllArchiveTweets` を呼び出す実装に変更 |
| `.env.local` | **追加** | `TWITTER_ARCHIVE_START_DATE` 環境変数を追加 |

---

## 6. 変更詳細

### 6.1 `lib/twitter-api.ts` の変更

#### 変更前（v3.0）

```typescript
import { TwitterApi } from 'twitter-api-v2';

export async function fetchUserTweets(
  accessToken: string,
  userId: string,
  startDate?: string,
  endDate?: string
) {
  const client = new TwitterApi(accessToken);
  
  try {
    const tweets = await client.v2.userTimeline(userId, {
      max_results: 100,
      'tweet.fields': ['created_at', 'text', 'attachments'],
      'media.fields': ['url', 'preview_image_url'],
      start_time: startDate,
      end_time: endDate,
    });

    return tweets.data.data || [];
  } catch (error) {
    console.error('Error fetching tweets:', error);
    throw error;
  }
}
```

#### 変更後（v3.1）

```typescript
import { TwitterApi } from 'twitter-api-v2';

/**
 * ExWHYZ関連ポストの検索クエリ
 * - メンバー名（英語・カタカナ・ひらがな）のOR条件
 * - リツイート・リプライを除外
 */
export const EXWHYZ_SEARCH_QUERY =
  '(ExWHYZ OR mikina OR yu-ki OR maho OR mayu OR now OR midoriko ' +
  'OR イクスワイズ OR ミキナ OR ユーキ OR マホ OR マユ OR ナウ OR ミドリコ OR ドリ ' +
  'OR みきな OR まほ OR ゆーき OR まほ OR なう OR みどりこ OR どり) ' +
  '-is:retweet -is:reply';

/**
 * アーカイブ検索の開始日時（ExWHYZ活動開始月）
 * 環境変数 TWITTER_ARCHIVE_START_DATE で上書き可能
 */
export const ARCHIVE_START_DATE =
  process.env.TWITTER_ARCHIVE_START_DATE ?? '2022-06-01T00:00:00Z';

/**
 * /2/tweets/search/all を使って全アーカイブからポストを検索・全件取得する。
 * ページネーション（next_token）を使い、全件が取得されるまで繰り返す。
 *
 * @param bearerToken  X API Bearer Token（Pro以上が必要）
 * @param startTime    取得開始日時（ISO 8601形式、省略時は ARCHIVE_START_DATE を使用）
 * @param endTime      取得終了日時（ISO 8601形式、省略時は現在時刻）
 * @returns            取得したツイートの配列
 */
export async function fetchAllArchiveTweets(
  bearerToken: string,
  startTime?: string,
  endTime?: string
): Promise<any[]> {
  const client = new TwitterApi(bearerToken);

  const start = startTime ?? ARCHIVE_START_DATE;
  const end   = endTime   ?? new Date().toISOString();

  const allTweets: any[] = [];
  let nextToken: string | undefined = undefined;

  try {
    do {
      const params: Record<string, any> = {
        query:           EXWHYZ_SEARCH_QUERY,
        start_time:      start,
        end_time:        end,
        max_results:     500,          // 1リクエストあたり最大500件
        'tweet.fields':  'created_at,text,attachments,author_id',
        'media.fields':  'url,preview_image_url',
        expansions:      'attachments.media_keys,author_id',
        'user.fields':   'username,name,profile_image_url',
      };

      if (nextToken) {
        params.next_token = nextToken;
      }

      const response = await client.v2.search(params.query, params);

      const tweets = response.data?.data ?? [];
      allTweets.push(...tweets);

      // 次ページのトークンを取得（なければループ終了）
      nextToken = response.data?.meta?.next_token;

      console.log(
        `[twitter-api] 取得済み: ${allTweets.length}件 / next_token: ${nextToken ?? 'なし'}`
      );
    } while (nextToken);

    return allTweets;
  } catch (error) {
    console.error('[twitter-api] fetchAllArchiveTweets エラー:', error);
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
    .sort(([a], [b]) => a.localeCompare(b))  // 日付昇順でソート
    .map(([date, items]) => ({ date, items }));
}
```

---

### 6.2 `lib/cache.ts` の変更

#### 追加する定数・関数

```typescript
// 追加する定数
const CACHE_LAST_FETCHED_KEY = 'exwhyz_timeline_tweets_last_fetched';

/**
 * 最終取得日時を保存する（差分更新で使用）
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
 * 既存キャッシュに差分ツイートをマージして保存する。
 * tweetId の重複は除去する。
 */
export function mergeCachedTweets(newTweets: any[]): void {
  if (typeof window === 'undefined') return;

  try {
    const existing: any[] = getCachedTweets() ?? [];
    const existingIds = new Set(existing.map((t: any) => t.tweetId ?? t.id));
    const merged = [
      ...existing,
      ...newTweets.filter((t) => !existingIds.has(t.tweetId ?? t.id)),
    ];
    setCachedTweets(merged);
  } catch (error) {
    console.error('[cache] mergeCachedTweets エラー:', error);
  }
}
```

#### `clearCache` の変更

```typescript
// 変更前
export function clearCache() {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(CACHE_TIMESTAMP_KEY);
}

// 変更後
export function clearCache() {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(CACHE_TIMESTAMP_KEY);
  localStorage.removeItem(CACHE_LAST_FETCHED_KEY);  // ← 追加
}
```

---

### 6.3 `lib/data-provider.ts` の変更

#### 変更後（v3.1）

```typescript
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

  // モックモード
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
    const lastFetchedAt = forceRefresh ? getLastFetchedAt() : null;

    // 差分更新: 更新ボタン押下時は最終取得日時以降のみ取得
    // 初回取得: キャッシュなし の場合は ARCHIVE_START_DATE から全件取得
    const endTime = new Date().toISOString();
    const startTimeParam = lastFetchedAt ?? '';

    const response = await fetch(
      `/api/tweets/fetch?startTime=${encodeURIComponent(startTimeParam)}&endTime=${encodeURIComponent(endTime)}`
    );

    if (!response.ok) {
      throw new Error(`API エラー: ${response.status}`);
    }

    const { tweets } = await response.json();

    if (forceRefresh && lastFetchedAt) {
      // 差分マージ
      mergeCachedTweets(tweets);
    } else {
      // 全件保存
      setCachedTweets(tweets);
    }

    // 最終取得日時を更新
    setLastFetchedAt(endTime);

    return getCachedTweets() ?? tweets;
  } catch (error) {
    console.error('[data-provider] getTweetsData エラー:', error);
    throw error;
  }
}
```

---

### 6.4 `app/api/tweets/fetch/route.ts` の変更

#### 変更後（v3.1）

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
    // /2/tweets/search/all で全件取得（ページネーション込み）
    const rawTweets = await fetchAllArchiveTweets(
      bearerToken,
      startTime || undefined,   // 空文字の場合は undefined（ARCHIVE_START_DATE を使用）
      endTime
    );

    const formattedTweets = formatTweetsForTimeline(rawTweets);

    return NextResponse.json({
      tweets: formattedTweets,
      count:  rawTweets.length,
      meta: {
        startTime: startTime || 'ARCHIVE_START_DATE（デフォルト）',
        endTime:   endTime   || '（現在時刻）',
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

### 6.5 `.env.local` への追加

```bash
# アーカイブ取得の開始日時（デフォルト: ExWHYZ活動開始月）
# ISO 8601形式で指定。変更不要な場合はコメントアウトのままでOK
# TWITTER_ARCHIVE_START_DATE=2022-06-01T00:00:00Z
```

---

## 7. データフロー（v3.1 更新版）

```
1. 初回アクセス（キャッシュなし）
   ├─ キャッシュチェック → なし
   ├─ /api/tweets/fetch を呼び出し（startTime未指定 → 2022-06-01〜現在）
   │   └─ /2/tweets/search/all でページネーション全件取得
   │       query: (ExWHYZ OR mikina OR ...) -is:retweet -is:reply
   ├─ 取得結果を localStorage に全件保存
   ├─ last_fetched_at を現在時刻で保存
   └─ タイムライン表示

2. 2回目以降のアクセス（キャッシュあり）
   ├─ キャッシュチェック → あり
   └─ キャッシュから即表示（APIコール不要）

3. 更新ボタン押下（差分更新）
   ├─ last_fetched_at を取得（例: 2024-01-15T10:00:00Z）
   ├─ /api/tweets/fetch を呼び出し（startTime = last_fetched_at）
   │   └─ 最終取得以降の差分のみ取得
   ├─ 差分を既存キャッシュにマージ（重複除去）
   ├─ last_fetched_at を現在時刻で更新
   └─ タイムライン再描画
```

---

## 8. API認証方式の変更

### 変更前（v3.0）

- OAuth 2.0（ユーザー認証）でログインユーザーのアクセストークンを使用
- ユーザー本人のタイムラインを取得

### 変更後（v3.1）

- **Bearer Token認証**（アプリ認証）のみで動作
- ユーザーのOAuthログインは不要になる可能性がある
- `TWITTER_API_BEARER_TOKEN` 環境変数のみで全件取得が可能

> 💡 **注意**: ユーザー認証フロー（NextAuth.js）は、今後ユーザー個別の機能（メモ追加・お気に入りなど）を実装する際に改めて活用できます。v3.1 時点では Bearer Token のみで動作させます。

---

## 9. Rate Limit への対応

### `/2/tweets/search/all` の Rate Limit

| プラン | リクエスト数 | ツイート数/月 |
|--------|------------|-------------|
| Pro    | 300回/15分 | 500,000件/月 |
| Enterprise | 300回/15分 | 無制限 |

### 対応策

| 課題 | 対策 |
|------|------|
| 初回取得に時間がかかる | ローディング画面を表示し、バックグラウンドで取得 |
| Rate Limit到達 | エラーハンドリングでリトライを実装（指数バックオフ） |
| 月間ツイート数の超過 | キャッシュを活用して API 呼び出しを最小限に抑える |
| ページネーション大量呼び出し | `max_results: 500` で1リクエストあたりの取得数を最大化 |

### エラーハンドリング方針

```typescript
// Rate Limit (429) が返った場合の対処
if (response.status === 429) {
  const resetTime = response.headers.get('x-rate-limit-reset');
  console.warn(`[twitter-api] Rate Limit到達。リセット時刻: ${resetTime}`);
  // ユーザーへの通知とリトライ猶予時間の表示
  throw new Error(`RATE_LIMIT:${resetTime}`);
}
```

---

## 10. 後方互換性

| 項目 | 互換性 | 備考 |
|------|--------|------|
| `formatTweetsForTimeline` の戻り値 | ✅ 維持 | 既存の timeline.json 形式と同一 |
| キャッシュキー (`exwhyz_timeline_tweets`) | ✅ 維持 | 既存キャッシュはそのまま利用可能 |
| モックモード (`NEXT_PUBLIC_USE_MOCK=true`) | ✅ 維持 | モック動作に影響なし |
| OAuth ログインフロー | ⚠️ 任意 | Bearer Token認証のみで動作するため不要になるが、今後の拡張に備え残存 |

---

## 11. 実装フェーズ案

### フェーズ1: `lib/twitter-api.ts` の修正
- [ ] `EXWHYZ_SEARCH_QUERY` 定数の定義
- [ ] `ARCHIVE_START_DATE` 定数の定義
- [ ] `fetchAllArchiveTweets` 関数の実装（ページネーション込み）
- [ ] `formatTweetsForTimeline` の日付昇順ソート追加

### フェーズ2: `lib/cache.ts` の修正
- [ ] `CACHE_LAST_FETCHED_KEY` 定数の追加
- [ ] `setLastFetchedAt` 関数の追加
- [ ] `getLastFetchedAt` 関数の追加
- [ ] `mergeCachedTweets` 関数の追加
- [ ] `clearCache` 関数の修正（`CACHE_LAST_FETCHED_KEY` 削除を追加）

### フェーズ3: `lib/data-provider.ts` の修正
- [ ] 初回全件取得フローの実装
- [ ] 差分更新フローの実装
- [ ] エラーハンドリングの強化

### フェーズ4: `app/api/tweets/fetch/route.ts` の修正
- [ ] `fetchAllArchiveTweets` 呼び出しへの変更
- [ ] `startTime`・`endTime` クエリパラメータの処理

### フェーズ5: テスト・動作確認
- [ ] モックモードでの動作確認（変更なし）
- [ ] 本番モードでの初回全件取得テスト
- [ ] ページネーション動作確認
- [ ] 差分更新（更新ボタン）動作確認
- [ ] Rate Limit エラーハンドリング確認

---

## 12. 次のステップ

この変更要求書（v3.1）の内容でご承認いただけましたら、以下の順序で実装を進めます：

1. **`lib/twitter-api.ts` の改修** - `fetchAllArchiveTweets` への置き換えとクエリ定数定義
2. **`lib/cache.ts` の改修** - 差分更新用の関数追加
3. **`lib/data-provider.ts` の改修** - 初回全件取得 / 差分更新フロー
4. **`app/api/tweets/fetch/route.ts` の改修** - APIルートの変更
5. **`.env.local` の更新** - `TWITTER_ARCHIVE_START_DATE` の追加
6. **動作確認** - モック/本番モードでのテスト

ご確認・ご意見をお願いいたします！🎉


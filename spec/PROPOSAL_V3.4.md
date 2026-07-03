# ExWHYZ-Timeline ユーザー個別 ExWHYZ 関連ツイート取得（API フィルタリング版） 変更要求書（v3.4）

## 📋 変更要件の整理

### v3.4での変更要件

- **`from:username` + `EXWHYZ_SEARCH_QUERY` を組み合わせた `searchAll()` に変更する**: v3.3 で実装した `userTimeline()` は `query` パラメータをサポートしていないため、ログインユーザーのツイートを API 側でキーワードフィルタリングできない。`from:username (ExWHYZ OR ...)` というクエリで `searchAll()` を使うことで、**API 側でフィルタリングを行い、取得件数を最小化する**

---

## 1. 変更の背景と目的

### 現状の課題（v3.3の実装）

**v3.3で実装されている `lib/twitter-api.ts` の実装**:

```typescript
export async function fetchUserArchiveTweets(
  accessToken: string,
  userId: string,
  startTime?: string,
  endTime?: string
): Promise<any[]> {
  const client = new TwitterApi(accessToken);

  // /2/users/:id/tweets でログインユーザーのツイートを全件取得
  const paginator = await client.v2.userTimeline(userId, {
    // query パラメータなし → ExWHYZ 関連かどうかに関わらず全ツイートを取得
    start_time: start,
    end_time:   end,
    max_results: 100,
    ...
  });
  ...
}
```

**課題**:

| 課題 | 詳細 |
|------|------|
| API 側でフィルタリングできない | `userTimeline()` は `query` パラメータをサポートしていないため、ExWHYZ 関連以外のツイートも全件取得してしまう |
| 取得件数が多い | ログインユーザーの全ツイートを取得するため、ExWHYZ と無関係なツイートも含まれ、API の従量コストが増加する |
| `EXWHYZ_SEARCH_QUERY` が使われていない | 定数として定義されているが、実際のフィルタリングに使用されていない |

### 変更の目的

- **API 側でフィルタリングを行い、取得件数を最小化する**: `from:username (ExWHYZ OR ...)` というクエリで `searchAll()` を使うことで、ExWHYZ 関連ツイートのみを API 側で絞り込んで取得する
- **従量コストの削減**: 取得するツイート数が減るため、X API の月間ツイート数消費を抑えられる
- **`EXWHYZ_SEARCH_QUERY` を有効活用する**: 既存の定数を `from:username` と組み合わせて実際のフィルタリングに使用する

---

## 2. エンドポイント仕様比較

### 変更前（v3.3）

| 項目 | 内容 |
|------|------|
| エンドポイント | `GET /2/users/:id/tweets` |
| 認証方式 | OAuth2 accessToken（ユーザー認証） |
| 取得対象 | ログインユーザーの**全ツイート**（ExWHYZ 関連かどうかに関わらず） |
| フィルタリング | なし（API 側でのフィルタリング不可） |
| 必要プラン | Basic 以上 |

### 変更後（v3.4）

| 項目 | 内容 |
|------|------|
| エンドポイント | `GET /2/tweets/search/all` |
| 認証方式 | OAuth2 accessToken（ユーザー認証） |
| 取得対象 | ログインユーザーの**ExWHYZ 関連ツイートのみ**（`from:username` + `EXWHYZ_SEARCH_QUERY`） |
| フィルタリング | **API 側でフィルタリング**（取得件数を最小化） |
| 必要プラン | **Pro 以上** |

> ⚠️ **注意**: `/2/tweets/search/all` は **X API Pro プラン以上** が必要です。

---

## 3. クエリ仕様

### 変更後のクエリ

```
from:ユーザー名 (ExWHYZ OR mikina OR yu-ki OR maho OR mayu OR now OR midoriko
OR イクスワイズ OR ミキナ OR ユーキ OR マホ OR マユ OR ナウ OR ミドリコ OR ドリ
OR みきな OR まほ OR ゆーき OR まほ OR なう OR みどりこ OR どり)
-is:retweet -is:reply
```

### クエリの構成

| 部分 | 内容 |
|------|------|
| `from:ユーザー名` | ログインユーザーのツイートのみに絞り込む |
| `(ExWHYZ OR ...)` | ExWHYZ 関連キーワードのいずれかを含む |
| `-is:retweet` | リツイートを除外 |
| `-is:reply` | リプライを除外 |

### ユーザー名の取得方法

`userId` から `username` を取得するために、`client.v2.user(userId)` を呼び出す：

```typescript
const userResponse = await client.v2.user(userId, { 'user.fields': 'username' });
const username = userResponse.data.username;
```

---

## 4. 処理の流れ（v3.4）

```
1. ブラウザ → /api/tweets/fetch を呼び出し

2. route.ts
   └─ getServerSession() で accessToken と userId を取得

3. twitter-api.ts: fetchUserArchiveTweets()
   ├─ OAuth2 accessToken で TwitterApi を初期化
   ├─ client.v2.user(userId) でユーザー名（username）を取得
   └─ /2/tweets/search/all を呼び出し
       ├─ query: from:username (ExWHYZ OR ...) -is:retweet -is:reply
       ├─ start_time: 2022-06-01T00:00:00Z（または前回取得日時）
       ├─ end_time:   現在時刻の30秒前
       └─ max_results: 500件/リクエスト（ページネーションで全件取得）

4. ExWHYZ 関連ツイートのみ取得（API 側でフィルタリング済み）

5. formatTweetsForTimeline() で日付ごとにグループ化して返す
```

---

## 5. 変更対象ファイルと変更内容

### 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `lib/twitter-api.ts` | **修正** | `userTimeline()` → `searchAll()` に変更。`from:username` + `EXWHYZ_SEARCH_QUERY` を組み合わせたクエリを使用。`userId` から `username` を取得する処理を追加 |

---

## 6. 変更詳細

### 6.1 `lib/twitter-api.ts` の変更

#### 変更前（v3.3）

```typescript
export async function fetchUserArchiveTweets(
  accessToken: string,
  userId: string,
  startTime?: string,
  endTime?: string
): Promise<any[]> {
  const client = new TwitterApi(accessToken);

  const start = startTime ?? ARCHIVE_START_DATE;
  const end   = endTime   ?? new Date(Date.now() - 30 * 1000).toISOString();

  const allTweets: any[] = [];

  try {
    // /2/users/:id/tweets でログインユーザーのツイートを全件取得
    // （query パラメータ非対応のため ExWHYZ 関連以外も取得してしまう）
    const paginator = await client.v2.userTimeline(userId, {
      start_time:     start,
      end_time:       end,
      max_results:    100,
      'tweet.fields': 'created_at,text,attachments,author_id',
      'media.fields': 'url,preview_image_url',
      expansions:     'attachments.media_keys',
      'user.fields':  'username,name,profile_image_url',
    });

    for await (const tweet of paginator) {
      allTweets.push(tweet);
    }
    return allTweets;
  } catch (error) {
    throw error;
  }
}
```

#### 変更後（v3.4）

```typescript
export async function fetchUserArchiveTweets(
  accessToken: string,
  userId: string,
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
    // userId からユーザー名（username）を取得
    const userResponse = await client.v2.user(userId, { 'user.fields': 'username' });
    const username = userResponse.data.username;
    console.log(`[twitter-api] ユーザー名: @${username}`);

    // from:username + EXWHYZ_SEARCH_QUERY を組み合わせたクエリ
    // → ログインユーザーの ExWHYZ 関連ツイートのみを API 側でフィルタリング
    const query = `from:${username} ${EXWHYZ_SEARCH_QUERY}`;

    // /2/tweets/search/all で全アーカイブ検索（ページネーション自動処理）
    const paginator = await client.v2.searchAll(query, {
      start_time:     start,
      end_time:       end,
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
```

---

## 7. データフロー（v3.4 更新版）

```
1. 初回アクセス（キャッシュなし）
   ├─ キャッシュチェック → なし
   ├─ /api/tweets/fetch を呼び出し
   │   ├─ getServerSession() で accessToken と userId を取得
   │   ├─ client.v2.user(userId) でユーザー名を取得
   │   └─ /2/tweets/search/all でページネーション全件取得
   │       query: from:username (ExWHYZ OR ...) -is:retweet -is:reply
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

## 8. コスト比較

| 方式 | 取得対象 | 取得件数の目安 | API コスト |
|------|---------|-------------|-----------|
| v3.1（全ユーザー横断検索） | 全ユーザーの ExWHYZ 関連ツイート | 非常に多い | 高い |
| v3.3（userTimeline 全件） | ログインユーザーの全ツイート | 多い | 中程度 |
| **v3.4（from:username + searchAll）** | **ログインユーザーの ExWHYZ 関連ツイートのみ** | **最小** | **最小** |

---

## 9. 後方互換性

| 項目 | 互換性 | 備考 |
|------|--------|------|
| `EXWHYZ_SEARCH_QUERY` 定数 | ✅ 維持 | `from:username` と組み合わせて使用 |
| `formatTweetsForTimeline` の戻り値 | ✅ 維持 | 既存の timeline.json 形式と同一 |
| キャッシュキー (`exwhyz_timeline_tweets`) | ✅ 維持 | 既存のlocalStorageデータはそのまま利用可能 |
| モックモード (`NEXT_PUBLIC_USE_MOCK=true`) | ✅ 維持 | キャッシュロジックを通らないため影響なし |
| `app/api/tweets/fetch/route.ts` | ✅ 変更なし | `fetchUserArchiveTweets()` を呼ぶだけなので影響なし |
| `lib/data-provider.ts` | ✅ 変更なし | 影響なし |
| `hooks/useTwitterData.ts` | ✅ 変更なし | 影響なし |

---

## 10. 実装フェーズ案

### フェーズ1: `lib/twitter-api.ts` の修正
- [ ] `userTimeline()` → `searchAll()` に変更
- [ ] `client.v2.user(userId)` でユーザー名を取得する処理を追加
- [ ] `from:username` + `EXWHYZ_SEARCH_QUERY` を組み合わせたクエリを構築
- [ ] `max_results` を 100 → 500 に変更（`searchAll` は最大500件/リクエスト）

### フェーズ2: テスト・動作確認
- [ ] モックモードでの動作確認（変更なし）
- [ ] OAuth ログイン後の初回全件取得テスト
- [ ] `from:username` フィルターが正しく機能しているか確認
- [ ] 差分更新（更新ボタン）動作確認

---

## 11. 次のステップ

この変更要求書（v3.4）の内容でご承認いただけましたら、以下の順序で実装を進めます：

1. **`lib/twitter-api.ts` の改修** — `userTimeline()` → `searchAll()` に変更、`from:username` クエリ追加
2. **動作確認** — OAuth ログイン後のデータ取得テスト

ご確認・ご意見をお願いいたします！🎉

# ExWHYZ-Timeline 認証方式修正（searchAll を Bearer Token で呼び出す） 変更要求書（v3.5）

## 📋 変更要件の整理

### v3.5での変更要件

- **`searchAll()` の認証を OAuth2 accessToken → Bearer Token に変更する**: `/2/tweets/search/all` エンドポイントは OAuth2 ユーザー認証をサポートしていないため、Bearer Token（アプリ認証）で呼び出す必要がある。ユーザー名の取得には引き続き OAuth2 accessToken を使用する

---

## 1. 変更の背景と目的

### 現状の課題（v3.4の実装）

**v3.4で実装されている `lib/twitter-api.ts` の実装**:

```typescript
export async function fetchUserArchiveTweets(
  accessToken: string,   // OAuth2 accessToken のみ使用
  userId: string,
  ...
): Promise<any[]> {
  const client = new TwitterApi(accessToken);  // OAuth2 accessToken で初期化

  // userId からユーザー名を取得
  const userResponse = await client.v2.user(userId, ...);

  // /2/tweets/search/all を OAuth2 accessToken で呼び出し
  const paginator = await client.v2.searchAll(query, ...);
  // ↑ 401 Unauthorized エラーが発生
}
```

**課題**:

| 課題 | 詳細 |
|------|------|
| `/2/tweets/search/all` が OAuth2 ユーザー認証をサポートしていない | X API の仕様上、`/2/tweets/search/all` は Bearer Token（アプリ認証）でのみ呼び出し可能。OAuth2 accessToken で呼び出すと 401 Unauthorized が返る |
| ユーザー名の取得には OAuth2 accessToken が必要 | `client.v2.user(userId)` でユーザー名を取得するには、ユーザー認証が必要 |

### 変更の目的

- **401 エラーを解消する**: `searchAll()` を Bearer Token で呼び出すことで、X API の認証要件を満たす
- **ユーザー名取得は OAuth2 accessToken を継続使用**: `from:username` クエリを構築するためのユーザー名取得には引き続き OAuth2 accessToken を使用する

---

## 2. 認証方式の整理

### 各 API 呼び出しの認証方式

| API 呼び出し | 認証方式 | 理由 |
|------------|---------|------|
| `client.v2.user(userId)` | OAuth2 accessToken | ユーザー情報取得にはユーザー認証が必要 |
| `client.v2.searchAll(query, ...)` | **Bearer Token** | `/2/tweets/search/all` は Bearer Token のみサポート |

---

## 3. 変更対象ファイルと変更内容

### 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `lib/twitter-api.ts` | **修正** | `fetchUserArchiveTweets()` の引数に `bearerToken` を追加。`searchAll()` の呼び出しを Bearer Token で行うよう変更 |
| `app/api/tweets/fetch/route.ts` | **修正** | `fetchUserArchiveTweets()` に `TWITTER_API_BEARER_TOKEN` 環境変数を追加で渡す |

---

## 4. 変更詳細

### 4.1 `lib/twitter-api.ts` の変更

#### 変更前（v3.4）

```typescript
export async function fetchUserArchiveTweets(
  accessToken: string,   // OAuth2 accessToken のみ
  userId: string,
  startTime?: string,
  endTime?: string
): Promise<any[]> {
  const client = new TwitterApi(accessToken);  // OAuth2 で初期化

  // ユーザー名取得（OAuth2 accessToken を使用）
  const userResponse = await client.v2.user(userId, { 'user.fields': 'username' });
  const username = userResponse.data.username;

  // searchAll を OAuth2 accessToken で呼び出し → 401 エラー
  const paginator = await client.v2.searchAll(query, { ... });
  ...
}
```

#### 変更後（v3.5）

```typescript
export async function fetchUserArchiveTweets(
  accessToken: string,   // OAuth2 accessToken（ユーザー名取得用）
  userId: string,
  bearerToken: string,   // Bearer Token（searchAll 用）← 追加
  startTime?: string,
  endTime?: string
): Promise<any[]> {
  // OAuth2 accessToken でユーザー名を取得
  const userClient = new TwitterApi(accessToken);
  const userResponse = await userClient.v2.user(userId, { 'user.fields': 'username' });
  const username = userResponse.data.username;
  console.log(`[twitter-api] ユーザー名: @${username}`);

  // Bearer Token で searchAll を呼び出し
  const appClient = new TwitterApi(bearerToken);
  const query = `from:${username} ${EXWHYZ_SEARCH_QUERY}`;
  const paginator = await appClient.v2.searchAll(query, { ... });
  ...
}
```

---

### 4.2 `app/api/tweets/fetch/route.ts` の変更

#### 変更前（v3.4）

```typescript
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken || !session?.userId) {
    return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
  }

  const rawTweets = await fetchUserArchiveTweets(
    session.accessToken,   // OAuth2 accessToken のみ
    session.userId,
    startTime,
    endTime
  );
  ...
}
```

#### 変更後（v3.5）

```typescript
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken || !session?.userId) {
    return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
  }

  const bearerToken = process.env.TWITTER_API_BEARER_TOKEN;
  if (!bearerToken) {
    return NextResponse.json(
      { error: 'TWITTER_API_BEARER_TOKEN が設定されていません' },
      { status: 500 }
    );
  }

  const rawTweets = await fetchUserArchiveTweets(
    session.accessToken,   // OAuth2 accessToken（ユーザー名取得用）
    session.userId,
    bearerToken,           // Bearer Token（searchAll 用）← 追加
    startTime,
    endTime
  );
  ...
}
```

---

## 5. 処理の流れ（v3.5）

```
1. ブラウザ → /api/tweets/fetch を呼び出し

2. route.ts
   ├─ getServerSession() で accessToken と userId を取得（OAuth2）
   └─ TWITTER_API_BEARER_TOKEN 環境変数を取得

3. twitter-api.ts: fetchUserArchiveTweets()
   ├─ OAuth2 accessToken で TwitterApi を初期化
   ├─ client.v2.user(userId) でユーザー名（username）を取得
   ├─ Bearer Token で TwitterApi を初期化
   └─ /2/tweets/search/all を呼び出し（Bearer Token 認証）
       ├─ query: from:username (ExWHYZ OR ...) -is:retweet -is:reply
       ├─ start_time: 2022-06-01T00:00:00Z（または前回取得日時）
       ├─ end_time:   現在時刻の30秒前
       └─ max_results: 500件/リクエスト

4. ログインユーザーの ExWHYZ 関連ツイートのみ取得（API 側でフィルタリング済み）

5. formatTweetsForTimeline() で日付ごとにグループ化して返す
```

---

## 6. 後方互換性

| 項目 | 互換性 | 備考 |
|------|--------|------|
| `EXWHYZ_SEARCH_QUERY` 定数 | ✅ 維持 | `from:username` と組み合わせて使用 |
| `formatTweetsForTimeline` の戻り値 | ✅ 維持 | 既存の timeline.json 形式と同一 |
| キャッシュキー (`exwhyz_timeline_tweets`) | ✅ 維持 | 既存のlocalStorageデータはそのまま利用可能 |
| モックモード (`NEXT_PUBLIC_USE_MOCK=true`) | ✅ 維持 | 影響なし |
| `lib/data-provider.ts` | ✅ 変更なし | 影響なし |
| `hooks/useTwitterData.ts` | ✅ 変更なし | 影響なし |
| `TWITTER_API_BEARER_TOKEN` 環境変数 | ✅ 再利用 | v3.4 で「不要になる」としていたが、`searchAll()` に必要なため再利用 |

---

## 7. 実装フェーズ案

### フェーズ1: `lib/twitter-api.ts` の修正
- [ ] `fetchUserArchiveTweets()` の引数に `bearerToken: string` を追加
- [ ] ユーザー名取得用クライアント（OAuth2）と検索用クライアント（Bearer Token）を分離
- [ ] `searchAll()` を Bearer Token クライアントで呼び出すよう変更

### フェーズ2: `app/api/tweets/fetch/route.ts` の修正
- [ ] `TWITTER_API_BEARER_TOKEN` 環境変数の取得を追加
- [ ] `fetchUserArchiveTweets()` に `bearerToken` を追加で渡す

### フェーズ3: テスト・動作確認
- [ ] OAuth ログイン後の初回全件取得テスト
- [ ] 401 エラーが解消されているか確認
- [ ] `from:username` フィルターが正しく機能しているか確認

---

## 8. 次のステップ

この変更要求書（v3.5）の内容でご承認いただけましたら、以下の順序で実装を進めます：

1. **`lib/twitter-api.ts` の改修** — `bearerToken` 引数追加、クライアントを分離
2. **`app/api/tweets/fetch/route.ts` の改修** — `bearerToken` を追加で渡す
3. **動作確認** — 401 エラーが解消されているか確認

ご確認・ご意見をお願いいたします！🎉

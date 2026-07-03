# ExWHYZ-Timeline 認証方式統一（全 API 呼び出しを Bearer Token に統一） 変更要求書（v3.6）

## 📋 変更要件の整理

### v3.6での変更要件

- **ユーザー名取得も Bearer Token で行うよう変更する**: v3.5 では `client.v2.user(userId)` を OAuth2 accessToken で呼び出していたが、OAuth2 アクセストークンの有効期限切れにより 401 エラーが発生している。`client.v2.user(userId)` は Bearer Token でも呼び出せるため、全 API 呼び出しを Bearer Token に統一する

---

## 1. 変更の背景と目的

### 現状の課題（v3.5の実装）

**v3.5で発生している 401 エラー**:

```
[twitter-api] Step1: OAuth2 accessToken でユーザー名取得開始 (userId: 2288123636)
[twitter-api] Step1: 失敗 (OAuth2 accessToken でのユーザー名取得に失敗) 401 {
  title: 'Unauthorized',
  type: 'about:blank',
  status: 401,
  detail: 'Unauthorized'
}
```

**課題**:

| 課題 | 詳細 |
|------|------|
| OAuth2 アクセストークンの有効期限切れ | OAuth2 アクセストークンは通常2時間で期限切れになる。NextAuth.js のデフォルト設定ではトークンの自動リフレッシュが行われないため、期限切れ後は 401 エラーが発生する |
| `client.v2.user(userId)` に OAuth2 が不要 | `GET /2/users/:id` は Bearer Token でも呼び出せるため、OAuth2 accessToken を使う必要がない |

### 変更の目的

- **401 エラーを解消する**: ユーザー名取得も Bearer Token で行うことで、OAuth2 アクセストークンの有効期限問題を完全に回避する
- **認証方式を Bearer Token に統一する**: 全 API 呼び出しを Bearer Token で行うことで、コードをシンプルにする
- **`accessToken` 引数を削除する**: `fetchUserArchiveTweets()` から `accessToken` 引数が不要になり、関数シグネチャがシンプルになる

---

## 2. 認証方式の変更

### 変更前（v3.5）

| API 呼び出し | 認証方式 |
|------------|---------|
| `client.v2.user(userId)` | OAuth2 accessToken（有効期限切れで 401 発生） |
| `client.v2.searchAll(query, ...)` | Bearer Token |

### 変更後（v3.6）

| API 呼び出し | 認証方式 |
|------------|---------|
| `client.v2.user(userId)` | **Bearer Token** |
| `client.v2.searchAll(query, ...)` | Bearer Token |

---

## 3. 変更対象ファイルと変更内容

### 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `lib/twitter-api.ts` | **修正** | `fetchUserArchiveTweets()` から `accessToken` 引数を削除。`client.v2.user(userId)` を Bearer Token で呼び出すよう変更 |
| `app/api/tweets/fetch/route.ts` | **修正** | `fetchUserArchiveTweets()` から `session.accessToken` の引数を削除 |

---

## 4. 変更詳細

### 4.1 `lib/twitter-api.ts` の変更

#### 変更前（v3.5）

```typescript
export async function fetchUserArchiveTweets(
  accessToken: string,   // OAuth2 accessToken（ユーザー名取得用）← 削除
  userId: string,
  bearerToken: string,
  startTime?: string,
  endTime?: string
): Promise<any[]> {
  // OAuth2 accessToken でユーザー名を取得 → 有効期限切れで 401 エラー
  const userClient = new TwitterApi(accessToken);
  const userResponse = await userClient.v2.user(userId, { 'user.fields': 'username' });
  const username = userResponse.data.username;

  // Bearer Token で searchAll を呼び出し
  const appClient = new TwitterApi(bearerToken);
  const paginator = await appClient.v2.searchAll(query, { ... });
  ...
}
```

#### 変更後（v3.6）

```typescript
export async function fetchUserArchiveTweets(
  userId: string,
  bearerToken: string,   // Bearer Token のみ（accessToken 引数を削除）
  startTime?: string,
  endTime?: string
): Promise<any[]> {
  // Bearer Token でユーザー名を取得（OAuth2 accessToken 不要）
  const client = new TwitterApi(bearerToken);
  const userResponse = await client.v2.user(userId, { 'user.fields': 'username' });
  const username = userResponse.data.username;

  // 同じ Bearer Token クライアントで searchAll を呼び出し
  const query = `from:${username} ${EXWHYZ_SEARCH_QUERY}`;
  const paginator = await client.v2.searchAll(query, { ... });
  ...
}
```

---

### 4.2 `app/api/tweets/fetch/route.ts` の変更

#### 変更前（v3.5）

```typescript
const rawTweets = await fetchUserArchiveTweets(
  session.accessToken,   // OAuth2 accessToken（ユーザー名取得用）← 削除
  session.userId,
  bearerToken,
  startTime,
  endTime
);
```

#### 変更後（v3.6）

```typescript
const rawTweets = await fetchUserArchiveTweets(
  session.userId,        // ログインユーザーの X ユーザーID
  bearerToken,           // Bearer Token（全 API 呼び出し用）
  startTime,
  endTime
);
```

---

## 5. 処理の流れ（v3.6）

```
1. ブラウザ → /api/tweets/fetch を呼び出し

2. route.ts
   ├─ getServerSession() で userId を取得（OAuth2 セッション）
   └─ TWITTER_API_BEARER_TOKEN 環境変数を取得

3. twitter-api.ts: fetchUserArchiveTweets()
   ├─ Bearer Token で TwitterApi を初期化（1つのクライアントのみ）
   ├─ client.v2.user(userId) でユーザー名（username）を取得（Bearer Token）
   └─ /2/tweets/search/all を呼び出し（Bearer Token）
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
| `session.accessToken` の利用 | ⚠️ 不要になる | `fetchUserArchiveTweets()` では使用しなくなるが、セッション自体は維持 |

---

## 7. 実装フェーズ案

### フェーズ1: `lib/twitter-api.ts` の修正
- [ ] `fetchUserArchiveTweets()` から `accessToken` 引数を削除
- [ ] `client.v2.user(userId)` を Bearer Token クライアントで呼び出すよう変更
- [ ] デバッグログを整理（Step1/Step2 の分離ログを統合）

### フェーズ2: `app/api/tweets/fetch/route.ts` の修正
- [ ] `fetchUserArchiveTweets()` から `session.accessToken` の引数を削除

### フェーズ3: テスト・動作確認
- [ ] OAuth ログイン後の初回全件取得テスト
- [ ] 401 エラーが解消されているか確認
- [ ] `from:username` フィルターが正しく機能しているか確認

---

## 8. 次のステップ

この変更要求書（v3.6）の内容でご承認いただけましたら、以下の順序で実装を進めます：

1. **`lib/twitter-api.ts` の改修** — `accessToken` 引数削除、Bearer Token に統一
2. **`app/api/tweets/fetch/route.ts` の改修** — `session.accessToken` の引数を削除
3. **動作確認** — 401 エラーが解消されているか確認

ご確認・ご意見をお願いいたします！🎉

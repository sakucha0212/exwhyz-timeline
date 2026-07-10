# ExWHYZ-Timeline 更新ボタン500エラー修正 変更要求書（v3.22）

## 📋 変更要件の整理

### v3.22での変更要件

1. **バグ修正**: 当月ページで「更新」ボタンを押すと 500 エラーが発生する問題を修正する

---

## 1. 現状（v3.21）と問題の詳細

### 問題の再現手順

1. 当月（例: `2026-07`）のページを表示する
2. 一度ツイートデータが取得・キャッシュされた状態で「更新」ボタンを押す
3. → HTTP 500 エラーが返る

### 原因

差分更新（`forceRefresh=true`）時のリクエストフローを追うと、以下のバグが確認できます。

#### フロー図

```
更新ボタン押下
  └─ useMonthlyTwitterData.refresh()
       └─ getMonthlyTweetsData(yearMonth, forceRefresh=true)
            └─ fetchAndMergeCurrentMonth(yearMonth)
                 └─ GET /api/tweets/fetch?sinceId=xxx&endTime=yyy
                                          ↑ startTime が渡されない！
                      └─ fetchUserArchiveTweets(userId, bearerToken, undefined, endTime, sinceId)
                           └─ const start = startTime ?? ARCHIVE_START_DATE
                                            ↑ "2022-06-01T00:00:00Z" にフォールバック
                                └─ searchAll({ start_time: "2022-06-01", since_id: "xxx", ... })
                                             ↑ since_id と start_time を同時指定 → X API エラー
```

#### バグ箇所: `lib/twitter-api.ts`（62〜72行目）

```typescript
// 現状: sinceId の有無に関わらず常に start_time を渡している
const paginator = await client.v2.searchAll(query, {
  start_time:     start,   // ← sinceId がある場合でも常に渡される
  end_time:       end,
  ...(sinceId ? { since_id: sinceId } : {}),
  max_results:    500,
  'tweet.fields': 'created_at,text,attachments,author_id',
  'media.fields': 'url,preview_image_url',
  expansions:     'attachments.media_keys,author_id',
  'user.fields':  'username,name,profile_image_url',
});
```

#### X API の仕様上の問題

X API v2 の `/2/tweets/search/all` において、`since_id` と `start_time` を同時に指定した場合：

- `since_id` が示すツイートの投稿日時より `start_time` が古い場合、API がエラーを返す
- 差分更新では `since_id`（最新ツイートID）だけで期間を絞れるため、`start_time` は不要

---

## 2. 変更詳細

### 2.1 `lib/twitter-api.ts`（修正）— `sinceId` がある場合は `start_time` を省略

**変更前:**

```typescript
const paginator = await client.v2.searchAll(query, {
  start_time:     start,
  end_time:       end,
  ...(sinceId ? { since_id: sinceId } : {}),
  max_results:    500,
  'tweet.fields': 'created_at,text,attachments,author_id',
  'media.fields': 'url,preview_image_url',
  expansions:     'attachments.media_keys,author_id',
  'user.fields':  'username,name,profile_image_url',
});
```

**変更後:**

```typescript
const paginator = await client.v2.searchAll(query, {
  // sinceId がある場合は start_time を省略（since_id と start_time の競合を防ぐ）
  ...(sinceId ? {} : { start_time: start }),
  end_time:       end,
  ...(sinceId ? { since_id: sinceId } : {}),
  max_results:    500,
  'tweet.fields': 'created_at,text,attachments,author_id',
  'media.fields': 'url,preview_image_url',
  expansions:     'attachments.media_keys,author_id',
  'user.fields':  'username,name,profile_image_url',
});
```

**変更点の詳細:**

| 変更内容 | 変更前 | 変更後 |
|---------|--------|--------|
| `start_time` の渡し方 | 常に渡す | `sinceId` がない場合のみ渡す |

---

## 3. 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `lib/twitter-api.ts` | **修正** | `sinceId` がある場合は `start_time` を X API に渡さないよう変更 |

---

## 4. 修正の影響範囲

### 4.1 動作への影響

| シナリオ | 変更前 | 変更後 |
|---------|--------|--------|
| 初回取得（キャッシュなし） | `start_time` あり・`since_id` なし | ✅ 変更なし |
| 過去月の取得 | `start_time` あり・`since_id` なし | ✅ 変更なし |
| 当月の差分更新（更新ボタン） | `start_time` あり・`since_id` あり → **500エラー** | ✅ `since_id` のみ → 正常動作 |

### 4.2 後方互換性

| 項目 | 互換性 | 備考 |
|------|--------|------|
| API レスポンス形式 | ✅ 変更なし | `DayData[]` の形式は同じ |
| IndexedDBキャッシュ構造 | ✅ 変更なし | スキーマ変更なし |
| モックモード | ✅ 変更なし | `NEXT_PUBLIC_USE_MOCK=true` 時は API 呼び出し自体が行われない |
| 初回取得・過去月取得 | ✅ 変更なし | `sinceId` が `undefined` の場合は従来通り `start_time` を渡す |

---

## 5. 実装フェーズ案

### フェーズ1: 変更提案書作成
- [x] `spec/PROPOSAL_V3.22.md` を作成

### フェーズ2: コード修正
- [x] `lib/twitter-api.ts` の `searchAll` 呼び出し部分を修正

---

## 6. 次のステップ

この変更要求書（v3.22）の内容でご承認いただけましたら、フェーズ2の実装を進めます。

ご確認・ご意見をお願いいたします！🎉

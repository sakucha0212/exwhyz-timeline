# ExWHYZ-Timeline 差分更新400エラー修正 変更要求書（v3.23）

## 📋 変更要件の整理

### v3.23での変更要件

1. **バグ修正**: 当月ページで「更新」ボタンを押すと 400 エラーが発生する問題を修正する

---

## 1. 現状（v3.22）と問題の詳細

### 問題の再現手順

1. 当月（例: `2026-07`）のページを表示する
2. 一度ツイートデータが取得・キャッシュされた状態で「更新」ボタンを押す
3. → HTTP 400 エラー（`Invalid Request: One or more parameters to your request was invalid.`）が返る

### 原因

v3.22 で `start_time` と `since_id` の競合は解消されましたが、**`end_time` と `since_id` の時間的矛盾**が残っています。

#### フロー図

```
更新ボタン押下
  └─ fetchAndMergeCurrentMonth(yearMonth)
       ├─ sinceId = キャッシュ済み最新ツイートID（例: 直近数秒前のツイート）
       ├─ endTime = new Date(Date.now() - 30 * 1000).toISOString()
       │            = 現在時刻の「30秒前」
       └─ GET /api/tweets/fetch?sinceId=xxx&endTime=yyy
            └─ searchAll({
                 since_id: "xxx",   // 例: 10秒前のツイートID
                 end_time: "yyy",   // 現在時刻の30秒前
               })
               ↑ end_time（30秒前）< since_id のツイート投稿時刻（10秒前）
               → 時間的矛盾 → X API が 400 エラーを返す
```

#### X API の仕様上の制約

X API v2 の `/2/tweets/search/all` において：

> `end_time` は `since_id` が示すツイートの投稿日時より**後**でなければならない

最新ツイートが「30秒以内」に投稿されたものだった場合、`end_time`（現在時刻の30秒前）が `since_id` のツイートより古くなり、矛盾が生じます。

#### 調査結果

| 候補 | 内容 | 結論 |
|------|------|------|
| `end_time` と `since_id` の時間的矛盾 | `end_time` が `since_id` のツイートより古い場合に 400 エラー | **✅ 原因** |
| クエリ文字数超過 | v3.21 でキーワード追加後の文字数が 1024 文字を超えた | ❌ 除外（実測 248 文字） |

---

## 2. 変更詳細

### 2.1 `lib/twitter-api.ts`（修正）— `sinceId` がある場合は `end_time` も省略

差分更新時（`sinceId` あり）は `since_id` だけで「このツイートより新しいもの」を絞れるため、`end_time` は不要です。

**変更前:**

```typescript
const paginator = await client.v2.searchAll(query, {
  // sinceId がある場合は start_time を省略（since_id と start_time の競合を防ぐ）
  ...(sinceId ? {} : { start_time: start }),
  end_time:       end,                                 // ← 常に渡している
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
  // sinceId がある場合は start_time・end_time を省略（since_id との時間的矛盾を防ぐ）
  ...(sinceId ? {} : { start_time: start }),
  ...(sinceId ? {} : { end_time: end }),               // ← sinceId がない場合のみ渡す
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
| `end_time` の渡し方 | 常に渡す | `sinceId` がない場合のみ渡す |

---

## 3. 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `lib/twitter-api.ts` | **修正** | `sinceId` がある場合は `end_time` を X API に渡さないよう変更 |

---

## 4. 修正の影響範囲

### 4.1 動作への影響

| シナリオ | `start_time` | `end_time` | `since_id` | 変更前 | 変更後 |
|---------|-------------|-----------|-----------|--------|--------|
| 初回取得（キャッシュなし） | あり | あり | なし | ✅ 正常 | ✅ 変更なし |
| 過去月の取得 | あり | あり | なし | ✅ 正常 | ✅ 変更なし |
| 当月の差分更新（更新ボタン） | なし（v3.22で修正済み） | あり → **400エラー** | あり | ❌ 400エラー | ✅ `since_id` のみ → 正常動作 |

### 4.2 差分更新時の動作

`since_id` のみを指定した場合、X API は「指定したツイートIDより新しいすべてのツイート」を返します。`end_time` を省略しても動作に問題はありません。

### 4.3 後方互換性

| 項目 | 互換性 | 備考 |
|------|--------|------|
| API レスポンス形式 | ✅ 変更なし | `DayData[]` の形式は同じ |
| IndexedDBキャッシュ構造 | ✅ 変更なし | スキーマ変更なし |
| モックモード | ✅ 変更なし | `NEXT_PUBLIC_USE_MOCK=true` 時は API 呼び出し自体が行われない |
| 初回取得・過去月取得 | ✅ 変更なし | `sinceId` が `undefined` の場合は従来通り `end_time` を渡す |

---

## 5. 実装フェーズ案

### フェーズ1: 変更提案書作成
- [x] `spec/PROPOSAL_V3.23.md` を作成

### フェーズ2: コード修正
- [x] `lib/twitter-api.ts` の `searchAll` 呼び出し部分を修正

---

## 6. 次のステップ

この変更要求書（v3.23）の内容でご承認いただけましたら、フェーズ2の実装を進めます。

ご確認・ご意見をお願いいたします！🎉

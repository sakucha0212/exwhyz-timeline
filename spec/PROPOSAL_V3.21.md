# ExWHYZ-Timeline ツイート検索条件追加 変更要求書（v3.21）

## 📋 変更要件の整理

### v3.21での変更要件

1. **検索キーワードの追加**: `EXWHYZ_SEARCH_QUERY` に以下の2つのキーワードを追加する
   - `EMPiRE`
   - `俺とお前で音源チェック`

---

## 1. 現状（v3.20）

### 現在の検索クエリ（`lib/twitter-api.ts` 8〜12行目）

```typescript
export const EXWHYZ_SEARCH_QUERY =
  '(ExWHYZ OR WHYZ OR NATSLIVE OR mikina OR yu-ki OR maho OR mayu OR now OR midoriko ' +
  'OR イクスワイズ OR イクス OR ミキナ OR ユーキ OR マホ OR マユ OR ナウ OR ミドリコ OR ドリ ' +
  'OR みきな OR まほ OR ゆーき OR まゆ OR なう OR みどりこ OR どり OR ちぇきな) ' +
  '-is:retweet -is:reply';
```

現在は ExWHYZ のグループ名・メンバー名（英語・カタカナ・ひらがな）のみが対象です。
`EMPiRE`（ExWHYZ メンバーの前身グループ）および `俺とお前で音源チェック`（関連コンテンツ）が含まれていません。

---

## 2. 変更詳細

### 2.1 `lib/twitter-api.ts`（修正）— 検索キーワードの追加

**変更前:**

```typescript
export const EXWHYZ_SEARCH_QUERY =
  '(ExWHYZ OR WHYZ OR NATSLIVE OR mikina OR yu-ki OR maho OR mayu OR now OR midoriko ' +
  'OR イクスワイズ OR イクス OR ミキナ OR ユーキ OR マホ OR マユ OR ナウ OR ミドリコ OR ドリ ' +
  'OR みきな OR まほ OR ゆーき OR まゆ OR なう OR みどりこ OR どり OR ちぇきな) ' +
  '-is:retweet -is:reply';
```

**変更後:**

```typescript
export const EXWHYZ_SEARCH_QUERY =
  '(ExWHYZ OR WHYZ OR NATSLIVE OR mikina OR yu-ki OR maho OR mayu OR now OR midoriko ' +
  'OR イクスワイズ OR イクス OR ミキナ OR ユーキ OR マホ OR マユ OR ナウ OR ミドリコ OR ドリ ' +
  'OR みきな OR まほ OR ゆーき OR まゆ OR なう OR みどりこ OR どり OR ちぇきな ' +
  'OR EMPiRE OR "俺とお前で音源チェック") ' +
  '-is:retweet -is:reply';
```

**変更点の詳細:**

| 追加キーワード | 備考 |
|--------------|------|
| `EMPiRE` | 英字のため単語単位でマッチ |
| `"俺とお前で音源チェック"` | フレーズ検索（ダブルクォートで囲む）にすることで完全一致のみを取得 |

> **注意**: `俺とお前で音源チェック` はスペースを含まない連続した文字列ですが、Twitter API の検索では念のためダブルクォートで囲んでフレーズ検索とすることで、意図しない部分一致を防ぎます。

---

## 3. 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `lib/twitter-api.ts` | **修正** | `EXWHYZ_SEARCH_QUERY` に `EMPiRE` と `"俺とお前で音源チェック"` を追加 |

---

## 4. 修正の影響範囲

### 4.1 検索結果への影響

| 項目 | 影響 |
|------|------|
| 既存キーワードの検索結果 | ✅ 変更なし |
| 新規キーワードのツイート | 新たに取得対象になる |
| リツイート・リプライ | ✅ 引き続き除外（`-is:retweet -is:reply` は変更なし） |

### 4.2 キャッシュへの影響

| 状況 | 影響 |
|------|------|
| 既存キャッシュ（過去月） | 古いキャッシュには新キーワードのツイートが含まれない |
| 新規取得（当月以降） | 新キーワードのツイートも取得される |

> **推奨対応**: 過去月のデータも含めて再取得したい場合は、ブラウザの IndexedDB キャッシュをクリアして再取得してください。

### 4.3 後方互換性

| 項目 | 互換性 | 備考 |
|------|--------|------|
| API レスポンス形式 | ✅ 変更なし | `DayData[]` の形式は同じ |
| IndexedDBキャッシュ構造 | ✅ 変更なし | スキーマ変更なし |
| モックモード | ✅ 変更なし | `NEXT_PUBLIC_USE_MOCK=true` 時の挙動は変更なし |

---

## 5. 実装フェーズ案

### フェーズ1: 変更提案書作成
- [x] `spec/PROPOSAL_V3.21.md` を作成

### フェーズ2: コード修正
- [x] `lib/twitter-api.ts` の `EXWHYZ_SEARCH_QUERY` に `EMPiRE` と `"俺とお前で音源チェック"` を追加

---

## 6. 次のステップ

この変更要求書（v3.21）の内容でご承認いただけましたら、フェーズ2の実装を進めます。

ご確認・ご意見をお願いいたします！🎉

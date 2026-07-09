# ExWHYZ-Timeline タイムゾーンズレ修正 変更要求書（v3.19）

## 📋 変更要件の整理

### v3.19での変更要件

1. **タイムゾーンズレの修正**: ツイートの日付グループ化をUTC基準からJST（日本時間）基準に変更する
2. **日付ヘッダーの安全な解析**: `DayEntry.tsx` の日付パースをタイムゾーンに依存しない方法に変更する

---

## 1. 現状の問題（v3.18）

### 症状

見出しの日付とツイート埋め込みの表示日がズレる。

**例:**
- 見出し: `2025年6月24日（火）`
- ツイート埋め込みの表示: `2025年6月25日 AM 12:28`

### 原因

#### 問題箇所①: `lib/twitter-api.ts` — `formatTweetsForTimeline` 関数（94行目）

```typescript
// 現状（UTC基準で日付を計算）
const date = new Date(tweet.created_at).toISOString().split('T')[0];
```

Twitter API が返す `created_at` は **UTC** の ISO 8601 形式です。
`.toISOString()` も常に **UTC** で文字列を返すため、日付グループが UTC 基準になります。

**具体例:**

| 値 | 内容 |
|---|---|
| `tweet.created_at` | `2025-06-24T15:28:00.000Z`（UTC） |
| `.toISOString().split('T')[0]` | `2025-06-24`（UTC基準） |
| 日本時間（JST = UTC+9）に換算 | `2025-06-25 00:28` |

→ **見出しは `2025-06-24`（UTC）** なのに、**ツイート埋め込みは `2025年6月25日`（JST）** と表示される。

#### 問題箇所②: `components/Timeline/DayEntry.tsx` — `formatDate` 関数（40行目）

```typescript
// 現状（文字列をDateオブジェクトに変換）
const d = new Date(dateStr); // "2025-06-24" → UTC 0:00 として解釈
```

`"2025-06-24"` のような日付文字列を `new Date()` に渡すと、**UTC の 0:00** として解釈されます。
JST 環境（UTC+9）では `2025-06-23T15:00:00+09:00` となり、`getDate()` が `23` を返す可能性があります。

---

## 2. 変更詳細

### 2.1 `lib/twitter-api.ts`（修正）— JST基準での日付グループ化

**変更前:**
```typescript
tweets.forEach((tweet) => {
  const date = new Date(tweet.created_at).toISOString().split('T')[0];
  // ...
});
```

**変更後:**
```typescript
tweets.forEach((tweet) => {
  // JST（UTC+9）基準で日付を計算する
  const d = new Date(tweet.created_at);
  const jstDate = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const date = jstDate.toISOString().split('T')[0];
  // ...
});
```

UTC のタイムスタンプに 9時間（= 9 × 60 × 60 × 1000 ミリ秒）を加算することで、
JST の日付文字列（`YYYY-MM-DD`）を正確に取得します。

### 2.2 `components/Timeline/DayEntry.tsx`（修正）— 安全な日付パース

**変更前:**
```typescript
const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const weekday = weekdays[d.getDay()];
  return `${year}年${month}月${day}日（${weekday}）`;
};
```

**変更後:**
```typescript
const formatDate = (dateStr: string) => {
  // "YYYY-MM-DD" を直接パースしてタイムゾーンの影響を受けないようにする
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day); // ローカル時刻として生成
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const weekday = weekdays[d.getDay()];
  return `${year}年${month}月${day}日（${weekday}）`;
};
```

`"YYYY-MM-DD"` を直接 `split('-')` で分解して数値に変換し、
`new Date(year, month - 1, day)` でローカル時刻として生成することで、
タイムゾーンの影響を完全に排除します。

---

## 3. 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `lib/twitter-api.ts` | **修正** | `formatTweetsForTimeline` 内の日付計算をUTC→JST基準に変更 |
| `components/Timeline/DayEntry.tsx` | **修正** | `formatDate` の日付パースをタイムゾーン安全な方法に変更 |

---

## 4. 修正の影響範囲

### 4.1 既存キャッシュへの影響

IndexedDB に保存済みのキャッシュデータは **UTC基準の日付** でグループ化されています。
修正後に新規取得したデータは **JST基準の日付** でグループ化されます。

| 状況 | 影響 |
|------|------|
| キャッシュなし（初回取得） | 修正後の正しい日付で保存される |
| キャッシュあり（過去月） | 古いキャッシュは UTC 基準のまま残る |
| キャッシュあり（当月） | 差分更新時に新着分のみ JST 基準で追加される |

> **推奨対応**: 修正デプロイ後、ブラウザの IndexedDB キャッシュをクリアして再取得することで、全データが JST 基準に統一されます。

### 4.2 モックデータへの影響

`data/user-tweets.json` のモックデータは日付文字列（`"YYYY-MM-DD"`）を直接持つため、
`formatTweetsForTimeline` を経由しません。**影響なし。**

### 4.3 後方互換性

| 項目 | 互換性 | 備考 |
|------|--------|------|
| IndexedDBキャッシュ構造 | ✅ 変更なし | スキーマ変更なし |
| API レスポンス形式 | ✅ 変更なし | `DayData[]` の形式は同じ |
| モックモード | ✅ 変更なし | `NEXT_PUBLIC_USE_MOCK=true` 時の挙動は変更なし |
| v3.18の空日付トグル | ✅ 変更なし | フィルタリングロジックは変更なし |

---

## 5. 実装フェーズ案

### フェーズ1: 変更提案書作成
- [x] `spec/PROPOSAL_V3.19.md` を作成

### フェーズ2: コード修正
- [x] `lib/twitter-api.ts` の `formatTweetsForTimeline` を JST 基準に修正
- [x] `components/Timeline/DayEntry.tsx` の `formatDate` をタイムゾーン安全な実装に修正

---

## 6. 次のステップ

この変更要求書（v3.19）の内容でご承認いただけましたら、フェーズ2の実装を進めます。

ご確認・ご意見をお願いいたします！🎉

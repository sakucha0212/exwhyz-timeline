# ExWHYZ-Timeline `type: "festival"` 廃止 変更提案書（v3.49）

## 📋 変更要件の整理

### v3.49 での変更要件

1. **クリーンアップ**: `type: "festival"` を型定義・スタイル定義から削除する
2. **範囲**: `highlights.json` に `festival` エントリが存在しないため、データ変更不要

---

## 1. 現状（v3.48）と問題の詳細

### 現状

`highlights.json` には `type: "festival"` のエントリが 0 件。しかしコード上では以下の 3 ファイルで `'festival'` が定義されている：

- `FilterBar.tsx` — `HighlightType` 型、`TYPE_CONFIG` 配列
- `HighlightCard.tsx` — `HighlightItem.type` 型、各スタイル関数の Record
- `HighlightsContainer.tsx` — `HighlightItem.type` 型

これらは未使用のデッドコードであり、将来的に誤った期待を生む可能性がある。

---

## 2. 変更詳細

### 2.1 FilterBar.tsx

型定義と TYPE_CONFIG から `'festival'` を削除。

```typescript
// 変更前
export type HighlightType = 'tour' | 'live' | 'festival' | 'announcement' | 'event';

const TYPE_CONFIG = [
  { key: 'tour', ... },
  { key: 'live', ... },
  { key: 'festival', ... },  // 削除
  { key: 'announcement', ... },
  { key: 'event', ... },
];

// 変更後
export type HighlightType = 'tour' | 'live' | 'announcement' | 'event';

const TYPE_CONFIG = [
  { key: 'tour', ... },
  { key: 'live', ... },
  { key: 'announcement', ... },
  { key: 'event', ... },
];
```

### 2.2 HighlightCard.tsx

型定義と各スタイル関数から `'festival'` を削除。

```typescript
// 変更前
type: 'tour' | 'live' | 'festival' | 'announcement' | 'event';

// 変更後
type: 'tour' | 'live' | 'announcement' | 'event';
```

`getTypeIcon`, `getTypeColor`, `getTypeBorderColor`, `getTypeLabel` の各 Record から `festival` キーを削除。

### 2.3 HighlightsContainer.tsx

型定義から `'festival'` を削除。

```typescript
// 変更前
type: 'tour' | 'live' | 'festival' | 'announcement' | 'event';

// 変更後
type: 'tour' | 'live' | 'announcement' | 'event';
```

---

## 3. 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `spec/PROPOSAL_V3.49.md` | **新規** | 本変更提案書 |
| `components/Highlights/FilterBar.tsx` | **修正** | `HighlightType` 型と `TYPE_CONFIG` から `'festival'` 削除 |
| `components/Highlights/HighlightCard.tsx` | **修正** | `HighlightItem.type` 型と各スタイル関数から `'festival'` 削除 |
| `components/Highlights/HighlightsContainer.tsx` | **修正** | `HighlightItem.type` 型から `'festival'` 削除 |

---

## 4. 修正の影響範囲

| 項目 | 影響 | 備考 |
|------|------|------|
| `highlights.json` | ✅ 変更なし | festival エントリ 0 件のため |
| `YearSection` | ✅ 変更なし | |
| `page.tsx` | ✅ 変更なし | |
| タイムライン画面 | ✅ 変更なし | |
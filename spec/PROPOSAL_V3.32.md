# ExWHYZ-Timeline type/category 統合と表示ラベル細分化 変更要求書（v3.32）

## 📋 変更要件の整理

### v3.32での変更要件

1. **データ構造簡素化**: `category` フィールドを廃止し、`type` に統合する
2. **表示ラベル細分化**: ツアーは「ツアー」、単発ライブは「ライブ」、フェスは「フェス」と表示する

---

## 1. 現状（v3.31）と問題の詳細

### 問題

- `type`（日付形式の決定）と `category`（アイコン・色・ラベル）が分離しており冗長
- ツアーも単発ライブも `category: "live"` で「ライブ」と表示され、区別できない

### 改善方針

`category` を廃止し、`type` に統合する。

---

## 2. 変更詳細

### 2.1 データ定義: `data/highlights.json`（修正）

```json
// 変更前
{ "type": "tour",  "category": "live", ... }
{ "type": "event", "category": "live", ... }
{ "type": "event", "category": "LIVE", ... }
{ "type": "event", "category": "announcement", ... }

// 変更後
{ "type": "tour",  ... }
{ "type": "live",  ... }
{ "type": "festival", ... }
{ "type": "announcement", ... }
```

#### 新しい `type` 値

| `type` | 日付形式 | アイコン | 色 | ラベル |
|--------|---------|---------|-----|------|
| `tour` | 開始日〜終了日 | 🎵 | ピンク | ツアー |
| `live` | 発生日 | 🎵 | ピンク | ライブ |
| `festival` | 発生日 | 🎵 | ピンク | フェス |
| `announcement` | 発生日 | 📢 | 青 | 発表 |

#### 日付判別

```typescript
// type === 'tour' のみ期間表示、それ以外は単一日表示
const isRange = item.type === 'tour';
```

### 2.2 `HighlightItem` 型の変更

```typescript
// 変更前
interface HighlightItem {
  id: string;
  type: 'tour' | 'event';
  title: string;
  category: string;
  date?: string;
  startDate?: string;
  endDate?: string;
}

// 変更後
interface HighlightItem {
  id: string;
  type: 'tour' | 'live' | 'festival' | 'announcement';  // category 統合
  title: string;
  date?: string;
  startDate?: string;
  endDate?: string;
}
```

### 2.3 `HighlightCard.tsx`（修正）

- `getCategoryColor` → `getTypeColor`
- `getCategoryIcon` → `getTypeIcon`
- `getCategoryLabel` → `getTypeLabel`
- 引数を `(category: string)` から `(type: string)` に変更
- `HighlightItem` 型から `category` フィールドを削除

### 2.4 `HighlightsContainer.tsx`（修正）

- `HighlightItem` 型から `category` フィールドを削除
- ソートキー: `startDate ?? date` に統一（`type` での分岐不要）

---

## 3. 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `spec/PROPOSAL_V3.32.md` | **新規** | 本変更要求書 |
| `data/highlights.json` | **修正** | `category` 削除、`type` を `tour`/`live`/`festival`/`announcement` に変更 |
| `components/Highlights/HighlightCard.tsx` | **修正** | 型・関数・ラベルを `type` ベースに変更 |
| `components/Highlights/HighlightsContainer.tsx` | **修正** | 型とソートキー修正 |

---

## 4. 修正の影響範囲

| 項目 | 影響 | 備考 |
|------|------|------|
| タイムライン詳細 | ✅ 変更なし | `TimelineContainer` は変更なし |
| モード切替 | ✅ 変更なし | |
| ツアー表示 | ✅ 「ツアー」ラベルに変更 | 従来は「ライブ」だった |
# ExWHYZ-Timeline タイムライン月ナビゲーション改善 変更要求書（v3.34）

## 📋 変更要件の整理

### v3.34での変更要件

1. **レイアウト改善**: `MonthPagination` の並びを「左右分離型」（案A）に変更
2. **新機能**: タイムライン最下部に前月/次月ナビゲーションボタンを追加

---

## 1. 現状（v3.33）と問題の詳細

### 問題

現在の `MonthPagination` は `[前月] [年▼] [月▼] [次月]` の並びで、前後移動と年月直接指定が混在しており、「年月を選んでから前月/次月を押す」という誤った操作順を想起させる。

また、タイムラインを最後までスクロールした後、次の月に移動するには画面上部まで戻る必要があり、操作が煩雑。

---

## 2. 変更詳細

### 2.1 `MonthPagination.tsx` — レイアウトを案A（左右分離型）に変更

```
変更前: [前月] [2026年▼] [7月▼] [次月]  空の日を非表示  読み込み中...  [更新]

変更後: [◀ 前月] [次月 ▶]    [2026年▼] [7月▼]    空の日を非表示  読み込み中...  [更新]
         ← 連続移動 →         ← 直接指定 →         ← その他オプション →
```

| 変更点 | 内容 |
|--------|------|
| 前月/次月ボタン | 左端にグループ化。小さめのギャップで隣接 |
| 年/月ドロップダウン | 中央に独立して配置。前後移動とは分離 |
| 空日トグル・更新ボタン等 | 右側に配置（既存の `ml-auto` を維持） |

### 2.2 `TimelineContainer.tsx` — 最下部に前月/次月ナビゲーションを追加

`filteredDates` の表示後、下部に前月/次月ボタンを表示する。

```tsx
{/* 下部ナビゲーション */}
<div className="flex justify-between items-center mt-8 pt-4 border-t border-gray-700">
  {/* 前月ボタン */}
  <button onClick={() => setCurrentYearMonth(prevYM)}
    disabled={prevYM < archiveStartYM}
    className="...">
    ◀ 前月（{prevMonthLabel}）
  </button>
  {/* 次月ボタン */}
  <button onClick={() => setCurrentYearMonth(nextYM)}
    disabled={nextYM > archiveEndYM}
    className="...">
    次月（{nextMonthLabel}）▶
  </button>
</div>
```

### 2.3 ラベル計算（`TimelineContainer` 内）

前月/次月の年月を計算し、`"7月"` のようなラベルを生成する。

```typescript
const [ymYear, ymMonth] = currentYearMonth.split('-').map(Number);
// 前月
const prevMonth = ymMonth === 1 ? 12 : ymMonth - 1;
const prevYear = ymMonth === 1 ? ymYear - 1 : ymYear;
const prevYM = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
// 次月
const nextMonth = ymMonth === 12 ? 1 : ymMonth + 1;
const nextYear = ymMonth === 12 ? ymYear + 1 : ymYear;
const nextYM = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
```

---

## 3. 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `spec/PROPOSAL_V3.34.md` | **新規** | 本変更要求書 |
| `components/Timeline/MonthPagination.tsx` | **修正** | レイアウトを案Aに変更（前月/次月を左端にグループ化） |
| `components/Timeline/TimelineContainer.tsx` | **修正** | リスト下部に前月/次月ナビゲーションボタンを追加 |

---

## 4. 修正の影響範囲

| 項目 | 影響 | 備考 |
|------|------|------|
| ハイライト画面 | ✅ 変更なし | `HighlightsContainer` は変更なし |
| モード切替 | ✅ 変更なし | |
| スマホ表示 | ✅ 2行可変レイアウト | flex-wrap により狭い画面では自然に折り返す |
# ExWHYZ-Timeline 概要ページツアー表示欄削除 変更要求書（v3.25）

## 📋 変更要件の整理

### v3.25での変更要件

1. **UI修正**: 概要ページからツアー表示欄を削除する

---

## 1. 現状（v3.24）と問題の詳細

v3.24 で実装した概要チャート画面には、以下の2セクションが存在する。

1. **ツアー一覧**（`TourSection` + `TourCard`）
2. **年月別イベント一覧**（`YearAccordion` + `MonthRow`）

ツアー表示欄は不要との判断により、削除する。

---

## 2. 変更詳細

### 2.1 `components/Overview/OverviewContainer.tsx`（修正）

`TourSection` の import と使用を削除する。

**変更前:**
```tsx
import TourSection from './TourSection';
// ...
<TourSection tours={data.tours} onSelectMonth={onSelectMonth} />
```

**変更後:**
```tsx
// TourSection import 削除
// TourSection 使用箇所 削除
```

### 2.2 削除ファイル

| ファイル | 理由 |
|---------|------|
| `components/Overview/TourSection.tsx` | ツアー一覧セクション（不要） |
| `components/Overview/TourCard.tsx` | ツアーカード（不要） |

### 2.3 `data/highlights.json`（修正）

`tours` フィールドを削除し、`events` のみに簡素化する。

---

## 3. 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `spec/PROPOSAL_V3.25.md` | **新規** | 本変更要求書 |
| `components/Overview/OverviewContainer.tsx` | **修正** | `TourSection` の import/使用を削除 |
| `components/Overview/TourSection.tsx` | **削除** | 不要 |
| `components/Overview/TourCard.tsx` | **削除** | 不要 |
| `data/highlights.json` | **修正** | `tours` フィールドを削除 |

---

## 4. 修正の影響範囲

| 項目 | 影響 | 備考 |
|------|------|------|
| 年月別イベント一覧 | ✅ 変更なし | `YearAccordion`、`MonthRow` はそのまま |
| モード切替 | ✅ 変更なし | `ViewModeTabs`、`page.tsx` に影響なし |
| タイムライン詳細 | ✅ 変更なし | `TimelineContainer` に影響なし |
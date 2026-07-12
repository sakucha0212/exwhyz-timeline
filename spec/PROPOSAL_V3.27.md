# ExWHYZ-Timeline 全年に同一イベントが表示されるバグ修正 変更要求書（v3.27）

## 📋 変更要件の整理

### v3.27での変更要件

1. **バグ修正**: 概要ページのすべての年に同じイベントが表示されてしまう問題を修正する

---

## 1. 現状（v3.26）と問題の詳細

### 問題

概要ページ（`OverviewContainer` → `YearAccordion`）で、すべての年アコーディオンを開くと、どの年にも同じ全51件のイベントが表示されてしまう。

例：2025年のアコーディオンを開いても「ExWHYZ LAST LIVE '光'（2026-08）」が表示される。

### 原因

`components/Overview/YearAccordion.tsx` のイベント振り分けロジックに **年のフィルタリングが欠落** している。

```typescript
// 現在のコード（36-41行目）
allEvents.forEach((event) => {
    const month = parseInt(event.yearMonth.split('-')[1], 10);  // 月だけ抽出
    if (eventsByMonth[month]) {
      eventsByMonth[month].push(event);  // 年を無視して月だけで振り分け
    }
  });
```

`OverviewContainer` は全 `YearAccordion` に同じ `allEvents`（全51件）を渡しており、`YearAccordion` 内ではイベントの年が自身の `year` prop と一致するかをチェックしていない。そのため、すべての年に全イベントがその月に表示されてしまう。

#### データフロー

```
OverviewContainer
  ├─ YearAccordion (year=2026) ← allEvents=全51件 → 年チェックなし → 全イベント表示
  ├─ YearAccordion (year=2025) ← allEvents=全51件 → 年チェックなし → 全イベント表示
  ├─ YearAccordion (year=2024) ← allEvents=全51件 → 年チェックなし → 全イベント表示
  └─ ...
```

---

## 2. 変更詳細

### 2.1 `components/Overview/YearAccordion.tsx`（修正）

`allEvents.forEach` のループ内で、イベントの年が自身の `year` と一致するかをチェックする行を追加する。

**変更前:**
```typescript
  allEvents.forEach((event) => {
    const month = parseInt(event.yearMonth.split('-')[1], 10);
    if (eventsByMonth[month]) {
      eventsByMonth[month].push(event);
    }
  });
```

**変更後:**
```typescript
  allEvents.forEach((event) => {
    const eventYear = parseInt(event.yearMonth.split('-')[0], 10);
    if (eventYear !== year) return;  // 年が一致しないイベントはスキップ
    const month = parseInt(event.yearMonth.split('-')[1], 10);
    if (eventsByMonth[month]) {
      eventsByMonth[month].push(event);
    }
  });
```

---

## 3. 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `spec/PROPOSAL_V3.27.md` | **新規** | 本変更要求書 |
| `components/Overview/YearAccordion.tsx` | **修正** | `allEvents.forEach` 内に年の一致チェックを追加（2行追加） |

---

## 4. 修正の影響範囲

| 項目 | 影響 | 備考 |
|------|------|------|
| 概要チャート表示 | ✅ 修正 | 各年にその年のイベントのみが正しく表示される |
| `MonthRow` | ✅ 変更なし | props の内容は変わらず、正しいイベントのみが渡されるようになる |
| `OverviewContainer` | ✅ 変更なし | 全イベントを渡す設計は変更不要（フィルタは子で行う） |
| 年アコーディオンのイベント数カウント | ✅ 修正 | `monthsWithEvents` も正しい値になる |
# ExWHYZ-Timeline ハイライト並び順のソート基準変更 変更要求書（v3.33）

## 📋 変更要件の整理

### v3.33での変更要件

1. **ソート基準変更**: ツアーの並び順を開始日基準から終了日基準に変更する

---

## 1. 変更詳細

### 1.1 `components/Highlights/HighlightsContainer.tsx`（修正）

`sortByDate` 関数の `startDate` → `endDate` に変更。

**変更前:**
```typescript
const aDate = a.startDate ?? a.date!;
const bDate = b.startDate ?? b.date!;
```

**変更後:**
```typescript
const aDate = a.endDate ?? a.date!;
const bDate = b.endDate ?? b.date!;
```

---

## 2. 変更対象ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `spec/PROPOSAL_V3.33.md` | **新規** | 本変更要求書 |
| `components/Highlights/HighlightsContainer.tsx` | **修正** | ソート基準を `endDate` に変更（`startDate` → `endDate`） |

---

## 3. 修正の影響範囲

| 項目 | 影響 | 備考 |
|------|------|------|
| ツアーカードの並び順 | ✅ 終了日が新しいものが上に | |
| 単発イベントの並び順 | ✅ 変更なし | |